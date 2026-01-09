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
 */
export class CommandService {
  /** WebSocket 客户端集合 */
  private wsClients: Set<WSContext> = new Set()

  /** 待处理的导出请求 */
  private pendingExports: Map<string, PendingExportRequest> = new Map()

  /** 导出请求超时时间（毫秒） */
  private exportTimeout = 30000

  /**
   * 注册 WebSocket 客户端
   */
  registerClient(ws: WSContext): void {
    this.wsClients.add(ws)
  }

  /**
   * 注销 WebSocket 客户端
   */
  unregisterClient(ws: WSContext): void {
    this.wsClients.delete(ws)
  }

  /**
   * 获取已连接的客户端数量
   */
  getClientCount(): number {
    return this.wsClients.size
  }

  /**
   * 广播消息给所有客户端
   */
  broadcast(message: AnyWSMessage): void {
    const data = JSON.stringify(message)
    for (const client of this.wsClients) {
      client.send(data)
    }
  }

  /**
   * 同步场景到所有客户端
   */
  syncScene(scene: SceneData): void {
    const message: SceneSyncMessage = {
      type: 'scene_sync',
      payload: scene,
    }
    this.broadcast(message)
  }

  /**
   * 重置场景
   */
  resetScene(): void {
    const message: ResetMessage = {
      type: 'reset',
    }
    this.broadcast(message)
  }

  /**
   * 滚动到指定内容
   */
  scrollToContent(target: ExcalidrawElement | readonly ExcalidrawElement[]): void {
    const message: ScrollToMessage = {
      type: 'scroll_to',
      payload: { target },
    }
    this.broadcast(message)
  }

  /**
   * 设置活动工具
   */
  setActiveTool(tool: string, options?: Record<string, unknown>): void {
    const message: SetActiveToolMessage = {
      type: 'set_active_tool',
      payload: { tool, options },
    }
    this.broadcast(message)
  }

  /**
   * 切换侧边栏
   */
  toggleSidebar(name: string, open?: boolean): void {
    const message: ToggleSidebarMessage = {
      type: 'toggle_sidebar',
      payload: { name, open },
    }
    this.broadcast(message)
  }

  /**
   * 设置 Toast 消息
   */
  setToast(toast: ToastMessage | null): void {
    const message: SetToastMessage = {
      type: 'set_toast',
      payload: toast,
    }
    this.broadcast(message)
  }

  /**
   * 刷新画布
   */
  refresh(): void {
    const message: RefreshMessage = {
      type: 'refresh',
    }
    this.broadcast(message)
  }

  /**
   * 撤销
   */
  undo(): void {
    const message: UndoMessage = {
      type: 'undo',
    }
    this.broadcast(message)
  }

  /**
   * 重做
   */
  redo(): void {
    const message: RedoMessage = {
      type: 'redo',
    }
    this.broadcast(message)
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    const message: HistoryClearMessage = {
      type: 'history_clear',
    }
    this.broadcast(message)
  }

  /**
   * 请求导出
   * @param format 导出格式
   * @returns 导出结果
   */
  async requestExport(format: ExportFormat): Promise<ExportResult> {
    if (this.wsClients.size === 0) {
      throw new Error('No connected clients')
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
      this.broadcast(message)
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
