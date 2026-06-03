import { ModelConfig, ModelProvider, ModelTestResult, MODEL_PRESETS } from '@/types/model';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { getDatabase } from './database';

// 读取模型配置
export async function getModelConfigs(): Promise<ModelConfig[]> {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM model_configs ORDER BY is_default DESC, name').all() as any[];

  const dbConfigs = rows.map(row => ({
    id: row.id,
    name: row.name,
    provider: row.provider,
    enabled: Boolean(row.enabled),
    isDefault: Boolean(row.is_default),
    settings: JSON.parse(row.settings),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  // 如果 DB 为空，返回默认配置
  if (dbConfigs.length === 0) {
    return getDefaultModelConfigs();
  }

  // 合并：DB 配置 + 环境变量中的默认模型（如果 DB 里没有的话）
  const defaults = getDefaultModelConfigs();
  for (const def of defaults) {
    if (!dbConfigs.some(c => c.id === def.id)) {
      dbConfigs.push(def);
    }
  }

  return dbConfigs;
}

// 保存模型配置
export async function saveModelConfigs(configs: ModelConfig[]): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare('DELETE FROM model_configs').run();

  const insert = db.prepare(`
    INSERT INTO model_configs (id, name, provider, enabled, is_default, settings, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const config of configs) {
    insert.run(
      config.id,
      config.name,
      config.provider,
      config.enabled ? 1 : 0,
      config.isDefault ? 1 : 0,
      JSON.stringify(config.settings),
      config.createdAt || now,
      now
    );
  }
}

// 获取单个模型配置
export async function getModelConfig(id: string): Promise<ModelConfig | null> {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM model_configs WHERE id = ?').get(id) as any;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    enabled: Boolean(row.enabled),
    isDefault: Boolean(row.is_default),
    settings: JSON.parse(row.settings),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// 添加模型配置
export async function addModelConfig(config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelConfig> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = `model_${Date.now()}`;

  // 如果设置为默认，取消其他默认
  if (config.isDefault) {
    db.prepare('UPDATE model_configs SET is_default = 0').run();
  }

  db.prepare(`
    INSERT INTO model_configs (id, name, provider, enabled, is_default, settings, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    config.name,
    config.provider,
    config.enabled ? 1 : 0,
    config.isDefault ? 1 : 0,
    JSON.stringify(config.settings),
    now,
    now
  );

  return {
    ...config,
    id,
    createdAt: now,
    updatedAt: now,
  };
}

// 更新模型配置（不存在则创建）
export async function updateModelConfig(id: string, updates: Partial<ModelConfig>): Promise<ModelConfig | null> {
  const db = getDatabase();
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT * FROM model_configs WHERE id = ?').get(id) as any;

  // 如果不存在，创建新记录
  if (!existing) {
    db.prepare(`
      INSERT INTO model_configs (id, name, provider, enabled, is_default, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      updates.name || id,
      updates.provider || 'custom',
      updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : 1,
      updates.isDefault ? 1 : 0,
      JSON.stringify(updates.settings || {}),
      now,
      now
    );
    return {
      id,
      name: updates.name || id,
      provider: updates.provider || 'custom',
      enabled: updates.enabled !== undefined ? updates.enabled : true,
      isDefault: updates.isDefault || false,
      settings: updates.settings || {},
      createdAt: now,
      updatedAt: now,
    };
  }

  const updatedConfig = {
    ...JSON.parse(existing.settings),
    ...updates.settings,
  };

  // 如果设置为默认，取消其他默认
  if (updates.isDefault) {
    db.prepare('UPDATE model_configs SET is_default = 0').run();
  }

  db.prepare(`
    UPDATE model_configs
    SET name = ?, provider = ?, enabled = ?, is_default = ?, settings = ?, updated_at = ?
    WHERE id = ?
  `).run(
    updates.name || existing.name,
    updates.provider || existing.provider,
    updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : existing.enabled,
    updates.isDefault !== undefined ? (updates.isDefault ? 1 : 0) : existing.is_default,
    JSON.stringify(updatedConfig),
    now,
    id
  );

  return {
    id,
    name: updates.name || existing.name,
    provider: updates.provider || existing.provider,
    enabled: updates.enabled !== undefined ? updates.enabled : Boolean(existing.enabled),
    isDefault: updates.isDefault !== undefined ? updates.isDefault : Boolean(existing.is_default),
    settings: updatedConfig,
    createdAt: existing.created_at,
    updatedAt: now,
  };
}

// 删除模型配置
export async function deleteModelConfig(id: string): Promise<boolean> {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM model_configs WHERE id = ?').run(id);
  return result.changes > 0;
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
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM model_configs WHERE is_default = 1 AND enabled = 1').get() as any;

  if (row) {
    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      enabled: Boolean(row.enabled),
      isDefault: Boolean(row.is_default),
      settings: JSON.parse(row.settings),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // 如果没有默认模型，返回第一个启用的模型
  const enabledRow = db.prepare('SELECT * FROM model_configs WHERE enabled = 1 LIMIT 1').get() as any;
  if (enabledRow) {
    return {
      id: enabledRow.id,
      name: enabledRow.name,
      provider: enabledRow.provider,
      enabled: Boolean(enabledRow.enabled),
      isDefault: Boolean(enabledRow.is_default),
      settings: JSON.parse(enabledRow.settings),
      createdAt: enabledRow.created_at,
      updatedAt: enabledRow.updated_at,
    };
  }

  // 如果数据库为空，返回默认配置
  const defaults = getDefaultModelConfigs();
  return defaults[0] || null;
}
