import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { ExcalidrawClient } from './client'
import { registerAllTools } from './tools'
import { registerAllResources } from './resources'

export interface MCPServerOptions {
  transport: 'http'
  serverUrl: string
}

/**
 * 创建并启动 MCP Server
 *
 * 连接到 Excalidraw 后端服务，注册所有 Tools 和 Resources，
 * 然后通过 stdio 传输等待 MCP 客户端连接。
 */
export async function createMCPServer(options: MCPServerOptions): Promise<void> {
  const client = new ExcalidrawClient(options.serverUrl)

  // 验证后端服务连接
  const isConnected = await client.healthCheck()
  if (!isConnected) {
    throw new Error(`Cannot connect to backend server: ${options.serverUrl}`)
  }

  // 使用 stderr 输出日志，因为 stdout 被 stdio 传输使用
  console.error(`[MCP] Connected to backend server: ${options.serverUrl}`)

  const server = new McpServer({
    name: 'excalidraw-mcp-server',
    version: '0.0.1',
  })

  // 注册 Tools 和 Resources
  registerAllTools(server, client)
  registerAllResources(server, client)

  console.error('[MCP] Registered 23 tools and 5 resources')

  // 使用 stdio 传输连接 MCP 客户端
  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error('[MCP] Server started and connected via stdio')
}

// 导出 Client 供外部使用
export { ExcalidrawClient } from './client'
