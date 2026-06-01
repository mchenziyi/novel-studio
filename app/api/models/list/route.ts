import { NextRequest, NextResponse } from 'next/server';
import { ModelProvider } from '@/types/model';
import { getSettings } from '@/lib/settings';
import { ProxyAgent } from 'undici';

// 创建带代理的 fetch
async function proxyFetch(url: string, options: any = {}) {
  const settings = await getSettings();
  const fetchOptions: any = { ...options };

  if (settings.proxy?.enabled && settings.proxy.url) {
    fetchOptions.dispatcher = new ProxyAgent(settings.proxy.url);
  }

  return fetch(url, fetchOptions);
}

// 从各提供商 API 获取模型列表
async function fetchModelsFromProvider(
  provider: ModelProvider,
  apiKey: string,
  baseURL: string
): Promise<{ models: string[]; error?: string }> {
  try {
    switch (provider) {
      case 'openai': {
        if (!apiKey) return { models: [], error: '需要配置 API Key' };
        const url = baseURL || 'https://api.openai.com/v1';
        const response = await proxyFetch(`${url}/models`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (response.ok) {
          const data = await response.json();
          const models = data.data
            .map((m: any) => m.id)
            .filter((id: string) =>
              id.startsWith('gpt') ||
              id.startsWith('o1') ||
              id.startsWith('o3') ||
              id.startsWith('o4') ||
              id.startsWith('chatgpt')
            )
            .sort();
          return { models };
        }
        return { models: [], error: `API 请求失败: ${response.status}` };
      }

      case 'deepseek': {
        if (!apiKey) return { models: [], error: '需要配置 API Key' };
        const url = baseURL || 'https://api.deepseek.com/v1';
        const response = await proxyFetch(`${url}/models`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (response.ok) {
          const data = await response.json();
          return { models: data.data.map((m: any) => m.id).sort() };
        }
        return { models: [], error: `API 请求失败: ${response.status}` };
      }

      case 'gemini': {
        if (!apiKey) return { models: [], error: '需要配置 API Key' };
        try {
          const response = await proxyFetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
            { signal: AbortSignal.timeout(15000) }
          );
          if (response.ok) {
            const data = await response.json();
            const models = data.models
              .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
              .map((m: any) => m.name.replace('models/', ''))
              .sort();
            return { models };
          }
          const errorData = await response.json().catch(() => ({}));
          return { models: [], error: errorData.error?.message || `API 请求失败: ${response.status}` };
        } catch (error) {
          return {
            models: [],
            error: '无法连接到 Google API，请检查代理配置或网络连接'
          };
        }
      }

      case 'anthropic': {
        if (!apiKey) return { models: [], error: '需要配置 API Key' };
        return {
          models: [
            'claude-opus-4-20250514',
            'claude-sonnet-4-20250514',
            'claude-haiku-4-5-20251001',
          ],
          error: 'Anthropic 没有公开的模型列表 API，显示已知模型'
        };
      }

      case 'ollama': {
        const url = baseURL || 'http://localhost:11434';
        const response = await fetch(`${url}/api/tags`, {
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const data = await response.json();
          return { models: data.models?.map((m: any) => m.name) || [] };
        }
        return { models: [], error: '无法连接到 Ollama 服务' };
      }

      case 'lmstudio': {
        const url = baseURL || 'http://localhost:1234/v1';
        const response = await fetch(`${url}/models`, {
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const data = await response.json();
          return { models: data.data.map((m: any) => m.id).sort() };
        }
        return { models: [], error: '无法连接到 LM Studio 服务' };
      }

      case 'custom': {
        if (!baseURL) return { models: [], error: '需要配置 API 地址' };
        const headers: Record<string, string> = {};
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        const response = await proxyFetch(`${baseURL}/models`, {
          headers,
          signal: AbortSignal.timeout(10000),
        });
        if (response.ok) {
          const data = await response.json();
          return { models: data.data?.map((m: any) => m.id).sort() || [] };
        }
        return { models: [], error: `API 请求失败: ${response.status}` };
      }

      default:
        return { models: [], error: `不支持的提供商: ${provider}` };
    }
  } catch (error) {
    return {
      models: [],
      error: error instanceof Error ? error.message : '请求失败'
    };
  }
}

// 获取可用模型列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') as ModelProvider;
    const apiKey = searchParams.get('apiKey') || '';
    const baseURL = searchParams.get('baseURL') || '';

    if (!provider) {
      return NextResponse.json(
        { error: '缺少 provider 参数' },
        { status: 400 }
      );
    }

    const result = await fetchModelsFromProvider(provider, apiKey, baseURL);

    return NextResponse.json({
      provider,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return NextResponse.json(
      { error: '获取模型列表失败' },
      { status: 500 }
    );
  }
}
