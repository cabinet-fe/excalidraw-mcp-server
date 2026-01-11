import type { WSContext } from 'hono/ws'
import type {
  ExcalidrawElement,
  ToastMessage,
  ExportFormat,
  AnyWSMessage,
  SetActiveToolMessage,
  ToggleSidebarMessage,
  SetToastMessage,
  RefreshMessage,
  ScrollToMessage,
  UndoMessage,
  RedoMessage,
  HistoryClearMessage,
  ExportRequestMessage,
  SceneSyncMessage,
  ResetMessage,
  SceneData,
} from '../types'

/** 导出结果 */
export interface ExportResult {
  data: string
  mimeType: string
}

/** 待处理的导出请求 */
interface PendingExportRequest {
  resolve: (result: ExportResult) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

/**
 * 命令服务
 * 通过 WebSocket 向前端发送 UI 控制命令
 * 支持按场景房间广播
 */
export class CommandService {
  /** 场景房间映射：sceneId -> 客户端集合 */
  private rooms: Map<string, Set<WSContext>> = new Map()

  /** 客户端所在房间映射：ws -> sceneId */
  private clientRooms: Map<WSContext, string> = new Map()

  /** 待处理的导出请求 */
  private pendingExports: Map<string, PendingExportRequest> = new Map()

  /** 导出请求超时时间（毫秒） */
  private exportTimeout = 30000

  /**
   * 客户端加入场景房间
   */
  joinRoom(sceneId: string, ws: WSContext): void {
    // 先离开之前的房间
    this.leaveCurrentRoom(ws)

    // 加入新房间
    let room = this.rooms.get(sceneId)
    if (!room) {
      room = new Set()
      this.rooms.set(sceneId, room)
    }
    room.add(ws)
    this.clientRooms.set(ws, sceneId)

    console.log(`[CommandService] Client joined room: ${sceneId}, room size: ${room.size}`)
  }

  /**
   * 客户端离开当前房间
   */
  leaveCurrentRoom(ws: WSContext): void {
    const currentRoom = this.clientRooms.get(ws)
    if (currentRoom) {
      const room = this.rooms.get(currentRoom)
      if (room) {
        room.delete(ws)
        if (room.size === 0) {
          this.rooms.delete(currentRoom)
        }
      }
      this.clientRooms.delete(ws)
      console.log(`[CommandService] Client left room: ${currentRoom}`)
    }
  }

  /**
   * 注销 WebSocket 客户端（断开连接时调用）
   */
  unregisterClient(ws: WSContext): void {
    this.leaveCurrentRoom(ws)
  }

  /**
   * 获取客户端所在的房间 ID
   */
  getClientRoom(ws: WSContext): string | undefined {
    return this.clientRooms.get(ws)
  }

  /**
   * 获取已连接的客户端数量（所有房间）
   */
  getClientCount(): number {
    let count = 0
    for (const room of this.rooms.values()) {
      count += room.size
    }
    return count
  }

  /**
   * 获取指定房间的客户端数量
   */
  getRoomClientCount(sceneId: string): number {
    return this.rooms.get(sceneId)?.size ?? 0
  }

  /**
   * 广播消息给指定房间的所有客户端
   */
  broadcastToRoom(sceneId: string, message: AnyWSMessage, exclude?: WSContext): void {
    const room = this.rooms.get(sceneId)
    if (!room) return

    const data = JSON.stringify(message)
    for (const client of room) {
      if (client !== exclude) {
        client.send(data)
      }
    }
  }

  /**
   * 广播消息给所有客户端（跨房间）
   */
  broadcast(message: AnyWSMessage): void {
    const data = JSON.stringify(message)
    for (const room of this.rooms.values()) {
      for (const client of room) {
        client.send(data)
      }
    }
  }

