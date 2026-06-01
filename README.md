# Novel Studio - 小说写作 Agent 平台

一个专为网络小说创作设计的全栈写作平台，集成 AI Agent 架构，支持多模型调用，提供完整的可视化功能。

## 项目简介

Novel Studio 是为了解决 CLI + 编辑器写作方式的不便而创建的 Web 写作平台，支持任意网络小说项目的创作管理。

### 核心特性

- **完整的写作界面** - 章节管理、大纲、角色、伏笔追踪
- **AI Agent 集成** - 7 个专业 Agent，支持完整工作流
- **ChatAgent** - 聊天式写作助手，边聊边写
- **版本控制** - 章节级版本管理，支持 Diff 对比和回滚
- **全文搜索** - 搜索章节内容、角色、伏笔
- **数据可视化** - 角色关系图、伏笔时间线、写作统计

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Next.js 14 (App Router) | 全栈框架 |
| 语言 | TypeScript | 类型安全 |
| 样式 | Tailwind CSS | 快速 UI 开发 |
| 状态管理 | Zustand | 轻量级状态管理 |
| 版本控制 | simple-git | Git 集成 |
| AI 集成 | Vercel AI SDK | 多模型支持 |

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装

```bash
# 克隆项目
git clone https://github.com/mchenziyi/novel-studio.git
cd novel-studio

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，配置 API key
```

### 配置环境变量

编辑 `.env.local` 文件：

```env
# Claude API (Anthropic)
ANTHROPIC_API_KEY=your_claude_api_key

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_api_key

# 小说项目路径
NOVEL_PROJECT_PATH=/path/to/your/novel/project

# 使用模拟 API（未配置真实 key 时）
USE_MOCK_API=true
```

### 启动

```bash
# 开发模式
npm run dev

# 生产构建
npm run build
npm start
```

访问 http://localhost:3000

### Docker 运行

```bash
# 构建 Docker 镜像
docker build -t novel-studio .

# 运行容器
docker run -d \
  --name novel-studio \
  -p 3000:3000 \
  -v /path/to/your/novel/project:/app/novel-data \
  -e ANTHROPIC_API_KEY=your_claude_api_key \
  -e OPENAI_API_KEY=your_openai_api_key \
  -e DEEPSEEK_API_KEY=your_deepseek_api_key \
  -e NOVEL_PROJECT_PATH=/app/novel-data \
  novel-studio

# 使用 Docker Compose
docker-compose up -d
```

访问 http://localhost:3000

## 功能模块

### 1. 仪表盘 (`/`)

项目概览页面，展示：
- 总章数、总字数、当前进度
- 角色数量、伏笔数量
- 最近编辑章节
- 快速操作入口
- 写作进度条

### 2. 章节管理 (`/chapters`)

完整的章节管理功能：
- **章节列表** - 按章号排序，显示标题、字数、状态
- **搜索筛选** - 支持按标题搜索，按状态筛选
- **章节编辑器**：
  - 字数/字符实时统计
  - 自动保存（30 秒间隔）
  - 键盘快捷键 `⌘S` 保存
  - Markdown 预览模式
- **版本控制**：
  - 版本历史列表
  - 版本 Diff 对比（高亮显示修改）
  - 版本回滚

### 3. 全文搜索 (`/search`)

强大的搜索功能：
- 搜索章节内容、角色、伏笔
- 高亮显示匹配内容
- 类型筛选（全部/章节/角色/伏笔）
- 搜索结果按相关度排序

### 4. 角色管理 (`/characters`)

角色信息管理：
- 角色列表（14 个角色）
- 搜索功能
- 角色详情：描述、关系、出场章节
- 角色关系图（Canvas 绘制）

### 5. 伏笔追踪 (`/foreshadowing`)

伏笔管理（109 个伏笔）：
- **三种视图模式**：
  - 列表视图：详细信息展示
  - 时间线视图：按章节分布
  - 统计视图：状态分布、章节分布
- **状态筛选**：已埋设/推进中/已回收
- **搜索功能**：按名称、描述搜索
- **统计卡片**：总数、各状态数量、回收率

### 6. 大纲管理 (`/outline`)

大纲结构化展示：
- 三栏布局：卷列表、章节列表、章节详情
- 支持 5 卷大纲

### 7. 写作统计 (`/stats`)

数据分析和可视化：
- 总字数、章数、平均字数
- 字数分布图表
- 极值统计（最长/最短章节）
- 章节字数柱状图
- 章节详情表格

### 8. Agent 工作台 (`/agent`)

