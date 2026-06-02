import { ModelConfig } from '@/types/model';
import { createModelInstance, getDefaultModel, getModelConfigs } from './model-config';
import { generateText, streamText, stepCountIs } from 'ai';

export type ModelType = string;

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// 调用模型（基础版，无工具）
export async function callModel(
  modelIdOrConfig: string | ModelConfig,
  promptOrMessages: string | Message[],
  context?: string
): Promise<string> {
  // 获取模型配置
  let config: ModelConfig | null;
  if (typeof modelIdOrConfig === 'string') {
    const configs = await getModelConfigs();
    config = configs.find(c => c.id === modelIdOrConfig) || await getDefaultModel();
  } else {
    config = modelIdOrConfig;
  }

  if (!config) {
    throw new Error('没有可用的模型配置，请在设置中添加模型');
  }

  // 如果传入的是字符串，转换为消息格式
  const messages = typeof promptOrMessages === 'string'
    ? [{ role: 'user' as const, content: promptOrMessages }]
    : promptOrMessages;

  // 提取系统消息
  const systemMessages = messages.filter(m => m.role === 'system');
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  const systemPrompt = systemMessages.map(m => m.content).join('\n') || context;

  // 创建模型实例
  const model = createModelInstance(config);

  const result = await generateText({
    model,
    messages: nonSystemMessages,
    system: systemPrompt,
    temperature: 0.8,
  });
  return result.text;
}

// 调用模型（带工具调用能力）
export async function callModelWithTools(
  modelIdOrConfig: string | ModelConfig,
  promptOrMessages: string | Message[],
  tools: Record<string, any>,
  context?: string
): Promise<{ text: string; toolCalls: any[]; toolResults: any[] }> {
  // 获取模型配置
  let config: ModelConfig | null;
  if (typeof modelIdOrConfig === 'string') {
    const configs = await getModelConfigs();
    config = configs.find(c => c.id === modelIdOrConfig) || await getDefaultModel();
  } else {
    config = modelIdOrConfig;
  }

  if (!config) {
    throw new Error('没有可用的模型配置，请在设置中添加模型');
  }

  // 如果传入的是字符串，转换为消息格式
  const messages = typeof promptOrMessages === 'string'
    ? [{ role: 'user' as const, content: promptOrMessages }]
    : promptOrMessages;

  // 提取系统消息
  const systemMessages = messages.filter(m => m.role === 'system');
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  const systemPrompt = systemMessages.map(m => m.content).join('\n') || context;

  // 创建模型实例
  const model = createModelInstance(config);

  const result = await generateText({
    model,
    messages: nonSystemMessages,
    system: systemPrompt,
    tools,
    stopWhen: stepCountIs(10), // 允许多轮工具调用
    temperature: 0.8,
  });

  return {
    text: result.text,
    toolCalls: result.toolCalls || [],
    toolResults: result.toolResults || [],
  };
}

// 测试模型连接
export async function testModel(modelId: string): Promise<boolean> {
  try {
    await callModel(modelId, '你好，这是一条测试消息。');
    return true;
  } catch (error) {
    console.error(`Model ${modelId} test failed:`, error);
    return false;
  }
}

// 流式调用模型（带工具调用能力）
export async function streamModelWithTools(
  modelIdOrConfig: string | ModelConfig,
  promptOrMessages: string | Message[],
  tools: Record<string, any>,
  context?: string
) {
  // 获取模型配置
  let config: ModelConfig | null;
  if (typeof modelIdOrConfig === 'string') {
    const configs = await getModelConfigs();
    config = configs.find(c => c.id === modelIdOrConfig) || await getDefaultModel();
  } else {
    config = modelIdOrConfig;
  }

  if (!config) {
    throw new Error('没有可用的模型配置，请在设置中添加模型');
  }

  // 如果传入的是字符串，转换为消息格式
  const messages = typeof promptOrMessages === 'string'
    ? [{ role: 'user' as const, content: promptOrMessages }]
    : promptOrMessages;

  // 提取系统消息
  const systemMessages = messages.filter(m => m.role === 'system');
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  const systemPrompt = systemMessages.map(m => m.content).join('\n') || context;

  // 创建模型实例
  const model = createModelInstance(config);

  return streamText({
    model,
    messages: nonSystemMessages,
    system: systemPrompt,
    tools,
    stopWhen: stepCountIs(10),
    temperature: 0.8,
  });
}

// 获取所有可用模型
export async function getAvailableModels(): Promise<ModelConfig[]> {
  return getModelConfigs();
}

// 获取模型信息
export async function getModelInfo(modelId: string): Promise<ModelConfig | null> {
  const configs = await getModelConfigs();
  return configs.find(c => c.id === modelId) || null;
}
