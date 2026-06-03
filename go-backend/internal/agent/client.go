package agent

import (
	"context"
	"io"
	"log"

	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"
)

// ChatModel is the interface Eino ChatModels implement (Stream + Generate + BindTools)
type ChatModel interface {
	Generate(ctx context.Context, input []*schema.Message, opts ...model.Option) (*schema.Message, error)
	Stream(ctx context.Context, input []*schema.Message, opts ...model.Option) (*schema.StreamReader[*schema.Message], error)
	BindTools(tools []*schema.ToolInfo) error
}

// ModelClient wraps an Eino ChatModel for OpenAI-compatible streaming + tool calling
type ModelClient struct {
	model     ChatModel
	modelName string
}

func NewModelClient(model ChatModel, modelName string) *ModelClient {
	return &ModelClient{model: model, modelName: modelName}
}

func (c *ModelClient) Model() ChatModel { return c.model }

type StreamChunk struct {
	Text      string
	ToolCalls []schema.ToolCall
	IsDone    bool
}

func (c *ModelClient) ChatStream(ctx context.Context, messages []*schema.Message, tools []*Tool, temperature float32) (<-chan StreamChunk, error) {
	ch := make(chan StreamChunk, 100)

	toolInfos := BuildEinoToolInfos(tools)
	if err := c.model.BindTools(toolInfos); err != nil {
		return nil, err
	}

	stream, err := c.model.Stream(ctx, messages)
	if err != nil {
		return nil, err
	}

	go func() {
		defer close(ch)
		defer stream.Close()

		var toolCallAccum map[int]*schema.ToolCall

		for {
			msg, err := stream.Recv()
			if err == io.EOF {
				if len(toolCallAccum) > 0 {
					var tcs []schema.ToolCall
					for _, tc := range toolCallAccum {
						tcs = append(tcs, *tc)
					}
					ch <- StreamChunk{ToolCalls: tcs}
				}
				ch <- StreamChunk{IsDone: true}
				return
			}
			if err != nil {
				log.Printf("[ModelClient] Stream error: %v", err)
				ch <- StreamChunk{IsDone: true}
				return
			}

			if msg.Content != "" {
				ch <- StreamChunk{Text: msg.Content}
			}

			if len(msg.ToolCalls) > 0 {
				if toolCallAccum == nil {
					toolCallAccum = make(map[int]*schema.ToolCall)
				}
				for i := range msg.ToolCalls {
					tc := &msg.ToolCalls[i]
					idx := 0
					if tc.Index != nil {
						idx = *tc.Index
					}
					if existing, ok := toolCallAccum[idx]; ok {
						if tc.Function.Arguments != "" {
							existing.Function.Arguments += tc.Function.Arguments
						}
					} else {
						copy := *tc
						toolCallAccum[idx] = &copy
					}
				}
			}

			if msg.ResponseMeta != nil && msg.ResponseMeta.FinishReason != "" {
				if len(toolCallAccum) > 0 {
					var tcs []schema.ToolCall
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

func (c *ModelClient) ChatSync(ctx context.Context, messages []*schema.Message, tools []*Tool) (*ChatResult, error) {
	if len(tools) > 0 {
		toolInfos := BuildEinoToolInfos(tools)
		if err := c.model.BindTools(toolInfos); err != nil {
			return nil, err
		}
	}
	msg, err := c.model.Generate(ctx, messages)
	if err != nil {
		return nil, err
	}
	return &ChatResult{Content: msg.Content, ToolCalls: msg.ToolCalls}, nil
}

type ChatResult struct {
	Content   string
	ToolCalls []schema.ToolCall
}

func BuildEinoToolInfos(tools []*Tool) []*schema.ToolInfo {
	var infos []*schema.ToolInfo
	for _, t := range tools {
		info := &schema.ToolInfo{
			Name: t.Name,
			Desc: t.Description,
		}
		if len(t.Properties) > 0 {
			params := make(map[string]*schema.ParameterInfo)
			for name, prop := range t.Properties {
				params[name] = &schema.ParameterInfo{
					Type:     schema.DataType(prop.Type),
					Desc:     prop.Description,
					Enum:     prop.Enum,
					Required: contains(t.Required, name),
				}
			}
			info.ParamsOneOf = schema.NewParamsOneOfByParams(params)
		}
		infos = append(infos, info)
	}
	return infos
}
