'use client';

import { useState, useEffect } from 'react';
import { AgentType, Workflow } from '@/types';

interface Agent {
  id: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export default function AgentPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [chapterId, setChapterId] = useState<number>(75);
  const [running, setRunning] = useState(false);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      // 从 novel-pro 获取 agent 定义
      const agentList: Agent[] = [
        { id: 'planner', name: 'Planner', description: '生成章节意图', icon: '📋', color: '#4CAF50' },
        { id: 'composer', name: 'Composer', description: '压缩上下文包', icon: '📦', color: '#2196F3' },
        { id: 'writer', name: 'Writer', description: '生成正文', icon: '✍️', color: '#FF9800' },
        { id: 'observer', name: 'Observer', description: '提取事实变化', icon: '👁️', color: '#9C27B0' },
        { id: 'settler', name: 'Settler', description: '写总账并刷新快照', icon: '📊', color: '#F44336' },
        { id: 'auditor', name: 'Auditor', description: '审计正文', icon: '🔍', color: '#00BCD4' },
        { id: 'reviser', name: 'Reviser', description: '定点修订', icon: '🔧', color: '#795548' },
      ];
      setAgents(agentList);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAgent = async (agentId: AgentType) => {
    setRunning(true);
    setResult(null);

    try {
      const response = await fetch(`/api/agent/${agentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chapterId }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Failed to run agent:', error);
      setResult({ error: 'Failed to run agent' });
    } finally {
      setRunning(false);
    }
  };

  const handleRunWorkflow = async () => {
    setRunning(true);
    setWorkflow(null);
    setResult(null);

    try {
      const response = await fetch('/api/agent/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chapterId }),
      });

      const data = await response.json();
      setWorkflow(data.workflow);
    } catch (error) {
      console.error('Failed to run workflow:', error);
      setResult({ error: 'Failed to run workflow' });
    } finally {
      setRunning(false);
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
      <h1 className="text-3xl font-bold mb-8">Agent 工作台</h1>

      {/* 配置 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">配置</h2>
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">章节 ID</label>
            <input
              type="number"
              value={chapterId}
              onChange={(e) => setChapterId(parseInt(e.target.value))}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleRunWorkflow}
            disabled={running}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 mt-6"
          >
            {running ? '运行中...' : '运行完整工作流'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Agent 列表 */}
        <div className="w-80">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-4">Agent 列表</h3>
            <div className="space-y-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`p-4 border rounded-lg cursor-pointer ${
                    selectedAgent === agent.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{agent.icon}</span>
                    <div>
                      <div className="font-semibold">{agent.name}</div>
                      <div className="text-sm text-gray-500">{agent.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent 详情和运行 */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold mb-4">
              {selectedAgent
                ? agents.find(a => a.id === selectedAgent)?.name
                : '选择一个 Agent'}
            </h3>

            {selectedAgent && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">描述</div>
                  <p>{agents.find(a => a.id === selectedAgent)?.description}</p>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-1">章节 ID</div>
                  <p>{chapterId}</p>
                </div>

                <button
                  onClick={() => handleRunAgent(selectedAgent)}
                  disabled={running}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {running ? '运行中...' : `运行 ${agents.find(a => a.id === selectedAgent)?.name}`}
                </button>
              </div>
            )}

            {/* 运行结果 */}
            {result && (
              <div className="mt-6">
                <h4 className="font-bold mb-2">运行结果</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 工作流状态 */}
        {workflow && (
          <div className="w-96">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold mb-4">工作流状态</h3>
              <div className="space-y-3">
                {workflow.steps.map((step, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      step.status === 'completed'
                        ? 'bg-green-100'
                        : step.status === 'running'
                        ? 'bg-blue-100'
                        : step.status === 'failed'
                        ? 'bg-red-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{step.agentId}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          step.status === 'completed'
                            ? 'bg-green-200 text-green-800'
                            : step.status === 'running'
                            ? 'bg-blue-200 text-blue-800'
                            : step.status === 'failed'
                            ? 'bg-red-200 text-red-800'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                    {step.error && (
                      <div className="text-sm text-red-600 mt-1">{step.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
