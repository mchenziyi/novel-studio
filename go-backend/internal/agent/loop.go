package agent

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/cloudwego/eino/schema"
)

type Agent struct {
	DB        *sql.DB
	Model     *ModelClient
	NovelID   string
	ChapterID int
	Tools     []*Tool
	MaxSteps  int
}

func NewAgent(db *sql.DB, model *ModelClient, novelID string, chapterID int) *Agent {
	tctx := &ToolContext{DB: db, NovelID: novelID, AgentID: model.modelName}
	return &Agent{
		DB:        db,
		Model:     model,
		NovelID:   novelID,
		ChapterID: chapterID,
		Tools:     BuildAllTools(tctx),
		MaxSteps:  50,
	}
}

type StreamEvent struct {
	Type       string   `json:"type"`
	Text       string   `json:"text,omitempty"`
	ToolName   string   `json:"toolName,omitempty"`
	ToolInput  string   `json:"toolInput,omitempty"`
	ToolOutput string   `json:"toolOutput,omitempty"`
	ToolCalls  []string `json:"toolCalls,omitempty"`
	Message    string   `json:"message,omitempty"`
	Error      string   `json:"error,omitempty"`
}

type AgentResult struct {
	Message   string   `json:"message"`
	ToolCalls []string `json:"toolCalls"`
}

type StreamCallback func(event StreamEvent)

func (a *Agent) Run(ctx context.Context, userMessages []*schema.Message, cb StreamCallback) *AgentResult {
	var toolCallNames []string
	var fullText strings.Builder

	tctx := &ToolContext{DB: a.DB, NovelID: a.NovelID, AgentID: a.Model.modelName}
	systemPrompt := BuildSystemPrompt(tctx, a.ChapterID)

	messages := []*schema.Message{
		{Role: schema.System, Content: systemPrompt},
	}
	messages = append(messages, userMessages...)

	for step := 0; step < a.MaxSteps; step++ {
		log.Printf("[Agent] Step %d: %d msgs, %d tools", step+1, len(messages), len(a.Tools))

		stream, err := a.Model.ChatStream(ctx, messages, a.Tools, 0.8)
		if err != nil {
			cb(StreamEvent{Type: "error", Error: fmt.Sprintf("模型调用失败: %v", err)})
			break
		}

		var toolCalls []schema.ToolCall
		var stepText strings.Builder

		for chunk := range stream {
			if chunk.Text != "" {
				stepText.WriteString(chunk.Text)
				cb(StreamEvent{Type: "chunk", Text: chunk.Text})
			}
			if len(chunk.ToolCalls) > 0 {
				toolCalls = chunk.ToolCalls
			}
			if chunk.IsDone {
				break
			}
		}

		if len(toolCalls) == 0 {
			fullText.WriteString(stepText.String())
			break
		}

		messages = append(messages, &schema.Message{
			Role:      schema.Assistant,
			Content:   stepText.String(),
			ToolCalls: toolCalls,
		})

		for _, tc := range toolCalls {
			name := tc.Function.Name
			toolCallNames = append(toolCallNames, name)
			log.Printf("[Agent] Tool: %s(%s)", name, tc.Function.Arguments)

			cb(StreamEvent{Type: "tool_start", ToolName: name, ToolInput: tc.Function.Arguments})

			var args map[string]any
			if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
				args = map[string]any{}
			}

			toolResult := a.executeTool(ctx, name, args)
			cb(StreamEvent{Type: "tool_end", ToolName: name, ToolOutput: truncate(toolResult, 500)})

			messages = append(messages, &schema.Message{
				Role:       schema.Tool,
				Content:    toolResult,
				Name:       name,
				ToolCallID: tc.ID,
			})
		}
		log.Printf("[Agent] After tools: %d messages", len(messages))
	}

	finalText := fullText.String()
	if finalText == "" {
		finalText = "模型没有生成回复。请重试或换个方式提问。"
	}

	cb(StreamEvent{Type: "done", Message: finalText, ToolCalls: toolCallNames})
	return &AgentResult{Message: finalText, ToolCalls: toolCallNames}
}

func (a *Agent) executeTool(ctx context.Context, name string, args map[string]any) string {
	for _, t := range a.Tools {
		if t.Name == name {
			result, err := t.Execute(ctx, args)
			if err != nil {
				return fmt.Sprintf(`{"error":"%s"}`, err.Error())
			}
			return result
		}
	}
	return fmt.Sprintf(`{"error":"未知工具: %s"}`, name)
}

func truncate(s string, n int) string {
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	return string(runes[:n]) + "..."
}
