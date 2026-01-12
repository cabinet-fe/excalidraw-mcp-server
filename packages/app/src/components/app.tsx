import { useEffect, useRef, useState } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { useWebSocket } from '../hooks/use-websocket'
import { createMessageHandler } from '../handlers/message-handler'
import { SceneSelector } from './scene-selector'
import { loadScene, saveScene, sceneExists } from '../services/scene-storage'
import { getLastSceneId, setLastSceneId } from '../services/last-scene'
import type { SentWSMessage } from '../types'

/**
 * 主应用组件
 * 包含 Excalidraw 画板，并通过 WebSocket 与后端服务同步状态
 * 场景数据持久化到 IndexedDB，支持多场景管理
 *
 * 改进：
 * - 自动恢复上次使用的场景
 * - 场景信息栏移到右上角避免遮挡
 * - 页面加载时主动同步缓存数据到服务端
 */
export function App() {
  // 场景状态
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null)
  const [showSceneSelector, setShowSceneSelector] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
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

  // 是否已发送初始同步
  const hasSentInitialSyncRef = useRef(false)

  const { sendMessage, lastMessage, connectionStatus } = useWebSocket('/ws')

  // 自动恢复上次使用的场景
  useEffect(() => {
    const restoreLastScene = async () => {
      const lastId = getLastSceneId()
      if (lastId) {
        // 检查场景是否还存在
        const exists = await sceneExists(lastId)
        if (exists) {
          const stored = await loadScene(lastId)
          if (stored) {
            setCurrentSceneId(lastId)
            setInitialData({
              elements: stored.elements,
              appState: stored.appState,
              files: stored.files,
            })
            setIsLoading(false)
            return
          }
        }
      }
      // 无法恢复，显示选择器
      setShowSceneSelector(true)
      setIsLoading(false)
    }

    restoreLastScene()
  }, [])

  // 保持 currentSceneIdRef 同步
  useEffect(() => {
    currentSceneIdRef.current = currentSceneId
    // 保存到 localStorage
    if (currentSceneId) {
      setLastSceneId(currentSceneId)
    }
  }, [currentSceneId])

  // 连接状态变化时加入房间并同步缓存数据
  useEffect(() => {
    if (connectionStatus === 'connected' && currentSceneId && initialData) {
      // 加入房间
      sendMessage({
        type: 'join',
        payload: { sceneId: currentSceneId },
      })

      // 首次连接时主动同步缓存数据到服务器
      if (!hasSentInitialSyncRef.current && initialData.elements.length > 0) {
        hasSentInitialSyncRef.current = true
        const filteredElements = (initialData.elements as Array<{ isDeleted?: boolean }>).filter(
          (el) => el && !el.isDeleted
        )
        sendMessage({
          type: 'scene_update',
          payload: {
            sceneId: currentSceneId,
            elements: filteredElements,
            appState: {
              viewBackgroundColor: initialData.appState.viewBackgroundColor,
            },
            files: initialData.files,
          },
        })
        console.log('[App] Synced cached scene data to server')
      }
    }
  }, [connectionStatus, currentSceneId, initialData, sendMessage])

  // 场景选择处理
  const handleSceneSelect = async (sceneId: string, isNew: boolean) => {
    setCurrentSceneId(sceneId)
    hasSentInitialSyncRef.current = false

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

    setShowSceneSelector(false)

    // 加入场景房间
    if (connectionStatus === 'connected') {
      sendMessage({
        type: 'join',
        payload: { sceneId },
      })
    }
  }

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

  // 加载中
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <style>{`
          .loading-container {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #f8f9fa;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e0e0e0;
            border-top-color: #6965db;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // 显示场景选择器
  if (showSceneSelector || !currentSceneId) {
    return <SceneSelector onSelect={handleSceneSelect} />
  }

  return (
    <div className="excalidraw-wrapper">
      {/* 场景信息栏 - 移到右上角避免遮挡工具栏 */}
      <div className="scene-info-bar">
        <span className="scene-id" title={currentSceneId}>{currentSceneId}</span>
        <span className={`connection-status ${connectionStatus}`} title={`连接状态: ${connectionStatus}`}>
          {connectionStatus === 'connected' ? '●' : connectionStatus === 'connecting' ? '◐' : '○'}
        </span>
        <button
          className="btn-switch"
          onClick={() => {
            setShowSceneSelector(true)
            hasInitializedRef.current = false
            suppressSyncRef.current = true
            hasSentInitialSyncRef.current = false
          }}
        >
          切换
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
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          font-size: 12px;
          backdrop-filter: blur(8px);
        }

        .scene-id {
          color: #666;
          font-family: monospace;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .connection-status {
          font-size: 10px;
          line-height: 1;
        }

        .connection-status.connected {
          color: #22c55e;
        }

        .connection-status.connecting {
          color: #f59e0b;
        }

        .connection-status.disconnected,
        .connection-status.error {
          color: #ef4444;
        }

        .btn-switch {
          padding: 4px 10px;
          background: #f0f0f0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          transition: background 0.2s;
        }

        .btn-switch:hover {
          background: #e0e0e0;
        }
      `}</style>
    </div>
  )
}
