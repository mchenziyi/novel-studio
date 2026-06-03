# Novel Studio v2 — 架构设计文档

## 技术选型

| 层 | v1 (当前) | v2 (目标) |
|---|---|---|
| 前端 | Next.js 16 + React | Vue 3 + Vite + Pinia + Naive UI |
| 后端 | Next.js Route Handler | Go 1.22 + Gin |
| Agent | AI SDK (JS) + 手撸循环 | Eino (字节 CloudWeGo) |
| 数据库 | SQLite (better-sqlite3) | SQLite (mattn/go-sqlite3) |
| 文件服务 | Node.js fs | Go embed/os |
| 部署 | Vercel / Node | 单二进制 / Docker |

---

## 一、后端项目结构

```
novel-studio-go/
├── cmd/
│   └── server/
│       └── main.go                  # 入口
├── internal/
│   ├── config/
│   │   └── config.go                # 配置（YAML/ENV）
│   ├── database/
│   │   ├── db.go                    # SQLite 连接池 & 迁移
│   │   └── migrations/
│   │       └── 001_init.sql         # 初始建表
│   ├── models/                      # 数据模型（映射表）
│   │   ├── novel.go
│   │   ├── chapter.go
│   │   ├── character.go
│   │   ├── foreshadowing.go
│   │   ├── outline.go
│   │   ├── chat.go
│   │   ├── memory.go
│   │   ├── style.go
│   │   ├── model_config.go
│   │   └── story.go                 # facts/hooks/summaries/state
│   ├── repository/                  # 数据访问层（每个表一个 file）
│   │   ├── novel_repo.go
│   │   ├── chapter_repo.go
│   │   ├── chapter_version_repo.go
│   │   ├── character_repo.go
│   │   ├── character_relation_repo.go
│   │   ├── foreshadowing_repo.go
│   │   ├── outline_repo.go
│   │   ├── chat_repo.go
│   │   ├── memory_repo.go
│   │   ├── style_repo.go
│   │   ├── model_config_repo.go
│   │   ├── story_fact_repo.go
│   │   ├── story_hook_repo.go
│   │   ├── story_summary_repo.go
│   │   ├── story_character_repo.go
│   │   ├── story_state_repo.go
│   │   ├── story_plotline_repo.go
│   │   ├── story_resource_repo.go
│   │   └── story_sync_repo.go
│   ├── service/                     # 业务逻辑层
│   │   ├── chapter_service.go       # 章节 CRUD + 版本管理
│   │   ├── character_service.go
│   │   ├── foreshadowing_service.go
│   │   ├── outline_service.go
│   │   ├── chat_service.go          # 会话管理
│   │   ├── memory_service.go
│   │   ├── style_service.go         # 文风指纹分析
│   │   ├── model_service.go         # 模型配置管理
│   │   ├── story_service.go         # 故事数据同步
│   │   ├── search_service.go        # 全文搜索
│   │   └── migration_service.go     # v1 数据迁移
│   ├── handler/                     # HTTP handler（每个路由组一个 file）
│   │   ├── novel_handler.go
│   │   ├── chapter_handler.go
│   │   ├── character_handler.go
│   │   ├── foreshadowing_handler.go
│   │   ├── outline_handler.go
│   │   ├── chat_handler.go          # 会话 CRUD
│   │   ├── agent_handler.go         # Agent 聊天 SSE 流
│   │   ├── style_handler.go
│   │   ├── model_handler.go
│   │   ├── search_handler.go
│   │   ├── git_handler.go
│   │   ├── plotline_handler.go
│   │   └── migration_handler.go
│   ├── agent/                       # Eino Agent 系统
│   │   ├── tools.go                 # 工具定义（映射到 Eino Tool）
│   │   ├── graph.go                 # Eino Graph 编排（novel-pro 流程）
│   │   ├── nodes/                   # 各步骤的 Lambda/Chain 实现
│   │   │   ├── gate.go              # 门禁检查
│   │   │   ├── reader.go            # 读上下文
│   │   │   ├── planner.go           # 规划
│   │   │   ├── composer.go          # 组合
│   │   │   ├── writer.go            # 写作
│   │   │   ├── observer.go          # 观察
│   │   │   ├── settler.go           # 沉淀
│   │   │   └── auditor.go           # 审计
│   │   └── prompt.go                # 系统提示模板
│   ├── middleware/
│   │   ├── cors.go
│   │   ├── logger.go
│   │   └── recovery.go
│   └── router/
│       └── router.go                # 路由注册
├── web/                             # Vue 前端（build 产物嵌入二进制）
├── data/                            # 小说数据文件（可选，从 v1 迁移）
├── go.mod
├── go.sum
├── Makefile
└── Dockerfile
```

