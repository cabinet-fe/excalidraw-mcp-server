import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ExcalidrawClient } from '../client'

/**
 * 注册场景管理 Tools
 */
export function registerSceneTools(server: McpServer, client: ExcalidrawClient): void {
  /**
   * 获取场景元素（不含已删除）
   */
  server.registerTool(
    'get_scene_elements',
    {
      description: 'Get all elements in the current scene (excluding deleted elements)',
      inputSchema: {},
    },
    async () => {
      const elements = await client.getElements(false)
      return {
        content: [{ type: 'text', text: JSON.stringify(elements, null, 2) }],
      }
    }
  )

  /**
   * 获取场景元素（含已删除）
   */
  server.registerTool(
    'get_scene_elements_including_deleted',
    {
      description: 'Get all elements in the current scene (including deleted elements)',
      inputSchema: {},
    },
    async () => {
      const elements = await client.getElements(true)
      return {
        content: [{ type: 'text', text: JSON.stringify(elements, null, 2) }],
      }
    }
  )

  /**
   * 获取应用状态
   */
  server.registerTool(
    'get_app_state',
    {
      description: 'Get the current application state (view settings, current tool, etc.)',
      inputSchema: {},
    },
    async () => {
      const appState = await client.getAppState()
      return {
        content: [{ type: 'text', text: JSON.stringify(appState, null, 2) }],
      }
    }
  )

  /**
   * 更新场景
   */
  server.registerTool(
    'update_scene',
    {
      description: 'Update the scene with new elements and/or app state',
      inputSchema: {
        elements: z.array(z.record(z.unknown())).optional()
          .describe('Array of Excalidraw elements to set'),
        appState: z.record(z.unknown()).optional()
          .describe('Application state to update'),
      },
    },
    async (args: { elements?: Record<string, unknown>[]; appState?: Record<string, unknown> }) => {
      await client.updateScene({
        elements: args.elements,
        appState: args.appState,
      })
      return {
        content: [{ type: 'text', text: 'Scene updated successfully' }],
      }
    }
  )

  /**
   * 重置场景
   */
  server.registerTool(
    'reset_scene',
    {
      description: 'Reset/clear the canvas scene (removes all elements)',
      inputSchema: {},
    },
    async () => {
      await client.resetScene()
      return {
        content: [{ type: 'text', text: 'Scene reset successfully' }],
      }
    }
  )
}
