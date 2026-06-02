# Novel Studio - 项目总结

## 项目简介

Novel Studio 是一个 AI 驱动的小说写作平台，用于管理小说《开局屠村现场-他们说我疯了》的写作工作流。集成了章节管理、角色管理、伏笔追踪、大纲管理、AI Agent 写作等功能。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 16.2.6 |
| React | React | 19.2.4 |
| 语言 | TypeScript | - |
| 样式 | Tailwind CSS | - |
| 数据库 | SQLite (better-sqlite3) | - |
| 可视化 | D3.js + Recharts | - |
| AI SDK | Vercel AI SDK | 6.x |
| Diff | diff 库 | 9.0.0 (ESM-only) |
| 构建 | Turbopack | - |

## 项目结构

```
novel-studio/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局（Sidebar + main）
│   ├── page.tsx                  # 首页/仪表盘
│   ├── globals.css               # 全局样式
│   ├── chapters/                 # 章节管理
│   │   ├── page.tsx              # 章节列表
│   │   └── [id]/
│   │       ├── page.tsx          # 章节详情（Server Component）
│   │       └── chapter-editor.tsx # 章节编辑器（Client Component）
│   ├── characters/               # 角色管理
│   ├── outline/                  # 大纲管理
│   ├── foreshadowing/            # 伏笔追踪
│   ├── plotlines/                # 情节线
│   ├── search/                   # 搜索
│   ├── stats/                    # 统计
│   ├── settings/                 # 设置
│   ├── agent/                    # Agent 工作台
│   └── api/                      # API Routes
│       ├── chapters/             # 章节 CRUD + 历史 + 回滚
│       ├── characters/           # 角色 CRUD
│       ├── outline/              # 大纲 CRUD
│       ├── foreshadowing/        # 伏笔 CRUD
│       ├── agent/                # Agent 调用
│       ├── ai/                   # AI 编辑
│       ├── git/                  # Git 操作
│       ├── files/                # 文件读写
│       ├── models/               # 模型配置
│       ├── search/               # 搜索
│       ├── settings/             # 设置
│       └── migration/            # 数据库迁移
├── components/                   # 共享组件
│   ├── layout/                   # Sidebar 等布局组件
│   ├── chapters/                 # 章节组件（ai-edit-sidebar 等）
│   ├── characters/               # 角色组件
│   ├── visualization/            # 可视化组件
│   ├── git/                      # Git 组件
│   ├── agent/                    # Agent 组件
│   ├── ui/                       # 通用 UI 组件
│   └── error-boundary.tsx        # React Error Boundary
├── lib/                          # 工具库
│   ├── file-system.ts            # 文件/数据库操作
│   ├── database.ts               # 数据库连接
│   ├── db-migration.ts           # 数据库迁移
│   ├── version-control.ts        # 版本管理
│   ├── git.ts                    # Git 操作
│   ├── models.ts                 # AI 模型配置
│   ├── novel-pro.ts              # novel-pro 集成
│   ├── parsers.ts                # Markdown 解析
│   ├── settings.ts               # 设置管理
│   └── utils.ts                  # 工具函数
├── stores/                       # Zustand 状态管理
├── types/                        # TypeScript 类型定义
├── .data/                        # SQLite 数据库文件
├── docs/                         # 项目文档
└── __tests__/                    # 测试文件
```

## 核心模块说明

### 数据存储

- **SQLite 数据库**: `.data/novel-studio.db`，存储章节、角色、大纲等结构化数据
- **文件系统**: 原始 Markdown 文件存储在 `chapters/` 目录（与数据库双向同步）
- **版本历史**: `chapters/.history/` 目录存储章节历史版本 JSON

### 章节管理 (`/chapters`)

- 章节列表：按章号排序，显示标题、字数、状态
- 章节编辑器：textarea 编辑 + Markdown 预览
- 版本历史：查看/对比/回滚历史版本
- AI 编辑侧边栏：选中文字后调用 AI 修改
- 自动保存：每 30 秒自动保存（可关闭）
- 快捷键：`Cmd+S` 手动保存

### AI 编辑 (`components/chapters/ai-edit-sidebar.tsx`)

- 聊天式交互：用户输入修改要求，AI 返回修改建议
- Diff 对比：支持字符/词/行三种粒度的 diff 展示
- 一键应用：点击"应用修改"直接替换编辑器内容
- `diff` 库使用动态 import（`await import('diff')`），避免 SSR 问题

### Agent 系统 (`/agent`)

集成 novel-pro 的 7 个 Agent：
1. **Planner**: 生成章节意图
2. **Composer**: 压缩上下文包
3. **Writer**: 生成正文
4. **Observer**: 提取事实变化
5. **Settler**: 写总账并刷新快照
6. **Auditor**: 审计正文
7. **Reviser**: 定点修订

### Git 集成

- Git 状态查看
- Git Diff 对比
- Git 提交历史
- Git 分支管理

## 开发命令

```bash
npm run dev          # 启动开发服务器 (Turbopack)
npm run build        # 构建生产版本
npm run test         # 运行测试
npm run test:watch   # 监听模式测试
npm run lint         # ESLint 检查
```

## 环境变量

`.env.local` 中配置：
```
ANTHROPIC_API_KEY=xxx      # Claude API
OPENAI_API_KEY=xxx         # OpenAI API
DEEPSEEK_API_KEY=xxx       # DeepSeek API
```

## 与原小说项目的关系

Novel Studio 读写的数据位于 `../开局屠村现场-他们说我疯了/` 目录：
- `chapters/` - 章节 Markdown 文件
- `故事/` - 角色矩阵、伏笔池、大纲等
- `00-大纲.md` - 小说大纲

数据库 (`.data/novel-studio.db`) 是 Novel Studio 自己的，首次运行需要通过 migration API 导入数据。
