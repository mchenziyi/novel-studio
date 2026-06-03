package agent

import (
	"context"
	"fmt"

	"github.com/cloudwego/eino-ext/components/model/openai"
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
// Currently supports OpenAI-compatible providers (DeepSeek, MiMo, Ollama, etc.)
// Gemini support will be added in a follow-up via eino-ext/gemini
func (p *ModelProvider) ChatModel(ctx context.Context) (ChatModel, error) {
	switch p.Provider {
	case "deepseek":
		return p.deepseekModel(ctx)
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
