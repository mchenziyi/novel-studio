package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"novel-studio-go/internal/models"
	"novel-studio-go/internal/service"

	"github.com/gin-gonic/gin"
)

type ChatHandler struct {
	ChatSvc  *service.ChatService
	ChapSvc  *service.ChapterService
	ModelSvc *service.ModelService
	MemSvc   *service.MemoryService
	StyleSvc *service.StyleService
	NovelSvc *service.NovelService
	DB       *sql.DB
}

func NewChatHandler(db *sql.DB) *ChatHandler {
	return &ChatHandler{
		ChatSvc:  &service.ChatService{DB: db},
		ChapSvc:  &service.ChapterService{DB: db},
		ModelSvc: &service.ModelService{DB: db},
		MemSvc:   &service.MemoryService{DB: db},
		StyleSvc: &service.StyleService{DB: db},
		NovelSvc: &service.NovelService{DB: db},
		DB:       db,
	}
}

// GET /api/agent/chat
func (h *ChatHandler) List(c *gin.Context) {
	novelID := c.DefaultQuery("novelId", "default")
	chapterID := c.Query("chapterId")
	sessionID := c.Query("sessionId")

	if sessionID != "" {
		msgs, err := h.ChatSvc.GetMessages(sessionID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"sessionId": sessionID,
			"messages":  msgs,
		})
		return
	}

	if chapterID != "" {
		// Find sessions related to this chapter
		sessions, err := h.ChatSvc.ListSessions(novelID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		var related []models.ChatSession
		for _, s := range sessions {
			if s.ChapterID == chapterID {
				related = append(related, s)
			}
		}
		c.JSON(http.StatusOK, gin.H{"sessions": related})
		return
	}

	sessions, err := h.ChatSvc.ListSessions(novelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}

// DELETE /api/agent/chat/:id
func (h *ChatHandler) Delete(c *gin.Context) {
	if err := h.ChatSvc.SoftDelete(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// POST /api/agent/chat/:id/restore
func (h *ChatHandler) Restore(c *gin.Context) {
	if err := h.ChatSvc.Restore(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// POST /api/agent/chat — SSE 流式聊天（占位）
func (h *ChatHandler) Chat(c *gin.Context) {
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

	// Save session (create or load)
	sessionID := req.SessionID
	if sessionID == "" {
		sessionID = fmt.Sprintf("%d", time.Now().UnixMilli())
		_ = h.ChatSvc.CreateSession(&models.ChatSession{
			ID:      sessionID,
			NovelID: req.NovelID,
			Title:   "新对话",
			Context: req.Context,
			Model:   req.ModelID,
		})
	}

	// Save user message
	userMsgID := fmt.Sprintf("%d-user", time.Now().UnixNano())
	metaMap := map[string]interface{}{
		"model":     req.ModelID,
		"context":   req.Context,
		"chapterId": req.ChapterID,
	}
	metaBytes, _ := json.Marshal(metaMap)
	_ = h.ChatSvc.AddMessage(&models.ChatMessage{
		ID:        userMsgID,
		SessionID: sessionID,
		Role:      "user",
		Content:   req.Messages[len(req.Messages)-1].Content,
		Metadata:  string(metaBytes),
	})

	// Placeholder response (Agent 系统在 Phase 2 实现)
	assistantMsgID := fmt.Sprintf("%d-assistant", time.Now().UnixNano())
	responseText := "Go 后端已就绪。Agent 系统将在 Phase 2 集成 Eino 框架。当前接口可正常收发消息。"

	// Stream response
	chunks := chunkText(responseText, 5)
	for _, chunk := range chunks {
		data, _ := json.Marshal(gin.H{"type": "chunk", "text": chunk})
		fmt.Fprintf(c.Writer, "data: %s\n\n", data)
		flusher.Flush()
		time.Sleep(20 * time.Millisecond)
	}

	// Save assistant message
	toolCallsMeta := map[string]interface{}{"toolCalls": []string{}}
	tcBytes, _ := json.Marshal(toolCallsMeta)
	_ = h.ChatSvc.AddMessage(&models.ChatMessage{
		ID:        assistantMsgID,
		SessionID: sessionID,
		Role:      "assistant",
		Content:   responseText,
		Metadata:  string(tcBytes),
	})

	// Send done event
	done, _ := json.Marshal(gin.H{
		"type":      "done",
		"sessionId": sessionID,
		"message":   responseText,
		"toolCalls": []string{},
	})
	fmt.Fprintf(c.Writer, "data: %s\n\n", done)
	flusher.Flush()
}

func chunkText(text string, chunkSize int) []string {
	runes := []rune(text)
	var chunks []string
	for i := 0; i < len(runes); i += chunkSize {
		end := i + chunkSize
		if end > len(runes) {
			end = len(runes)
		}
		chunks = append(chunks, string(runes[i:end]))
	}
	return chunks
}