  /**
   * 同步场景到指定房间的所有客户端
   */
  syncSceneToRoom(sceneId: string, scene: SceneData, exclude?: WSContext): void {
    const message: SceneSyncMessage = {
      type: 'scene_sync',
      payload: scene,
    }
    this.broadcastToRoom(sceneId, message, exclude)
  }

  /**
   * 重置指定房间的场景
   */
  resetSceneInRoom(sceneId: string): void {
    const message: ResetMessage = {
      type: 'reset',
    }
    this.broadcastToRoom(sceneId, message)
  }

  /**
   * 滚动到指定内容（房间内广播）
   */
  scrollToContent(sceneId: string, target: ExcalidrawElement | readonly ExcalidrawElement[]): void {
    const message: ScrollToMessage = {
      type: 'scroll_to',
      payload: { target },
    }
    this.broadcastToRoom(sceneId, message)
  }

  /**
   * 设置活动工具（房间内广播）
   */
  setActiveTool(sceneId: string, tool: string, options?: Record<string, unknown>): void {
    const message: SetActiveToolMessage = {
      type: 'set_active_tool',
      payload: { tool, options },
    }
    this.broadcastToRoom(sceneId, message)
  }

  /**
   * 切换侧边栏（房间内广播）
   */
  toggleSidebar(sceneId: string, name: string, open?: boolean): void {
    const message: ToggleSidebarMessage = {
      type: 'toggle_sidebar',
      payload: { name, open },
    }
    this.broadcastToRoom(sceneId, message)
  }

  /**
   * 设置 Toast 消息（房间内广播）
   */
  setToast(sceneId: string, toast: ToastMessage | null): void {
    const message: SetToastMessage = {
      type: 'set_toast',
      payload: toast,
    }
    this.broadcastToRoom(sceneId, message)
  }

  /**
   * 刷新画布（房间内广播）
   */
  refresh(sceneId: string): void {
    const message: RefreshMessage = {
      type: 'refresh',
    }
    this.broadcastToRoom(sceneId, message)
  }

  /**
   * 撤销（房间内广播）
   */
  undo(sceneId: string): void {
    const message: UndoMessage = {
      type: 'undo',
    }
    this.broadcastToRoom(sceneId, message)
  }

  /**
   * 重做（房间内广播）
   */
  redo(sceneId: string): void {
    const message: RedoMessage = {
      type: 'redo',
    }
    this.broadcastToRoom(sceneId, message)
  }

  /**
   * 清空历史记录（房间内广播）
   */
  clearHistory(sceneId: string): void {
    const message: HistoryClearMessage = {
      type: 'history_clear',
    }
    this.broadcastToRoom(sceneId, message)
  }

  /**
   * 请求导出（向房间内第一个客户端请求）
   */
  async requestExport(sceneId: string, format: ExportFormat): Promise<ExportResult> {
    const room = this.rooms.get(sceneId)
    if (!room || room.size === 0) {
      throw new Error(`No connected clients in room: ${sceneId}`)
    }

    const requestId = crypto.randomUUID()

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingExports.delete(requestId)
        reject(new Error('Export request timed out'))
      }, this.exportTimeout)

      this.pendingExports.set(requestId, { resolve, reject, timeout })

      const message: ExportRequestMessage = {
        type: 'export_request',
        payload: { format, requestId },
      }
      this.broadcastToRoom(sceneId, message)
    })
  }

  /**
   * 处理导出响应
   */
  handleExportResponse(requestId: string, data: string, mimeType: string): void {
    const pending = this.pendingExports.get(requestId)
    if (!pending) return

    clearTimeout(pending.timeout)
    this.pendingExports.delete(requestId)
    pending.resolve({ data, mimeType })
  }

  /**
   * 取消所有待处理的导出请求
   */
  cancelAllExports(): void {
    for (const [requestId, pending] of this.pendingExports) {
      clearTimeout(pending.timeout)
      pending.reject(new Error('Export cancelled'))
      this.pendingExports.delete(requestId)
    }
  }
}

/** 全局命令服务实例 */
export const commandService = new CommandService()
