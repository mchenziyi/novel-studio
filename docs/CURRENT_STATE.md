# 当前开发状态

> 最后更新: 2026-06-03

## 已完成功能

### 章节管理
- [x] 章节列表页 (`/chapters`)
- [x] 章节详情/编辑页 (`/chapters/[id]`)
- [x] 章节 CRUD API
- [x] SQLite 数据库存储
- [x] 文件系统双向同步
- [x] 版本历史（创建/查看/对比/回滚）
- [x] 自动保存（30秒间隔）
- [x] 手动保存（Cmd+S）
- [x] 字数统计
- [x] Markdown 预览
- [x] 内容格式化（去除多余空行）
- [x] 复制内容

### AI 编辑
- [x] AI 编辑侧边栏组件
- [x] 聊天式交互界面
- [x] 选中文字自动填入输入框
- [x] Diff 对比（字符/词/行三种模式）
- [x] 一键应用修改
- [x] `diff` 库动态导入（ESM 兼容）
- [x] ErrorBoundary 错误捕获

### Pipeline 自动化写作系统（新增）
- [x] **SSE 流式 Pipeline 引擎** — 从阻塞式串行改为实时推送每步进度
- [x] **多维审计系统** — 10 个维度审计（连续性/角色/资源/伏笔/节奏/情感/对话/AI痕迹/大纲/字数）
- [x] **自动修订循环** — 审计发现问题后自动调 Reviser，支持配置最大修订轮数（默认1轮）
- [x] **审计结果持久化** — `audit_results` + `audit_dimension_results` 表，按维度存储问题详情
- [x] **Pipeline SSE API** — `POST /api/agent/pipeline`，流式返回步骤事件
- [x] **审计结果 API** — `GET /api/agent/audit?chapterId=&latest=true`
- [x] **PipelineVisualizer 组件** — 实时展示各 Agent 步骤状态、修订标记、审计评分
- [x] **AuditDetail 组件** — 详细审计报告（分数/维度展开/问题分类/修复建议）
- [x] **usePipeline Hook** — 前端 SSE 消费层，管理 Pipeline 全生命周期状态
- [x] **Agent 工作台升级** — 集成 Pipeline 运行器，可配置修订轮数

### 基础设施
- [x] 根布局（Sidebar + main content）
- [x] 侧边栏导航
- [x] 数据库 schema 和迁移（含 audit 表）
- [x] ErrorBoundary 组件
- [x] 测试框架（Jest, 6 suites, 65 tests）

### 其他页面（基础框架）
- [x] 角色管理页 (`/characters`)
- [x] 大纲管理页 (`/outline`)
- [x] 伏笔追踪页 (`/foreshadowing`)
- [x] 情节线页 (`/plotlines`)
- [x] 搜索页 (`/search`)
- [x] 统计页 (`/stats`)
- [x] 设置页 (`/settings`)
- [x] Agent 工作台 (`/agent`)
- [x] Agent 对话 (`/agent/chat`)

## 进行中

### 章节编辑器布局问题
- **状态**: 部分修复
- **问题**: 主内容区 textarea 高度不正确，只显示 1-2 行
- **临时修复**: 主内容区 div 使用 `style={{flex:1,minHeight:0}}` 替代 `className="flex-1 flex overflow-hidden"`
- **根因**: Tailwind CSS 的 `flex-1` + `overflow-hidden` 组合在 Turbopack 编译后表现异常

## 未开始

- [ ] 真理文件系统 — 人类可读的 Markdown 真相文件视图（参考 inkos TruthFiles）
- [ ] 真理文件查看/编辑页面
- [ ] Settler 自动同步真理文件
- [ ] 角色关系图可视化 (D3.js)
- [ ] 伏笔追踪可视化
- [ ] 情节线时间线
- [ ] 写作进度图表
- [ ] E2E 测试 (Playwright)
- [ ] 生产环境部署
- [ ] 多人协作

## 数据状态

- 章节: 74 章已导入数据库
- 角色: 已从角色矩阵导入
- 伏笔: 已从伏笔池导入
- 大纲: 已导入
- 版本历史: 章节编辑后自动创建

## 测试状态

- 测试框架: Jest + jsdom
- 测试文件: `__tests__/` 目录
- 测试结果: 6 suites, 65 tests 全部通过
- 覆盖范围: API routes, lib 工具函数, 组件基础渲染
- **注意**: 无 E2E 测试，无法覆盖浏览器端渲染问题