---

## 二、API 路由设计

### 章节

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/chapters?novelId=xxx | 获取所有章节列表 |
| POST | /api/chapters/create | 创建新章节 |
| GET | /api/chapters/:id | 获取章节详情（内容+元数据） |
| PUT | /api/chapters/:id | 更新章节内容 |
| DELETE | /api/chapters/:id | 删除章节 |
| GET | /api/chapters/:id/history | 获取版本历史 |
| GET | /api/chapters/:id/diff?from=v1&to=v2 | 获取版本差异 |
| POST | /api/chapters/:id/rollback | 回滚到指定版本 |

### Agent

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/agent/chat | 流式 SSE 聊天（主要入口） |
| GET | /api/agent/chat?sessionId=xxx | 获取历史消息 |
| GET | /api/agent/chat?novelId=xxx&chapterId=xxx | 获取章节关联对话 |
| DELETE | /api/agent/chat/:sessionId | 删除/恢复会话 |

### 角色

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/characters?novelId=xxx | 获取角色列表 |
| POST | /api/characters | 创建角色 |
| PUT | /api/characters/:id | 更新角色 |

### 伏笔

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/foreshadowing?novelId=xxx | 获取伏笔列表 |
| POST | /api/foreshadowing | 创建伏笔 |
| PUT | /api/foreshadowing/:id | 更新伏笔 |

### 大纲

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/outline?novelId=xxx | 获取大纲 |
| PUT | /api/outline | 更新大纲 |

### 小说

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/novels | 获取小说列表 |
| POST | /api/novels | 创建小说 |
| PUT | /api/novels/:id | 更新小说信息 |
| GET | /api/novels/:id/config | 获取写作配置 |
| PUT | /api/novels/:id/config | 更新写作配置 |

### 文风

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/style?novelId=xxx | 获取文风列表 |
| POST | /api/style | 导入/创建文风 |
| PUT | /api/style/:id | 更新文风 |
| DELETE | /api/style/:id | 删除文风 |
| POST | /api/style/:id/activate | 激活文风 |

### 模型配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/models | 获取模型配置列表 |
| POST | /api/models | 添加模型 |
| PUT | /api/models/:id | 更新模型 |
| DELETE | /api/models/:id | 删除模型 |
| POST | /api/models/test/:id | 测试模型连接 |
| GET | /api/models/list?provider=xxx | 拉取服务商可用模型列表 |

### 搜索

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/search?novelId=xxx&q=xxx | 全文搜索 |

### 情节线

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/plotlines?novelId=xxx | 获取情节线列表 |
| POST | /api/plotlines | 创建情节线 |
| PUT | /api/plotlines/:id | 更新情节线 |

### 数据迁移

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/migration/all | 从 v1 .data 目录全量迁移 |
| POST | /api/migration/characters | 仅迁移角色 |
| POST | /api/migration/foreshadowing | 仅迁移伏笔 |
| POST | /api/migration/story | 仅迁移故事数据 |

---

## 三、数据库设计

**与 v1 完全一致**（直接复用 SQLite 文件），20 张表：

### 核心表

```
novels              — 小说元信息
chapters            — 章节（id, novel_id, title, content, word_count, status, last_modified）
chapter_versions    — 版本历史（id, chapter_id, content, source, agent_name, description）
characters          — 角色（id, novel_id, name, role[protagonist/antagonist/supporting], status）
character_relations — 角色关系（source_id, target_id, type[family/friend/enemy/...], strength）
foreshadowing       — 伏笔（id, novel_id, name, description, status[planted/progressing/resolved]）
foreshadowing_chapters — 伏笔-章节关联
outline             — 大纲（id, novel_id, content）
```

### 配置表

