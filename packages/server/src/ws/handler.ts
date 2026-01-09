import type { WSContext, WSEvents } from 'hono/ws'
import type { SceneService } from '../services/scene-service'
import type { CommandService } from '../services/command-service'
import type {
  AnyWSMessage,
  SceneUpdateMessage,
  ExportResponseMessage,
} from '../types'

/** WebSocket 处理器依赖 */
export interface WebSocketHandlerDependencies {
  sceneService: SceneService
  commandService: CommandService
}

/**
 * 创建 WebSocket 处理器
 * 处理客户端连接和消息，实现实时双向同步
 */
export function createWebSocketHandler(deps: WebSocketHandlerDependencies): () => WSEvents {
  const { sceneService, commandService } = deps

  return function handler(): WSEvents {
    let unsubscribe: (() => void) | null = null
    let wsContext: WSContext | null = null

    return {
      onOpen(_event: Event, ws: WSContext) {
        console.log('[WS] Client connected')
        wsContext = ws

        // 注册到命令服务
        commandService.registerClient(ws)

        // 发送当前场景给新连接的客户端
        const scene = sceneService.getScene()
        ws.send(JSON.stringify({
          type: 'scene_sync',
          payload: scene,
        }))

        // 订阅场景变更，推送给客户端
        // 注意：由于 commandService 已经负责广播，这里不再需要单独订阅
        // 只有当客户端是唯一需要更新的情况下才使用
      },

      onMessage(event: MessageEvent, ws: WSContext) {
        try {
          const data = typeof event.data === 'string' ? event.data : event.data.toString()
          const message = JSON.parse(data) as AnyWSMessage

          switch (message.type) {
            case 'scene_update': {
              // 来自前端的场景更新
              const payload = (message as SceneUpdateMessage).payload
              // 不保存到历史记录，因为这是用户在前端的操作
              sceneService.updateScene(payload, false)
              break
            }

            case 'export_response': {
              // 前端导出完成的响应
              const payload = (message as ExportResponseMessage).payload
              commandService.handleExportResponse(
                payload.requestId,
                payload.data,
                payload.mimeType
              )
              break
            }

            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }))
              break

            default:
              console.warn('[WS] Unknown message type:', message.type)
          }
        } catch (error) {
          console.error('[WS] Failed to process message:', error)
        }
      },

      onClose() {
        console.log('[WS] Client disconnected')

        if (wsContext) {
          commandService.unregisterClient(wsContext)
          wsContext = null
        }

        if (unsubscribe) {
          unsubscribe()
          unsubscribe = null
        }
      },

      onError(event: Event) {
        console.error('[WS] Error:', event)
      },
    }
  }
}
