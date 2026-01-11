# Excalidraw MCP Server

基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的 Excalidraw 服务，允许 AI 助手通过标准化协议与 Excalidraw 画板进行交互，实现图表的创建、编辑和导出等功能。

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                           服务器端 (Server)                          │
│  ┌─────────────────────┐       ┌─────────────────────────────────┐  │
│  │   Excalidraw App    │◄─────►│      Backend Service (Hono)     │  │
│  │   (React + Vite)    │  WS   │  - REST API                     │  │
│  │                     │       │  - WebSocket 实时同步            │  │
│  │  - 画板渲染          │       │  - 场景状态管理                   │  │
│  │  - 用户交互          │       │  - 导出服务 (PNG/SVG)            │  │
│  │                     │       │  - serveStatic 静态资源托管      │  │
│  └─────────────────────┘       └───────────────┬─────────────────┘  │
│                                                │                     │
└────────────────────────────────────────────────┼─────────────────────┘
                                                 │ Streamable HTTP
                                                 │
┌────────────────────────────────────────────────┼─────────────────────┐
│                        MCP Client Environment                        │
│  ┌─────────────────────────────────────────────▼─────────────────┐   │
│  │                    MCP Server (NPM Package)                   │   │
│  │                  npx excalidraw-mcp-server                    │   │
│  │                                                               │   │
│  │  传输方式: stdio (本地) 或 Streamable HTTP (远程)          │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                    ▲                                  │
│                                    │ MCP Protocol                     │
│                                    ▼                                  │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                AI Client (Claude, Cursor, etc.)               │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

## 使用方法

### MCP Server (NPM 包)

```bash
# 本地使用（默认，适用于 Claude Desktop / Cursor 等）
npx excalidraw-mcp-server --server https://excalidraw.example.com

# 指定传输方式为 stdio
npx excalidraw-mcp-server --transport stdio --server https://excalidraw.example.com

# 启动 HTTP 服务（Streamable HTTP 传输）
npx excalidraw-mcp-server --transport http --server https://excalidraw.example.com --port 3001
```

> **注意**: 默认使用 stdio 模式，方便 AI 客户端直接调用。如果需要跨网络访问，请使用 http 模式。

### CLI 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--transport`, `-t` | `http` \| `stdio` | `stdio` | 传输方式 |
| `--server`, `-s` | `string` | - | 后端服务地址 (必填) |
| `--port`, `-p` | `number` | `3001` | HTTP 服务端口 (仅限 http 模式) |
| `--help`, `-h` | - | - | 显示帮助信息 |
| `--version`, `-v` | - | - | 显示版本号 |

## MCP Tools

基于 [Excalidraw API](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api) 设计，提供以下核心功能：

| 类别 | Tools |
|------|-------|
| 场景管理 | `update_scene`, `reset_scene`, `get_scene_elements`, `get_app_state` |
| 元素操作 | `add_element`, `update_element`, `delete_element`, `scroll_to_content` |
| 库管理 | `update_library`, `get_library_items` |
| 文件管理 | `add_files`, `get_files` |
| 导出功能 | `export_to_svg`, `export_to_png`, `export_to_json` |
| 历史记录 | `history_clear`, `undo`, `redo` |
| UI 控制 | `set_active_tool`, `toggle_sidebar`, `set_toast`, `refresh` |

## MCP Resources

| Resource URI | 描述 |
|--------------|------|
| `excalidraw://scene/current` | 当前场景的完整数据 (elements + appState) |
| `excalidraw://elements` | 当前场景的所有元素列表 |
| `excalidraw://app-state` | 当前应用状态 |
| `excalidraw://files` | 场景中的所有二进制文件 |
| `excalidraw://library` | 组件库数据 |

## 项目结构

```
excalidraw-mcp-server/
├── packages/
│   ├── app/                    # 前端 Excalidraw 应用
│   │   ├── src/
│   │   │   ├── components/     # React 组件
│   │   │   ├── handlers/       # 事件处理器
│   │   │   ├── hooks/          # 自定义 Hooks
│   │   │   ├── services/       # 服务层
│   │   │   ├── styles/         # 样式文件
│   │   │   ├── types/          # 类型定义
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── server/                 # 后端 Hono 服务
│   │   ├── src/
│   │   │   ├── routes/         # API 路由
│   │   │   ├── services/       # 业务逻辑
│   │   │   ├── types/          # 类型定义
│   │   │   ├── ws/             # WebSocket 处理
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── mcp/                    # MCP Server NPM 包
│       ├── src/
│       │   ├── bin/            # CLI 入口点
│       │   ├── tools/          # MCP Tools 实现
│       │   ├── resources/      # MCP Resources 实现
│       │   ├── utils/          # 工具函数
│       │   ├── client.ts       # 后端服务客户端
│       │   └── index.ts        # MCP Server 入口
│       ├── tsdown.config.ts
│       └── package.json
│
├── dev-prompts/                # 开发提示词
│   └── languages/
│       └── typescript.md
├── AGENTS.md                   # AI 助手开发指南
├── README.md
├── LICENSE
├── package.json                # Monorepo 根配置
├── tsconfig.base.json          # 基础 TypeScript 配置
├── tsconfig.json               # 根 TypeScript 配置
└── bun.lock
```

## 技术栈

- **前端**: React 19 + Vite + @excalidraw/excalidraw
- **后端**: Node.js 24+ + Hono + WebSocket
- **MCP**: @modelcontextprotocol/sdk + commander + zod + tsdown

## 开发

```bash
# 安装依赖
bun install

# 开发模式 (需要分别启动各个包)
bun run --filter app dev
bun run --filter server dev
bun run --filter mcp dev
```

## License

MIT
