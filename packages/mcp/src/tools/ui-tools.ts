import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ExcalidrawClient } from '../client'

/**
 * 注册 UI 控制 Tools
 */
export function registerUITools(server: McpServer, client: ExcalidrawClient): void {
  /**
   * 设置活动工具
   */
  server.registerTool(
    'set_active_tool',
    {
      description: 'Set the currently active drawing tool',
      inputSchema: {
        tool: z.enum([
          'selection',
          'rectangle',
          'ellipse',
          'diamond',
          'arrow',
          'line',
          'freedraw',
          'text',
          'image',
          'eraser',
          'hand',
          'laser',
        ]).describe('Tool to activate'),
        locked: z.boolean().optional().describe('Keep tool selected after drawing'),
      },
    },
    async (args: { tool: string; locked?: boolean }) => {
      await client.setActiveTool(args.tool, { locked: args.locked })
      return {
        content: [{
          type: 'text',
          text: `Active tool set to "${args.tool}"${args.locked ? ' (locked)' : ''}`,
        }],
      }
    }
  )

  /**
   * 切换侧边栏
   */
  server.registerTool(
    'toggle_sidebar',
    {
      description: 'Toggle a sidebar panel visibility',
      inputSchema: {
        name: z.enum(['library', 'customSidebar']).describe('Sidebar name'),
        open: z.boolean().optional().describe('Force open (true) or close (false). Omit to toggle.'),
      },
    },
    async (args: { name: string; open?: boolean }) => {
      await client.toggleSidebar(args.name, args.open)
      const action = args.open === true ? 'opened' : args.open === false ? 'closed' : 'toggled'
      return {
        content: [{ type: 'text', text: `Sidebar "${args.name}" ${action}` }],
      }
    }
  )

  /**
   * 设置 Toast 消息
   */
  server.registerTool(
    'set_toast',
    {
      description: 'Show or hide a toast notification message',
      inputSchema: {
        message: z.string().nullable().describe('Message to show (null to hide)'),
        closable: z.boolean().optional().default(true).describe('Whether the toast can be closed'),
        duration: z.number().optional().default(3000).describe('Auto-hide duration in milliseconds'),
      },
    },
    async (args: { message: string | null; closable?: boolean; duration?: number }) => {
      await client.setToast(args.message, {
        closable: args.closable,
        duration: args.duration,
      })
      return {
        content: [{
          type: 'text',
          text: args.message ? `Toast shown: "${args.message}"` : 'Toast hidden',
        }],
      }
    }
  )

  /**
   * 刷新画布
   */
  server.registerTool(
    'refresh',
    {
      description: 'Refresh/redraw the canvas',
      inputSchema: {},
    },
    async () => {
      await client.refresh()
      return {
        content: [{ type: 'text', text: 'Canvas refreshed' }],
      }
    }
  )
}
