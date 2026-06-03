package agent

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/schema"
)

// NewEinoTool wraps our Agent Tool as an Eino BaseTool.
// It implements both InvokableTool and StreamableTool.
func NewEinoTool(t *Tool) tool.InvokableTool {
	return &einoToolAdapter{tool: t}
}

type einoToolAdapter struct {
	tool *Tool
}

// Info returns the tool's schema info for the model
func (a *einoToolAdapter) Info(ctx context.Context) (*schema.ToolInfo, error) {
	params := make(map[string]*schema.ParameterInfo)
	for name, prop := range a.tool.Properties {
		params[name] = &schema.ParameterInfo{
			Type:     schema.DataType(prop.Type),
			Desc:     prop.Description,
			Enum:     prop.Enum,
			Required: contains(a.tool.Required, name),
		}
	}
	return &schema.ToolInfo{
		Name:   a.tool.Name,
		Desc:   a.tool.Description,
		ParamsOneOf: schema.NewParamsOneOfByParams(params),
	}, nil
}

// InvokableRun executes the tool synchronously
func (a *einoToolAdapter) InvokableRun(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error) {
	var args map[string]any
	if err := json.Unmarshal([]byte(argumentsInJSON), &args); err != nil {
		return fmt.Sprintf(`{"error":"invalid arguments: %s"}`, err.Error()), nil
	}
	return a.tool.Execute(ctx, args)
}

func contains(list []string, item string) bool {
	for _, s := range list {
		if s == item {
			return true
		}
	}
	return false
}

// WrapTools converts all our tools to Eino tool format
func WrapTools(tools []*Tool) []tool.BaseTool {
	var result []tool.BaseTool
	for _, t := range tools {
		result = append(result, NewEinoTool(t))
	}
	return result
}
