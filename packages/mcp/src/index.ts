import { createServer } from 'node:http'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

import { ExcalidrawClient } from './client'
import { registerAllTools } from './tools'
import { registerAllResources } from './resources'

export interface MCPServerOptions {
  transport: 'http' | 'stdio'
  serverUrl: string
  port?: number
  sceneId: string
}

/**
 * 创建并启动 MCP Server
 *
 * 连接到 Excalidraw 后端服务，注册所有 Tools 和 Resources，
 * 然后根据指定的传输方式进行连接。
 */
export async function createMCPServer(options: MCPServerOptions): Promise<void> {
  const client = new ExcalidrawClient(options.serverUrl, options.sceneId)

  // 验证后端服务连接
  const isConnected = await client.healthCheck()
  if (!isConnected) {
    throw new Error(`Cannot connect to backend server: ${options.serverUrl}`)
  }

  const server = new McpServer({
    name: 'excalidraw-mcp-server',
    version: '0.0.1',
  })

  // 注册 Tools 和 Resources
  registerAllTools(server, client)
  registerAllResources(server, client)

  if (options.transport === 'stdio') {
    // 使用 stdio 传输连接 MCP 客户端
    console.error(`[MCP] Connecting via stdio...`)
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('[MCP] Server started and connected via stdio')
  } else {
    // 使用 Streamable HTTP 传输
    const port = options.port ?? 3001
    console.error(`[MCP] Starting Streamable HTTP server on port ${port}...`)

    const transport = new StreamableHTTPServerTransport()

    const httpServer = createServer(async (req, res) => {
      // StreamableHTTPServerTransport handle the request
      await transport.handleRequest(req, res)
    })

    await server.connect(transport)

    httpServer.listen(port, () => {
      console.error(`[MCP] Streamable HTTP server running at http://localhost:${port}`)
    })
  }

  console.error('[MCP] Registered 23 tools and 5 resources')
}

// 导出 Client 供外部使用
export { ExcalidrawClient } from './client'
