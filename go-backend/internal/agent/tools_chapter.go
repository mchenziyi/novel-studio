package agent

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"novel-studio-go/internal/models"
	"novel-studio-go/internal/repository"
)

// ============================================================================
// Chapter Tools (6 tools)
// ============================================================================

func chapterTools(tctx *ToolContext) []*Tool {
	return []*Tool{
		{
			Name:        "getChapter",
			Description: "获取指定章节的完整内容。当用户询问某章内容、想看某章、或需要基于某章进行修改时使用。",
			Properties: map[string]Property{
				"chapterId": {Type: "number", Description: "章节编号，如 74"},
			},
			Required: []string{"chapterId"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				chID := fmt.Sprintf("%04d", int(args["chapterId"].(float64)))
				ch, err := repository.GetChapter(tctx.DB, chID)
				if err != nil {
					return `{"error":"章节不存在"}`, nil
				}
				b, _ := json.Marshal(map[string]any{"id": ch.ID, "title": ch.Title, "content": ch.Content, "wordCount": ch.WordCount, "status": ch.Status})
				return string(b), nil
			},
		},
		{
			Name:        "listChapters",
			Description: "获取所有章节的列表（标题、字数、状态）。当用户想知道有哪些章节、最新章节、总章数时使用。",
			Properties:  map[string]Property{},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				chapters, _ := repository.GetChapters(tctx.DB, tctx.NovelID)
				type CI struct {
					ID     string `json:"id"`
					Title  string `json:"title"`
					Words  int    `json:"words"`
					Status string `json:"status"`
				}
				var list []CI
				for _, ch := range chapters {
					list = append(list, CI{ch.ID, ch.Title, ch.WordCount, ch.Status})
				}
				b, _ := json.Marshal(map[string]any{"chapters": list, "total": len(list)})
				return string(b), nil
			},
		},
		{
			Name:        "searchChapters",
			Description: "搜索章节内容。当你需要查找特定场景、对话或人物出场时使用。",
			Properties: map[string]Property{
				"query": {Type: "string", Description: "搜索关键词"},
			},
			Required: []string{"query"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				query := args["query"].(string)
				chapters, _ := repository.SearchChapters(tctx.DB, tctx.NovelID, query)
				var results []map[string]any
				for _, ch := range chapters {
					idx := strings.Index(ch.Content, query)
					snippet := ""
					if idx >= 0 {
						start := idx - 30
						if start < 0 { start = 0 }
						end := idx + len(query) + 50
						if end > len([]rune(ch.Content)) { end = len([]rune(ch.Content)) }
						snippet = string([]rune(ch.Content)[start:end])
					}
					results = append(results, map[string]any{"id": ch.ID, "title": ch.Title, "snippet": snippet})
				}
				b, _ := json.Marshal(map[string]any{"results": results})
				return string(b), nil
			},
		},
		{
			Name:        "saveChapter",
			Description: "保存章节内容到数据库。写完一章后必须立即调用此工具保存！用户说'写XX章'时，写完内容后自动保存。",
			Properties: map[string]Property{
				"chapterId":   {Type: "number", Description: "章节编号"},
				"content":     {Type: "string", Description: "完整的章节内容"},
				"description": {Type: "string", Description: "保存说明，如'AI 重写了开头'"},
			},
			Required: []string{"chapterId", "content"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				chID := fmt.Sprintf("%04d", int(args["chapterId"].(float64)))
				content := args["content"].(string)
				desc := strArg(args, "description")

				ch, err := repository.GetChapter(tctx.DB, chID)
				if err != nil {
					title := fmt.Sprintf("第%d章", int(args["chapterId"].(float64)))
					repository.CreateChapter(tctx.DB, &models.Chapter{ID: chID, NovelID: tctx.NovelID, Title: title, Content: content, File: chID + ".md"})
					ch, _ = repository.GetChapter(tctx.DB, chID)
				}

				if ch != nil {
					ch.Content = content
					ch.WordCount = countRunes(content)
					ch.Status = "audit"
					repository.UpdateChapter(tctx.DB, ch)
				}

				now := fmt.Sprintf("%d", timeNow())
				vid := fmt.Sprintf("v-%s", now)
				repository.CreateChapterVersion(tctx.DB, &models.ChapterVersion{
					ID: vid, ChapterID: chID, Content: content,
					Timestamp: now, Source: "agent", AgentName: tctx.AgentID, Description: desc,
				})

				b, _ := json.Marshal(map[string]any{"ok": true, "chapterId": int(args["chapterId"].(float64)), "wordCount": countRunes(content), "versionId": vid})
				return string(b), nil
			},
		},
		{
			Name:        "markChapterStatus",
			Description: "标记章节状态。状态流转：pending→audit(审计中)，audit→synced(已同步)。",
			Properties: map[string]Property{
				"chapterId": {Type: "number", Description: "章节编号"},
				"status":    {Type: "string", Enum: []string{"audit", "synced"}, Description: "目标状态"},
			},
			Required: []string{"chapterId", "status"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				chID := fmt.Sprintf("%04d", int(args["chapterId"].(float64)))
				repository.UpdateChapterStatus(tctx.DB, chID, args["status"].(string))
				return fmt.Sprintf(`{"ok":true,"chapterId":%d,"status":"%s"}`, int(args["chapterId"].(float64)), args["status"].(string)), nil
			},
		},
		{
			Name:        "getVersionHistory",
			Description: "获取章节的版本历史。查看修改记录、对比不同版本时使用。",
			Properties: map[string]Property{
				"chapterId": {Type: "number", Description: "章节编号"},
				"limit":     {Type: "number", Description: "返回最近几个版本，默认 10"},
			},
			Required: []string{"chapterId"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				chID := fmt.Sprintf("%04d", int(args["chapterId"].(float64)))
				limit := intArg(args, "limit", 10)
				vers, _ := repository.GetChapterVersions(tctx.DB, chID, limit)
				b, _ := json.Marshal(map[string]any{"versions": vers})
				return string(b), nil
			},
		},
	}
}

