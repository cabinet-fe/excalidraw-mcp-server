import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ExcalidrawClient } from '../client'

import { registerSceneTools } from './scene-tools'
import { registerElementTools } from './element-tools'
import { registerLibraryTools } from './library-tools'
import { registerFileTools } from './file-tools'
import { registerExportTools } from './export-tools'
import { registerHistoryTools } from './history-tools'
import { registerUITools } from './ui-tools'

/**
 * 注册所有 MCP Tools
 *
 * 包含以下类别：
 * - 场景管理 (5): get_scene_elements, get_scene_elements_including_deleted, get_app_state, update_scene, reset_scene
 * - 元素操作 (4): add_element, update_element, delete_element, scroll_to_content
 * - 库管理 (2): get_library_items, update_library
 * - 文件管理 (2): get_files, add_files
 * - 导出功能 (3): export_to_json, export_to_svg, export_to_png
 * - 历史记录 (3): undo, redo, history_clear
 * - UI 控制 (4): set_active_tool, toggle_sidebar, set_toast, refresh
 *
 * 总计: 23 个 Tools
 */
export function registerAllTools(server: McpServer, client: ExcalidrawClient): void {
  registerSceneTools(server, client)
  registerElementTools(server, client)
  registerLibraryTools(server, client)
  registerFileTools(server, client)
  registerExportTools(server, client)
  registerHistoryTools(server, client)
  registerUITools(server, client)
}
