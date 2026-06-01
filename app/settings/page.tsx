'use client';

import { useState, useEffect } from 'react';

interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export default function SettingsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const response = await fetch('/api/models');
      const data = await response.json();
      setModels(data);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestModel = async (modelId: string) => {
    setTesting(modelId);
    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: modelId }),
      });
      const data = await response.json();
      setTestResults(prev => ({
        ...prev,
        [modelId]: data.success,
      }));
    } catch (error) {
      console.error('Failed to test model:', error);
      setTestResults(prev => ({
        ...prev,
        [modelId]: false,
      }));
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">设置</h1>

      {/* 模型配置 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">模型配置</h2>
        <p className="text-gray-600 mb-4">
          配置 AI 模型的 API Key 和连接测试。
        </p>

        <div className="space-y-4">
          {models.map((model) => (
            <div
              key={model.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <div className="font-semibold">{model.name}</div>
                <div className="text-sm text-gray-500">{model.provider}</div>
                <div className="text-sm text-gray-600">{model.description}</div>
              </div>
              <div className="flex items-center space-x-4">
                {testResults[model.id] !== undefined && (
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      testResults[model.id]
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {testResults[model.id] ? '连接成功' : '连接失败'}
                  </span>
                )}
                <button
                  onClick={() => handleTestModel(model.id)}
                  disabled={testing === model.id}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {testing === model.id ? '测试中...' : '测试连接'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 环境变量 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">环境变量</h2>
        <p className="text-gray-600 mb-4">
          请在 <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> 文件中配置以下环境变量：
        </p>
        <div className="bg-gray-50 p-4 rounded-lg">
          <pre className="text-sm font-mono">
{`# Claude API (Anthropic)
ANTHROPIC_API_KEY=your_claude_api_key_here

# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Novel Project Path
NOVEL_PROJECT_PATH=/Users/czy/Downloads/books/开局屠村现场-他们说我疯了`}
          </pre>
        </div>
      </div>

      {/* 项目信息 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">项目信息</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">项目名称</div>
            <div className="font-semibold">开局屠村现场-他们说我疯了</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">版本</div>
            <div className="font-semibold">1.0.0</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">框架</div>
            <div className="font-semibold">Next.js 14</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Agent 系统</div>
            <div className="font-semibold">novel-pro</div>
          </div>
        </div>
      </div>
    </div>
  );
}
