import { Hono } from 'hono'
import type { SceneService } from '../services/scene-service'
import type { LibraryService } from '../services/library-service'
import type { CommandService } from '../services/command-service'
import type {
  ExcalidrawElement,
  BinaryFiles,
  LibraryItem,
  ToastMessage,
  ExportFormat,
  SceneUpdateData,
} from '../types'

/** API 路由依赖 */
export interface ApiRouteDependencies {
  sceneService: SceneService
  libraryService: LibraryService
  commandService: CommandService
}

/**
 * 创建 API 路由
 * 提供 RESTful 接口供 MCP Server 调用
 */
export function createApiRoutes(deps: ApiRouteDependencies): Hono {
  const { sceneService, libraryService, commandService } = deps
  const api = new Hono()

  // ===========================================================================
  // 场景管理
  // ===========================================================================

  /**
   * 获取当前场景
   */
  api.get('/scene', (c) => {
    return c.json({
      success: true,
      data: sceneService.getScene(),
    })
  })

  /**
   * 获取场景元素
   */
  api.get('/elements', (c) => {
    const includeDeleted = c.req.query('includeDeleted') === 'true'
    const elements = includeDeleted
      ? sceneService.getAllElements()
      : sceneService.getElements()
    return c.json({
      success: true,
      data: elements,
    })
  })

  /**
   * 获取应用状态
   */
  api.get('/app-state', (c) => {
    return c.json({
      success: true,
      data: sceneService.getAppState(),
    })
  })

  /**
   * 获取所有文件
   */
  api.get('/files', (c) => {
    return c.json({
      success: true,
      data: sceneService.getFiles(),
    })
  })

  /**
   * 更新场景
   */
  api.post('/scene', async (c) => {
    const body = (await c.req.json()) as SceneUpdateData
    sceneService.updateScene(body)
    // 同步到所有客户端
    commandService.syncScene(sceneService.getScene())
    return c.json({ success: true })
  })

  /**
   * 重置场景
   */
  api.post('/scene/reset', (c) => {
    sceneService.resetScene()
    commandService.resetScene()
    return c.json({ success: true })
  })

  // ===========================================================================
  // 元素操作
  // ===========================================================================

  /**
   * 添加元素
   */
  api.post('/elements', async (c) => {
    const element = (await c.req.json()) as ExcalidrawElement
    sceneService.addElement(element)
    commandService.syncScene(sceneService.getScene())
    return c.json({ success: true, data: { id: element.id } })
  })

  /**
   * 批量添加元素
   */
  api.post('/elements/batch', async (c) => {
    const elements = (await c.req.json()) as ExcalidrawElement[]
    sceneService.addElements(elements)
    commandService.syncScene(sceneService.getScene())
    return c.json({ success: true, data: { count: elements.length } })
  })

  /**
   * 更新元素
   */
  api.patch('/elements/:id', async (c) => {
    const id = c.req.param('id')
    const updates = (await c.req.json()) as Partial<ExcalidrawElement>
    const success = sceneService.updateElement(id, updates)
    if (!success) {
      return c.json({ success: false, error: 'Element not found' }, 404)
    }
    commandService.syncScene(sceneService.getScene())
    return c.json({ success: true })
  })

  /**
   * 删除元素
   */
  api.delete('/elements/:id', (c) => {
    const id = c.req.param('id')
    const success = sceneService.deleteElement(id)
    if (!success) {
      return c.json({ success: false, error: 'Element not found' }, 404)
    }
    commandService.syncScene(sceneService.getScene())
    return c.json({ success: true })
  })

  /**
   * 滚动到内容
   */
  api.post('/scroll-to', async (c) => {
    const body = (await c.req.json()) as { elementId?: string; elementIds?: string[] }

    let target: ExcalidrawElement | readonly ExcalidrawElement[]

    if (body.elementId) {
      const element = sceneService.getElementById(body.elementId)
      if (!element) {
        return c.json({ success: false, error: 'Element not found' }, 404)
      }
      target = element
    } else if (body.elementIds && body.elementIds.length > 0) {
      const elements = body.elementIds
        .map((id) => sceneService.getElementById(id))
        .filter((el): el is ExcalidrawElement => el !== undefined)
      if (elements.length === 0) {
        return c.json({ success: false, error: 'No elements found' }, 404)
      }
      target = elements
    } else {
      // 滚动到所有内容
      target = sceneService.getElements() as ExcalidrawElement[]
    }

    commandService.scrollToContent(target)
    return c.json({ success: true })
  })

  // ===========================================================================
  // 文件管理
  // ===========================================================================

  /**
   * 添加文件
   */
  api.post('/files', async (c) => {
    const files = (await c.req.json()) as BinaryFiles
    sceneService.addFiles(files)
    commandService.syncScene(sceneService.getScene())
    return c.json({ success: true })
  })

  // ===========================================================================
  // 库管理
  // ===========================================================================

  /**
   * 获取库项目
   */
  api.get('/library', (c) => {
    return c.json({
      success: true,
      data: libraryService.getItems(),
    })
  })

  /**
   * 更新库
   */
  api.post('/library', async (c) => {
    const items = (await c.req.json()) as LibraryItem[]
    libraryService.updateLibrary(items)
    return c.json({ success: true })
  })

  /**
   * 添加库项目
   */
  api.post('/library/items', async (c) => {
    const item = (await c.req.json()) as LibraryItem
    libraryService.addItem(item)
    return c.json({ success: true })
  })

  /**
   * 删除库项目
   */
  api.delete('/library/items/:id', (c) => {
    const id = c.req.param('id')
    const success = libraryService.removeItem(id)
    if (!success) {
      return c.json({ success: false, error: 'Library item not found' }, 404)
    }
    return c.json({ success: true })
  })

  // ===========================================================================
  // 历史记录
  // ===========================================================================

  /**
   * 获取历史记录状态
   */
  api.get('/history', (c) => {
    return c.json({
      success: true,
      data: sceneService.getHistoryState(),
    })
  })

  /**
   * 撤销
   */
  api.post('/undo', (c) => {
    const success = sceneService.undo()
    if (success) {
      commandService.syncScene(sceneService.getScene())
    }
    return c.json({ success })
  })

  /**
   * 重做
   */
  api.post('/redo', (c) => {
    const success = sceneService.redo()
    if (success) {
      commandService.syncScene(sceneService.getScene())
    }
    return c.json({ success })
  })

  /**
   * 清空历史记录
   */
  api.post('/history/clear', (c) => {
    sceneService.clearHistory()
    commandService.clearHistory()
    return c.json({ success: true })
  })

  // ===========================================================================
  // UI 控制
  // ===========================================================================

  /**
   * 设置活动工具
   */
  api.post('/command/set-active-tool', async (c) => {
    const body = (await c.req.json()) as { tool: string; options?: Record<string, unknown> }
    commandService.setActiveTool(body.tool, body.options)
    return c.json({ success: true })
  })

  /**
   * 切换侧边栏
   */
  api.post('/command/toggle-sidebar', async (c) => {
    const body = (await c.req.json()) as { name: string; open?: boolean }
    commandService.toggleSidebar(body.name, body.open)
    return c.json({ success: true })
  })

  /**
   * 设置 Toast 消息
   */
  api.post('/command/set-toast', async (c) => {
    const body = (await c.req.json()) as ToastMessage | null
    commandService.setToast(body)
    return c.json({ success: true })
  })

  /**
   * 刷新画布
   */
  api.post('/command/refresh', (c) => {
    commandService.refresh()
    return c.json({ success: true })
  })

  // ===========================================================================
  // 导出功能
  // ===========================================================================

  /**
   * 导出为 JSON
   */
  api.get('/export/json', (c) => {
    const scene = sceneService.getScene()
    return c.json({
      success: true,
      data: scene,
    })
  })

  /**
   * 导出为 SVG
   */
  api.post('/export/svg', async (c) => {
    try {
      const result = await commandService.requestExport('svg')
      return c.json({
        success: true,
        data: result,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed'
      return c.json({ success: false, error: message }, 500)
    }
  })

  /**
   * 导出为 PNG
   */
  api.post('/export/png', async (c) => {
    try {
      const result = await commandService.requestExport('png')
      return c.json({
        success: true,
        data: result,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed'
      return c.json({ success: false, error: message }, 500)
    }
  })

  /**
   * 通用导出端点
   */
  api.post('/export/:format', async (c) => {
    const format = c.req.param('format') as ExportFormat
    if (!['svg', 'png', 'json'].includes(format)) {
      return c.json({ success: false, error: 'Invalid export format' }, 400)
    }

    if (format === 'json') {
      return c.json({
        success: true,
        data: sceneService.getScene(),
      })
    }

    try {
      const result = await commandService.requestExport(format)
      return c.json({
        success: true,
        data: result,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed'
      return c.json({ success: false, error: message }, 500)
    }
  })

  return api
}
