import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { deepseek } from '@ai-sdk/deepseek';
import { generateText } from 'ai';

export type ModelType = 'claude' | 'deepseek' | 'gpt';

// 获取模型名称，支持环境变量覆盖
const getAnthropicModel = () => {
  return process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229';
};

export const models = {
  claude: anthropic(getAnthropicModel()),
  deepseek: deepseek('deepseek-chat'),
  gpt: openai('gpt-4-turbo'),
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function callModel(
  model: ModelType,
  promptOrMessages: string | Message[],
  context?: string
): Promise<string> {
  // 如果传入的是字符串，转换为消息格式
  const messages = typeof promptOrMessages === 'string'
    ? [{ role: 'user' as const, content: promptOrMessages }]
    : promptOrMessages;

  // 提取系统消息
  const systemMessages = messages.filter(m => m.role === 'system');
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  const systemPrompt = systemMessages.map(m => m.content).join('\n') || context;

  // 重新创建模型实例以使用最新的环境变量
  const modelInstance = anthropic(getAnthropicModel());

  const result = await generateText({
    model: modelInstance,
    messages: nonSystemMessages,
    system: systemPrompt,
  });
  return result.text;
}

// 测试模型连接
export async function testModel(model: ModelType): Promise<boolean> {
  try {
    await callModel(model, 'Hello, this is a test message.');
    return true;
  } catch (error) {
    console.error(`Model ${model} test failed:`, error);
    return false;
  }
}

// 获取模型信息
export function getModelInfo(model: ModelType): {
  name: string;
  provider: string;
  description: string;
} {
  const modelInfo = {
    claude: {
      name: 'Claude',
      provider: 'Anthropic',
      description: 'Advanced AI assistant with strong reasoning capabilities',
    },
    deepseek: {
      name: 'DeepSeek',
      provider: 'DeepSeek',
      description: 'High-performance language model for various tasks',
    },
    gpt: {
      name: 'GPT',
      provider: 'OpenAI',
      description: 'Versatile language model with broad capabilities',
    },
  };

  return modelInfo[model];
}

// 获取所有可用模型
export function getAvailableModels(): ModelType[] {
  return Object.keys(models) as ModelType[];
}
