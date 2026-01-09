import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ExcalidrawClient } from '../client'

/**
 * 注册所有 MCP Resources
 *
 * 包含以下资源：
 * - excalidraw://scene/current - 完整场景数据
 * - excalidraw://elements - 场景元素列表
 * - excalidraw://app-state - 应用状态
 * - excalidraw://files - 二进制文件
 * - excalidraw://library - 组件库
 *
 * 总计: 5 个 Resources
 */
export function registerAllResources(server: McpServer, client: ExcalidrawClient): void {
  /**
   * 当前场景
   */
  server.registerResource(
    'current-scene',
    'excalidraw://scene/current',
    {
      description: 'The complete data of the current scene (elements + appState + files)',
      mimeType: 'application/json',
    },
    async (uri) => {
      const scene = await client.getScene()
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(scene, null, 2),
        }],
      }
    }
  )

  /**
   * 场景元素
   */
  server.registerResource(
    'scene-elements',
    'excalidraw://elements',
    {
      description: 'All elements in the current scene (excluding deleted)',
      mimeType: 'application/json',
    },
    async (uri) => {
      const elements = await client.getElements()
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(elements, null, 2),
        }],
      }
    }
  )

  /**
   * 应用状态
   */
  server.registerResource(
    'app-state',
    'excalidraw://app-state',
    {
      description: 'Current application state (view settings, current tool, zoom, etc.)',
      mimeType: 'application/json',
    },
    async (uri) => {
      const appState = await client.getAppState()
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(appState, null, 2),
        }],
      }
    }
  )

  /**
   * 二进制文件
   */
  server.registerResource(
    'binary-files',
    'excalidraw://files',
    {
      description: 'All binary files in the scene (images, etc.)',
      mimeType: 'application/json',
    },
    async (uri) => {
      const files = await client.getFiles()
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(files, null, 2),
        }],
      }
    }
  )

  /**
   * 组件库
   */
  server.registerResource(
    'library',
    'excalidraw://library',
    {
      description: 'Component library items',
      mimeType: 'application/json',
    },
    async (uri) => {
      const library = await client.getLibrary()
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(library, null, 2),
        }],
      }
    }
  )
}
