import { cn } from '@/lib/utils';
import { PipelineStep, AgentType } from '@/types/pipeline';

const agentIcons: Record<AgentType, string> = {
  planner: '📋',
  composer: '📦',
  writer: '✍️',
  observer: '👁️',
  settler: '📊',
  auditor: '🔍',
  reviser: '🔧',
};

const agentNames: Record<AgentType, string> = {
  planner: 'Planner',
  composer: 'Composer',
  writer: 'Writer',
  observer: 'Observer',
  settler: 'Settler',
  auditor: 'Auditor',
  reviser: 'Reviser',
};

interface PipelineVisualizerProps {
  steps: PipelineStep[];
  currentStepIndex: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  auditResult?: {
    passed: boolean;
    overallScore: number;
    totalIssues: number;
    criticalCount: number;
    summary: string;
  } | null;
  retryCount?: number;
  durationMs?: number | null;
  error?: string | null;
}

export function PipelineVisualizer({
  steps,
  currentStepIndex,
  status,
  auditResult,
  retryCount = 0,
  durationMs,
  error,
}: PipelineVisualizerProps) {
  if (status === 'idle') {
    return (
      <div className="p-4 bg-[#fafafa] rounded-lg border border-[#e8e8e8]">
        <p className="text-gray-400 text-sm">点击「运行 Pipeline」开始自动化写作流程</p>
      </div>
    );
  }

  // 找出 reviser 出现的位置（修订循环）
  const reviserIndices = steps
    .map((s, i) => (s.agentId === 'reviser' ? i : -1))
    .filter(i => i >= 0);

  return (
    <div className="space-y-3">
      {/* Pipeline 状态头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === 'running' && (
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          )}
          {status === 'completed' && (
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
          )}
          {status === 'failed' && (
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          )}
          <span className="text-sm font-medium">
            {status === 'running' ? '运行中…' : status === 'completed' ? '已完成' : '失败'}
          </span>
          {retryCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
              修订 ×{retryCount}
            </span>
          )}
        </div>
        {durationMs != null && (
          <span className="text-xs text-gray-400">{Math.round(durationMs / 1000)}s</span>
        )}
      </div>

      {/* 步骤列表 */}
      <div className="relative">
        <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-[#e8e8e8]" />
        <div className="space-y-2">
          {steps.map((step, index) => {
            const isRunning = step.status === 'running';
            const isCompleted = step.status === 'completed';
            const isFailed = step.status === 'failed';
            const isPending = step.status === 'pending';
            const isReviser = step.agentId === 'reviser';

            return (
              <div key={index} className="relative pl-10">
                {/* 步骤圆点 */}
                <div
                  className={cn(
                    'absolute left-[9px] w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] border-2',
                    isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : isRunning
                      ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                      : isFailed
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'bg-white border-[#d1d5db] text-gray-400'
                  )}
                >
                  {isCompleted ? '✓' : isFailed ? '✕' : isRunning ? '' : ''}
                </div>

                {/* 步骤卡片 */}
                <div
                  className={cn(
                    'px-3 py-2 rounded-md border text-sm transition-all',
                    isCompleted
                      ? 'bg-green-50/50 border-green-200/60'
                      : isRunning
                      ? 'bg-blue-50/50 border-blue-200/60'
                      : isFailed
                      ? 'bg-red-50/50 border-red-200/60'
                      : 'bg-white border-[#e8e8e8]',
                    isReviser && 'border-l-2 border-l-orange-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{agentIcons[step.agentId]}</span>
                      <span className="font-medium text-[13px]">{agentNames[step.agentId]}</span>
                      {isReviser && (
                        <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                          修订
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-[11px] px-1.5 py-0.5 rounded',
                        isCompleted
                          ? 'bg-green-100 text-green-700'
                          : isRunning
                          ? 'bg-blue-100 text-blue-700'
                          : isFailed
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {isCompleted ? '完成' : isRunning ? '运行中…' : isFailed ? '失败' : '等待'}
                    </span>
                  </div>

                  {/* 错误信息 */}
                  {step.error && (
                    <div className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                      {step.error}
                    </div>
                  )}

                  {/* 输出摘要 */}
                  {step.output && isCompleted && (
                    <div className="mt-1 text-[11px] text-gray-500 truncate">
                      {step.agentId === 'auditor' && step.output.overallScore !== undefined ? (
                        <span>
                          评分 {step.output.overallScore}/100 ·{' '}
                          {step.output.passed ? '✅ 通过' : '❌ 未通过'}
                          {step.output.totalIssues > 0 && ` · ${step.output.totalIssues} 个问题`}
                        </span>
                      ) : (
                        <span>{getOutputPreview(step)}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 审计结果 */}
      {auditResult && (
        <div
          className={cn(
            'p-3 rounded-lg border',
            auditResult.passed
              ? 'bg-green-50/60 border-green-200'
              : 'bg-amber-50/60 border-amber-200'
          )}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium">🔍 审计报告</span>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  auditResult.overallScore >= 90
                    ? 'bg-green-100 text-green-700'
                    : auditResult.overallScore >= 70
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                )}
              >
                {auditResult.overallScore}/100
              </span>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  auditResult.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                )}
              >
                {auditResult.passed ? '通过' : '未通过'}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-600 mb-2">{auditResult.summary}</p>
          <div className="flex gap-3 text-[11px]">
            {auditResult.criticalCount > 0 && (
              <span className="text-red-600">🔴 critical {auditResult.criticalCount}</span>
            )}
            {auditResult.totalIssues - auditResult.criticalCount > 0 && (
              <span className="text-amber-600">
                🟡 其他问题 {auditResult.totalIssues - auditResult.criticalCount}
              </span>
            )}
            {auditResult.totalIssues === 0 && (
              <span className="text-green-600">✅ 无问题</span>
            )}
          </div>
        </div>
      )}

      {/* 全局错误 */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

function getOutputPreview(step: PipelineStep): string {
  if (!step.output) return '';
  if (typeof step.output === 'string') {
    return step.output.substring(0, 80) + (step.output.length > 80 ? '…' : '');
  }
  const str = JSON.stringify(step.output);
  return str.substring(0, 80) + (str.length > 80 ? '…' : '');
}
