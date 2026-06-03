# Vue 3 前端设计 — Novel Studio v2

## 设计哲学

> **关键词：简洁 · 专注 · 可对比 · 可收缩**

核心操作「写 + 聊 + 对比」。版本历史和编辑区必须并列可视，导航可收缩释放空间。

---

## 一、全局布局

### 1.1 Sidebar（可收缩）

```
展开态（200px）                    收缩态（56px）
┌───────────┬─────────────┐       ┌────┬─────────────────┐
│ 📖 Novel  │             │       │ 📖  │                 │
│ ────────  │             │       │ ──  │                 │
│ 🏠 首页   │             │       │ 🏠  │                 │
│ 📄 章节   │  Main       │       │ 📄  │  Main           │
│ 💬 聊天   │             │       │ 💬  │                 │
│ 👤 角色   │             │       │ 👤  │                 │
│ 🪝 伏笔   │             │       │ 🪝  │                 │
│ 📋 大纲   │             │       │ 📋  │                 │
│ 📈 情节线 │             │       │ 📈  │                 │
│ ────────  │             │       │ ──  │                 │
│ 🔍 搜索   │             │       │ 🔍  │                 │
│ 📊 统计   │             │       │ 📊  │                 │
│ ⚙ 设置   │             │       │ ⚙  │                 │
└───────────┴─────────────┘       └────┴─────────────────┘
```

- 展开：200px，显示图标 + 文字
- 收缩：56px，仅图标 + tooltip
- 切换按钮固定在侧栏顶部（汉堡图标）
- 折叠态时鼠标悬停可临时展开（可选）

### 1.2 配色

```
背景:        #fafafa (main) / #f5f5f5 (sidebar)
卡片:        #ffffff
文字主:      #1a1a1a
文字辅:      #666666
边框:        #e5e5e5
强调色:      #171717（纯黑）
成功:        #2e7d32
警告:        #e65100
错误:        #c62828
```

**只用黑白灰，不用彩色。** 写作工具不需要颜色分散注意力。

### 1.3 间距

| 名称 | 值 | 用途 |
|------|-----|------|
| xs | 4px | 紧凑元素间 |
| sm | 8px | 图标与文字 |
| md | 16px | 卡片内边距 |
| lg | 24px | 页面内边距 |
| xl | 32px | 区块间距 |
| 2xl | 48px | 大区块间距 |

---

## 二、页面设计

### 2.1 首页 `/`

```
┌──────────────────────────────────────────┐
│  # 仪表盘                                 │
│                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ 75   │ │232k  │ │14    │ │0     │    │
│  │ 章节 │ │总字数│ │角色  │ │伏笔  │    │
│  └──────┘ └──────┘ └──────┘ └──────┘    │
│                                          │
│  最近更新                                 │
│  ┌──────────────────────────────────┐    │
│  │ 0075 · 大周天 · 2648字 · 2天前  │    │
│  │ 0074 · 灰香   · 2500字 · 3天前  │    │
│  │ ...                             │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

三态：
- **加载**：`<n-spin>` 居中
- **空**：不适用（默认小说始终存在）
- **错误**：`<n-result status="error">` + 重试按钮

### 2.2 章节列表 `/chapters`

三态：
- **加载**：骨架屏（4 个灰色矩形）
- **空**：「还没有章节，点击新建开始写作」+ 新建按钮
- **错误**：Toast 提示 + 重试

### 2.3 章节编辑器 `/chapters/:id` ⭐核心

```
┌──────────────────────────────────────────────────────────────┐
│ ← 返回    # 0075 · 大周天    2648字    [保存 Ctrl+S]         │
├──────────────────────────────────────────────────────────────┤
│ ┌─ 版本历史（250px）──────┐ ┌─ Diff 对比区（剩余宽度）─────┐ │
│ │                         │ │                              │ │
│ │ ● v3  2小时前  agent    │ │  @@ -15,7 +15,8 @@           │ │
│ │   重写了养气术段落       │ │                              │ │
│ │ ○ v2  昨天     manual   │ │  第二天。辰时。               │ │
│ │   修改了结尾             │ │ -周醒坐在住处的板床上，       │ │
│ │ ○ v1  3天前    agent    │ │ -膝盖上摊着薄册。             │ │
│ │   初稿                   │ │ +周醒盘腿坐在板床上，         │ │
│ │                         │ │ +膝盖上摊着一本泛黄的薄册。    │ │
│ │                         │ │  养气术进阶，第三层。          │ │
│ │                         │ │  ...                          │ │
│ │ 点击 ● → 右侧显示该版本  │ │                              │ │
│ │   与当前内容的 diff       │ │  [← 还原到此版本]             │ │
│ └─────────────────────────┘ └──────────────────────────────┘ │
│                          ↕ 拖拽调整分栏宽度                    │
├──────────────────────────────────────────────────────────────┤
│ ┌─ AI 聊天（高 240px，可拖拽）─────────────────────────────┐ │
│ │  💬 🤖 ···                                               │ │
│ │  [输入框 .........................................] [发送]│ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**交互流程**：

