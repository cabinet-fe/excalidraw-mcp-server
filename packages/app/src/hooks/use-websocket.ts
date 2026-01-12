import { useEffect, useRef, useState } from 'react'
import type { ReceivedWSMessage, SentWSMessage } from '../types'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseWebSocketReturn {
  sendMessage: (message: SentWSMessage) => void
  lastMessage: ReceivedWSMessage | null
  connectionStatus: ConnectionStatus
}

/**
 * WebSocket 连接 Hook
 * 管理与后端服务的实时通信
 *
 * React Compiler 会自动处理 memoization，无需手动 useCallback
 */
export function useWebSocket(url: string): UseWebSocketReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [lastMessage, setLastMessage] = useState<ReceivedWSMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  // 标记是否为主动关闭（组件卸载时）
  const isClosingRef = useRef(false)
  // 标记是否显示过连接错误
  const hasShownErrorRef = useRef(false)

  // 连接 WebSocket
  const connect = () => {
    // 如果正在关闭，不要尝试连接
    if (isClosingRef.current) return

    // 构建完整的 WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = url.startsWith('/') ? `${protocol}//${window.location.host}${url}` : url

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionStatus('connected')
      reconnectAttempts.current = 0
      hasShownErrorRef.current = false
      if (import.meta.env.DEV) {
        console.log('[WebSocket] Connected')
      }
    }

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const message = JSON.parse(event.data) as ReceivedWSMessage
        setLastMessage(message)
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error)
      }
    }

    ws.onclose = (event: CloseEvent) => {
      // 主动关闭时不做任何处理
      if (isClosingRef.current) return

      setConnectionStatus('disconnected')

      // 只在非正常关闭且开发模式时记录日志
      if (event.code !== 1000 && event.code !== 1005 && import.meta.env.DEV) {
        console.log(`[WebSocket] Disconnected (code: ${event.code})`)
      }

      // 自动重连
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isClosingRef.current) return
          reconnectAttempts.current++
          if (import.meta.env.DEV) {
            console.log(`[WebSocket] Reconnecting... (attempt ${reconnectAttempts.current})`)
          }
          connect()
        }, delay)
      }
    }

    ws.onerror = () => {
      // 主动关闭时不做任何处理
      if (isClosingRef.current) return

      // 仅在开发模式且未显示过错误时记录
      if (import.meta.env.DEV && !hasShownErrorRef.current) {
        hasShownErrorRef.current = true
        console.warn('[WebSocket] Connection error - server may not be running')
      }
      setConnectionStatus('error')
    }
  }

  // 初始化连接
  useEffect(() => {
    isClosingRef.current = false
    hasShownErrorRef.current = false

    // 添加短暂延迟，避免 React 严格模式下立即关闭的问题
    const connectTimeout = setTimeout(() => {
      connect()
    }, 100)

    return () => {
      // 标记为主动关闭
      isClosingRef.current = true
      clearTimeout(connectTimeout)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        // 使用正常关闭码
        wsRef.current.close(1000, 'Component unmounting')
        wsRef.current = null
      }
    }
  }, [url])

  // 发送消息
  // React Compiler 会自动优化此函数
  const sendMessage = (message: SentWSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
    // 不再在未连接时输出警告，避免噪声
  }

  return {
    sendMessage,
    lastMessage,
    connectionStatus,
  }
}
