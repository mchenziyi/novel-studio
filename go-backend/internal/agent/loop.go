package agent

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	openai "github.com/sashabaranov/go-openai"
)

// Agent orchestrates the AI conversation with tools and streaming
type Agent struct {
	DB        *sql.DB
	Model     *ModelClient
	NovelID   string
	ChapterID int
	Tools     []*Tool
	MaxSteps  int
}

// NewAgent creates an agent instance for the given context
func NewAgent(db *sql.DB, apiKey, baseURL, model, novelID string, chapterID int) *Agent {
	tctx := &ToolContext{DB: db, NovelID: novelID, AgentID: model}
	return &Agent{
		DB:        db,
		Model:     NewModelClient(apiKey, baseURL, model),
		NovelID:   novelID,
		ChapterID: chapterID,
		Tools:     BuildAllTools(tctx),
		MaxSteps:  50,
	}
}

// StreamCallback receives streaming events during the agent loop
type StreamCallback func(event StreamEvent)

type StreamEvent struct {
	Type      string   `json:"type"`      // "chunk", "tool_start", "tool_end", "done", "error"
	Text      string   `json:"text,omitempty"`
	ToolName  string   `json:"toolName,omitempty"`
	ToolInput string   `json:"toolInput,omitempty"`
	ToolOutput string  `json:"toolOutput,omitempty"`
	ToolCalls []string `json:"toolCalls,omitempty"`
	Message   string   `json:"message,omitempty"`
	Error     string   `json:"error,omitempty"`
}

// AgentResult holds the final result of the agent run
type AgentResult struct {
	Message   string   `json:"message"`
	ToolCalls []string `json:"toolCalls"`
	SessionID string   `json:"sessionId,omitempty"`
}

// Run executes the agent loop with streaming callbacks.
// It handles: system prompt, tool calls, streaming text, and post-processing
func (a *Agent) Run(ctx context.Context, userMessages []openai.ChatCompletionMessage, cb StreamCallback) *AgentResult {
	var toolCallNames []string
	var fullText strings.Builder

	// Build messages with system prompt
	tctx := &ToolContext{DB: a.DB, NovelID: a.NovelID, AgentID: a.Model.modelName}
	systemPrompt := BuildSystemPrompt(tctx, a.ChapterID)
	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: systemPrompt},
	}
	messages = append(messages, userMessages...)

	// Agent loop: up to MaxSteps iterations
	for step := 0; step < a.MaxSteps; step++ {
		log.Printf("[Agent] Step %d: %d messages, %d tools", step+1, len(messages), len(a.Tools))

		// Call model
		stream, err := a.Model.ChatStream(ctx, messages, a.Tools, 0.8)
		if err != nil {
			cb(StreamEvent{Type: "error", Error: fmt.Sprintf("模型调用失败: %v", err)})
			break
		}

		var toolCalls []openai.ToolCall
		var stepText strings.Builder

		for chunk := range stream {
			if chunk.Text != "" {
				stepText.WriteString(chunk.Text)
				cb(StreamEvent{Type: "chunk", Text: chunk.Text})
			}
			if len(chunk.ToolCalls) > 0 {
				toolCalls = chunk.ToolCalls
				log.Printf("[Agent] Got %d tool calls from stream: %+v", len(toolCalls), toolCalls[0].ID)
			}
			if chunk.IsDone {
				break
			}
		}

		// If no tool calls, we're done
		if len(toolCalls) == 0 {
			fullText.WriteString(stepText.String())
			break
		}

		// Execute tools and inject results as user messages
		for _, tc := range toolCalls {
			name := tc.Function.Name
			toolCallNames = append(toolCallNames, name)
			log.Printf("[Agent] Tool call: %s(%s) id=%s", name, tc.Function.Arguments, tc.ID)

			cb(StreamEvent{Type: "tool_start", ToolName: name, ToolInput: tc.Function.Arguments})

			var args map[string]any
			if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
				args = map[string]any{}
			}

			var toolResult string
			for _, t := range a.Tools {
				if t.Name == name {
					result, err := t.Execute(ctx, args)
					if err != nil {
						toolResult = fmt.Sprintf(`{"error":"%s"}`, err.Error())
					} else {
						toolResult = result
					}
					break
				}
			}
			if toolResult == "" {
				toolResult = fmt.Sprintf(`{"error":"未知工具: %s"}`, name)
			}

			cb(StreamEvent{Type: "tool_end", ToolName: name, ToolOutput: truncate(toolResult, 500)})

			// Inject as user message instead of tool role (more compatible)
			messages = append(messages, openai.ChatCompletionMessage{
				Role:    openai.ChatMessageRoleUser,
				Content: fmt.Sprintf("[工具 %s 返回]: %s", name, toolResult),
			})
		}
		log.Printf("[Agent] After tools: %d messages", len(messages))
	}

	// Build final response
	finalText := fullText.String()
	if finalText == "" {
		finalText = "模型没有生成回复。请重试或换个方式提问。"
	}

	cb(StreamEvent{
		Type:      "done",
		Message:   finalText,
		ToolCalls: toolCallNames,
	})

	return &AgentResult{
		Message:   finalText,
		ToolCalls: toolCallNames,
	}
}

func countRunes(text string) int { return len([]rune(text)) }

func timeNow() int64     { return time.Now().UnixMilli() }
