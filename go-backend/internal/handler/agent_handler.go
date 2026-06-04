package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/cloudwego/eino/schema"

	"novel-studio-go/internal/agent"
	"novel-studio-go/internal/models"
	"novel-studio-go/internal/repository"

	"github.com/gin-gonic/gin"
)

// SSEChat handles POST /api/agent/chat with Eino-backed Agent
func (h *ChatHandler) SSEChat(c *gin.Context) {
	// 先读原始 body，v1 前端发的是 "model" 而非 "modelId"
	bodyBytes, _ := c.GetRawData()
	var rawBody map[string]any
	json.Unmarshal(bodyBytes, &rawBody)
	// 将 "model" 复制到 "modelId"（v1 兼容）
	if _, ok := rawBody["modelId"]; !ok {
		if m, ok := rawBody["model"].(string); ok && m != "" {
			rawBody["modelId"] = m
		}
	}
	// 重新序列化后用 ShouldBindJSON 绑定
	fixedBytes, _ := json.Marshal(rawBody)
	c.Request.Body = io.NopCloser(bytes.NewReader(fixedBytes))
	
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
		if len([]rune(title)) > 30 {
			title = string([]rune(title)[:30])
		}
		chapterIDStr := ""
		if req.ChapterID > 0 {
			chapterIDStr = fmt.Sprintf("%04d", req.ChapterID)
		}
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
				ID:        fmt.Sprintf("%d-%s", time.Now().UnixNano(), "user"),
				SessionID: sessionID,
				Role:      msg.Role,
				Content:   msg.Content,
				Metadata:  string(meta),
			})
		}
	}

	// Create Eino ChatModel via ModelProvider (supports DeepSeek/Gemini/OpenAI)
	provider := modelConfig.Provider
	if provider == "" || provider == "custom" {
		provider = "openai"
	}
	mp := agent.NewModelProvider(provider, apiKey, baseURL, modelName)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Minute)
	defer cancel()

	chatModel, err := mp.ChatModel(ctx)
	if err != nil {
		send(gin.H{"type": "error", "error": fmt.Sprintf("创建模型失败: %v", err)})
		return
	}

	// Create Agent with Eino model client
	modelClient := agent.NewModelClient(chatModel, modelName)
	ag := agent.NewAgent(h.DB, modelClient, novelID, req.ChapterID)

	// Convert messages to Eino format
	var userMsgs []*schema.Message
	for _, msg := range req.Messages {
		switch msg.Role {
		case "user":
			userMsgs = append(userMsgs, &schema.Message{
				Role:    schema.User,
				Content: msg.Content,
			})
		case "assistant":
			userMsgs = append(userMsgs, &schema.Message{
				Role:    schema.Assistant,
				Content: msg.Content,
			})
		}
	}

	// Run agent with streaming
	var fullText string
	var toolCallNames []string

	result := ag.Run(ctx, userMsgs, func(evt agent.StreamEvent) {
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
				ID:        fmt.Sprintf("%d-%s", time.Now().UnixNano(), "assistant"),
				SessionID: sessionID,
				Role:      "assistant",
				Content:   evt.Message,
				Metadata:  string(meta),
			})
			if len([]rune(fullText)) > 20 {
				h.ChatSvc.UpdateTitle(sessionID, string([]rune(fullText)[:20]))
			}
			send(gin.H{
				"type":      "done",
				"sessionId": sessionID,
				"message":   evt.Message,
				"toolCalls": evt.ToolCalls,
			})

			// Trigger Learning Agent asynchronously with full conversation
			fullConvo := append(userMsgs, &schema.Message{
				Role:    schema.Assistant,
				Content: evt.Message,
			})
			learner := agent.NewLearner(h.DB, modelClient, novelID)
			learner.AnalyzeAndSave(ctx, fullConvo)
		}
	})

	if result == nil || fullText == "" {
		send(gin.H{
			"type":      "done",
			"sessionId": sessionID,
			"message":   "模型没有生成回复。请重试或换个方式提问。",
			"toolCalls": toolCallNames,
		})
	}
}

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
	for i := range configs {
		if configs[i].Enabled {
			return &configs[i]
		}
	}
	return nil
}
