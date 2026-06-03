package agent

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/cloudwego/eino/schema"
)

// ============================================================================
// Learning Agent — 后台分析对话，提取知识，存入 memory
// ============================================================================

const learningSystemPrompt = `你是 Novel Studio 的学习 Agent。你的任务是分析用户和 AI 写作助手的对话，提取可复用的知识。

## 核心任务
分析以下对话记录，从中提取有价值的 insights：

1. **文风偏好**（style_preference）：用户喜欢/讨厌的写法、句式偏好、用词习惯、模仿对象
2. **纠正记录**（correction）：用户纠正了 AI 的哪些错误，正确版本是什么
3. **角色信息**（character）：用户透露的角色设定、性格、关系、能力变化
4. **世界观规则**（world_rule）：用户讨论的世界观规则、力量体系、时间线约束
5. **剧情规则**（plot_rule）：用户讨论的剧情走向、因果约束、伏笔安排
6. **用户偏好**（user_preference）：用户表达的任何喜好、习惯、工作方式

## 输出格式
每次调用输出 JSON 数组（最多 5 条），如果对话没有新信息则输出空数组 []：

[{
  "key": "简短的唯一标识",
  "content": "详细内容（200字以内）",
  "category": "style_preference|correction|character|world_rule|plot_rule|user_preference",
  "importance": 1-5,
  "source": "来源描述"
}]

## 评分标准
- importance=5：用户明确纠正错误，或反复强调的要求
- importance=4：用户主动透露的角色/世界观信息
- importance=3：从对话中推断出的偏好或规则
- importance=2：一般性观察
- importance=1：泛泛之交

## 执行原则
- 只输出真正有洞察价值的内容，不要泛泛而谈
- 避免重复：检查是否已有相同 key 的记忆
- 保持简洁：content 精炼到 200 字以内
- 宁可少保存，不要保存废话`

// LearningAgentResults holds the parsed output of a learning analysis
type LearningAgentResults struct {
	Insights []MemoryInsight `json:"insights"`
}

type MemoryInsight struct {
	Key        string `json:"key"`
	Content    string `json:"content"`
	Category   string `json:"category"`
	Importance int    `json:"importance"`
	Source     string `json:"source"`
}

// Learner wraps a ModelClient + DB for async learning
type Learner struct {
	DB      *sql.DB
	Model   *ModelClient
	NovelID string
}

func NewLearner(db *sql.DB, model *ModelClient, novelID string) *Learner {
	return &Learner{DB: db, Model: model, NovelID: novelID}
}

// AnalyzeConversation runs the learning analysis using a lightweight model call.
// The model outputs JSON directly (no tool calling needed for learning).
func (l *Learner) AnalyzeConversation(ctx context.Context, messages []*schema.Message) (*LearningAgentResults, error) {
	convText := formatConversation(messages)
	userMsg := &schema.Message{
		Role:    schema.User,
		Content: fmt.Sprintf("请分析以下对话，提取有价值的知识：\n\n%s", convText),
	}

	msgs := []*schema.Message{
		{Role: schema.System, Content: learningSystemPrompt},
		userMsg,
	}

	// Sync call without tools — model outputs JSON directly
	result, err := l.Model.ChatSync(ctx, msgs, nil)
	if err != nil {
		return nil, fmt.Errorf("learning analysis failed: %w", err)
	}

	insights, err := parseInsights(result.Content)
	if err != nil {
		log.Printf("[Learner] Failed to parse: %v, raw: %.300s", err, result.Content)
		return &LearningAgentResults{}, nil
	}

	saved := 0
	for _, ins := range insights.Insights {
		if ins.Importance >= 4 {
			if err := l.saveInsight(ins); err != nil {
				log.Printf("[Learner] save failed: %v", err)
			} else {
				saved++
			}
		}
	}
	log.Printf("[Learner] %d insights, %d saved (importance>=4)", len(insights.Insights), saved)
	return insights, nil
}