// ============================================================================
// Character Tools (4 tools)
// ============================================================================

func characterTools(tctx *ToolContext) []*Tool {
	return []*Tool{
		{
			Name:        "listCharacters",
			Description: "获取所有角色列表。需要了解角色设定、查找角色信息时使用。",
			Properties:  map[string]Property{},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				chars, _ := repository.GetCharacters(tctx.DB, tctx.NovelID)
				b, _ := json.Marshal(map[string]any{"characters": chars})
				return string(b), nil
			},
		},
		{
			Name:        "getCharacter",
			Description: "获取指定角色的完整信息。",
			Properties: map[string]Property{
				"characterId": {Type: "string", Description: "角色 ID"},
			},
			Required: []string{"characterId"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				ch, err := repository.GetCharacter(tctx.DB, args["characterId"].(string))
				if err != nil { return `{"error":"角色不存在"}`, nil }
				b, _ := json.Marshal(ch)
				return string(b), nil
			},
		},
		{
			Name:        "addCharacter",
			Description: "新增角色。用户讨论角色设定并确认后使用。",
			Properties: map[string]Property{
				"name":          {Type: "string", Description: "角色名"},
				"role":          {Type: "string", Enum: []string{"protagonist", "antagonist", "supporting"}, Description: "角色定位"},
				"personality":   {Type: "string", Description: "性格特征"},
				"speakingStyle": {Type: "string", Description: "说话风格"},
				"currentState":  {Type: "string", Description: "当前状态"},
			},
			Required: []string{"name", "role"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				id := fmt.Sprintf("char-%d", timeNow())
				c := &models.Character{
					ID: id, NovelID: tctx.NovelID, Name: args["name"].(string),
					Role: args["role"].(string),
					Description: fmt.Sprintf("性格: %s | 说话风格: %s | 当前状态: %s",
						strArg(args, "personality"), strArg(args, "speakingStyle"), strArg(args, "currentState")),
				}
				repository.CreateCharacter(tctx.DB, c)
				return fmt.Sprintf(`{"ok":true,"id":"%s","name":"%s"}`, id, c.Name), nil
			},
		},
		{
			Name:        "updateCharacter",
			Description: "更新角色信息。需要角色名（必须已存在）。",
			Properties: map[string]Property{
				"name":          {Type: "string", Description: "角色名（必须已存在）"},
				"role":          {Type: "string", Enum: []string{"protagonist", "antagonist", "supporting"}, Description: "角色定位"},
				"personality":   {Type: "string", Description: "性格特征"},
				"speakingStyle": {Type: "string", Description: "说话风格"},
				"currentState":  {Type: "string", Description: "当前状态"},
			},
			Required: []string{"name"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				name := args["name"].(string)
				chars, _ := repository.GetCharacters(tctx.DB, tctx.NovelID)
				var target *models.Character
				for _, c := range chars {
					if c.Name == name { target = &c; break }
				}
				if target == nil { return `{"error":"角色不存在"}`, nil }
				if v, ok := args["role"]; ok { target.Role = v.(string) }
				repository.UpdateCharacter(tctx.DB, target)
				return `{"ok":true}`, nil
			},
		},
	}
}

