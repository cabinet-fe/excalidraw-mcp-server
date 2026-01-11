import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ExcalidrawClient } from '../client'

/**
 * 注册文件管理 Tools
 */
export function registerFileTools(server: McpServer, client: ExcalidrawClient): void {
  /**
   * 获取文件
   */
  server.registerTool(
    'get_files',
    {
      description: 'Get all binary files (images) in the current scene',
      inputSchema: {},
    },
    async () => {
      const files = await client.getFiles()
      const fileCount = Object.keys(files).length
      return {
        content: [{
          type: 'text',
          text: fileCount > 0
            ? `Found ${fileCount} files:\n${JSON.stringify(files, null, 2)}`
            : 'No files in the current scene',
        }],
      }
    }
  )

  /**
   * 添加文件
   */
  server.registerTool(
    'add_files',
    {
      description: 'Add binary files (images) to the scene. Files should be provided as base64 data URLs.',
      inputSchema: {
        files: z.record(
          z.string().describe('File ID'),
          z.object({
            mimeType: z.string().describe('MIME type (e.g., "image/png", "image/jpeg")'),
            dataURL: z.string().describe('Base64 data URL (e.g., "data:image/png;base64,...")'),
          })
        ).describe('Files to add, keyed by file ID'),
      },
    },
    async (args: {
      files: Record<string, { mimeType: string; dataURL: string }>
    }) => {
      const files: Record<string, unknown> = {}
      const now = Date.now()

      for (const [id, file] of Object.entries(args.files)) {
        files[id] = {
          id,
          mimeType: file.mimeType,
          dataURL: file.dataURL,
          created: now,
        }
      }

      await client.addFiles(files)
      return {
        content: [{
          type: 'text',
          text: `Added ${Object.keys(files).length} file(s) successfully`,
        }],
      }
    }
  )
}
