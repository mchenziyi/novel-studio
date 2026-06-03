package agent

import (
	"context"
	"encoding/json"
	"io"

	openai "github.com/sashabaranov/go-openai"
)

// ModelClient wraps OpenAI-compatible API for streaming + tool calling
type ModelClient struct {
	client    *openai.Client
	modelName string
}

func NewModelClient(apiKey, baseURL, model string) *ModelClient {
	cfg := openai.DefaultConfig(apiKey)
	if baseURL != "" {
		cfg.BaseURL = baseURL
	}
	return &ModelClient{
		client:    openai.NewClientWithConfig(cfg),
		modelName: model,
	}
}

type StreamChunk struct {
	Text      string
	ToolCalls []openai.ToolCall
	IsDone    bool
	Usage     *openai.Usage
}

func (c *ModelClient) ChatStream(ctx context.Context, messages []openai.ChatCompletionMessage, tools []*Tool, temperature float32) (<-chan StreamChunk, error) {
	ch := make(chan StreamChunk, 100)

	var openaiTools []openai.Tool
	for _, t := range tools {
		schemaBytes, _ := json.Marshal(t.JSONSchema())
		openaiTools = append(openaiTools, openai.Tool{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        t.Name,
				Description: t.Description,
				Parameters:  json.RawMessage(schemaBytes),
			},
		})
	}

	req := openai.ChatCompletionRequest{
		Model:       c.modelName,
		Messages:    messages,
		Tools:       openaiTools,
		Temperature: temperature,
		Stream:      true,
	}

	stream, err := c.client.CreateChatCompletionStream(ctx, req)
	if err != nil {
		return nil, err
	}

	go func() {
		defer close(ch)
		defer stream.Close()

		var toolCallAccum map[int]*openai.ToolCall

		for {
			resp, err := stream.Recv()
			if err == io.EOF {
				ch <- StreamChunk{IsDone: true}
				return
			}
			if err != nil {
				ch <- StreamChunk{Text: "[StreamError: " + err.Error() + "]", IsDone: true}
				return
			}
			if len(resp.Choices) == 0 {
				continue
			}

			delta := resp.Choices[0].Delta

			if delta.Content != "" {
				ch <- StreamChunk{Text: delta.Content}
			}

			if len(delta.ToolCalls) > 0 {
				if toolCallAccum == nil {
					toolCallAccum = make(map[int]*openai.ToolCall)
				}
				for _, tc := range delta.ToolCalls {
					if tc.Index == nil {
						continue
					}
					if existing, ok := toolCallAccum[*tc.Index]; ok {
						if tc.Function.Arguments != "" {
							existing.Function.Arguments += tc.Function.Arguments
						}
					} else {
						toolCallAccum[*tc.Index] = &openai.ToolCall{
							ID:   tc.ID,
							Type: tc.Type,
							Function: openai.FunctionCall{
								Name:      tc.Function.Name,
								Arguments: tc.Function.Arguments,
							},
						}
					}
				}
			}

			if resp.Usage != nil {
				ch <- StreamChunk{Usage: resp.Usage}
			}

			if len(resp.Choices) > 0 && resp.Choices[0].FinishReason != "" {
				if len(toolCallAccum) > 0 {
					var tcs []openai.ToolCall
					for _, tc := range toolCallAccum {
						tcs = append(tcs, *tc)
					}
					ch <- StreamChunk{ToolCalls: tcs}
				}
				ch <- StreamChunk{IsDone: true}
				return
			}
		}
	}()

	return ch, nil
}

// ChatSync non-streaming completion with tools
func (c *ModelClient) ChatSync(ctx context.Context, messages []openai.ChatCompletionMessage, tools []*Tool, temperature float32) (*ChatResult, error) {
	var openaiTools []openai.Tool
	for _, t := range tools {
		schemaBytes, _ := json.Marshal(t.JSONSchema())
		openaiTools = append(openaiTools, openai.Tool{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        t.Name,
				Description: t.Description,
				Parameters:  json.RawMessage(schemaBytes),
			},
		})
	}

	req := openai.ChatCompletionRequest{
		Model:       c.modelName,
		Messages:    messages,
		Tools:       openaiTools,
		Temperature: temperature,
	}

	resp, err := c.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return nil, err
	}

	result := &ChatResult{}
	if len(resp.Choices) > 0 {
		result.Content = resp.Choices[0].Message.Content
		if len(resp.Choices[0].Message.ToolCalls) > 0 {
			result.ToolCalls = resp.Choices[0].Message.ToolCalls
		}
	}
	if resp.Usage.TotalTokens > 0 {
		result.Usage = &resp.Usage
	}
	return result, nil
}

type ChatResult struct {
	Content   string
	ToolCalls []openai.ToolCall
	Usage     *openai.Usage
}