AI Agent 集成：
- **7 个专业 Agent**：
  - Planner - 生成章节意图
  - Composer - 压缩上下文包
  - Writer - 生成正文
  - Observer - 提取事实变化
  - Settler - 写总账并刷新快照
  - Auditor - 审计正文
  - Reviser - 定点修订
- **工作流执行**：一键运行完整写作流程
- **步骤可视化**：实时显示执行状态

### 9. ChatAgent (`/agent/chat`)

聊天式写作助手：
- **4 种模式**：
  - 头脑风暴 - 讨论情节、角色、世界观
  - 写作 - 生成章节内容
  - 编辑 - 改进现有内容
  - 分析 - 分析章节质量
- **模型选择**：Claude / DeepSeek / GPT
- **实时 Diff**：修改内容即时对比
- **保存功能**：一键保存到章节

### 10. 设置 (`/settings`)

- 模型配置
- 环境变量参考
- 项目信息

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `⌘S` | 保存章节 |
| `⌘/` | 打开搜索 |
| `⌘H` | 返回仪表盘 |
| `⌘C` | 章节管理 |
| `⌘A` | Agent 工作台 |
| `⌘G` | ChatAgent |
| `⇧?` | 显示快捷键帮助 |
| `ESC` | 关闭弹窗 |

## 项目结构

```
novel-studio/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 仪表盘
│   ├── chapters/          # 章节管理
│   ├── characters/        # 角色管理
│   ├── foreshadowing/     # 伏笔追踪
│   ├── outline/           # 大纲管理
│   ├── plotlines/         # 情节线
│   ├── search/            # 搜索
│   ├── stats/             # 统计
│   ├── agent/             # Agent 工作台
│   │   └── chat/          # ChatAgent
│   ├── settings/          # 设置
│   └── api/               # API 路由
├── components/            # 组件
│   ├── ui/                # UI 组件
│   ├── layout/            # 布局组件
│   ├── agent/             # Agent 组件
│   ├── git/               # Git 组件
│   └── visualization/     # 可视化组件
├── lib/                   # 工具库
│   ├── file-system.ts     # 文件操作
│   ├── version-control.ts # 版本控制
│   ├── git.ts             # Git 操作
│   ├── models.ts          # AI 模型
│   └── novel-pro.ts       # Agent 定义
├── stores/                # Zustand 状态
├── types/                 # TypeScript 类型
└── hooks/                 # 自定义 Hooks
```

## API 接口

### 章节相关
- `GET /api/chapters` - 获取章节列表
- `GET /api/chapters/[id]` - 获取单个章节
- `PUT /api/chapters/[id]` - 更新章节
- `GET /api/chapters/[id]/history` - 获取版本历史
- `GET /api/chapters/[id]/diff` - 获取版本 Diff
- `POST /api/chapters/[id]/rollback` - 回滚版本

### 数据相关
- `GET /api/characters` - 获取角色列表
- `GET /api/foreshadowing` - 获取伏笔列表
- `GET /api/outline` - 获取大纲
- `GET /api/files` - 获取同步状态

### 搜索
- `GET /api/search?q=keyword` - 全文搜索

### Agent
- `POST /api/agent/planner` - 运行 Planner
- `POST /api/agent/writer` - 运行 Writer
- `POST /api/agent/workflow` - 运行完整工作流
- `POST /api/agent/chat` - ChatAgent 对话

### Git
- `GET /api/git/status` - Git 状态
- `GET /api/git/log` - 提交历史
- `POST /api/git/commit` - 创建提交

## 开发说明

### 本地开发

```bash
# 启动开发服务器
npm run dev

# 构建检查
npm run build

# 代码检查
npm run lint
```

### 添加新页面

1. 在 `app/` 目录创建页面文件
2. 在 `components/layout/sidebar.tsx` 添加导航链接
3. 如需 API，在 `app/api/` 创建路由

### 添加新 Agent

1. 在 `lib/novel-pro.ts` 添加 Agent 定义
2. 在 `app/api/agent/` 创建 API 路由
3. 更新 Agent 工作台页面

## 常见问题

### Q: API key 未配置怎么办？

A: 在 `.env.local` 中设置 `USE_MOCK_API=true`，系统会返回模拟响应。

### Q: 如何连接真实的小说项目？

A: 修改 `.env.local` 中的 `NOVEL_PROJECT_PATH` 指向你的小说项目目录。

### Q: 支持哪些 AI 模型？

A: 支持 Claude (Anthropic)、DeepSeek、GPT (OpenAI)。

## 许可证

MIT License

## 作者

- GitHub: [mchenziyi](https://github.com/mchenziyi)

## 致谢

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [simple-git](https://github.com/steveukx/git-js)
