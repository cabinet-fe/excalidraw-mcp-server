import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ExcalidrawClient } from '../client'

/**
 * 注册历史记录 Tools
 */
export function registerHistoryTools(server: McpServer, client: ExcalidrawClient): void {
  /**
   * 撤销
   */
  server.registerTool(
    'undo',
    {
      description: 'Undo the last operation',
      inputSchema: {},
    },
    async () => {
      await client.undo()
      return {
        content: [{
          type: 'text',
          text: 'Undo command sent',
        }],
      }
    }
  )

  /**
   * 重做
   */
  server.registerTool(
    'redo',
    {
      description: 'Redo the last undone operation',
      inputSchema: {},
    },
    async () => {
      await client.redo()
      return {
        content: [{
          type: 'text',
          text: 'Redo command sent',
        }],
      }
    }
  )

  /**
   * 清空历史记录
   */
  server.registerTool(
    'history_clear',
    {
      description: 'Clear all history (both undo and redo stacks)',
      inputSchema: {},
    },
    async () => {
      await client.clearHistory()
      return {
        content: [{ type: 'text', text: 'History cleared successfully' }],
      }
    }
  )
}
