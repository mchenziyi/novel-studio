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
    stopWhen: stepCountIs(20), // 允许多轮工具调用（复杂审计可能需要读多个文件）
    temperature: 0.8,
  });

  // 清理模型输出的工具调用文本伪影（当模型不支持 function calling 时会模仿输出）
  let text = cleanToolCallArtifacts(result.text || '');

  // 从 steps 中提取工具调用和结果（AI SDK v6 的顶层属性可能为空）
  const allToolCalls: any[] = [];
  const allToolResults: any[] = [];
  for (const step of result.steps || []) {
    if (step.toolCalls) allToolCalls.push(...step.toolCalls);
    if (step.toolResults) allToolResults.push(...step.toolResults);
  }

  // 如果模型调了工具但没生成文本，从最后一步的工具结果构造兜底文本
  if (!text && allToolResults.length > 0) {
    const lastResult = allToolResults[allToolResults.length - 1];
    if (lastResult?.result) {
      const preview = typeof lastResult.result === 'string'
        ? lastResult.result
        : JSON.stringify(lastResult.result, null, 2);
      text = `我查询了相关数据：\n\n${preview.substring(0, 2000)}`;
    }
  }

  return {
    text: text || '',
    toolCalls: allToolCalls,
    toolResults: allToolResults,
  };
}

// 清理模型输出中的工具调用文本伪影
export function cleanToolCallArtifacts(text: string): string {
  if (!text) return text;
  return text
    // 移除 --- Begin [...] --- / --- End [...] --- 包裹的块
    .replace(/--- Begin \[[^\]]*\] ---[\s\S]*?--- End \[[^\]]*\] ---\s*/g, '')
    // 移除所有 🔧 相关内容（行内或单独一行）
    .replace(/🔧[^\n]*/g, '')
    // 移除工具名+括号调用模式，如 readFile(...)、getChapter(...)
    .replace(/\b(readFile|listDirectory|searchFiles|getChapter|listChapters|searchChapters|getCharacter|listCharacters|getForeshadowing|listForeshadowing|getOutline|getStats|queryDatabase|saveChapter|getStoryContext|getFacts|addFact|getHooks|addHook|updateHook|getSync|updateSync|getStoryCharacters|updateStoryCharacter|getSummaries|updateSummary|getState|updateState|getPlotlines|updatePlotline|getResources|addResource|compareTexts|saveMemory|searchMemory|listMemories|getVersionHistory|getGitStatus|getGitLog|gitCommit)\s*\([^)]*\)\s*/g, '')
    // 清理多余空行
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
    stopWhen: stepCountIs(20),
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
