# AGENTS

本文件为 AI 助手在当前项目中工作提供指导。项目概述和使用方法请参阅 [README.md](./README.md)。

## 核心指令

- 本项目使用 **bun** 作为包管理器和脚本执行器
- 除非指定依赖版本，否则**始终安装使用最新依赖**，不得使用任何过期依赖，**安装后必须自检确保符合该规则**

## 技术栈

**开发语言**: TypeScript (严格模式)

### 前端应用 (Excalidraw App)

部署于服务器，提供可视化画板界面。

| 技术 | 用途 |
|------|------|
| React 19 | 前端开发框架 |
| Vite | 开发服务器与构建工具 |
| @excalidraw/excalidraw | Excalidraw 画板组件 |

### 后端服务 (Backend Service)

部署于服务器，提供 API 和实时通信。

| 技术 | 用途 |
|------|------|
| Node.js 24+ | 运行时，优先使用新特性 (Web Streams, fetch, WebSocket) |
| Hono | 轻量级 Web 框架 |
| @hono/node-server | Node.js 适配器 |
| hono/websocket | WebSocket 支持，用于前端实时同步 |
| serveStatic | 托管前端构建后的静态资源 |

### MCP Server (NPM 包)

发布到 npm，供 AI 客户端调用。

| 技术 | 用途 |
|------|------|
| @modelcontextprotocol/sdk | MCP 官方 SDK |
| commander | CLI 参数解析 |
| zod | 输入参数校验 |
| tsdown | 打包工具，仅输出 ESM 格式 |

## MCP Tools 规划

基于 [Excalidraw API](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api) 设计，尽可能覆盖所有核心功能。

### 场景管理

| Tool 名称 | 对应 API | 描述 |
|-----------|----------|------|
| `update_scene` | `updateScene` | 更新场景 (elements, appState, collaborators) |
| `reset_scene` | `resetScene` | 重置/清空画布场景 |
| `get_scene_elements` | `getSceneElements` | 获取当前场景所有元素 (不含已删除) |
| `get_scene_elements_including_deleted` | `getSceneElementsIncludingDeleted` | 获取所有元素 (含已删除) |
| `get_app_state` | `getAppState` | 获取当前应用状态 |

### 元素操作

| Tool 名称 | 描述 |
|-----------|------|
| `add_element` | 添加元素 (rectangle, ellipse, diamond, arrow, line, freedraw, text, image, frame, group) |
| `update_element` | 更新指定元素的属性 (位置、大小、颜色、样式等) |
| `delete_element` | 删除指定元素 (软删除，设置 isDeleted: true) |
| `scroll_to_content` | `scrollToContent` | 滚动到指定元素或全部内容 |

### 库管理

| Tool 名称 | 对应 API | 描述 |
|-----------|----------|------|
| `update_library` | `updateLibrary` | 更新组件库 |
| `get_library_items` | - | 获取当前库中的所有组件 |

### 文件管理

| Tool 名称 | 对应 API | 描述 |
|-----------|----------|------|
| `add_files` | `addFiles` | 添加二进制文件 (图片等) |
| `get_files` | `getFiles` | 获取场景中的所有文件 |

### 导出功能

| Tool 名称 | 对应 API | 描述 |
|-----------|----------|------|
| `export_to_svg` | `exportToSvg` | 导出为 SVG 格式 |
| `export_to_png` | `exportToBlob` | 导出为 PNG 图片 |
| `export_to_json` | - | 导出为 Excalidraw JSON 格式 |

### 历史记录

| Tool 名称 | 对应 API | 描述 |
|-----------|----------|------|
| `history_clear` | `history.clear` | 清空历史记录 |
| `undo` | - | 撤销操作 |
| `redo` | - | 重做操作 |

### UI 控制

| Tool 名称 | 对应 API | 描述 |
|-----------|----------|------|
| `set_active_tool` | `setActiveTool` | 设置当前激活的工具 |
| `toggle_sidebar` | `toggleSidebar` | 切换侧边栏显示状态 |
| `set_toast` | `setToast` | 显示/隐藏提示消息 |
| `refresh` | `refresh` | 刷新画布 |

## MCP Resources 规划

| Resource URI | 描述 |
|--------------|------|
| `excalidraw://scene/current` | 当前场景的完整数据 (elements + appState) |
| `excalidraw://elements` | 当前场景的所有元素列表 |
| `excalidraw://app-state` | 当前应用状态 |
| `excalidraw://files` | 场景中的所有二进制文件 |
| `excalidraw://library` | 组件库数据 |

<!-- DEV_PROMPTS:START -->

# DevPrompts Instructions

本说明为在当前项目中工作的 AI 助手 提供指导。

## 目标优先级

**始终**按此顺序决策：

正确性 → 安全性 → 可维护性 → 可读性 → 性能 → 简洁性

## 通用开发规范

- **命名规范**：使用具有描述性的变量和函数名。
- **模块化**：遵循 SOLID 原则，确保函数职责单一，避免"上帝类"或超长函数。
- **注释艺术**：不要解释代码"在做什么"，而要解释"为什么这样做"以及任何非显而易见的逻辑。
- **自解释**：代码本身应清晰易读，尽量减少对文档的依赖。
- **避免死代码**：不得包含任何未使用或者不会被执行到的代码。

## 特定语言规范

- [TypeScript](dev-prompts/languages/typescript.md)

## 代码审查

**每次**代码生成都要经过必要的审查，以符合上述规范。


<!-- DEV_PROMPTS:END -->