```
1. 用户修改了当前章节内容（编辑区有未保存改动）
2. 打开版本面板（默认显示最近 10 个版本）
3. 点击 v2 → 右侧 Diff 区对比 v2 与当前编辑区内容
   - 撤回的段落：红色背景 / 删除线
   - 新增的段落：绿色背景
   - 未变内容：灰色
4. 用户浏览 diff，决定是否还原
5. 点击 [还原到此版本] → 确认弹窗 → 编辑区替换为 v2 内容
   → 自动创建新版本（来源：rollback）
```

**版本列表细节**：
- 当前版本高亮（蓝色左边框）
- 选中版本高亮（深色背景）
- 每个版本显示：来源图标（agent/手动/回滚）、时间、一句话描述

**Diff 显示**：
- 默认逐行对比（inline diff）
- 可选切换为左右并列（side-by-side）
- 纯 Go 后端做 diff（当前已有 `/api/chapters/:id/diff?from=v1&to=v2`），前端请求 JSON 展示

**API 调用**：
- `GET /api/chapters/:id/history` → 版本列表
- `GET /api/chapters/:id/diff?from=v2&to=current` → diff JSON
- `POST /api/chapters/:id/rollback` → 还原到指定版本

三态：
- **加载**：左右各显示骨架
- **空版本**：「尚无历史版本，保存后自动记录」
- **Diff 错误**：「无法计算差异」+ 显示纯文本内容

### 2.4 AI 聊天 `/agent/chat`

```
┌────────────────┬──────────────────────────┐
│ 对话列表(280px)│ 聊天区                    │
│ ────────────── │                          │
│ 💬 写 76 章    │  用户: 帮我写 76 章      │
│ 💬 审计 75 章  │                           │
│ 💬 角色讨论    │  AI: 好的……               │
│ ...           │  [📝 getChapter]          │
│               │  [💾 saveChapter]         │
│ [+ 新对话]    │                           │
│               │  [输入框.........] [发送]  │
└────────────────┴──────────────────────────┘
```

三态：
- **加载会话列表**：左侧骨架
- **空会话**：「还没有对话，开始和 AI 聊聊吧」
- **错误**：Toast

### 2.5 其他页面（统一布局）

```
┌─────────────────────────────────┐
│  # 页面标题     [+ 操作按钮]     │
├─────────────────────────────────┤
│  [内容区 — 表格 / 表单 / 编辑器]│
└─────────────────────────────────┘
```

| 页面 | 内容 | 三态 |
|------|------|------|
| 角色 `/characters` | n-data-table + 右侧 Drawer | 加载骨架 / 空提示 / Toast |
| 伏笔 `/foreshadowing` | n-data-table + 状态 tabs | 同上 |
| 大纲 `/outline` | Markdown 编辑器 | 同上 |
| 情节线 `/plotlines` | n-data-table | 同上 |
| 搜索 `/search` | 输入框 + 章节列表 | 空搜索提示 / 无结果提示 |
| 统计 `/stats` | 同首页卡片 | 加载 |
| 设置 `/settings` | n-tabs(模型/文风/规范) | 加载 |

---

## 三、组件树

```
App.vue
├── AppSidebar.vue              ← 可收缩
│   ├── SidebarToggle.vue       ← 收缩按钮
│   ├── NovelSelector.vue
│   └── NavItem.vue × 10
├── RouterView
│   ├── HomePage.vue
│   │   ├── StatCard.vue × 4
│   │   └── RecentTable.vue
│   ├── ChaptersPage.vue
│   │   └── ChapterCard.vue × N
│   ├── ChapterEditorPage.vue ⭐
│   │   ├── EditorTopBar.vue         ← 标题、字数、保存按钮
│   │   ├── VersionPanel.vue         ← 左侧 250px，版本列表
│   │   │   └── VersionItem.vue      ← 单条版本：来源图标 + 时间 + 描述 + 选中态
│   │   ├── EditorPanel.vue          ← 右侧，可编辑当前版本（正常模式）
│   │   │                        或 显示 diff 对比（选中历史版本时）
│   │   │   └── VersionDiff.vue      ← 选中版本时覆盖显示：逐行 diff + [还原] 按钮
│   │   ├── ResizeHandle.vue         ← 拖拽手柄 × 2
│   │   └── ChatPanel.vue            ← 底部 240px，SSE 聊天
│   │       ├── MessageBubble.vue
│   │       └── ToolCallBadge.vue
│   ├── AgentChatPage.vue
│   │   ├── SessionList.vue
│   │   └── ChatPanel.vue (复用)
│   ├── CharactersPage.vue
│   ├── ForeshadowingPage.vue
│   ├── OutlinePage.vue
│   ├── PlotlinesPage.vue
│   ├── SearchPage.vue
│   ├── StatsPage.vue
│   └── SettingsPage.vue
└── AppProvider.vue              ← n-message-provider + n-dialog-provider
```

---

## 四、SSE 工具调用状态机

