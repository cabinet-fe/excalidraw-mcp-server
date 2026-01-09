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

  // 连接 WebSocket
  const connect = () => {
    // 构建完整的 WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = url.startsWith('/') ? `${protocol}//${window.location.host}${url}` : url

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionStatus('connected')
      reconnectAttempts.current = 0
      console.log('[WebSocket] Connected')
    }

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const message = JSON.parse(event.data) as ReceivedWSMessage
        setLastMessage(message)
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error)
      }
    }

    ws.onclose = () => {
      setConnectionStatus('disconnected')
      console.log('[WebSocket] Disconnected')

      // 自动重连
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++
          connect()
        }, delay)
      }
    }

    ws.onerror = () => {
      setConnectionStatus('error')
      console.error('[WebSocket] Connection error')
    }
  }

  // 初始化连接
  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [url])

  // 发送消息
  // React Compiler 会自动优化此函数
  const sendMessage = (message: SentWSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('[WebSocket] Cannot send message: not connected')
    }
  }

  return {
    sendMessage,
    lastMessage,
    connectionStatus,
  }
}
