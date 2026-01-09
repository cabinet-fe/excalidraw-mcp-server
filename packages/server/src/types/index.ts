/**
 * Excalidraw MCP Server 共享类型定义
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

/** 线条样式 */
export type StrokeStyle = 'solid' | 'dashed' | 'dotted'

/** 文本对齐方式 */
export type TextAlign = 'left' | 'center' | 'right'

/** 垂直对齐方式 */
export type VerticalAlign = 'top' | 'middle' | 'bottom'

/** 圆角类型 */
export interface Roundness {
  type: 1 | 2 | 3
  value?: number
}

// ============================================================================
// Excalidraw 元素
// ============================================================================

/** Excalidraw 元素基础接口 */
export interface ExcalidrawElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  angle: number
  strokeColor: string
  backgroundColor: string
  fillStyle: FillStyle
  strokeWidth: number
  strokeStyle: StrokeStyle
  roughness: number
  opacity: number
  groupIds: readonly string[]
  frameId: string | null
  index: string
  roundness: Roundness | null
  seed: number
  version: number
  versionNonce: number
  isDeleted: boolean
  boundElements: readonly BoundElement[] | null
  updated: number
  link: string | null
  locked: boolean
}

/** 绑定元素 */
export interface BoundElement {
  id: string
  type: 'text' | 'arrow'
}

/** 文本元素 */
export interface TextElement extends ExcalidrawElement {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: number
  textAlign: TextAlign
  verticalAlign: VerticalAlign
  containerId: string | null
  originalText: string
  autoResize: boolean
  lineHeight: number
}

/** 线性元素（箭头、线条） */
export interface LinearElement extends ExcalidrawElement {
  type: 'arrow' | 'line'
  points: readonly [number, number][]
  startBinding: PointBinding | null
  endBinding: PointBinding | null
  startArrowhead: Arrowhead | null
  endArrowhead: Arrowhead | null
}

/** 点绑定 */
export interface PointBinding {
  elementId: string
  focus: number
  gap: number
}

/** 箭头类型 */
export type Arrowhead = 'arrow' | 'bar' | 'dot' | 'triangle'

/** 图片元素 */
export interface ImageElement extends ExcalidrawElement {
  type: 'image'
  fileId: string | null
  status: 'pending' | 'saved' | 'error'
  scale: [number, number]
}

/** 自由绘制元素 */
export interface FreedrawElement extends ExcalidrawElement {
  type: 'freedraw'
  points: readonly [number, number, number][]
  pressures: readonly number[]
  simulatePressure: boolean
  lastCommittedPoint: [number, number] | null
}

// ============================================================================
// 应用状态
// ============================================================================

/** 缩放信息 */
export interface Zoom {
  value: number
}

/** 应用状态 */
export interface AppState {
  viewBackgroundColor: string
  currentItemFontFamily: number
  currentItemFontSize: number
  currentItemStrokeColor: string
  currentItemBackgroundColor: string
  currentItemFillStyle: FillStyle
  currentItemStrokeWidth: number
  currentItemStrokeStyle: StrokeStyle
  currentItemRoughness: number
  currentItemOpacity: number
  currentItemEndArrowhead: Arrowhead | null
  currentItemStartArrowhead: Arrowhead | null
  zoom: Zoom
  scrollX: number
  scrollY: number
  theme: 'light' | 'dark'
  gridSize: number | null
  name: string
}

/** 部分应用状态 */
export type PartialAppState = Partial<AppState>

// ============================================================================
// 文件
// ============================================================================

/** 二进制文件数据 */
export interface BinaryFileData {
  mimeType: string
  id: string
  dataURL: string
  created: number
  lastRetrieved?: number
}

/** 二进制文件映射 */
export type BinaryFiles = Record<string, BinaryFileData>

// ============================================================================
// 场景
// ============================================================================

/** 场景数据 */
export interface SceneData {
  elements: readonly ExcalidrawElement[]
  appState: PartialAppState
  files: BinaryFiles
}

/** 场景更新数据 */
export interface SceneUpdateData {
  elements?: readonly ExcalidrawElement[]
  appState?: PartialAppState
  files?: BinaryFiles
}

// ============================================================================
// 库
// ============================================================================

/** 库项目状态 */
export type LibraryItemStatus = 'published' | 'unpublished'

/** 库项目 */
export interface LibraryItem {
  id: string
  status: LibraryItemStatus
  elements: readonly ExcalidrawElement[]
  name: string
  created: number
}

// ============================================================================
// WebSocket 消息
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

/** 场景同步消息 */
export interface SceneSyncMessage extends WSMessage<'scene_sync', SceneData> {
  type: 'scene_sync'
  payload: SceneData
}

/** 场景更新消息 */
export interface SceneUpdateMessage extends WSMessage<'scene_update', SceneUpdateData> {
  type: 'scene_update'
  payload: SceneUpdateData
}