```
tool_start → [pending]  灰色闪烁 badge + 工具名
    ↓
tool_end   → [done]     绿色 badge + 结果摘要（可展开）
    ↓       → [error]    红色 badge + 错误信息
```

```ts
// composables/useSSE.ts
interface ToolCallState {
  name: string
  status: 'pending' | 'done' | 'error'
  input?: string
  output?: string
}

export function useSSE(url: string) {
  const text = ref('')
  const toolCalls = ref<ToolCallState[]>([])
  const isDone = ref(false)
  const error = ref('')

  async function connect(body: object) {
    text.value = ''
    toolCalls.value = []
    isDone.value = false
    error.value = ''

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!resp.ok) { error.value = '请求失败'; return }

    const reader = resp.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = JSON.parse(line.slice(6))
        switch (data.type) {
          case 'chunk': text.value += data.text; break
          case 'tool_start':
            toolCalls.value.push({ name: data.toolName, status: 'pending', input: data.toolInput })
            break
          case 'tool_end':
            const tc = toolCalls.value.find(t => t.name === data.toolName && t.status === 'pending')
            if (tc) { tc.status = 'done'; tc.output = data.toolOutput }
            break
          case 'error':
            error.value = data.error
            break
          case 'done':
            isDone.value = true
            break
        }
      }
    }
  }

  return { text, toolCalls, isDone, error, connect }
}
```

---

## 五、状态管理（Pinia）

```ts
stores/
  novel.ts       // currentNovelId, novels[], switchNovel(id)
  chapters.ts    // chapters[], current, loadList(), loadOne(id), save(id, content)
  chat.ts        // sessions[], currentSessionId, messages[], send(msg), loadHistory(sid)
  settings.ts    // models[], activeStyle, configs
```

---

## 六、路由

```ts
const routes = [
  { path: '/',              component: () => import('@/pages/HomePage.vue') },
  { path: '/chapters',      component: () => import('@/pages/ChaptersPage.vue') },
  { path: '/chapters/:id',  component: () => import('@/pages/ChapterEditorPage.vue') },
  { path: '/agent/chat',    component: () => import('@/pages/AgentChatPage.vue') },
  { path: '/characters',    component: () => import('@/pages/CharactersPage.vue') },
  { path: '/foreshadowing', component: () => import('@/pages/ForeshadowingPage.vue') },
  { path: '/outline',       component: () => import('@/pages/OutlinePage.vue') },
  { path: '/plotlines',     component: () => import('@/pages/PlotlinesPage.vue') },
  { path: '/search',        component: () => import('@/pages/SearchPage.vue') },
  { path: '/stats',         component: () => import('@/pages/StatsPage.vue') },
  { path: '/settings',      component: () => import('@/pages/SettingsPage.vue') },
]
```

全部 lazy load。

---

## 七、目录结构

```
web/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   │   └── index.ts
│   ├── stores/
│   │   ├── novel.ts
│   │   ├── chapters.ts
│   │   ├── chat.ts
│   │   └── settings.ts
│   ├── api/
│   │   └── client.ts          ← fetch wrapper，自动拼接 novelId
│   ├── composables/
│   │   └── useSSE.ts
│   ├── pages/
│   │   ├── HomePage.vue
│   │   ├── ChaptersPage.vue
│   │   ├── ChapterEditorPage.vue
│   │   ├── AgentChatPage.vue
│   │   ├── CharactersPage.vue
│   │   ├── ForeshadowingPage.vue
│   │   ├── OutlinePage.vue
│   │   ├── PlotlinesPage.vue
│   │   ├── SearchPage.vue
│   │   ├── StatsPage.vue
│   │   └── SettingsPage.vue
│   └── components/
│       ├── layout/
│       │   ├── AppSidebar.vue
│       │   ├── SidebarToggle.vue
│       │   ├── NovelSelector.vue
│       │   └── NavItem.vue
│       ├── editor/
│       │   ├── EditorTopBar.vue
│       │   ├── VersionPanel.vue
│       │   ├── EditorPanel.vue
│       │   ├── VersionDiff.vue
│       │   └── ResizeHandle.vue
│       ├── chat/
│       │   ├── ChatPanel.vue
│       │   ├── MessageBubble.vue
│       │   ├── ToolCallBadge.vue
│       │   └── SessionList.vue
│       └── shared/
│           ├── StatCard.vue
│           ├── RecentTable.vue
│           ├── ChapterCard.vue
│           └── PageHeader.vue
```

---

## 八、实施顺序

1. **Vite + Vue + Naive UI 脚手架**（30 分钟）
2. **Layout + 可收缩 Sidebar + Router**（1 小时）
3. **首页仪表盘**（30 分钟）
4. **章节编辑器**（3 小时）⭐ — 最复杂：三区布局 + 拖拽分栏 + 版本加载 + Diff
5. **ChatPanel 复用组件**（1 小时）— SSE + ToolCall 状态机
6. **AI 聊天页面**（30 分钟）— 复用 ChatPanel + SessionList
7. **其他 7 个页面**（2 小时）
8. **Go embed 集成**（30 分钟）

**总计：~9 小时**
