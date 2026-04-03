# Service Manager Desktop

服务管理器是一个基于 [Tauri](https://tauri.app/) + [React](https://reactjs.org/) + [Ant Design](https://ant.design/) 构建的跨平台桌面应用，用于管理和监控多个后台服务或脚本任务。界面风格参考 SwitchHosts，左侧任务列表 + 右侧命令预览。

## 主要功能

- **任务管理**：创建任务只需填写「名称 + 启动命令」，支持编辑和删除（包括预置任务）。
- **Shell 直接执行**：启动命令通过 `sh -c`（macOS/Linux）或 `cmd /C`（Windows）直接执行，支持 `cd ... && npm run dev` 等复合命令，无需额外拼接环境变量。
- **实时日志**：捕获子进程的 stdout/stderr，通过 Tauri 事件实时推送到前端日志面板，体验接近终端。
- **进程状态监控**：基于 PID 检测进程是否存在，支持启动、停止、重启操作。
- **微信机器人**：内置微信机器人控制面板，支持启停、API 健康检查和消息推送配置。
- **独立日志抽屉**：每个任务有独立的日志记录，可在抽屉面板中查看完整历史。

## 技术栈

- **前端**：React 18 + Ant Design 5 + Vite + TypeScript
- **后端**：Tauri 2 + Rust
- **通信**：Tauri Commands（前端调后端）+ Tauri Events（后端推前端日志）

## 快速开始

### 环境要求

- Node.js >= 18
- Rust + Cargo
- Tauri 构建依赖（参考 [Tauri 文档](https://tauri.app/start/prerequisites/)）

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri dev
```

### 构建打包

```bash
npm run tauri build
```

构建产物位于 `src-tauri/target/release` 目录。

## 项目结构

```
src/                        # 前端 React 源码
├── api/tauri.ts            # Tauri 后端 API 封装
├── components/
│   ├── ServiceSidebar.tsx   # 左侧任务列表
│   ├── MainToolbar.tsx      # 工具栏（启动/停止/重启/刷新等）
│   ├── ServiceEditDialog.tsx# 创建/编辑任务弹窗
│   ├── LogConsole.tsx       # 日志控制台
│   ├── ServiceLogDrawer.tsx # 独立日志抽屉
│   └── WeChatBotControls.tsx# 微信机器人控制面板
├── App.tsx                  # 主应用入口
└── types.ts                 # 类型定义

src-tauri/src/               # Rust 后端源码
├── lib.rs                   # Tauri 命令注册与调度
├── service_manager.rs       # 服务启停、状态检测、日志推送
├── service_config.rs        # 预置任务与配置结构
├── config_manager.rs        # 配置文件读写管理
└── wechat_api.rs            # 微信机器人 API
```

## 许可

本项目采用开源许可协议，详见 [LICENSE](LICENSE)。
