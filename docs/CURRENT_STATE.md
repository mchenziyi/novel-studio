# 当前开发状态

> 最后更新: 2026-06-01

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

### 基础设施
- [x] 根布局（Sidebar + main content）
- [x] 侧边栏导航
- [x] 数据库 schema 和迁移
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

- [ ] Agent 系统实际调用 AI 模型
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
