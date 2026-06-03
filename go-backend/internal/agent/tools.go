package agent

import (
	"context"
	"database/sql"
)

// Tool represents a tool that the AI agent can call
type Tool struct {
	Name        string
	Description string
	Properties  map[string]Property
	Required    []string
	Execute     func(ctx context.Context, args map[string]any) (string, error)
}

// Property defines a JSON Schema property for a tool parameter
type Property struct {
	Type        string   `json:"type"`
	Description string   `json:"description,omitempty"`
	Enum        []string `json:"enum,omitempty"`
}

// JSONSchema returns the tool's parameters as a JSON Schema object
func (t *Tool) JSONSchema() map[string]any {
	props := make(map[string]any)
	for name, prop := range t.Properties {
		p := map[string]any{"type": prop.Type}
		if prop.Description != "" {
			p["description"] = prop.Description
		}
		if len(prop.Enum) > 0 {
			p["enum"] = prop.Enum
		}
		props[name] = p
	}
	schema := map[string]any{
		"type":       "object",
		"properties": props,
	}
	if len(t.Required) > 0 {
		schema["required"] = t.Required
	}
	return schema
}

// ============================================================================
// Tool Context — shared dependencies for tool execution
// ============================================================================

type ToolContext struct {
	DB      *sql.DB
	NovelID string
	AgentID string // model name
}

// BuildAllTools creates all 31 tools bound to the given context
func BuildAllTools(ctx *ToolContext) []*Tool {
	var tools []*Tool
	tools = append(tools, chapterTools(ctx)...)
	tools = append(tools, characterTools(ctx)...)
	tools = append(tools, foreshadowingTools(ctx)...)
	tools = append(tools, outlineTools(ctx)...)
	tools = append(tools, configTools(ctx)...)
	tools = append(tools, styleTools(ctx)...)
	tools = append(tools, statsTools(ctx)...)
	tools = append(tools, memoryTools(ctx)...)
	return tools
}
