'use client';

import { useState, useEffect } from 'react';
import { AgentType } from '@/types/pipeline';
import { useNovel } from '@/lib/novel-context';
import { usePipeline } from '@/hooks/use-pipeline';
import { PipelineVisualizer } from '@/components/agent/pipeline-visualizer';
import { AuditDetail } from '@/components/agent/audit-detail';
import { cn } from '@/lib/utils';

interface AgentDef {
  id: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const AGENTS: AgentDef[] = [
  { id: 'planner',  name: 'Planner',  description: '生成章节意图',     icon: '📋', color: '#4CAF50' },
  { id: 'composer', name: 'Composer', description: '压缩上下文包',     icon: '📦', color: '#2196F3' },
  { id: 'writer',   name: 'Writer',   description: '生成正文',         icon: '✍️', color: '#FF9800' },
  { id: 'observer', name: 'Observer', description: '提取事实变化',     icon: '👁️', color: '#9C27B0' },
  { id: 'settler',  name: 'Settler',  description: '写总账并刷新快照', icon: '📊', color: '#F44336' },
  { id: 'auditor',  name: 'Auditor',  description: '多维审计正文',     icon: '🔍', color: '#00BCD4' },
  { id: 'reviser',  name: 'Reviser',  description: '定点修订',         icon: '🔧', color: '#795548' },
];

export default function AgentPage() {
  const { currentNovelId } = useNovel();
  const [chapterId, setChapterId] = useState<number | undefined>(undefined);
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [agentResult, setAgentResult] = useState<any>(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [maxRetries, setMaxRetries] = useState(1);
  const [showAuditPanel, setShowAuditPanel] = useState(false);

  const pipeline = usePipeline({
    novelId: currentNovelId,
    config: { maxRevisionRounds: maxRetries },
  });

  // 切换小说时重置
  useEffect(() => {
    setChapterId(undefined);
    setSelectedAgent(null);
    setAgentResult(null);
    pipeline.reset();
  }, [currentNovelId]);

  const handleRunPipeline = () => {
    if (!chapterId) return;
    setShowAuditPanel(false);
    pipeline.start(chapterId);
  };

  const handleRunSingleAgent = async (agentId: AgentType) => {
    if (!chapterId) return;
    setAgentRunning(true);
    setAgentResult(null);
    try {
      const res = await fetch(`/api/agent/${agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId }),
      });
      const data = await res.json();
      setAgentResult(data);
    } catch (err) {
      setAgentResult({ error: '运行失败' });
    } finally {
      setAgentRunning(false);
    }
  };

  // Pipeline 完成后自动显示审计详情
  useEffect(() => {
    if (pipeline.status === 'completed' && pipeline.auditResult) {
      setShowAuditPanel(true);
    }
  }, [pipeline.status]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Agent 工作台</h1>

      {/* 配置面板 */}
      <div className="bg-white rounded-lg border border-[#e8e8e8] p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">配置</h2>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">章节 ID</label>
            <input
              type="number"
              value={chapterId ?? ''}
              onChange={(e) => setChapterId(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="如 74"
              className="px-3 py-1.5 border border-[#e0e0e0] rounded-md text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">最大修订轮数</label>
            <select
              value={maxRetries}
              onChange={(e) => setMaxRetries(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-[#e0e0e0] rounded-md text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value={0}>0（不过修订）</option>
              <option value={1}>1（推荐）</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
          <button
            onClick={handleRunPipeline}
            disabled={!chapterId || pipeline.status === 'running'}
            className={cn(
              'px-5 py-1.5 rounded-md text-sm font-medium transition-colors',
              pipeline.status === 'running'
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-[#171717] text-white hover:bg-[#333]'
            )}
          >
            {pipeline.status === 'running' ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                运行中…
              </span>
            ) : (
              '运行 Pipeline'
            )}
          </button>
          {pipeline.status === 'running' && (
            <button
              onClick={pipeline.abort}
              className="px-4 py-1.5 rounded-md text-sm text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
            >
              取消
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-5">
        {/* 左侧：Agent 列表 */}
        <div className="bg-white rounded-lg border border-[#e8e8e8] p-4 h-fit">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">Agent 列表</h3>
          <div className="space-y-1.5">
            {AGENTS.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(prev => prev === agent.id ? null : agent.id)}
                className={cn(
                  'px-3 py-2 rounded-md border cursor-pointer transition-all text-sm',
                  selectedAgent === agent.id
                    ? 'border-blue-300 bg-blue-50/60'
                    : 'border-transparent hover:bg-gray-50 hover:border-[#e8e8e8]'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg" style={{ color: agent.color }}>{agent.icon}</span>
                  <div>
                    <div className="font-medium text-[13px]">{agent.name}</div>
                    <div className="text-[11px] text-gray-400">{agent.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 单 Agent 运行 */}
          {selectedAgent && (
            <div className="mt-4 pt-3 border-t border-[#e8e8e8]">
              <button
                onClick={() => handleRunSingleAgent(selectedAgent)}
                disabled={!chapterId || agentRunning}
                className="w-full px-3 py-1.5 rounded-md text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {agentRunning ? '运行中…' : `单独运行 ${AGENTS.find(a => a.id === selectedAgent)?.name}`}
              </button>
            </div>
          )}
        </div>

        {/* 右侧：Pipeline 可视化 + 审计详情 */}
        <div className="space-y-5">
          {/* Pipeline 可视化 */}
          <div className="bg-white rounded-lg border border-[#e8e8e8] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-500">Pipeline 执行状态</h3>
              {pipeline.pipelineId && (
                <span className="text-[10px] font-mono text-gray-400">{pipeline.pipelineId}</span>
              )}
            </div>
            <PipelineVisualizer
              steps={pipeline.steps}
              currentStepIndex={pipeline.currentStepIndex}
              status={pipeline.status}
              auditResult={pipeline.auditResult}
              retryCount={pipeline.retryCount}
              durationMs={pipeline.durationMs}
              error={pipeline.error}
            />
          </div>

          {/* 审计详情 */}
          {showAuditPanel && chapterId && (
            <div className="bg-white rounded-lg border border-[#e8e8e8] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500">审计详情</h3>
                <button
                  onClick={() => setShowAuditPanel(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  收起
                </button>
              </div>
              <AuditDetail chapterId={chapterId} pipelineId={pipeline.pipelineId || undefined} />
            </div>
          )}

          {/* 单 Agent 运行结果 */}
          {agentResult && (
            <div className="bg-white rounded-lg border border-[#e8e8e8] p-4">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">
                {AGENTS.find(a => a.id === selectedAgent)?.name} 输出
              </h3>
              <pre className="whitespace-pre-wrap text-xs text-gray-600 bg-gray-50 p-3 rounded-md max-h-96 overflow-auto">
                {JSON.stringify(agentResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
