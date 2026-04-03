# Service Manager Desktop

服务管理器 (Service Manager Desktop) 是一个基于 [Tauri](https://tauri.app/) + [React](https://reactjs.org/) + [Ant Design](https://ant.design/) 构建的跨平台桌面应用程序，用于便捷地管理和监控多个后台服务或任务。

## 主要功能

- **多服务管理**: 支持快速启动、停止和重启各个后端/前端及自定义服务。
- **自定义服务支持**: 支持用户自行添加、编辑和删除自定义的服务或任务配置。
- **实时日志查看**: 提供全局操作日志与各个服务的独立日志面板，实时跟踪服务状态。
- **微信机器人监控**: 内置微信机器人控制与状态健康检查功能。
- **全栈启停**: 一键控制全栈服务的启动或停止。
- **状态监控**: 定时轮询监控各个服务的运行状态和 PID。

## 技术栈

- **前端**: React (v18), Ant Design (v5), Vite, TypeScript
- **后端/桌面框架**: Tauri (v2), Rust
- **状态及通信**: Tauri API (命令、事件通信)

## 快速开始

### 环境要求

- Node.js (建议 v18+)
- Rust (配合 Cargo)
- Tauri 相关的构建依赖 (如各个平台的开发依赖项，详见 [Tauri 官方文档](https://tauri.app/v1/guides/getting-started/prerequisites))

### 安装依赖

```bash
npm install
```

### 开发模式运行

以开发模式启动应用 (自动启动 Vite 前端服务和 Tauri 后端服务)：

```bash
npm run tauri dev
```
或使用 npm 提供的脚本（如果配置支持）：
```bash
npm run dev
```

### 构建打包

构建生产版本的桌面应用：

```bash
npm run build
npm run tauri build
```

构建产物通常位于 `src-tauri/target/release` 目录下。

## 项目结构概览

- `src/`: 前端 React 源代码
  - `src/api/`: 与 Tauri 后端交互的 API 封装
  - `src/components/`: 前端 UI 组件（如侧边栏、控制面板、日志抽屉等）
  - `src/App.tsx`: 前端主应用入口和核心逻辑
- `src-tauri/`: Tauri (Rust) 后端源代码
  - `src-tauri/src/`: Rust 源代码逻辑

## 许可

本项目采用相应的开源许可协议，请查看根目录下的 [LICENSE](LICENSE) 文件了解更多详情。
