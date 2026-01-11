import { useEffect, useRef, useState } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { useWebSocket } from '../hooks/use-websocket'
import { createMessageHandler } from '../handlers/message-handler'
import { SceneSelector } from './scene-selector'
import { loadScene, saveScene } from '../services/scene-storage'
import type { SentWSMessage } from '../types'

/**
 * 主应用组件
 * 包含 Excalidraw 画板，并通过 WebSocket 与后端服务同步状态
 * 场景数据持久化到 IndexedDB，支持多场景管理
 */
export function App() {
  // 场景状态
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<{
    elements: readonly unknown[]
    appState: Record<string, unknown>
    files: Record<string, unknown>
  } | null>(null)

  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const messageHandlerRef = useRef<ReturnType<typeof createMessageHandler> | null>(null)
  const currentSceneIdRef = useRef<string | null>(null)

  // 同步控制机制
  const hasInitializedRef = useRef(false)
  const suppressSyncRef = useRef(true)
  const suppressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 保存场景的防抖计时器
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { sendMessage, lastMessage, connectionStatus } = useWebSocket('/ws')

  // 保持 currentSceneIdRef 同步
  useEffect(() => {
    currentSceneIdRef.current = currentSceneId
  }, [currentSceneId])

  // 场景选择处理
  const handleSceneSelect = async (sceneId: string, isNew: boolean) => {
    setCurrentSceneId(sceneId)

    if (!isNew) {
      // 加载已有场景
      const stored = await loadScene(sceneId)
      if (stored) {
        setInitialData({
          elements: stored.elements,
          appState: stored.appState,
          files: stored.files,
        })
      }
    } else {
      // 新场景使用空数据
      setInitialData({
        elements: [],
        appState: { viewBackgroundColor: '#ffffff' },
        files: {},
      })
    }

    // 加入场景房间
    if (connectionStatus === 'connected') {
      sendMessage({
        type: 'join',
        payload: { sceneId },
      })
    }
  }

  // 连接状态变化时加入房间
  useEffect(() => {
    if (connectionStatus === 'connected' && currentSceneId) {
      sendMessage({
        type: 'join',
        payload: { sceneId: currentSceneId },
      })
    }
  }, [connectionStatus, currentSceneId])

  // 处理 Excalidraw API 初始化
  const handleExcalidrawAPI = (api: ExcalidrawImperativeAPI) => {
    excalidrawAPIRef.current = api

    // 创建消息处理器
    messageHandlerRef.current = createMessageHandler({
      api,
      sendMessage: (message: unknown) => sendMessage(message as SentWSMessage),
      suppressSync: () => {
        suppressSyncRef.current = true
        if (suppressTimeoutRef.current) {
          clearTimeout(suppressTimeoutRef.current)
        }
        suppressTimeoutRef.current = setTimeout(() => {
          suppressSyncRef.current = false
        }, 300)
      },
      onInitialSync: () => {
        hasInitializedRef.current = true
        console.log('[App] Initial sync completed, enabling user sync')
      },
    })

    // 如果有服务器数据，标记初始化完成
    // 对于新场景或从本地恢复的场景，直接允许同步
    if (initialData) {
      hasInitializedRef.current = true
      suppressSyncRef.current = false
    }

    // 调试用
    if (import.meta.env.DEV) {
      (window as Window & { excalidrawAPI?: ExcalidrawImperativeAPI }).excalidrawAPI = api
    }
  }

  // 处理场景变更
  const handleChange = (
    elements: readonly unknown[],
    appState: Record<string, unknown>,
    files: Record<string, unknown>
  ) => {
    const sceneId = currentSceneIdRef.current
    if (!sceneId) return

    // 如果尚未完成初始化或处于抑制状态，跳过同步
    if (!hasInitializedRef.current || suppressSyncRef.current) {
      return
    }

    const filteredElements = (elements as Array<{ isDeleted?: boolean }>).filter(
      (el) => el && !el.isDeleted
    )

    // 防抖保存到 IndexedDB
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveScene(sceneId, {
        elements: filteredElements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
        },
        files,
      }).catch((err) => console.error('[App] Failed to save scene:', err))
    }, 500)

    // 同步到服务器
    if (connectionStatus === 'connected') {
      sendMessage({
        type: 'scene_update',
        payload: {
          sceneId,
          elements: filteredElements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            currentItemFontFamily: appState.currentItemFontFamily,
            zoom: appState.zoom,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
          },
          files,
        },
      })
    }
  }

  // 处理来自服务器的消息
  useEffect(() => {
    if (!lastMessage || !messageHandlerRef.current) return

    messageHandlerRef.current.handleMessage(lastMessage).catch((error) => {
      console.error('[App] Failed to handle message:', error)
    })
  }, [lastMessage])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (suppressTimeoutRef.current) {
        clearTimeout(suppressTimeoutRef.current)
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // 未选择场景时显示选择器
  if (!currentSceneId) {
    return <SceneSelector onSelect={handleSceneSelect} />
  }

  return (
    <div className="excalidraw-wrapper">
      {/* 场景信息栏 */}
      <div className="scene-info-bar">
        <span className="scene-id">{currentSceneId}</span>
        <button
          className="btn-switch"
          onClick={() => {
            setCurrentSceneId(null)
            setInitialData(null)
            hasInitializedRef.current = false
            suppressSyncRef.current = true
          }}
        >
          切换场景
        </button>
      </div>

      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
        initialData={initialData ? {
          elements: initialData.elements as Parameters<typeof Excalidraw>[0] extends { initialData?: { elements?: infer E } } ? E : never,
          appState: initialData.appState as Parameters<typeof Excalidraw>[0] extends { initialData?: { appState?: infer A } } ? A : never,
          files: initialData.files as Parameters<typeof Excalidraw>[0] extends { initialData?: { files?: infer F } } ? F : never,
        } : undefined}
        onChange={handleChange as unknown as Parameters<typeof Excalidraw>[0]['onChange']}
        langCode="zh-CN"
        theme="light"
        UIOptions={{
          canvasActions: {
            loadScene: true,
            saveAsImage: true,
            saveToActiveFile: false,
            export: {
              saveFileToDisk: true,
            },
          },
        }}
      />

      <style>{`
        .scene-info-bar {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          font-size: 13px;
        }

        .scene-id {
          color: #666;
          font-family: monospace;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .btn-switch {
          padding: 4px 12px;
          background: #f0f0f0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.2s;
        }

        .btn-switch:hover {
          background: #e0e0e0;
        }
      `}</style>
    </div>
  )
}