```
model_configs       — 模型配置（id, name, provider, settings[JSON], is_default）
settings            — 系统设置（key, value）
novel_configs       — 写作配置（novel_id, config_key, config_value）
style_profiles      — 文风配置（id, novel_id, name, fingerprint[JSON], llm_guide, is_active）
```

### 会话表

```
chat_sessions       — 会话（id, novel_id, title, chapter_id, context, model, deleted_at）
chat_messages       — 消息（id, session_id, role, content, metadata[JSON]）
```

### 记忆与故事数据表

```
memories            — AI 记忆（id, novel_id, category, key, content, importance, use_count）
story_facts         — 故事事实（id, novel_id, chapter, category, subject, content）
story_hooks         — 故事钩子（id, novel_id, chapter, type, content, status）
story_summaries     — 章节摘要（novel_id, chapter, title, summary, key_events）
story_state         — 故事状态（novel_id, category, key, value）
story_characters    — 故事角色（novel_id, name, role, personality, speaking_style, current_state）
story_resources     — 资源跟踪（novel_id, chapter, resource_name, change_type, amount）
story_plotlines     — 情节线（id, novel_id, name, status, start_chapter, end_chapter）
story_sync          — 同步状态（novel_id, synced_chapter, total_facts, can_continue）
```

---

## 四、Eino Agent 系统设计

### 4.1 Graph 拓扑

```
                    ┌──────────┐
         user_msg → │   Gate   │  门禁检查（字数/文风/设定合规）
                    └────┬─────┘
                         │ pass
                    ┌────▼─────┐
                    │  Reader   │  读取上下文（章节内容+角色+伏笔+大纲+文风）
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │  Planner  │  规划写作（章节结构、关键事件）
                    └────┬─────┘
                         │
                 ┌───────▼────────┐
                 │  Composer      │  组合场景
                 └───────┬────────┘
                         │
                 ┌───────▼────────┐
                 │  Writer        │  输出正文（流式）
                 └───────┬────────┘
                         │
                 ┌───────▼────────┐
                 │  Observer      │  自检（字数/文风/时间线/伏笔）
                 └───────┬────────┘
                         │ observation
                 ┌───────▼────────┐
                 │  Settler       │  沉淀（提取事实/角色/摘要 → 写入 DB）
                 └───────┬────────┘
                         │
                 ┌───────▼────────┐
                 │  Auditor       │  审计（逐项检查 + 生成报告）
                 └───────┬────────┘
                         │
                    ┌────▼─────┐
                    │  Response │  SSE 流输出 + saveChapter
                    └──────────┘
```

### 4.2 路由逻辑

Eino Graph 支持条件路由，根据用户意图自动走不同路径：

- **「写第X章」** → Gate → Reader → Planner → Composer → Writer → Observer → Settler → Auditor
- **「修改/优化」** → Gate → Reader → Writer → Observer → Settler
- **「审计」** → Gate → Reader → Auditor
- **「规划/讨论」** → Gate → Reader → Planner → Response
- **「查询」** → Reader → Response（工具调用→回复）

### 4.3 工具系统

所有工具用 Eino Tool 接口封装，分类如下：

**章节工具** (6 个)
```
getChapter(chapterId: int)           — 获取章节内容
listChapters()                       — 列表
searchChapters(query: string)        — 搜索
saveChapter(chapterId, content, desc)— 保存（含自动版本管理）
markChapterStatus(chapterId, status) — 标记状态(synced/audit)
getVersionHistory(chapterId, limit)  — 版本历史
```

**角色工具** (4 个)
```
listCharacters()
getCharacter(characterId: string)
addCharacter(name, role, personality, speakingStyle, currentState)
updateCharacter(name, role?, personality?, speakingStyle?, currentState?)
```

**伏笔工具** (3 个)
```
listForeshadowing(status?)
addForeshadowing(chapter: int, content, status?)
updateForeshadowing(id, status?, content?)
```

**大纲工具** (2 个)
```
getOutline()
updateOutline(content: string)
```

**配置工具** (1 个)
```
updateNovelConfig(configKey, value)
```

**文风工具** (3 个)
```
importStyle(name, referenceText: string)
createStyleFromDescription(name, description, avgSentenceLength?, shortSentenceRatio?, llmGuide?)
getActiveStyle()
```

**统计工具** (1 个)
```
getStats()
```

