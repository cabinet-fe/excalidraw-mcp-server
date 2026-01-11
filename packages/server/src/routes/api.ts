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
 * 所有场景相关接口都需要 sceneId 参数
 */
export function createApiRoutes(deps: ApiRouteDependencies): Hono {
  const { sceneService, libraryService, commandService } = deps
  const api = new Hono()

  // ===========================================================================
  // 场景管理 - 所有接口都需要 sceneId
  // ===========================================================================

  /**
   * 获取场景
   */
  api.get('/scene/:sceneId', (c) => {
    const sceneId = c.req.param('sceneId')
    const scene = sceneService.getScene(sceneId)
    if (!scene) {
      return c.json({
        success: true,
        data: {
          elements: [],
          appState: { viewBackgroundColor: '#ffffff' },
          files: {},
        },
      })
    }
    return c.json({
      success: true,
      data: scene,
    })
  })

  /**
   * 获取场景元素
   */
  api.get('/scene/:sceneId/elements', (c) => {
    const sceneId = c.req.param('sceneId')
    const includeDeleted = c.req.query('includeDeleted') === 'true'
    const elements = includeDeleted
      ? sceneService.getAllElements(sceneId)
      : sceneService.getElements(sceneId)
    return c.json({
      success: true,
      data: elements,
    })
  })

  /**
   * 获取应用状态
   */
  api.get('/scene/:sceneId/app-state', (c) => {
    const sceneId = c.req.param('sceneId')
    return c.json({
      success: true,
      data: sceneService.getAppState(sceneId),
    })
  })

  /**
   * 获取所有文件
   */
  api.get('/scene/:sceneId/files', (c) => {
    const sceneId = c.req.param('sceneId')
    return c.json({
      success: true,
      data: sceneService.getFiles(sceneId),
    })
  })

  /**
   * 更新场景
   */
  api.post('/scene/:sceneId', async (c) => {
    const sceneId = c.req.param('sceneId')
    const body = (await c.req.json()) as SceneUpdateData
    sceneService.updateScene(sceneId, body)
    // 同步到房间内的所有客户端
    const scene = sceneService.getScene(sceneId)
    if (scene) {
      commandService.syncSceneToRoom(sceneId, scene)
    }
    return c.json({ success: true })
  })

  /**
   * 重置场景
   */
  api.post('/scene/:sceneId/reset', (c) => {
    const sceneId = c.req.param('sceneId')
    sceneService.resetScene(sceneId)
    commandService.resetSceneInRoom(sceneId)
    return c.json({ success: true })
  })

  // ===========================================================================
  // 元素操作
  // ===========================================================================

  /**
   * 添加元素
   */
  api.post('/scene/:sceneId/elements', async (c) => {
    const sceneId = c.req.param('sceneId')
    const element = (await c.req.json()) as ExcalidrawElement
    sceneService.addElement(sceneId, element)
    const scene = sceneService.getScene(sceneId)
    if (scene) {
      commandService.syncSceneToRoom(sceneId, scene)
    }
    return c.json({ success: true, data: { id: element.id } })
  })

  /**
   * 批量添加元素
   */
  api.post('/scene/:sceneId/elements/batch', async (c) => {
    const sceneId = c.req.param('sceneId')
    const elements = (await c.req.json()) as ExcalidrawElement[]
    sceneService.addElements(sceneId, elements)
    const scene = sceneService.getScene(sceneId)
    if (scene) {
      commandService.syncSceneToRoom(sceneId, scene)
    }
    return c.json({ success: true, data: { count: elements.length } })
  })

  /**
   * 更新元素
   */
  api.patch('/scene/:sceneId/elements/:elementId', async (c) => {
    const sceneId = c.req.param('sceneId')
    const elementId = c.req.param('elementId')
    const updates = (await c.req.json()) as Partial<ExcalidrawElement>
    const success = sceneService.updateElement(sceneId, elementId, updates)
    if (!success) {
      return c.json({ success: false, error: 'Element not found' }, 404)
    }
    const scene = sceneService.getScene(sceneId)
    if (scene) {
      commandService.syncSceneToRoom(sceneId, scene)
    }
    return c.json({ success: true })
  })

  /**
   * 删除元素
   */
  api.delete('/scene/:sceneId/elements/:elementId', (c) => {
    const sceneId = c.req.param('sceneId')
    const elementId = c.req.param('elementId')
    const success = sceneService.deleteElement(sceneId, elementId)
    if (!success) {
      return c.json({ success: false, error: 'Element not found' }, 404)
    }
    const scene = sceneService.getScene(sceneId)
    if (scene) {
      commandService.syncSceneToRoom(sceneId, scene)
    }
    return c.json({ success: true })
  })

  /**
   * 滚动到内容
   */
  api.post('/scene/:sceneId/scroll-to', async (c) => {
    const sceneId = c.req.param('sceneId')
    const body = (await c.req.json()) as { elementId?: string; elementIds?: string[] }

    let target: ExcalidrawElement | readonly ExcalidrawElement[]

    if (body.elementId) {
      const element = sceneService.getElementById(sceneId, body.elementId)
      if (!element) {
        return c.json({ success: false, error: 'Element not found' }, 404)
      }
      target = element
    } else if (body.elementIds && body.elementIds.length > 0) {
      const elements = body.elementIds
        .map((id) => sceneService.getElementById(sceneId, id))
        .filter((el): el is ExcalidrawElement => el !== undefined)
      if (elements.length === 0) {
        return c.json({ success: false, error: 'No elements found' }, 404)
      }
      target = elements
    } else {
      // 滚动到所有内容
      target = sceneService.getElements(sceneId) as ExcalidrawElement[]
    }

    commandService.scrollToContent(sceneId, target)
    return c.json({ success: true })
  })

  // ===========================================================================
  // 文件管理
  // ===========================================================================

  /**
   * 添加文件
   */
  api.post('/scene/:sceneId/files', async (c) => {
    const sceneId = c.req.param('sceneId')
    const files = (await c.req.json()) as BinaryFiles
    sceneService.addFiles(sceneId, files)
    const scene = sceneService.getScene(sceneId)
    if (scene) {
      commandService.syncSceneToRoom(sceneId, scene)
    }
    return c.json({ success: true })
  })

  // ===========================================================================
  // 库管理 - 库是全局的，不需要 sceneId
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
  // UI 控制
  // ===========================================================================

  /**
   * 设置活动工具
   */
  api.post('/scene/:sceneId/command/set-active-tool', async (c) => {
    const sceneId = c.req.param('sceneId')
    const body = (await c.req.json()) as { tool: string; options?: Record<string, unknown> }
    commandService.setActiveTool(sceneId, body.tool, body.options)
    return c.json({ success: true })
  })

  /**
   * 切换侧边栏
   */
  api.post('/scene/:sceneId/command/toggle-sidebar', async (c) => {
    const sceneId = c.req.param('sceneId')
    const body = (await c.req.json()) as { name: string; open?: boolean }
    commandService.toggleSidebar(sceneId, body.name, body.open)
    return c.json({ success: true })
  })

  /**
   * 设置 Toast 消息
   */
  api.post('/scene/:sceneId/command/set-toast', async (c) => {
    const sceneId = c.req.param('sceneId')
    const body = (await c.req.json()) as ToastMessage | null
    commandService.setToast(sceneId, body)
    return c.json({ success: true })
  })

  /**
   * 刷新画布
   */
  api.post('/scene/:sceneId/command/refresh', (c) => {
    const sceneId = c.req.param('sceneId')
    commandService.refresh(sceneId)
    return c.json({ success: true })
  })

  /**
   * 撤销
   */
  api.post('/scene/:sceneId/undo', (c) => {
    const sceneId = c.req.param('sceneId')
    commandService.undo(sceneId)
    return c.json({ success: true })
  })

  /**
   * 重做
   */
  api.post('/scene/:sceneId/redo', (c) => {
    const sceneId = c.req.param('sceneId')
    commandService.redo(sceneId)
    return c.json({ success: true })
  })

  /**
   * 清空历史记录
   */
  api.post('/scene/:sceneId/history/clear', (c) => {
    const sceneId = c.req.param('sceneId')
    commandService.clearHistory(sceneId)
    return c.json({ success: true })
  })

  // ===========================================================================
  // 导出功能
  // ===========================================================================

  /**
   * 导出为 JSON
   */
  api.get('/scene/:sceneId/export/json', (c) => {
    const sceneId = c.req.param('sceneId')
    const scene = sceneService.getScene(sceneId)
    return c.json({
      success: true,
      data: scene ?? {
        elements: [],
        appState: { viewBackgroundColor: '#ffffff' },
        files: {},
      },
    })
  })

  /**
   * 导出为 SVG
   */
  api.post('/scene/:sceneId/export/svg', async (c) => {
    const sceneId = c.req.param('sceneId')
    try {
      const result = await commandService.requestExport(sceneId, 'svg')
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
  api.post('/scene/:sceneId/export/png', async (c) => {
    const sceneId = c.req.param('sceneId')
    try {
      const result = await commandService.requestExport(sceneId, 'png')
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
  api.post('/scene/:sceneId/export/:format', async (c) => {
    const sceneId = c.req.param('sceneId')
    const format = c.req.param('format') as ExportFormat
    if (!['svg', 'png', 'json'].includes(format)) {
      return c.json({ success: false, error: 'Invalid export format' }, 400)
    }

    if (format === 'json') {
      const scene = sceneService.getScene(sceneId)
      return c.json({
        success: true,
        data: scene ?? {
          elements: [],
          appState: { viewBackgroundColor: '#ffffff' },
          files: {},
        },
      })
    }

    try {
      const result = await commandService.requestExport(sceneId, format)
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
