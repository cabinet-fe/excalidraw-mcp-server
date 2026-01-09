#!/usr/bin/env node

import { Command } from 'commander'
import { createMCPServer } from '../index'

const program = new Command()

program
  .name('excalidraw-mcp-server')
  .description('MCP server for Excalidraw - allows AI assistants to interact with Excalidraw canvas')
  .version('0.0.1')
  .requiredOption('-t, --transport <type>', 'Transport type (http)', 'http')
  .requiredOption('-s, --server <url>', 'Backend server URL (e.g., https://excalidraw.example.com)')
  .action(async (options: { transport: string; server: string }) => {
    if (options.transport !== 'http') {
      console.error('Error: Only "http" transport is currently supported')
      process.exit(1)
    }

    if (!options.server) {
      console.error('Error: --server option is required')
      process.exit(1)
    }

    console.log(`🚀 Starting Excalidraw MCP Server...`)
    console.log(`   Transport: ${options.transport}`)
    console.log(`   Backend: ${options.server}`)

    try {
      await createMCPServer({
        transport: options.transport as 'http',
        serverUrl: options.server,
      })
    } catch (error) {
      console.error('Failed to start MCP server:', error)
      process.exit(1)
    }
  })

program.parse()