// AnalyzeAndSave is a fire-and-forget variant that runs in background
func (l *Learner) AnalyzeAndSave(parentCtx context.Context, messages []*schema.Message) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()

		_, err := l.AnalyzeConversation(ctx, messages)
		if err != nil {
			log.Printf("[Learner] Background analysis error: %v", err)
		}
	}()
}

// saveInsight writes a high-importance insight to the memories table
func (l *Learner) saveInsight(ins MemoryInsight) error {
	id := fmt.Sprintf("mem-%d", timeNow())
	_, err := l.DB.Exec(
		`INSERT OR IGNORE INTO memories (id, novel_id, category, key, content, source, importance) VALUES (?,?,?,?,?,?,?)`,
		id, l.NovelID, ins.Category, ins.Key, ins.Content, ins.Source, ins.Importance,
	)
	return err
}

// GetRecentMemories returns top memories for injection into system prompt
func (l *Learner) GetRecentMemories(limit int) []MemoryInsight {
	rows, err := l.DB.Query(
		`SELECT key, content, category, importance, source FROM memories WHERE novel_id=? ORDER BY importance DESC, updated_at DESC LIMIT ?`,
		l.NovelID, limit,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var insights []MemoryInsight
	for rows.Next() {
		var ins MemoryInsight
		var src sql.NullString
		if err := rows.Scan(&ins.Key, &ins.Content, &ins.Category, &ins.Importance, &src); err != nil {
			continue
		}
		ins.Source = src.String
		insights = append(insights, ins)
	}
	return insights
}

// FormatMemoriesForPrompt formats memories for injection into the system prompt
func (l *Learner) FormatMemoriesForPrompt() string {
	mems := l.GetRecentMemories(10)
	if len(mems) == 0 {
		return ""
	}
	var sb strings.Builder
	sb.WriteString("\n## 学习到的知识（来自之前对话的学习 Agent）\n")
	for _, m := range mems {
		cat := categoryLabel(m.Category)
		sb.WriteString(fmt.Sprintf("- [%s] %s: %s\n", cat, m.Content, ""))
	}
	return sb.String()
}

// ============================================================================
// Helpers
// ============================================================================

func formatConversation(msgs []*schema.Message) string {
	var sb strings.Builder
	for i, m := range msgs {
		if m.Role == schema.System {
			continue
		}
		role := "用户"
		if m.Role == schema.Assistant {
			role = "AI"
		}
		content := m.Content
		if len(content) > 500 {
			content = content[:500] + "..."
		}
		sb.WriteString(fmt.Sprintf("[%d] %s: %s\n", i+1, role, content))
	}
	return sb.String()
}

func parseInsights(text string) (*LearningAgentResults, error) {
	// Find JSON array in the response
	start := strings.Index(text, "[")
	if start < 0 {
		return &LearningAgentResults{}, nil
	}
	// Find matching closing bracket
	depth := 0
	end := -1
	for i := start; i < len(text); i++ {
		switch text[i] {
		case '[':
			depth++
		case ']':
			depth--
			if depth == 0 {
				end = i + 1
				break
			}
		}
		if end > 0 {
			break
		}
	}
	if end < 0 {
		return &LearningAgentResults{}, fmt.Errorf("unclosed JSON array")
	}

	jsonStr := text[start:end]
	var insights []MemoryInsight
	if err := json.Unmarshal([]byte(jsonStr), &insights); err != nil {
		return nil, err
	}
	return &LearningAgentResults{Insights: insights}, nil
}

func categoryLabel(cat string) string {
	switch cat {
	case "style_preference":
		return "文风偏好"
	case "correction":
		return "纠正"
	case "character":
		return "角色"
	case "world_rule":
		return "世界观"
	case "plot_rule":
		return "剧情"
	case "user_preference":
		return "偏好"
	default:
		return cat
	}
}