**记忆工具** (5 个)
```
saveMemory(key, content, category, importance, source?)
searchMemory(query: string, category?)
listMemories(category?)
getRelevantMemories(query: string)   — 语义相关
addFact(chapter, category, content)
```

**文件工具** (3 个)
```
readFile(path: string)
listDirectory(path: string)
searchFiles(pattern: string)
```

### 4.4 模型适配层

```go
// internal/agent/provider.go
type ModelProvider interface {
    Chat(ctx context.Context, req ChatRequest) (<-chan ChatChunk, error)
    ChatWithTools(ctx context.Context, req ChatRequest, tools []Tool) (*ChatResult, error)
}

// 实现：openai / deepseek / anthropic / google / ollama / custom
// 所有 provider 统一通过 OpenAI-compatible API 调用
// 差异仅：baseURL、apiKey、model name
```

---

## 五、前端 Vue 架构

### 5.1 项目结构

```
web/
├── public/
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   │   └── index.ts              # 路由定义
│   ├── stores/                   # Pinia stores
│   │   ├── novel.ts              # 当前小说
│   │   ├── chapters.ts           # 章节列表+缓存
│   │   ├── chat.ts               # 聊天状态+历史
│   │   └── settings.ts           # 模型/配置
│   ├── api/                      # API 调用封装
│   │   ├── client.ts             # fetch wrapper + SSE helper
│   │   ├── chapters.ts
│   │   ├── agent.ts
│   │   ├── characters.ts
│   │   ├── style.ts
│   │   └── models.ts
│   ├── composables/              # 组合式函数
│   │   ├── useSSE.ts             # SSE 流式处理
│   │   ├── useChapterEditor.ts   # 编辑器逻辑
│   │   └── useAgentChat.ts       # 聊天逻辑
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
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.vue
│   │   │   └── TopBar.vue
│   │   ├── chat/
│   │   │   ├── ChatPanel.vue      # 聊天面板
│   │   │   ├── MessageBubble.vue  # 消息气泡（支持 Markdown）
│   │   │   ├── ChapterPreview.vue # 章节预览
│   │   │   └── ToolCallBadge.vue  # 工具调用标识
│   │   ├── editor/
│   │   │   ├── EditorPanel.vue
│   │   │   ├── VersionHistory.vue
│   │   │   └── DiffViewer.vue
│   │   ├── chapter/
│   │   │   ├── ChapterCard.vue
│   │   │   └── ChapterList.vue
│   │   └── shared/
│   │       ├── MarkdownRenderer.vue
│   │       ├── StatusBadge.vue
│   │       └── WordCount.vue
│   └── assets/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### 5.2 页面 → API 对照

| 页面 | 路由 | 调用 API |
|------|------|----------|
| 首页 | / | novels, chapters, stats |
| 章节列表 | /chapters | chapters |
| 章节编辑器 | /chapters/:id | chapters/:id, chapters/:id/history, agent/chat |
| 角色管理 | /characters | characters |
| 伏笔管理 | /foreshadowing | foreshadowing |
| 大纲管理 | /outline | outline |
| 情节线 | /plotlines | plotlines |
| 全文搜索 | /search | search |
| AI 聊天 | /agent/chat | agent/chat, chapters |
| 统计面板 | /stats | chapters |
| 设置 | /settings | models, style |

### 5.3 核心交互：章节编辑器 + AI 协作

```
┌──────────────────────────────────────────────────┐
│  ChapterEditorPage.vue                           │
│  ┌─────────────────┐ ┌──────────────────────────┐│
│  │ EditorPanel.vue │ │ ChatPanel.vue            ││
│  │                  │ │                          ││
│  │ [Markdown 编辑器]│ │ [消息列表]               ││
│  │                  │ │  - AI 回复 + 工具调用    ││
│  │ [字数: 2650]     │ │  - 操作按钮（采纳/撤销） ││
│  │                  │ │                          ││
│  │                  │ │ [输入框 + 发送按钮]       ││
│  └─────────────────┘ └──────────────────────────┘│
│  ┌──────────────────────────────────────────────┐ │
│  │ VersionHistory.vue (底部抽屉)                │ │
│  │ [v3] [v2] [v1]   ↔  DiffViewer              │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## 六、关键设计决策

### 6.1 SSE 流式架构

