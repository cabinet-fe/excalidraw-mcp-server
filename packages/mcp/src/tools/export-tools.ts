import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ExcalidrawClient } from '../client'

/**
 * 注册导出功能 Tools
 */
export function registerExportTools(server: McpServer, client: ExcalidrawClient): void {
  /**
   * 导出为 JSON
   */
  server.registerTool(
    'export_to_json',
    {
      description: 'Export the current scene to Excalidraw JSON format',
      inputSchema: {},
    },
    async () => {
      const scene = await client.exportToJson()
      return {
        content: [{ type: 'text', text: JSON.stringify(scene, null, 2) }],
      }
    }
  )

  /**
   * 导出为 SVG
   */
  server.registerTool(
    'export_to_svg',
    {
      description: 'Export the current scene to SVG format. Returns SVG markup as a string.',
      inputSchema: {},
    },
    async () => {
      const result = await client.exportToSvg()
      return {
        content: [{
          type: 'text',
          text: `SVG exported successfully (${result.data.length} characters)\n\n${result.data}`,
        }],
      }
    }
  )

  /**
   * 导出为 PNG
   */
  server.registerTool(
    'export_to_png',
    {
      description: 'Export the current scene to PNG format. Returns base64-encoded image data.',
      inputSchema: {},
    },
    async () => {
      const result = await client.exportToPng()
      return {
        content: [{
          type: 'text',
          text: `PNG exported successfully.\nMIME Type: ${result.mimeType}\nBase64 Data (first 100 chars): ${result.data.slice(0, 100)}...`,
        }],
      }
    }
  )
}
