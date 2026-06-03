package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"novel-studio-go/internal/agent"
	"novel-studio-go/internal/models"
	"novel-studio-go/internal/repository"

	openai "github.com/sashabaranov/go-openai"
	"github.com/gin-gonic/gin"
)

// SSEChat handles the POST /api/agent/chat endpoint with full Agent integration
func (h *ChatHandler) SSEChat(c *gin.Context) {
	var req models.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.String(http.StatusInternalServerError, "streaming not supported")
		return
	}

	send := func(data any) {
		b, _ := json.Marshal(data)
		fmt.Fprintf(c.Writer, "data: %s\n\n", b)
		flusher.Flush()
	}

	// Resolve model config
	modelConfig := h.resolveModel(req.ModelID)
	if modelConfig == nil {
		send(gin.H{"type": "error", "error": "没有可用的模型配置"})
		return
	}

	var settings map[string]string
	json.Unmarshal([]byte(modelConfig.Settings), &settings)
	apiKey := settings["apiKey"]
	baseURL := settings["baseURL"]
	modelName := settings["model"]
	if modelName == "" {
		modelName = modelConfig.Name
	}

	if apiKey == "" {
		send(gin.H{"type": "error", "error": "模型未配置 API Key"})
		return
	}

	novelID := req.NovelID
	if novelID == "" {
		novelID = "default"
	}

	// Session management
	sessionID := req.SessionID
	if sessionID == "" {
		sessionID = fmt.Sprintf("%d-%x", time.Now().UnixMilli(), time.Now().UnixNano()%10000)
		title := req.Messages[len(req.Messages)-1].Content
		if len([]rune(title)) > 30 { title = string([]rune(title)[:30]) }
		chapterIDStr := ""
		if req.ChapterID > 0 { chapterIDStr = fmt.Sprintf("%04d", req.ChapterID) }
		h.ChatSvc.CreateSession(&models.ChatSession{
			ID: sessionID, NovelID: novelID, Title: title,
			ChapterID: chapterIDStr, Context: req.Context, Model: modelConfig.ID,
		})
	}

	// Save user message
	for _, msg := range req.Messages {
		if msg.Role != "system" {
			meta, _ := json.Marshal(map[string]any{
				"model": modelConfig.ID, "context": req.Context, "chapterId": req.ChapterID,
			})
			h.ChatSvc.AddMessage(&models.ChatMessage{
				ID: fmt.Sprintf("%d-%s", time.Now().UnixNano(), "user"),
				SessionID: sessionID, Role: msg.Role, Content: msg.Content, Metadata: string(meta),
			})
		}
	}

	// Build agent
	ag := agent.NewAgent(h.DB, apiKey, baseURL, modelName, novelID, req.ChapterID)

	// Convert messages to OpenAI format
	var openaiMsgs []openai.ChatCompletionMessage
	for _, msg := range req.Messages {
		switch msg.Role {
		case "user":
			openaiMsgs = append(openaiMsgs, openai.ChatCompletionMessage{
				Role: openai.ChatMessageRoleUser, Content: msg.Content,
			})
		case "assistant":
			openaiMsgs = append(openaiMsgs, openai.ChatCompletionMessage{
				Role: openai.ChatMessageRoleAssistant, Content: msg.Content,
			})
		}
	}

	// Run agent with streaming
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Minute)
	defer cancel()

	var fullText string
	var toolCallNames []string

	result := ag.Run(ctx, openaiMsgs, func(evt agent.StreamEvent) {
		switch evt.Type {
		case "chunk":
			fullText += evt.Text
			send(gin.H{"type": "chunk", "text": evt.Text})
		case "tool_start":
			send(gin.H{"type": "tool_start", "toolName": evt.ToolName, "toolInput": evt.ToolInput})
		case "tool_end":
			send(gin.H{"type": "tool_end", "toolName": evt.ToolName, "toolOutput": evt.ToolOutput})
		case "error":
			log.Printf("[SSEChat] Agent error: %s", evt.Error)
			send(gin.H{"type": "error", "error": evt.Error})
		case "done":
			toolCallNames = evt.ToolCalls
			meta, _ := json.Marshal(map[string]any{
				"model": modelConfig.ID, "context": req.Context,
				"chapterId": req.ChapterID, "toolCalls": evt.ToolCalls,
			})
			h.ChatSvc.AddMessage(&models.ChatMessage{
				ID: fmt.Sprintf("%d-%s", time.Now().UnixNano(), "assistant"),
				SessionID: sessionID, Role: "assistant",
				Content: evt.Message, Metadata: string(meta),
			})
			if len([]rune(fullText)) > 20 {
				h.ChatSvc.UpdateTitle(sessionID, string([]rune(fullText)[:20]))
			}
			send(gin.H{
				"type": "done", "sessionId": sessionID,
				"message": evt.Message, "toolCalls": evt.ToolCalls,
			})
		}
	})

	if result == nil || fullText == "" {
		send(gin.H{
			"type": "done", "sessionId": sessionID,
			"message": "模型没有生成回复。请重试或换个方式提问。",
			"toolCalls": toolCallNames,
		})
	}
}

// resolveModel finds the active model config
func (h *ChatHandler) resolveModel(modelID string) *models.ModelConfig {
	configs, err := repository.GetModelConfigs(h.DB)
	if err != nil {
		return nil
	}
	for i := range configs {
		c := &configs[i]
		if c.Enabled {
			if modelID != "" && c.ID == modelID {
				return c
			}
			if c.IsDefault {
				return c
			}
		}
	}
	// Return first enabled
	for i := range configs {
		if configs[i].Enabled {
			return &configs[i]
		}
	}
	return nil
}
