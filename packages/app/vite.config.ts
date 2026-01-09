import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
  define: {
    // Excalidraw 需要这个定义
    'process.env.IS_PREACT': JSON.stringify('false'),
  },
  build: {
    outDir: '../server/dist/public',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5200,
    // 开发模式下代理 API 请求到后端服务
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
})