/** 元素更新消息 */
export interface ElementUpdateMessage extends WSMessage<'element_update', { elements: readonly ExcalidrawElement[] }> {
  type: 'element_update'
  payload: { elements: readonly ExcalidrawElement[] }
}

/** 滚动到内容消息 */
export interface ScrollToMessage extends WSMessage<'scroll_to', { target: ExcalidrawElement | readonly ExcalidrawElement[] }> {
  type: 'scroll_to'
  payload: { target: ExcalidrawElement | readonly ExcalidrawElement[] }
}

/** 设置活动工具消息 */
export interface SetActiveToolMessage extends WSMessage<'set_active_tool', { tool: string; options?: Record<string, unknown> }> {
  type: 'set_active_tool'
  payload: { tool: string; options?: Record<string, unknown> }
}

/** 切换侧边栏消息 */
export interface ToggleSidebarMessage extends WSMessage<'toggle_sidebar', { name: string; open?: boolean }> {
  type: 'toggle_sidebar'
  payload: { name: string; open?: boolean }
}

/** Toast 消息 */
export interface ToastMessage {
  message: string
  closable?: boolean
  duration?: number
}

/** 设置 Toast 消息 */
export interface SetToastMessage extends WSMessage<'set_toast', ToastMessage | null> {
  type: 'set_toast'
  payload: ToastMessage | null
}

/** 导出格式 */
export type ExportFormat = 'svg' | 'png' | 'json'

/** 导出请求消息 */
export interface ExportRequestMessage extends WSMessage<'export_request', { format: ExportFormat; requestId: string }> {
  type: 'export_request'
  payload: { format: ExportFormat; requestId: string }
}

/** 导出响应消息 */
export interface ExportResponseMessage extends WSMessage<'export_response', { requestId: string; data: string; mimeType: string }> {
  type: 'export_response'
  payload: { requestId: string; data: string; mimeType: string }
}

/** 重置消息 */
export interface ResetMessage extends WSMessage<'reset'> {
  type: 'reset'
}

/** 刷新消息 */
export interface RefreshMessage extends WSMessage<'refresh'> {
  type: 'refresh'
}

/** Undo 消息 */
export interface UndoMessage extends WSMessage<'undo'> {
  type: 'undo'
}

/** Redo 消息 */
export interface RedoMessage extends WSMessage<'redo'> {
  type: 'redo'
}

/** 清空历史消息 */
export interface HistoryClearMessage extends WSMessage<'history_clear'> {
  type: 'history_clear'
}

/** Ping 消息 */
export interface PingMessage extends WSMessage<'ping'> {
  type: 'ping'
}

/** Pong 消息 */
export interface PongMessage extends WSMessage<'pong'> {
  type: 'pong'
}

/** 所有 WebSocket 消息类型联合 */
export type AnyWSMessage =
  | SceneSyncMessage
  | SceneUpdateMessage
  | ElementUpdateMessage
  | ScrollToMessage
  | SetActiveToolMessage
  | ToggleSidebarMessage
  | SetToastMessage
  | ExportRequestMessage
  | ExportResponseMessage
  | ResetMessage
  | RefreshMessage
  | UndoMessage
  | RedoMessage
  | HistoryClearMessage
  | PingMessage
  | PongMessage

// ============================================================================
// API 响应
// ============================================================================

/** API 成功响应 */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
}

/** API 错误响应 */
export interface ApiErrorResponse {
  success: false
  error: string
}

/** API 响应 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// ============================================================================
// 元素创建参数
// ============================================================================

/** 创建元素的基础参数 */
export interface CreateElementParams {
  type: ElementType
  x: number
  y: number
  width?: number
  height?: number
  strokeColor?: string
  backgroundColor?: string
  fillStyle?: FillStyle
  strokeWidth?: number
  strokeStyle?: StrokeStyle
  roughness?: number
  opacity?: number
  angle?: number
  locked?: boolean
}

/** 创建文本元素的参数 */
export interface CreateTextElementParams extends CreateElementParams {
  type: 'text'
  text: string
  fontSize?: number
  fontFamily?: number
  textAlign?: TextAlign
  verticalAlign?: VerticalAlign
}

/** 创建线性元素的参数 */
export interface CreateLinearElementParams extends CreateElementParams {
  type: 'arrow' | 'line'
  points?: [number, number][]
  startArrowhead?: Arrowhead | null
  endArrowhead?: Arrowhead | null
}

/** 创建图片元素的参数 */
export interface CreateImageElementParams extends CreateElementParams {
  type: 'image'
  fileId: string
}

/** 所有创建元素参数类型 */
export type AnyCreateElementParams =
  | CreateElementParams
  | CreateTextElementParams
  | CreateLinearElementParams
  | CreateImageElementParams