// ============================================================================
// Foreshadowing Tools (3 tools)
// ============================================================================

func foreshadowingTools(tctx *ToolContext) []*Tool {
	return []*Tool{
		{
			Name:        "listForeshadowing",
			Description: "获取伏笔列表。可按状态筛选：planted/progressing/resolved/all。",
			Properties: map[string]Property{
				"status": {Type: "string", Enum: []string{"planted", "progressing", "resolved", "all"}, Description: "按状态筛选"},
			},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				status := strArg(args, "status")
				items, _ := repository.GetForeshadowings(tctx.DB, tctx.NovelID, status)
				b, _ := json.Marshal(map[string]any{"foreshadowing": items})
				return string(b), nil
			},
		},
		{
			Name:        "addForeshadowing",
			Description: "新增伏笔。用户确认伏笔变动后使用。",
			Properties: map[string]Property{
				"chapter": {Type: "number", Description: "埋设章节号"},
				"content": {Type: "string", Description: "伏笔内容描述"},
				"status":  {Type: "string", Enum: []string{"open", "progressing", "resolved"}, Description: "状态，默认 open"},
			},
			Required: []string{"chapter", "content"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				id := fmt.Sprintf("hook-%d", timeNow())
				f := &models.Foreshadowing{
					ID: id, NovelID: tctx.NovelID, Name: strArg(args, "content"),
					Description: strArg(args, "content"), Status: "planted", PlantedChapter: int(args["chapter"].(float64)),
				}
				repository.CreateForeshadowing(tctx.DB, f)
				return fmt.Sprintf(`{"ok":true,"id":"%s"}`, id), nil
			},
		},
		{
			Name:        "updateForeshadowing",
			Description: "更新伏笔状态或内容。",
			Properties: map[string]Property{
				"id":      {Type: "string", Description: "伏笔 ID"},
				"status":  {Type: "string", Enum: []string{"open", "progressing", "resolved"}, Description: "新状态"},
				"content": {Type: "string", Description: "新内容"},
			},
			Required: []string{"id"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				return `{"ok":true,"note":"伏笔更新功能需完整实现"}`, nil
			},
		},
	}
}

// ============================================================================
// Outline Tools (2 tools)
// ============================================================================

func outlineTools(tctx *ToolContext) []*Tool {
	return []*Tool{
		{
			Name:        "getOutline",
			Description: "获取当前小说的大纲。",
			Properties:  map[string]Property{},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				o, err := repository.GetOutline(tctx.DB, tctx.NovelID)
				if err != nil { return `{"content":""}`, nil }
				b, _ := json.Marshal(o)
				return string(b), nil
			},
		},
		{
			Name:        "updateOutline",
			Description: "更新小说大纲（替换完整内容）。用户确认大纲调整后使用。",
			Properties: map[string]Property{
				"content": {Type: "string", Description: "完整的大纲 markdown 内容"},
			},
			Required: []string{"content"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				o := &models.Outline{ID: "outline-" + tctx.NovelID, NovelID: tctx.NovelID, Content: args["content"].(string)}
				repository.UpsertOutline(tctx.DB, o)
				return `{"ok":true}`, nil
			},
		},
	}
}

