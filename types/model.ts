// 模型提供商类型
export type ModelProvider = 'openai' | 'anthropic' | 'deepseek' | 'gemini' | 'ollama' | 'lmstudio' | 'custom';

// 模型配置接口
export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  enabled: boolean;
  isDefault: boolean;
  settings: ModelSettings;
  createdAt: string;
  updatedAt: string;
}

// 模型设置（根据提供商不同而不同）
export type ModelSettings =
  | OpenAISettings
  | AnthropicSettings
  | DeepSeekSettings
  | GeminiSettings
  | OllamaSettings
  | LMStudioSettings
  | CustomSettings;

// OpenAI 设置
export interface OpenAISettings {
  type: 'openai';
  apiKey: string;
  baseURL?: string;
  model: string;
  organization?: string;
}

// Anthropic 设置
export interface AnthropicSettings {
  type: 'anthropic';
  apiKey: string;
  baseURL?: string;
  model: string;
}

// DeepSeek 设置
export interface DeepSeekSettings {
  type: 'deepseek';
  apiKey: string;
  baseURL?: string;
  model: string;
}

// Gemini 设置
export interface GeminiSettings {
  type: 'gemini';
  apiKey: string;
  model: string;
}

// Ollama 设置
export interface OllamaSettings {
  type: 'ollama';
  baseURL: string;
  model: string;
}

// LM Studio 设置
export interface LMStudioSettings {
  type: 'lmstudio';
  baseURL: string;
  model: string;
}

// 自定义 OpenAI 兼容设置
export interface CustomSettings {
  type: 'custom';
  apiKey?: string;
  baseURL: string;
  model: string;
  headers?: Record<string, string>;
}

// 模型测试结果
export interface ModelTestResult {
  success: boolean;
  latency?: number;
  error?: string;
  model?: string;
}

// 预设模型配置
export const MODEL_PRESETS: Record<ModelProvider, {
  name: string;
  description: string;
  icon: string;
  defaultBaseURL?: string;
}> = {
  openai: {
    name: 'OpenAI',
    description: 'GPT-4o、GPT-4.1、o3 等',
    icon: '🤖',
    defaultBaseURL: 'https://api.openai.com/v1',
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude Opus、Sonnet、Haiku',
    icon: '🧠',
    defaultBaseURL: 'https://api.anthropic.com',
  },
  deepseek: {
    name: 'DeepSeek',
    description: 'DeepSeek Chat、R1',
    icon: '🔮',
    defaultBaseURL: 'https://api.deepseek.com/v1',
  },
  gemini: {
    name: 'Google Gemini',
    description: 'Gemini Pro、Flash 等',
    icon: '✨',
  },
  ollama: {
    name: 'Ollama',
    description: '本地部署的开源模型',
    icon: '🦙',
    defaultBaseURL: 'http://localhost:11434',
  },
  lmstudio: {
    name: 'LM Studio',
    description: '本地部署的模型',
    icon: '🏠',
    defaultBaseURL: 'http://localhost:1234/v1',
  },
  custom: {
    name: '自定义',
    description: 'OpenAI 兼容的自定义端点',
    icon: '⚙️',
  },
};
