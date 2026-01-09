import { useEffect, useRef } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { useWebSocket } from '../hooks/use-websocket'
import { createMessageHandler } from '../handlers/message-handler'
import type { SentWSMessage } from '../types'

/**
 * 主应用组件
 * 包含 Excalidraw 画板，并通过 WebSocket 与后端服务同步状态
 */
export function App() {
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const messageHandlerRef = useRef<ReturnType<typeof createMessageHandler> | null>(null)
  const { sendMessage, lastMessage, connectionStatus } = useWebSocket('/ws')

  // 处理 Excalidraw API 初始化
  // React Compiler 会自动处理 memoization，无需 useCallback
  const handleExcalidrawAPI = (api: ExcalidrawImperativeAPI) => {
    excalidrawAPIRef.current = api

    // 创建消息处理器
    messageHandlerRef.current = createMessageHandler({
      api,
      sendMessage: (message: unknown) => sendMessage(message as SentWSMessage),
    })

    // 将 API 暴露到 window 对象供调试使用
    if (import.meta.env.DEV) {
      (window as Window & { excalidrawAPI?: ExcalidrawImperativeAPI }).excalidrawAPI = api
    }
  }

  // 处理场景变更，同步到服务器
  // React Compiler 会自动优化此函数
  const handleChange = (
    elements: readonly unknown[],
    appState: Record<string, unknown>,
    files: Record<string, unknown>
  ) => {
    if (connectionStatus === 'connected') {
      const filteredElements = (elements as Array<{ isDeleted?: boolean }>).filter(
        (el) => el && !el.isDeleted
      )
      sendMessage({
        type: 'scene_update',
        payload: {
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

  return (
    <div className="excalidraw-wrapper">
      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
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
    </div>
  )
}
