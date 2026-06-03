package agent

import (
	"encoding/json"
	"fmt"
	"strings"

	"novel-studio-go/internal/repository"
)

// BuildSystemPrompt generates the system prompt with novel configs, active style, and memories
func BuildSystemPrompt(tctx *ToolContext, chapterID int) string {
	var sb strings.Builder
	sb.WriteString("你是 Novel Studio 的 AI 写作助手。\n\n")

	// Project info
	sb.WriteString(fmt.Sprintf("## 项目信息\n- 当前小说 ID：%s\n", tctx.NovelID))

	// Novel configs
	configs, _ := repository.GetNovelConfigs(tctx.DB, tctx.NovelID)
	if len(configs) > 0 {
		sb.WriteString("\n## 写作规范（必须遵循）\n")
		if v, ok := configs["targetTotalWords"]; ok {
			sb.WriteString(fmt.Sprintf("- 目标总字数：%s 字\n", v))
		}
		if min, ok := configs["minWordsPerChapter"]; ok {
			max := configs["maxWordsPerChapter"]
			sb.WriteString(fmt.Sprintf("- 每章字数：%s-%s 字\n", min, max))
		}
		if v, ok := configs["writingStyleRules"]; ok {
			sb.WriteString("\n### 文风规则\n")
			for _, r := range strings.Split(v, ",") {
				if r = strings.TrimSpace(r); r != "" {
					sb.WriteString(fmt.Sprintf("- %s\n", r))
				}
			}
		}
		if v, ok := configs["forbiddenPatterns"]; ok {
			sb.WriteString("\n### 禁止写法\n")
			for _, r := range strings.Split(v, ",") {
				if r = strings.TrimSpace(r); r != "" {
					sb.WriteString(fmt.Sprintf("- %s\n", r))
				}
			}
		}
	}

	// Active style
	sp, _ := repository.GetActiveStyleProfile(tctx.DB, tctx.NovelID)
	if sp != nil {
		sb.WriteString(fmt.Sprintf("\n## 当前激活文风：%s\n", sp.Name))
		if sp.LLMGuide != "" {
			sb.WriteString(sp.LLMGuide + "\n")
		}
		var fp map[string]any
		if json.Unmarshal([]byte(sp.Fingerprint), &fp) == nil {
			if sl, ok := fp["sentenceLength"].(map[string]any); ok {
				sb.WriteString(fmt.Sprintf("- 平均句长：%.0f 字\n", sl["avg"]))
				sb.WriteString(fmt.Sprintf("- 短句占比：%.0f%%\n", sl["shortPercent"]))
			}
		}
	}

	// Relevance memories
	mems, _ := repository.SearchMemories(tctx.DB, tctx.NovelID, "", "")
	if len(mems) > 0 {
		sb.WriteString("\n## 相关记忆\n")
		for _, m := range mems {
			if m.Importance >= 4 {
				sb.WriteString(fmt.Sprintf("- [%s] %s: %s\n", m.Category, m.Key, truncate(m.Content, 200)))
			}
		}
	}

	// Chapter context
	if chapterID > 0 {
		chID := fmt.Sprintf("%04d", chapterID)
		ch, err := repository.GetChapter(tctx.DB, chID)
		if err == nil {
			sb.WriteString(fmt.Sprintf("\n## 当前编辑章节\n- 第%d章：%s（%d字）\n", chapterID, ch.Title, ch.WordCount))
		}
	}

	// Rules
	sb.WriteString(`
## 使用原则
1. 先用工具查询数据再回答，不要凭记忆
2. 续写时按 novel-pro 流程：门禁检查 → 读上下文 → Planner → Composer → Writer → Observer → Settler → Auditor
3. 事实优先，不要编造
4. 写入前和用户确认
5. 不要在回复中提及工具名称，直接说结果
6. **写完章节后必须立即调用 saveChapter 保存到数据库**，不要只在聊天中输出文字！

## 记忆保存（重要）
你必须主动保存学到的知识。以下情况必须调用 saveMemory：
- 用户纠正你的错误 → category: correction, importance: 5
- 用户透露角色设定 → category: character, importance: 4
- 用户讨论世界观规则 → category: world_rule, importance: 4
- 用户提出文风要求 → category: writing_style, importance: 4
- 用户讨论剧情规则 → category: plot_rule, importance: 3
- 你从对话中发现重要事实 → category: fact, importance: 3
- 用户表达偏好 → category: user_preference, importance: 3

## 章节状态流转
- pending → audit：saveChapter 工具会自动设置
- audit → synced：审计通过后，用 markChapterStatus 工具标记
`)
	return sb.String()
}
