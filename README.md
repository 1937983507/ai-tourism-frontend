# AI 智能旅游规划助手（前端）

> **访问地址**：[https://www.aitrip.chat/](https://www.aitrip.chat/)  
> **欢迎体验智能旅游规划服务！**

## 📖 项目简介

**AI-Tourism Frontend** 是智能旅游规划系统的**前端应用**，基于 **Vue 3、Vite、Leaflet、高德地图**等技术栈构建。

该前端应用作为用户交互界面，负责**对话展示、地图渲染、路线可视化**等核心功能。用户在前端输入自然语言后，请求会先发往 **ai-tourism-backend** 后端服务，然后由后端转发给 **ai-tourism-agent** Python Agent 服务进行 AI 处理。

### 🎯 核心特性

- **智能对话界面** - 支持流式对话展示，实时显示 AI 回复内容
- **地图可视化** - 集成高德地图和 OpenStreetMap，支持路线规划可视化
- **会话管理** - 支持多会话管理，历史记录查询，会话重命名和删除
- **用户认证** - 完整的用户登录、注册、权限管理功能

---

## 🏗️ 系统整体架构

```
┌─────────────────┐
│   前端 (Vue)     │
│  ai-tourism-     │
│  frontend        │
└────────┬─────────┘
         │ HTTP/SSE
         │
┌────────▼─────────────────────────────────────┐
│   后端 API 服务 (Spring Boot)                 │
│   ai-tourism-backend                          │
│   - API 网关与请求路由                         │
│   - 会话与消息管理                             │
│   - 用户认证与权限管理                          │
└────────┬─────────────────────────────────────┘
         │ HTTP/SSE
         │
┌────────▼─────────────────────────────────────┐
│   Python Agent 服务                           │
│   ai-tourism-agent                            │
│   - LangGraph 工作流                          │
│   - AI 对话处理                               │
│   - 工具调用 (MCP/Function Call)              │
│   - 结构化输出                                │
└──────────────────────────────────────────────┘
```

### 架构说明

- **前端（ai-tourism-frontend）**：`Vue 3` 应用，负责交互、地图渲染与对话展示；通过 `SSE` 调用后端 `POST /ai_assistant/chat-stream` 实时消费模型输出

- **后端 API 服务（ai-tourism-backend）**：
  - **接入层（Controller + 鉴权）**：基于 `Spring Boot REST`，使用 `Sa-Token` 进行登录与权限校验，提供 RESTful API 接口
  - **业务服务层**：会话管理、消息入库、流式返回转发、API 网关功能
  - **数据访问层（MyBatis）**：通过 `MyBatis` 实现数据持久化，管理会话表、消息表、用户表等

- **Python Agent 服务（ai-tourism-agent）**：
  - **AI 对话处理**：LangGraph 工作流编排
  - **工具调用管理**：Function Call + MCP 工具
  - **状态管理**：使用 LangGraph Checkpoint 机制
  - **流式响应**：SSE 流式返回
  - **结构化输出**：JSON Schema 输出

---

## 🛠️ 技术栈与依赖

| 技术分类 | 技术栈 | 版本/说明 |
|---------|--------|----------|
| **核心框架** | Vue | `3.3.4` |
| **构建工具** | Vite | `4.5.14` |
| **路由** | Vue Router | `4.5.1` |
| **地图库** | Leaflet | CDN 引入 |
| **地图服务** | 高德地图 API | JavaScript API |
| **Markdown 渲染** | Marked | `16.3.0` |
| **代码高亮** | Highlight.js | `11.11.1` |
| **HTML 清理** | DOMPurify | `3.2.7` |

> 详见 [package.json](package.json) 依赖配置

---

## 📂 目录结构

```
ai-tourism-frontend/
├── src/
│   ├── components/          # Vue 组件
│   │   ├── ChatContainer.vue    # 对话容器组件
│   │   ├── MapContainer.vue     # 地图容器组件
│   │   └── Sidebar.vue          # 侧边栏组件
│   ├── views/               # 页面视图
│   │   ├── Home.vue            # 首页
│   │   └── Login.vue           # 登录页
│   ├── utils/               # 工具函数
│   │   ├── api.js              # API 请求封装
│   │   ├── mapConfig.js        # 地图配置
│   │   └── mapServiceManager.js # 地图服务管理
│   ├── router/              # 路由配置
│   │   └── index.js
│   ├── assets/              # 静态资源
│   │   └── style.css
│   ├── App.vue              # 根组件
│   └── main.js              # 入口文件
├── public/                  # 公共静态资源
├── index.html               # HTML 模板
├── vite.config.js           # Vite 配置
├── package.json             # 项目依赖
├── .env.example             # 环境变量模板
├── .gitignore               # Git 忽略配置
└── README.md                # 项目说明
```

---

## 🚀 快速开始

### 📋 环境要求

1. **Node.js** - 建议使用 Node.js 18+ 版本
2. **npm** 或 **yarn** - 包管理器
3. **后端服务** - 需要启动 [ai-tourism-backend](https://github.com/1937983507/ai-tourism-backend) 后端服务
4. **Agent 服务** - 需要启动 [ai-tourism-agent](https://github.com/1937983507/ai-tourism-agent) Python Agent 服务

### 🛫 部署与运行

#### 1. 克隆项目

```bash
git clone https://github.com/1937983507/ai-tourism-frontend.git
cd ai-tourism-frontend
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 配置环境变量

1. **复制环境变量模板**：
   ```bash
   # Windows
   copy .env.example .env.local
   
   # Linux/macOS
   cp .env.example .env.local
   ```

2. **编辑 `.env.local` 文件**，填入你的高德地图 API 密钥：
   ```env
   # 高德地图配置
   # 申请地址：https://console.amap.com/dev/key/app
   VITE_AMAP_API_KEY=your_amap_api_key_here
   VITE_AMAP_SECURITY_JS_CODE=your_security_js_code_here
   VITE_AMAP_WEB_API_KEY=your_web_api_key_here
   ```

   > **重要提示**：
   > - 高德地图 API 密钥申请地址：[https://console.amap.com/dev/key/app](https://console.amap.com/dev/key/app)
   > - 需要申请以下类型的密钥：
   >   - **Web 服务 API Key**（用于地理编码服务）
   >   - **Web 端（JS API）Key**（用于前端地图显示）
   >   - **安全密钥（Security JS Code）**（用于高德地图安全验证）
   > - `.env.local` 文件不会被提交到 Git，可以安全地存储你的密钥

#### 4. 配置后端 API 地址（推荐使用环境变量）

本项目通过 Vite 环境变量 `VITE_API_BASE_URL` 配置后端地址：

- **开发环境**：默认已在 `.env.development` 配置为 `http://127.0.0.1:8290`
- **生产环境**：默认已在 `.env.production` 留空（使用相对路径），配合 Nginx 同域反向代理转发到后端

如需覆盖默认值，可在本地创建 `.env.local`（不会提交到 Git）：

```env
VITE_API_BASE_URL=http://127.0.0.1:8290
```

#### 5. 启动开发服务器

```bash
npm run dev
```

项目将在 `http://localhost:3001` 启动。

#### 6. 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

---

## 🔧 环境变量配置说明

### 环境变量文件

项目支持以下环境变量文件（按优先级从低到高）：

| 文件 | 用途 | 是否提交到 Git | 使用场景 |
|------|------|---------------|----------|
| `.env` | 所有环境的默认配置 | ✅ 是 | 团队共享的默认配置 |
| `.env.development` | 开发环境专用 | ✅ 是 | 开发环境的公共配置 |
| `.env.production` | 生产环境专用 | ✅ 是 | 生产环境的公共配置 |
| `.env.local` | 本地覆盖（所有环境） | ❌ 否 | 个人本地开发配置（推荐） |
| `.env.development.local` | 开发环境本地覆盖 | ❌ 否 | 个人开发环境配置 |
| `.env.production.local` | 生产环境本地覆盖 | ❌ 否 | 生产环境本地配置 |

### 必需的环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_AMAP_API_KEY` | 高德地图 JavaScript API Key | `80838eddfb922202b289fd1ad6fa4e58` |
| `VITE_AMAP_SECURITY_JS_CODE` | 高德地图安全密钥 | `a45b8fdd549065da27a9395c8d5d87bd` |
| `VITE_AMAP_WEB_API_KEY` | 高德地图 Web API Key | `a7a5be837d1645cd49c74a601187bc35` |

> **注意**：所有 Vite 环境变量必须以 `VITE_` 前缀开头，才能在客户端代码中通过 `import.meta.env.VITE_*` 访问。

---

## 📦 生产环境部署

### 方式一：静态文件部署（推荐）

1. **构建项目**：
   ```bash
   npm run build
   ```

2. **部署 `dist/` 目录**：
   - 将 `dist/` 目录中的文件部署到静态文件服务器（如 Nginx、Apache、CDN 等）
   - 配置服务器支持 SPA 路由（所有路由指向 `index.html`）

3. **Nginx 配置示例**：
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /path/to/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

### 方式二：Docker 部署

1. **创建 Dockerfile**：
   ```dockerfile
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **构建和运行**：
   ```bash
   docker build -t ai-tourism-frontend .
   docker run -d -p 80:80 ai-tourism-frontend
   ```

### 生产环境环境变量配置

在生产环境部署时，有两种方式配置环境变量：

#### 方式 A：使用 `.env.production` 文件

1. 创建 `.env.production` 文件（可以提交到 Git，但密钥建议使用占位符）
2. 在 CI/CD 或部署脚本中替换真实密钥

#### 方式 B：使用构建时环境变量（推荐）

在 CI/CD 中设置环境变量，构建时自动注入：

```bash
# 在 CI/CD 中设置环境变量
export VITE_AMAP_API_KEY=your_production_key
export VITE_AMAP_SECURITY_JS_CODE=your_production_security_code
export VITE_AMAP_WEB_API_KEY=your_production_web_key

# 构建项目
npm run build
```

---

## 🔗 相关项目

- **后端 API 服务**：[ai-tourism-backend](https://github.com/1937983507/ai-tourism-backend) - Spring Boot 后端服务，提供 API 网关、会话管理、用户认证等功能
- **Python Agent 服务**：[ai-tourism-agent](https://github.com/1937983507/ai-tourism-agent) - 包含所有 AI Agent 相关功能（LangGraph 工作流、工具调用、AI 对话处理等）

---

## 📝 开发说明

### API 接口调用

前端通过 `src/utils/api.js` 封装了所有 API 请求，主要接口包括：

- **用户认证**：`login()`、`register()`、`logout()`、`me()`
- **会话管理**：`fetchSessionList()`、`deleteSession()`、`renameSession()`
- **AI 对话**：`sendMessage()`（支持 SSE 流式响应）

### 地图服务配置

地图服务配置在 `src/utils/mapConfig.js` 中，支持：
- **高德地图**：需要配置 API Key 和安全密钥
- **OpenStreetMap**：无需配置，可直接使用

### 流式响应处理

前端通过 `EventSource` 接收后端 SSE 流式响应，实时展示 AI 回复内容。相关代码在 `src/components/ChatContainer.vue` 中。

---

## 🔒 安全注意事项

1. **API 密钥安全**：
   - ⚠️ **不要**将包含真实密钥的 `.env.local` 文件提交到 Git
   - ✅ 使用 `.env.example` 作为模板，只提交占位符
   - ✅ 在高德地图控制台设置域名白名单，限制 API Key 的使用范围
   - ✅ 定期轮换 API 密钥

2. **前端环境变量限制**：
   - ⚠️ 前端环境变量会打包进代码，用户可以通过浏览器查看
   - ✅ 这是前端应用的特性，无法完全避免
   - ✅ 通过设置 API Key 的域名白名单和调用频率限制来降低风险

3. **生产环境建议**：
   - 使用 HTTPS 部署
   - 配置 CORS 策略
   - 设置 API Key 的调用频率限制

---

## 📬 联系与贡献

欢迎任何建议、反馈与贡献！如需交流或有合作意向，欢迎通过以下方式联系：

- **微信**：`13859211947`
- **GitHub**：提交 Issue 或 PR 到本仓库
- **后端项目**：[ai-tourism-backend 仓库](https://github.com/1937983507/ai-tourism-backend)
- **Agent 项目**：[ai-tourism-agent 仓库](https://github.com/1937983507/ai-tourism-agent)

如有 Bug、需求或想法，欢迎随时提出，我们会积极响应。
也欢迎 Vue + AI 应用开发相关的同学一起交流讨论。

---

## 📝 License

本项目仅供学习使用，**禁止未经授权的商用**。

---

## 📋 TODO list

### 1. 前端功能优化
- [ ] 优化流式响应展示效果，提升用户体验
- [ ] 支持对话内容编辑和重新发送
- [ ] 添加对话示例 prompt，用户可直接选择使用
- [ ] 优化地图交互，支持更多地图操作

### 2. 用户体验优化
- [ ] 添加加载动画和骨架屏
- [ ] 优化移动端适配
- [ ] 添加错误提示和重试机制
- [ ] 支持主题切换（深色/浅色模式）

### 3. 功能扩展
- [ ] 支持路线规划结果导出为 H5 页面
- [ ] 地图上点击地点展示详细信息（含图片与文字说明）
- [ ] 支持跳转至各景点订单服务
- [ ] 添加帮助页面和使用指南
