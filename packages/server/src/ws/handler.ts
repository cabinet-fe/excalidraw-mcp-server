import type { WSContext, WSEvents } from 'hono/ws'
import type { SceneService } from '../services/scene-service'
import type { CommandService } from '../services/command-service'
import type {
  AnyWSMessage,
  SceneUpdateMessage,
  ExportResponseMessage,
  JoinMessage,
  LeaveMessage,
} from '../types'

/** WebSocket 处理器依赖 */
export interface WebSocketHandlerDependencies {
  sceneService: SceneService
  commandService: CommandService
}

/**
 * 创建 WebSocket 处理器
 * 处理客户端连接和消息，实现按场景房间的实时双向同步
 */
export function createWebSocketHandler(deps: WebSocketHandlerDependencies): () => WSEvents {
  const { sceneService, commandService } = deps

  return function handler(): WSEvents {
    let wsContext: WSContext | null = null

    return {
      onOpen(_event: Event, ws: WSContext) {
        wsContext = ws
        const stats = commandService.getRoomStats()
        console.log(`[WS] Client connected, total connections: ${stats.totalClients + 1}`)
        // 客户端连接后需要发送 join 消息来加入房间
      },

      onMessage(event: MessageEvent, ws: WSContext) {
        try {
          const data = typeof event.data === 'string' ? event.data : event.data.toString()
          const message = JSON.parse(data) as AnyWSMessage

          switch (message.type) {
            case 'join': {
              // 客户端加入场景房间
              const payload = (message as JoinMessage).payload
              commandService.joinRoom(payload.sceneId, ws)

              // 如果服务器有该场景的缓存，发送给客户端
              const cachedScene = sceneService.getScene(payload.sceneId)
              if (cachedScene) {
                ws.send(JSON.stringify({
                  type: 'scene_sync',
                  payload: cachedScene,
                }))
              }
              break
            }

            case 'leave': {
              // 客户端离开场景房间
              const payload = (message as LeaveMessage).payload
              // 只是记录日志，实际离开由 commandService 处理
              console.log(`[WS] Client leaving room: ${payload.sceneId}`)
              commandService.leaveCurrentRoom(ws)
              break
            }

            case 'scene_update': {
              // 来自前端的场景更新
              const payload = (message as SceneUpdateMessage).payload
              const { sceneId, ...sceneData } = payload

              // 更新服务器缓存
              sceneService.updateScene(sceneId, sceneData)

              // 广播给同房间的其他客户端
              commandService.syncSceneToRoom(sceneId, {
                elements: sceneData.elements ?? [],
                appState: sceneData.appState ?? {},
                files: sceneData.files ?? {},
              }, ws)
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
        if (wsContext) {
          commandService.unregisterClient(wsContext)
          wsContext = null
        }
        const stats = commandService.getRoomStats()
        console.log(`[WS] Client disconnected, remaining connections: ${stats.totalClients}`)
      },

      onError(event: Event) {
        console.error('[WS] Error:', event)
      },
    }
  }
}
