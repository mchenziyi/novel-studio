import fs from 'fs/promises';
import path from 'path';
import { ModelConfig, ModelProvider, ModelTestResult, MODEL_PRESETS } from '@/types/model';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

const CONFIG_DIR = path.join(process.cwd(), '.config');
const MODELS_FILE = path.join(CONFIG_DIR, 'models.json');

// 确保配置目录存在
async function ensureConfigDir() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    // 目录已存在
  }
}

// 读取模型配置
export async function getModelConfigs(): Promise<ModelConfig[]> {
  try {
    await ensureConfigDir();
    const data = await fs.readFile(MODELS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // 返回默认配置
    return getDefaultModelConfigs();
  }
}

// 保存模型配置
export async function saveModelConfigs(configs: ModelConfig[]): Promise<void> {
  await ensureConfigDir();
  await fs.writeFile(MODELS_FILE, JSON.stringify(configs, null, 2), 'utf-8');
}

// 获取单个模型配置
export async function getModelConfig(id: string): Promise<ModelConfig | null> {
  const configs = await getModelConfigs();
  return configs.find(c => c.id === id) || null;
}

// 添加模型配置
export async function addModelConfig(config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelConfig> {
  const configs = await getModelConfigs();
  const newConfig: ModelConfig = {
    ...config,
    id: `model_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 如果设置为默认，取消其他默认
  if (newConfig.isDefault) {
    configs.forEach(c => c.isDefault = false);
  }

  configs.push(newConfig);
  await saveModelConfigs(configs);
  return newConfig;
}

// 更新模型配置
export async function updateModelConfig(id: string, updates: Partial<ModelConfig>): Promise<ModelConfig | null> {
  const configs = await getModelConfigs();
  const index = configs.findIndex(c => c.id === id);

  if (index === -1) return null;

  const updatedConfig = {
    ...configs[index],
    ...updates,
    id, // 确保 ID 不变
    updatedAt: new Date().toISOString(),
  };

  // 如果设置为默认，取消其他默认
  if (updatedConfig.isDefault) {
    configs.forEach(c => c.isDefault = false);
  }

  configs[index] = updatedConfig;
  await saveModelConfigs(configs);
  return updatedConfig;
}

// 删除模型配置
export async function deleteModelConfig(id: string): Promise<boolean> {
  const configs = await getModelConfigs();
  const filtered = configs.filter(c => c.id !== id);

  if (filtered.length === configs.length) return false;

  await saveModelConfigs(filtered);
  return true;
}

// 测试模型连接
export async function testModelConnection(id: string): Promise<ModelTestResult> {
  const config = await getModelConfig(id);
  if (!config) {
    return { success: false, error: '模型配置不存在' };
  }

  const startTime = Date.now();

  try {
    const model = createModelInstance(config);
    const result = await generateText({
      model,
      messages: [{ role: 'user', content: '你好，这是一条测试消息。请回复"测试成功"。' }],
      maxOutputTokens: 50,
    });

    const latency = Date.now() - startTime;

    return {
      success: true,
      latency,
      model: config.settings.model,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      latency,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

// 创建模型实例
export function createModelInstance(config: ModelConfig) {
  const { settings } = config;

  switch (settings.type) {
    case 'openai':
    case 'ollama':
    case 'lmstudio':
    case 'custom': {
      const openai = createOpenAI({
        baseURL: settings.baseURL || MODEL_PRESETS[settings.type].defaultBaseURL,
        apiKey: ('apiKey' in settings ? settings.apiKey : '') || 'ollama',
      });
      return openai.chat(settings.model);
    }

    case 'anthropic': {
      const anthropic = createAnthropic({
        baseURL: settings.baseURL,
        apiKey: settings.apiKey,
      });
      return anthropic(settings.model);
    }

    case 'deepseek': {
      const openai = createOpenAI({
        baseURL: settings.baseURL || 'https://api.deepseek.com/v1',
        apiKey: settings.apiKey,
      });
      return openai.chat(settings.model);
    }

    case 'gemini': {
      const google = createGoogleGenerativeAI({
        apiKey: settings.apiKey,
      });
      return google(settings.model);
    }

    default:
      throw new Error(`不支持的模型类型: ${(settings as any).type}`);
  }
}

// 获取可用模型列表（从 API 获取）
export async function fetchAvailableModels(provider: ModelProvider, settings?: any): Promise<string[]> {
  try {
    switch (provider) {
      case 'openai': {
        const baseURL = settings?.baseURL || 'https://api.openai.com/v1';
        const response = await fetch(`${baseURL}/models`, {
          headers: {
            'Authorization': `Bearer ${settings?.apiKey}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          return data.data
            .map((m: any) => m.id)
            .filter((id: string) => id.startsWith('gpt') || id.startsWith('o') || id.startsWith('chatgpt'))
            .sort();
        }
        break;
      }

      case 'ollama':
      case 'lmstudio': {
        const baseURL = settings?.baseURL || MODEL_PRESETS[provider].defaultBaseURL;
        const response = await fetch(`${baseURL.replace('/v1', '')}/api/tags`);
        if (response.ok) {
          const data = await response.json();
          return data.models?.map((m: any) => m.name) || [];
        }
        break;
      }
    }
  } catch (error) {
    console.error(`Failed to fetch models for ${provider}:`, error);
  }

  // 返回预设列表
  return [];
}

// 获取默认模型配置
function getDefaultModelConfigs(): ModelConfig[] {
  return [
    {
      id: 'default-mimo',
      name: 'Mimo',
      provider: 'custom',
      enabled: true,
      isDefault: true,
      settings: {
        type: 'custom',
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1',
        model: process.env.MIMO_MODEL || 'mimo-v2.5-pro',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

// 获取默认模型
export async function getDefaultModel(): Promise<ModelConfig | null> {
  const configs = await getModelConfigs();
  return configs.find(c => c.isDefault && c.enabled) || configs.find(c => c.enabled) || null;
}
