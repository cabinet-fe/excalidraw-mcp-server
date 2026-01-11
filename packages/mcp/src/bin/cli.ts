#!/usr/bin/env node
/**
 * MCP Server CLI
 *
 * 用于启动 Excalidraw MCP Server。
 * 支持两种传输方式：
 * - stdio: 适用于本地被 AI 客户端（如 Claude Desktop）直接调用
 * - http: 启动一个 HTTP 服务，通过 Streamable HTTP (SSE 增强版) 提供服务
 */
import { Command } from 'commander'
import { createMCPServer } from '../index'

const program = new Command()

program
  .name('excalidraw-mcp-server')
  .description('MCP server for Excalidraw - allows AI assistants to interact with Excalidraw canvas')
  .version('0.0.1')
  .option('-t, --transport <type>', 'Transport type (http, stdio)', 'stdio')
  .option('-p, --port <number>', 'Port to listen on (for http transport)', '3001')
  .requiredOption('-s, --server <url>', 'Backend server URL (e.g., https://excalidraw.example.com)')
  .requiredOption('-i, --scene-id <id>', 'Scene ID to operate on (e.g., my-drawing_1736605760000)')
  .action(async (options: { transport: string; server: string; port: string; sceneId: string }) => {
    const transport = options.transport.toLowerCase()

    if (transport !== 'http' && transport !== 'stdio') {
      console.error('Error: Only "http" and "stdio" transports are supported')
      process.exit(1)
    }

    if (!options.server) {
      console.error('Error: --server option is required')
      process.exit(1)
    }

    if (!options.sceneId) {
      console.error('Error: --scene-id option is required')
      process.exit(1)
    }

    console.error(`🚀 Starting Excalidraw MCP Server...`)
    console.error(`   Transport: ${transport}`)
    console.error(`   Backend: ${options.server}`)
    console.error(`   Scene ID: ${options.sceneId}`)
    if (transport === 'http') {
      console.error(`   Port: ${options.port}`)
    }

    try {
      await createMCPServer({
        transport: transport as 'http' | 'stdio',
        serverUrl: options.server,
        port: Number(options.port),
        sceneId: options.sceneId,
      })
    } catch (error) {
      console.error('Failed to start MCP server:', error)
      process.exit(1)
    }
  })

program.parse()
