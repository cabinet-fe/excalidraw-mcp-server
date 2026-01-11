import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ExcalidrawClient } from '../client'
import { randomId } from '../utils/random-id'

/**
 * 注册库管理 Tools
 */
export function registerLibraryTools(server: McpServer, client: ExcalidrawClient): void {
  /**
   * 获取库项目
   */
  server.registerTool(
    'get_library_items',
    {
      description: 'Get all items from the component library',
      inputSchema: {},
    },
    async () => {
      const items = await client.getLibrary()
      return {
        content: [{ type: 'text', text: JSON.stringify(items, null, 2) }],
      }
    }
  )

  /**
   * 更新库
   */
  server.registerTool(
    'update_library',
    {
      description: 'Update the component library with new items (replaces existing library)',
      inputSchema: {
        items: z.array(z.object({
          id: z.string().optional().describe('Item ID (auto-generated if not provided)'),
          name: z.string().describe('Item name'),
          status: z.enum(['published', 'unpublished']).optional().default('unpublished')
            .describe('Publication status'),
          elements: z.array(z.record(z.unknown())).describe('Elements in this library item'),
        })).describe('Library items to set'),
      },
    },
    async (args: {
      items: Array<{
        id?: string
        name: string
        status?: 'published' | 'unpublished'
        elements: Record<string, unknown>[]
      }>
    }) => {
      const items = args.items.map((item) => ({
        id: item.id ?? randomId(),
        name: item.name,
        status: item.status ?? 'unpublished',
        elements: item.elements,
        created: Date.now(),
      }))
      await client.updateLibrary(items)
      return {
        content: [{ type: 'text', text: `Library updated with ${items.length} items` }],
      }
    }
  )
}
