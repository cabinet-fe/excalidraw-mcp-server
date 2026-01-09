/**
 * API 响应类型
 */
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 场景数据
 */
interface SceneData {
  elements: readonly unknown[]
  appState: Record<string, unknown>
  files: Record<string, unknown>
}

/**
 * 库项目
 */
interface LibraryItem {
  id: string
  status: 'published' | 'unpublished'
  elements: readonly unknown[]
  name: string
  created: number
}

/**
 * 历史记录状态
 */
interface HistoryState {
  canUndo: boolean
  canRedo: boolean
  undoCount: number
  redoCount: number
}

/**
 * 导出结果
 */
interface ExportResult {
  data: string
  mimeType: string
}

/**
 * Excalidraw 后端服务客户端
 * 封装与后端 API 的通信逻辑
 */
export class ExcalidrawClient {
  private baseUrl: string

  constructor(serverUrl: string) {
    // 移除末尾的斜杠
    this.baseUrl = serverUrl.replace(/\/$/, '')
  }

  // ===========================================================================
  // 通用请求方法
  // ===========================================================================

  private async request<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`)
    }

    const result = (await response.json()) as ApiResponse<T>

    if (!result.success) {
      throw new Error(result.error ?? 'Unknown error')
    }

    return result.data as T
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' })
  }

  private async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  private async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' })
  }

  // ===========================================================================
  // 健康检查
  // ===========================================================================

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      return response.ok
    } catch {
      return false
    }
  }

  // ===========================================================================
  // 场景管理
  // ===========================================================================

  /**
   * 获取当前场景
   */
  async getScene(): Promise<SceneData> {
    return this.get<SceneData>('/api/scene')
  }

  /**
   * 获取场景元素
   */
  async getElements(includeDeleted = false): Promise<readonly unknown[]> {
    const query = includeDeleted ? '?includeDeleted=true' : ''
    return this.get<readonly unknown[]>(`/api/elements${query}`)
  }

  /**
   * 获取应用状态
   */
  async getAppState(): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>('/api/app-state')
  }

  /**
   * 获取所有文件
   */
  async getFiles(): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>('/api/files')
  }

  /**
   * 更新场景
   */
  async updateScene(data: Partial<SceneData>): Promise<void> {
    await this.post('/api/scene', data)
  }

  /**
   * 重置场景
   */
  async resetScene(): Promise<void> {
    await this.post('/api/scene/reset')
  }

  // ===========================================================================
  // 元素操作
  // ===========================================================================

  /**
   * 添加元素
   */
  async addElement(element: unknown): Promise<{ id: string }> {
    return this.post<{ id: string }>('/api/elements', element)
  }

  /**
   * 批量添加元素
   */
  async addElements(elements: readonly unknown[]): Promise<{ count: number }> {
    return this.post<{ count: number }>('/api/elements/batch', elements)
  }

  /**
   * 更新元素
   */
  async updateElement(id: string, updates: unknown): Promise<void> {
    await this.patch(`/api/elements/${id}`, updates)
  }

  /**
   * 删除元素
   */
  async deleteElement(id: string): Promise<void> {
    await this.delete(`/api/elements/${id}`)
  }

  /**
   * 滚动到内容
   */
  async scrollToContent(options?: { elementId?: string; elementIds?: string[] }): Promise<void> {
    await this.post('/api/scroll-to', options ?? {})
  }

  // ===========================================================================
  // 文件管理
  // ===========================================================================

  /**
   * 添加文件
   */
  async addFiles(files: Record<string, unknown>): Promise<void> {
    await this.post('/api/files', files)
  }

  // ===========================================================================
  // 库管理
  // ===========================================================================

  /**
   * 获取库项目
   */
  async getLibrary(): Promise<readonly LibraryItem[]> {
    return this.get<readonly LibraryItem[]>('/api/library')
  }

  /**
   * 更新库
   */
  async updateLibrary(items: readonly LibraryItem[]): Promise<void> {
    await this.post('/api/library', items)
  }

  /**
   * 添加库项目
   */
  async addLibraryItem(item: LibraryItem): Promise<void> {
    await this.post('/api/library/items', item)
  }

  /**
   * 删除库项目
   */
  async removeLibraryItem(id: string): Promise<void> {
    await this.delete(`/api/library/items/${id}`)
  }

  // ===========================================================================
  // 历史记录
  // ===========================================================================

  /**
   * 获取历史记录状态
   */
  async getHistoryState(): Promise<HistoryState> {
    return this.get<HistoryState>('/api/history')
  }

  /**
   * 撤销
   */
  async undo(): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/api/undo')
    return result.success
  }

  /**
   * 重做
   */
  async redo(): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/api/redo')
    return result.success
  }

  /**
   * 清空历史记录
   */
  async clearHistory(): Promise<void> {
    await this.post('/api/history/clear')
  }

  // ===========================================================================
  // UI 控制
  // ===========================================================================

  /**
   * 设置活动工具
   */
  async setActiveTool(tool: string, options?: Record<string, unknown>): Promise<void> {
    await this.post('/api/command/set-active-tool', { tool, options })
  }

  /**
   * 切换侧边栏
   */
  async toggleSidebar(name: string, open?: boolean): Promise<void> {
    await this.post('/api/command/toggle-sidebar', { name, open })
  }

  /**
   * 设置 Toast 消息
   */
  async setToast(message: string | null, options?: { closable?: boolean; duration?: number }): Promise<void> {
    if (message === null) {
      await this.post('/api/command/set-toast', null)
    } else {
      await this.post('/api/command/set-toast', { message, ...options })
    }
  }

  /**
   * 刷新画布
   */
  async refresh(): Promise<void> {
    await this.post('/api/command/refresh')
  }

  // ===========================================================================
  // 导出功能
  // ===========================================================================

  /**
   * 导出为 JSON
   */
  async exportToJson(): Promise<SceneData> {
    return this.get<SceneData>('/api/export/json')
  }

  /**
   * 导出为 SVG
   */
  async exportToSvg(): Promise<ExportResult> {
    return this.post<ExportResult>('/api/export/svg')
  }

  /**
   * 导出为 PNG
   */
  async exportToPng(): Promise<ExportResult> {
    return this.post<ExportResult>('/api/export/png')
  }
}
