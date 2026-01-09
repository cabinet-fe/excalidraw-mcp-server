import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type {
  ReceivedWSMessage,
  SceneSyncPayload,
  ElementUpdatePayload,
  ScrollToPayload,
  SetActiveToolPayload,
  ToggleSidebarPayload,
  ExportRequestPayload,
  ToastMessage,
} from '../types'
import { exportToSvg, exportToPng } from '../services/export-service'

/** 消息处理器返回类型 */
export interface MessageHandler {
  handleMessage: (message: ReceivedWSMessage) => Promise<void>
}

/** 消息处理器依赖 */
export interface MessageHandlerDependencies {
  api: ExcalidrawImperativeAPI
  sendMessage: (message: unknown) => void
}

/**
 * 创建消息处理器
 */
export function createMessageHandler(deps: MessageHandlerDependencies): MessageHandler {
  const { api, sendMessage } = deps

  const handlers: Record<string, (payload?: unknown) => void | Promise<void>> = {
    /**
     * 场景同步
     */
    scene_sync: (payload: unknown) => {
      const data = payload as SceneSyncPayload
      api.updateScene({
        elements: data.elements as Parameters<typeof api.updateScene>[0]['elements'],
        appState: data.appState as Parameters<typeof api.updateScene>[0]['appState'],
      })
      if (data.files && Object.keys(data.files).length > 0) {
        api.addFiles(Object.values(data.files) as Parameters<typeof api.addFiles>[0])
      }
    },

    /**
     * 元素更新
     */
    element_update: (payload: unknown) => {
      const data = payload as ElementUpdatePayload
      api.updateScene({
        elements: data.elements as Parameters<typeof api.updateScene>[0]['elements'],
      })
    },

    /**
     * 滚动到内容
     */
    scroll_to: (payload: unknown) => {
      const data = payload as ScrollToPayload
      api.scrollToContent(data.target as Parameters<typeof api.scrollToContent>[0])
    },

    /**
     * 重置场景
     */
    reset: () => {
      api.resetScene()
    },

    /**
     * 刷新画布
     */
    refresh: () => {
      api.refresh()
    },

    /**
     * 设置活动工具
     */
    set_active_tool: (payload: unknown) => {
      const data = payload as SetActiveToolPayload
      api.setActiveTool({
        type: data.tool,
        ...data.options,
      } as Parameters<typeof api.setActiveTool>[0])
    },

    /**
     * 切换侧边栏
     */
    toggle_sidebar: (payload: unknown) => {
      const data = payload as ToggleSidebarPayload
      api.toggleSidebar({
        name: data.name,
        force: data.open,
      })
    },

    /**
     * 设置 Toast 消息
     */
    set_toast: (payload: unknown) => {
      const data = payload as ToastMessage | null
      if (data) {
        api.setToast({
          message: data.message,
          closable: data.closable ?? true,
          duration: data.duration ?? 3000,
        })
      } else {
        api.setToast(null)
      }
    },

    /**
     * 撤销
     */
    undo: () => {
      // Excalidraw API 的 history 对象
      const history = api.history as { undo?: () => void; redo?: () => void; clear?: () => void } | undefined
      if (history?.undo) {
        history.undo()
      }
    },

    /**
     * 重做
     */
    redo: () => {
      // Excalidraw API 的 history 对象
      const history = api.history as { undo?: () => void; redo?: () => void; clear?: () => void } | undefined
      if (history?.redo) {
        history.redo()
      }
    },

    /**
     * 清空历史记录
     */
    history_clear: () => {
      const history = api.history as { undo?: () => void; redo?: () => void; clear?: () => void } | undefined
      if (history?.clear) {
        history.clear()
      }
    },

    /**
     * 导出请求
     */
    export_request: async (payload: unknown) => {
      const data = payload as ExportRequestPayload
      let result: string
      let mimeType: string

      try {
        if (data.format === 'svg') {
          result = await exportToSvg(api)
          mimeType = 'image/svg+xml'
        } else if (data.format === 'png') {
          const blob = await exportToPng(api)
          result = await blobToBase64(blob)
          mimeType = 'image/png'
        } else {
          // JSON
          const scene = {
            elements: api.getSceneElements(),
            appState: api.getAppState(),
            files: api.getFiles(),
          }
          result = JSON.stringify(scene)
          mimeType = 'application/json'
        }

        sendMessage({
          type: 'export_response',
          payload: {
            requestId: data.requestId,
            data: result,
            mimeType,
          },
        })
      } catch (error) {
        console.error('[Export] Failed:', error)
        sendMessage({
          type: 'export_response',
          payload: {
            requestId: data.requestId,
            data: '',
            mimeType: 'application/json',
          },
        })
      }
    },
  }

  return {
    handleMessage: async (message: ReceivedWSMessage) => {
      const handler = handlers[message.type]
      if (handler) {
        await handler(message.payload)
      } else {
        console.warn('[MessageHandler] Unknown message type:', message.type)
      }
    },
  }
}

/**
 * 将 Blob 转换为 Base64 字符串
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // 移除 data URL 前缀，只保留 base64 部分
      const base64 = result.split(',')[1] ?? ''
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
