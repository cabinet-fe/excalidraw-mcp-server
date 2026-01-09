/**
 * 前端类型定义
 * 与后端类型保持同步
 */

// ============================================================================
// 基础类型
// ============================================================================

/** Excalidraw 元素类型 */
export type ElementType =
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'text'
  | 'image'
  | 'frame'
  | 'group'

/** 填充样式 */
export type FillStyle = 'hachure' | 'cross-hatch' | 'solid'

/** Toast 消息 */
export interface ToastMessage {
  message: string
  closable?: boolean
  duration?: number
}

/** 导出格式 */
export type ExportFormat = 'svg' | 'png' | 'json'

// ============================================================================
// WebSocket 消息类型
// ============================================================================

/** WebSocket 消息类型 */
export type WSMessageType =
  | 'scene_sync'
  | 'scene_update'
  | 'element_update'
  | 'reset'
  | 'scroll_to'
  | 'set_active_tool'
  | 'toggle_sidebar'
  | 'set_toast'
  | 'refresh'
  | 'undo'
  | 'redo'
  | 'history_clear'
  | 'export_request'
  | 'export_response'
  | 'ping'
  | 'pong'

/** WebSocket 消息基础接口 */
export interface WSMessage<T extends WSMessageType = WSMessageType, P = unknown> {
  type: T
  payload?: P
}

/** 场景数据 */
export interface SceneData {
  elements: readonly unknown[]
  appState: Record<string, unknown>
  files: Record<string, unknown>
}

/** 场景同步消息 */
export interface SceneSyncPayload extends SceneData {}

/** 元素更新消息 */
export interface ElementUpdatePayload {
  elements: readonly unknown[]
}

/** 滚动到内容消息 */
export interface ScrollToPayload {
  target: unknown | readonly unknown[]
}

/** 设置活动工具消息 */
export interface SetActiveToolPayload {
  tool: string
  options?: Record<string, unknown>
}

/** 切换侧边栏消息 */
export interface ToggleSidebarPayload {
  name: string
  open?: boolean
}

/** 导出请求消息 */
export interface ExportRequestPayload {
  format: ExportFormat
  requestId: string
}

/** 导出响应消息 */
export interface ExportResponsePayload {
  requestId: string
  data: string
  mimeType: string
}

/** 接收的 WebSocket 消息类型 */
export type ReceivedWSMessage =
  | WSMessage<'scene_sync', SceneSyncPayload>
  | WSMessage<'element_update', ElementUpdatePayload>
  | WSMessage<'scroll_to', ScrollToPayload>
  | WSMessage<'reset'>
  | WSMessage<'refresh'>
  | WSMessage<'set_active_tool', SetActiveToolPayload>
  | WSMessage<'toggle_sidebar', ToggleSidebarPayload>
  | WSMessage<'set_toast', ToastMessage | null>
  | WSMessage<'undo'>
  | WSMessage<'redo'>
  | WSMessage<'history_clear'>
  | WSMessage<'export_request', ExportRequestPayload>
  | WSMessage<'pong'>

/** 发送的 WebSocket 消息类型 */
export type SentWSMessage =
  | WSMessage<'scene_update', Partial<SceneData>>
  | WSMessage<'export_response', ExportResponsePayload>
  | WSMessage<'ping'>