// ============================================================================
// Config Tools (1 tool)
// ============================================================================

func configTools(tctx *ToolContext) []*Tool {
	return []*Tool{
		{
			Name:        "updateNovelConfig",
			Description: "更新写作配置。设置目标字数、每章字数范围、文风规则、禁止写法等。",
			Properties: map[string]Property{
				"configKey": {Type: "string", Enum: []string{"targetTotalWords", "minWordsPerChapter", "maxWordsPerChapter", "writingStyleRules", "forbiddenPatterns", "coreSettings"}, Description: "配置项"},
				"value":     {Type: "string", Description: "配置值。字数为数字，规则为逗号分隔"},
			},
			Required: []string{"configKey", "value"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				repository.SetNovelConfig(tctx.DB, tctx.NovelID, args["configKey"].(string), args["value"].(string))
				return `{"ok":true}`, nil
			},
		},
	}
}

// ============================================================================
// Style Tools (3 tools)
// ============================================================================

func styleTools(tctx *ToolContext) []*Tool {
	return []*Tool{
		{
			Name:        "getActiveStyle",
			Description: "获取当前激活的文风配置。需要了解写作风格要求时使用。",
			Properties:  map[string]Property{},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				sp, _ := repository.GetActiveStyleProfile(tctx.DB, tctx.NovelID)
				if sp == nil { return `{"message":"没有激活的文风"}`, nil }
				b, _ := json.Marshal(sp)
				return string(b), nil
			},
		},
		{
			Name:        "importStyle",
			Description: "从参考文本导入文风。需要提供 500 字以上的参考文本。",
			Properties: map[string]Property{
				"name":          {Type: "string", Description: "文风配置名称"},
				"referenceText": {Type: "string", Description: "参考文本（至少 500 字）"},
			},
			Required: []string{"name", "referenceText"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				id := fmt.Sprintf("style-%d", timeNow())
				_ = id
				return `{"ok":true,"note":"文风指纹分析将在后续实现"}`, nil
			},
		},
		{
			Name:        "createStyleFromDescription",
			Description: "从文字描述创建文风配置。",
			Properties: map[string]Property{
				"name":               {Type: "string", Description: "文风配置名称"},
				"description":        {Type: "string", Description: "文风描述"},
				"avgSentenceLength":  {Type: "number", Description: "平均句长（中文字符数）"},
				"shortSentenceRatio": {Type: "number", Description: "短句占比百分比"},
				"llmGuide":           {Type: "string", Description: "给 AI 的文风指南"},
			},
			Required: []string{"name", "description"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				return `{"ok":true,"note":"文风创建将在后续实现"}`, nil
			},
		},
	}
}

// ============================================================================
// Stats Tools (1 tool)
// ============================================================================

func statsTools(tctx *ToolContext) []*Tool {
	return []*Tool{
		{
			Name:        "getStats",
			Description: "获取写作统计信息：总章数、总字数、最近更新等。需要了解项目概况时使用。",
			Properties:  map[string]Property{},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				totalCh, totalWords, recent, _ := repository.GetChapterStats(tctx.DB, tctx.NovelID)
				var charCount, hookCount int
				tctx.DB.QueryRow(`SELECT COUNT(*) FROM characters WHERE novel_id=?`, tctx.NovelID).Scan(&charCount)
				tctx.DB.QueryRow(`SELECT COUNT(*) FROM foreshadowing WHERE novel_id=?`, tctx.NovelID).Scan(&hookCount)
				b, _ := json.Marshal(map[string]any{
					"totalChapters":  totalCh,
					"totalWords":     totalWords,
					"characterCount": charCount,
					"hookCount":      hookCount,
					"recentChapters": recent,
				})
				return string(b), nil
			},
		},
	}
}

// ============================================================================
// Memory Tools (5 tools)
// ============================================================================

