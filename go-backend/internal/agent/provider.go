package agent

import (
	"context"
	"fmt"
	"os"

	"github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/cloudwego/eino-ext/components/model/gemini"

	"google.golang.org/genai"
)

// ModelProvider creates Eino ChatModel instances for different providers
type ModelProvider struct {
	Provider string
	APIKey   string
	BaseURL  string
	Model    string
}

func NewModelProvider(provider, apiKey, baseURL, modelName string) *ModelProvider {
	return &ModelProvider{Provider: provider, APIKey: apiKey, BaseURL: baseURL, Model: modelName}
}

// ChatModel creates an Eino ChatModel based on the provider type
func (p *ModelProvider) ChatModel(ctx context.Context) (ChatModel, error) {
	switch p.Provider {
	case "deepseek":
		return p.deepseekModel(ctx)
	case "gemini":
		return p.geminiModel(ctx)
	case "openai":
		return p.openaiModel(ctx)
	default:
		return p.customModel(ctx)
	}
}

func (p *ModelProvider) deepseekModel(ctx context.Context) (ChatModel, error) {
	baseURL := p.BaseURL
	if baseURL == "" {
		baseURL = "https://api.deepseek.com/v1"
	}
	return openai.NewChatModel(ctx, &openai.ChatModelConfig{
		Model:   p.Model,
		APIKey:  p.APIKey,
		BaseURL: baseURL,
	})
}

func (p *ModelProvider) openaiModel(ctx context.Context) (ChatModel, error) {
	return openai.NewChatModel(ctx, &openai.ChatModelConfig{
		Model:   p.Model,
		APIKey:  p.APIKey,
		BaseURL: p.BaseURL,
	})
}

func (p *ModelProvider) customModel(ctx context.Context) (ChatModel, error) {
	baseURL := p.BaseURL
	if baseURL == "" {
		return nil, fmt.Errorf("custom provider requires baseURL")
	}
	return openai.NewChatModel(ctx, &openai.ChatModelConfig{
		Model:   p.Model,
		APIKey:  p.APIKey,
		BaseURL: baseURL,
	})
}

func (p *ModelProvider) geminiModel(ctx context.Context) (ChatModel, error) {
	key := p.APIKey
	if key == "" {
		key = os.Getenv("GEMINI_API_KEY")
	}
	client, err := genai.NewClient(ctx, &genai.ClientConfig{APIKey: key})
	if err != nil {
		return nil, fmt.Errorf("gemini client: %w", err)
	}
	return gemini.NewChatModel(ctx, &gemini.Config{Client: client, Model: p.Model})
}
