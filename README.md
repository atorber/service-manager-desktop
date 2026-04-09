# Service Manager Desktop (本地服务与脚本管理器)

Service Manager Desktop 是一款基于 [Tauri](https://tauri.app/) + [React](https://reactjs.org/) + [Ant Design](https://ant.design/) 构建的跨平台桌面应用。它的设计初衷是解决开发者在日常开发和运维过程中面临的**“终端标签页地狱”**与**“环境碎片化”**问题。

本项目汲取了 **SwitchHosts** 在环境配置切换上的极简理念，将**多服务进程管理、复合脚本自动化执行、实时日志隔离追踪**整合到一个统一的图形化控制台中。让你能够像切换 Hosts 一样，优雅地切换和管理复杂的本地开发环境与自动化任务。

---

## 🎯 痛点与解决场景

在现代软件开发中，启动一个完整的本地开发环境往往需要打开多个终端窗口：
1. `npm run dev` 启动前端 Vite/Webpack 服务器；
2. `go run main.go` 或 `mvn spring-boot:run` 启动后端 API；
3. `docker-compose up` 启动 Redis/MySQL 依赖；
4. 运行某些数据同步或监听脚本。

**Service Manager Desktop 解决的核心问题：**
- **告别终端乱象**：无需再面对密密麻麻的终端 Tab，所有服务的启停状态一目了然。
- **防止进程残留**：基于 PID 的精准监控与退出机制，避免由于忘记关闭终端导致的端口被占用 (EADDRINUSE) 问题。
- **环境一键切换**：通过预配不同的服务配置，轻松在“开发环境”、“测试环境”之间一键切换（一键全栈启停）。

---

## 🚀 核心功能能力

### 1. 极简任务与服务管理 (SwitchHosts 风格)
- **直观列表面板**：左侧提供服务任务列表，右侧为命令配置与实时状态预览。
- **极速创建**：创建新任务无需繁琐配置，只需填写「任务名称」和「启动命令」。
- **复合脚本支持**：支持原生 Shell 的强大表达能力。启动命令通过底层 `sh -c` (macOS/Linux) 或 `cmd /C` (Windows) 直接执行。例如：你可以直接输入 `cd ~/my-project && export NODE_ENV=dev && npm run start`，无需手动拼接跨平台环境变量。

### 2. 进程级生命周期控制
- **精准 PID 追踪**：服务启动后，后端 Tauri Rust 进程会捕获真实的子进程 PID，并进行定时轮询。即使应用被最小化，也能准确感知进程意外退出。
- **一键启停与重载**：支持针对单个微服务或脚本的「启动」、「停止」和「重启」。
- **全栈模式**：提供一键「全栈启动/停止」能力，适合每天早上打开电脑，一键拉起所有依赖环境。

### 3. 实时日志隔离追踪
- **终端级体验**：后台捕获子进程的 `stdout` 和 `stderr` 流，通过 Tauri IPC 事件实时推送到前端面板，无刷新延迟。
- **日志隔离**：每个任务配置独立的日志流。你可以一边查看后端报错日志，一边在抽屉面板中单独查看前端打包的编译输出，互相不干扰。
- **历史留存**：提供全局操作日志台以及独立的日志抽屉，方便回溯错误堆栈和历史控制台输出。

### 4. 内置微信机器人控制中枢 (特性扩展)
- **开箱即用**：内置对微信自动化机器人的生命周期控制。
- **健康检查**：定时心跳检测机器人 API 健康状态，并在前端给出可视化的状态灯提示。

---

## 💻 典型使用场景

1. **前后端分离本地开发**
   - 任务 A: 前端项目 (`cd web && npm run dev`)
   - 任务 B: 后端服务 (`cd server && cargo run`)
   - **效果**：左右分栏查看日志，一键启动全栈。
2. **自动化脚本与工具箱**
   - 配置常用的 Python 数据处理脚本或 Node.js 爬虫脚本。无需每次打开终端寻找历史命令，在面板中点击“启动”即可，并直观观察执行日志。
3. **本地微服务集群模拟**
   - 当需要同时启动 Auth、User、Payment 多个微服务实例时，Service Manager 能够帮你将不同端口的服务井井有条地管理起来。

---

## 🛠 技术栈架构

项目采用了目前最为流行的现代化跨平台桌面应用架构：

- **前端交互**：React 18 + TypeScript + Vite，配合 Ant Design 5 提供专业级的企业后台管理 UI 体验。
- **桌面内核层**：Tauri 2 (Rust) 替代 Electron。体积更小，内存占用极低，且具有极高的安全性。
- **通信机制**：
  - **命令调用**：`Tauri Commands` 用于前端触发后端的进程启停、文件读写操作。
  - **状态推送**：`Tauri Events` 用于后端 Rust 异步将日志流和 PID 状态实时广播给前端，保证界面与底层状态的强一致性。

---

## 📦 快速开始与部署

### 1. 环境准备
- Node.js >= 18
- Rust 工具链 (配合 Cargo)
- Tauri 原生构建依赖（如 macOS 的 Xcode Command Line Tools，Windows 的 C++ Build Tools，参考 [Tauri 官方指南](https://tauri.app/start/prerequisites/)）

### 2. 安装与开发运行

```bash
# 1. 克隆并安装前端依赖
npm install

# 2. 启动开发模式 (自动拉起 Vite 前端与 Tauri 窗口)
npm run tauri dev
```

### 3. 构建生产版本

```bash
# 构建对应的操作系统安装包 (dmg, exe, AppImage 等)
npm run tauri build
```
构建的二进制产物将输出在 `src-tauri/target/release` 目录下。

---

## 📂 核心项目结构指北

了解核心代码布局，便于二次开发和定制你的专属管理器：

```text
src/                        # 前端 React 源码，负责所有 UI 表现
├── api/tauri.ts            # Tauri IPC 接口封装 (前后端桥梁)
├── components/
│   ├── ServiceSidebar.tsx   # 左侧导航与任务列表组件
│   ├── MainToolbar.tsx      # 顶部控制台 (全栈启停、刷新等核心交互)
│   ├── LogConsole.tsx       # 终端风格日志输出台
│   └── ServiceLogDrawer.tsx # 侧边栏独立日志抽屉
└── App.tsx                  # 核心状态机 (管理服务 running, pid 等)

src-tauri/src/               # 后端 Rust 源码，负责系统级能力
├── lib.rs                   # Tauri Application 入口与路由注册
├── service_manager.rs       # 核心模块：进程 Spawn、管道读取、PID 状态机
├── config_manager.rs        # 负责持久化用户自定义的命令和任务配置
└── wechat_api.rs            # 微信机器人特性的集成
```

## 📄 许可协议

本项目采用开源许可协议，详情请查看 [LICENSE](LICENSE) 文件。