```
Browser (EventSource) ←── Gin SSE Writer ←── Eino Graph Stream
                            │
                            ├─ 每个 chunk → 实时推送
                            ├─ 工具调用 → type:tool_call event
                            ├─ 工具结果 → type:tool_result event
                            └─ 完成   → type:done event + metadata
```

Go 端：
```go
func (h *AgentHandler) Chat(c *gin.Context) {
    c.Header("Content-Type", "text/event-stream")
    c.Header("Cache-Control", "no-cache")
    
    flusher := c.Writer.(http.Flusher)
    for chunk := range agentStream {
        fmt.Fprintf(c.Writer, "data: %s\n\n", chunk)
        flusher.Flush()
    }
}
```

### 6.2 数据迁移策略

v1 的 SQLite 文件（`.data/novel-studio.db`）**直接复制**到 v2 的 data 目录，不需要迁移脚本——表结构完全一致。

**需要迁移的内容：**
- 章节的 `.md` 文件内容 → 数据库 `chapters.content` 字段（v1 中可能文件/DB 双存）
- 迁移接口：`POST /api/migration/all`

### 6.3 嵌入部署

```dockerfile
# 单二进制：Go 后端 + Vue 前端
FROM golang:1.22 AS backend
COPY . /app
RUN cd /app && go build -o server ./cmd/server

FROM node:20 AS frontend
COPY web/ /web
RUN cd /web && npm ci && npm run build

FROM scratch
COPY --from=backend /app/server /server
COPY --from=frontend /web/dist /web/dist
COPY data/ /data
ENTRYPOINT ["/server"]
```

Go 用 `embed` 把 Vue build 产物嵌入二进制，一个文件部署。

### 6.4 保持兼容

| v1 特性 | v2 实现 |
|---------|---------|
| Git 版本控制 | 保留，用 go-git |
| 章节文件（.md） | 可选保留，数据库为主 |
| 文风指纹分析 | Go 实现相同的句子分析算法 |
| 模型供应商适配 | Go interface 实现 OpenAI-compatible |

---

## 七、实施计划（分 4 阶段）

### 阶段 1：Go 骨架 + 数据层（~1 周）

- [ ] 初始化 Go module + Gin 脚手架
- [ ] 数据库连接 + 建表迁移
- [ ] 所有 Repository 层（18 个表）
- [ ] Service 层（章节 CRUD、角色、伏笔、大纲）
- [ ] Handler 层（CRUD REST API）
- [ ] Router 注册 + 中间件
- [ ] v1 数据迁移接口

### 阶段 2：Agent 核心（~1 周）

- [ ] Eino 框架集成
- [ ] 工具定义（所有工具转为 Eino Tool）
- [ ] Eino Graph 编排（Gate→Reader→Planner→Composer→Writer→Observer→Settler→Auditor）
- [ ] 模型适配层（OpenAI/DeepSeek/Anthropic provider）
- [ ] SSE 流式对话接口
- [ ] 会话管理 + 记忆系统
- [ ] 章节保存 + 版本控制 + 后处理兜底

### 阶段 3：Vue 前端（~1 周）

- [ ] Vite + Vue 3 + Naive UI 脚手架
- [ ] Router + Pinia stores
- [ ] API client + SSE composable
- [ ] 章节列表 + 编辑器页面
- [ ] AI 聊天页面（Markdown 渲染 + 工具调用展示）
- [ ] 角色/伏笔/大纲管理页面
- [ ] 设置页面（模型配置 + 文风管理）
- [ ] 搜索 + 统计页面

### 阶段 4：高级功能 + 打磨（~1 周）

- [ ] 文风指纹分析（Go 实现）
- [ ] 文风导入/创建/激活
- [ ] 版本历史 + Diff 查看
- [ ] Git 版本控制
- [ ] 全文搜索（SQLite FTS5）
- [ ] 情节线管理
- [ ] 故事数据同步（Settler）
- [ ] 性能优化 + 错误处理
- [ ] Docker 部署

---

## 八、Go 依赖（go.mod 核心）

```
github.com/gin-gonic/gin
github.com/mattn/go-sqlite3
github.com/cloudwego/eino
github.com/cloudwego/eino-ext/components/model/openai
github.com/go-git/go-git/v5
github.com/rs/zerolog                   # 结构化日志
github.com/spf13/viper                   # 配置管理
```
