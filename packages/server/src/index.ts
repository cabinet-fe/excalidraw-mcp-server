import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from '@hono/node-server/serve-static'
import { createNodeWebSocket } from '@hono/node-ws'

import { createApiRoutes } from './routes/api'
import { SceneService } from './services/scene-service'
import { LibraryService } from './services/library-service'
import { CommandService } from './services/command-service'
import { createWebSocketHandler } from './ws/handler'

const app = new Hono()

// 中间件
app.use('*', logger())
app.use('*', cors())

// 初始化服务
const sceneService = new SceneService()
const libraryService = new LibraryService()
const commandService = new CommandService()

// 创建 WebSocket 适配器
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

// WebSocket 路由
app.get('/ws', upgradeWebSocket(createWebSocketHandler({
  sceneService,
  commandService,
})))

// API 路由
app.route('/api', createApiRoutes({
  sceneService,
  libraryService,
  commandService,
}))

// 静态文件托管（仅生产环境）
const isProduction = process.env.NODE_ENV === 'production'
if (isProduction) {
  app.use('/*', serveStatic({ root: './public' }))
}

// 健康检查
app.get('/health', (c) => c.json({
  status: 'ok',
  timestamp: Date.now(),
  clients: commandService.getClientCount(),
}))

const port = Number(process.env.PORT ?? 3000)

console.log(`🚀 Server starting on http://localhost:${port}`)

const server = serve({
  fetch: app.fetch,
  port,
})

// 注入 WebSocket 支持
injectWebSocket(server)

console.log(`✅ Server running on http://localhost:${port}`)
console.log(`📡 WebSocket available at ws://localhost:${port}/ws`)
