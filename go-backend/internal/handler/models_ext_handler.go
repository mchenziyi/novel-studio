package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"novel-studio-go/internal/agent"

	"github.com/cloudwego/eino/schema"
	"github.com/gin-gonic/gin"
)

func RegisterModelsExtRoutes(r *gin.RouterGroup, db *sql.DB) {
	// GET /api/models/list?provider=xxx&apiKey=xxx&baseURL=xxx
	r.GET("/models/list", func(c *gin.Context) {
		provider := c.Query("provider")
		apiKey := c.Query("apiKey")
		baseURL := c.Query("baseURL")

		if provider == "" || apiKey == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "provider 和 apiKey 必填"})
			return
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
		defer cancel()

		models, err := fetchModelsFromProvider(ctx, provider, apiKey, baseURL)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"models": models})
	})

	// POST /api/models/test/:id
	r.POST("/models/test", func(c *gin.Context) {
		var req struct {
			Provider string `json:"provider"`
			APIKey   string `json:"apiKey"`
			BaseURL  string `json:"baseURL"`
			Model    string `json:"model"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if req.APIKey == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "apiKey 必填"})
			return
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
		defer cancel()

		latency, err := testModelConnection(ctx, req.Provider, req.APIKey, req.BaseURL, req.Model)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"success": false, "error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "latency": latency.Milliseconds(), "model": req.Model})
	})
}

func fetchModelsFromProvider(ctx context.Context, provider, apiKey, baseURL string) ([]string, error) {
	customBaseURL := baseURL
	if customBaseURL == "" {
		switch provider {
		case "deepseek":
			customBaseURL = "https://api.deepseek.com/v1"
		case "openai":
			customBaseURL = "https://api.openai.com/v1"
		}
	}

	// Fetch from /models endpoint
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequestWithContext(ctx, "GET", customBaseURL+"/models", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var models []string
	for _, m := range result.Data {
		models = append(models, m.ID)
	}
	if models == nil {
		models = []string{}
	}
	return models, nil
}

func testModelConnection(ctx context.Context, provider, apiKey, baseURL, model string) (time.Duration, error) {
	mp := agent.NewModelProvider(provider, apiKey, baseURL, model)
	chatModel, err := mp.ChatModel(ctx)
	if err != nil {
		return 0, err
	}

	start := time.Now()
	client := agent.NewModelClient(chatModel, model)
	_, err = client.ChatSync(ctx, []*schema.Message{
		{Role: schema.User, Content: "hi"},
	}, nil)
	return time.Since(start), err
}