func memoryTools(tctx *ToolContext) []*Tool {
	return []*Tool{
		{
			Name:        "saveMemory",
			Description: "保存一条 AI 记忆。当用户纠正错误、透露角色设定、讨论规则、表达偏好时必须调用！",
			Properties: map[string]Property{
				"key":        {Type: "string", Description: "记忆唯一标识"},
				"content":    {Type: "string", Description: "记忆内容"},
				"category":   {Type: "string", Enum: []string{"character", "world_rule", "writing_style", "plot_rule", "user_preference", "correction", "fact"}, Description: "分类"},
				"importance": {Type: "number", Description: "重要性 1-5"},
				"source":     {Type: "string", Description: "来源，如'用户纠正'、'对话推断'"},
			},
			Required: []string{"key", "content", "category"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				m := &models.Memory{
					ID: fmt.Sprintf("mem-%d", timeNow()), NovelID: tctx.NovelID,
					Key: args["key"].(string), Content: args["content"].(string),
					Category: args["category"].(string), Importance: intArg(args, "importance", 3),
					Source: strArg(args, "source"),
				}
				repository.CreateMemory(tctx.DB, m)
				return `{"ok":true}`, nil
			},
		},
		{
			Name:        "searchMemory",
			Description: "搜索 AI 记忆。需要回忆之前的规则、偏好或纠正时使用。",
			Properties: map[string]Property{
				"query":    {Type: "string", Description: "搜索关键词"},
				"category": {Type: "string", Description: "按分类筛选（可选）"},
			},
			Required: []string{"query"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				mems, _ := repository.SearchMemories(tctx.DB, tctx.NovelID, args["query"].(string), strArg(args, "category"))
				b, _ := json.Marshal(map[string]any{"memories": mems})
				return string(b), nil
			},
		},
		{
			Name:        "listMemories",
			Description: "列出所有记忆，可按分类筛选。",
			Properties: map[string]Property{
				"category": {Type: "string", Enum: []string{"character", "world_rule", "writing_style", "plot_rule", "user_preference", "correction", "fact"}, Description: "分类"},
			},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				mems, _ := repository.ListMemories(tctx.DB, tctx.NovelID, strArg(args, "category"))
				b, _ := json.Marshal(map[string]any{"memories": mems})
				return string(b), nil
			},
		},
		{
			Name:        "addFact",
			Description: "添加一条故事事实。记录人物、事件、规则等。",
			Properties: map[string]Property{
				"chapter":  {Type: "number", Description: "所属章节"},
				"category": {Type: "string", Description: "事实分类"},
				"content":  {Type: "string", Description: "事实内容"},
			},
			Required: []string{"chapter", "category", "content"},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				f := &models.StoryFact{
					ID: fmt.Sprintf("fact-%d", timeNow()), NovelID: tctx.NovelID,
					Chapter: int(args["chapter"].(float64)), Category: args["category"].(string),
					Subject: args["category"].(string), Content: args["content"].(string),
				}
				repository.AddStoryFact(tctx.DB, f)
				return `{"ok":true}`, nil
			},
		},
		{
			Name:        "getRelevantMemories",
			Description: "获取与当前对话相关的记忆（最近保存的、高重要性的）。",
			Properties:  map[string]Property{},
			Execute: func(ctx context.Context, args map[string]any) (string, error) {
				mems, _ := repository.SearchMemories(tctx.DB, tctx.NovelID, "", "")
				// Filter high importance
				var relevant []models.Memory
				for _, m := range mems {
					if m.Importance >= 4 {
						relevant = append(relevant, m)
					}
				}
				if len(relevant) == 0 { relevant = mems }
				if len(relevant) > 10 { relevant = relevant[:10] }
				b, _ := json.Marshal(map[string]any{"memories": relevant})
				return string(b), nil
			},
		},
	}
}

// ============================================================================
// Helpers
// ============================================================================

func strArg(args map[string]any, key string) string {
	if v, ok := args[key]; ok {
		if s, ok := v.(string); ok { return s }
	}
	return ""
}

func intArg(args map[string]any, key string, def int) int {
	if v, ok := args[key]; ok {
		switch n := v.(type) {
		case float64: return int(n)
		case int: return n
		}
	}
	return def
}

// Suppress imports — actually needed
var _ = sql.NullString{}
var _ = strings.Index
var _ = fmt.Sprintf

func countRunes(text string) int { return len([]rune(text)) }
func timeNow() int64              { return time.Now().UnixMilli() }
