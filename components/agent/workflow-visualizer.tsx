import { cn } from '@/lib/utils';
import { Workflow, WorkflowStep, AgentType } from '@/types';

interface WorkflowVisualizerProps {
  workflow: Workflow | null;
  loading?: boolean;
}

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

export function WorkflowVisualizer({ workflow, loading = false }: WorkflowVisualizerProps) {
  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">暂无工作流</p>
      </div>
    );
  }

  const getStepStatusColor = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'skipped':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  const getStepStatusText = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'running':
        return '运行中';
      case 'failed':
        return '失败';
      case 'skipped':
        return '跳过';
      default:
        return '等待中';
    }
  };

  const getWorkflowStatusColor = (status: Workflow['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getWorkflowStatusText = (status: Workflow['status']) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'running':
        return '运行中';
      case 'failed':
        return '失败';
      default:
        return '等待中';
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      {/* 工作流头部 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">{workflow.name}</h3>
          <p className="text-sm text-gray-500">{workflow.description}</p>
        </div>
        <span
          className={cn(
            'px-2 py-1 text-xs rounded',
            getWorkflowStatusColor(workflow.status)
          )}
        >
          {getWorkflowStatusText(workflow.status)}
        </span>
      </div>

      {/* 工作流步骤 */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        <div className="space-y-4">
          {workflow.steps.map((step, index) => (
            <div key={index} className="relative pl-12">
              {/* 步骤图标 */}
              <div
                className={cn(
                  'absolute left-2 w-7 h-7 rounded-full flex items-center justify-center text-sm border-2',
                  step.status === 'completed'
                    ? 'bg-green-500 border-green-500 text-white'
                    : step.status === 'running'
                    ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                    : step.status === 'failed'
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'bg-white border-gray-300 text-gray-500'
                )}
              >
                {step.status === 'completed' ? '✓' : step.status === 'running' ? '⏳' : step.status === 'failed' ? '✕' : (index + 1)}
              </div>

              {/* 步骤内容 */}
              <div
                className={cn(
                  'p-3 rounded-lg border',
                  step.status === 'completed'
                    ? 'bg-green-50 border-green-200'
                    : step.status === 'running'
                    ? 'bg-blue-50 border-blue-200'
                    : step.status === 'failed'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span>{agentIcons[step.agentId]}</span>
                    <span className="font-medium">{agentNames[step.agentId]}</span>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs rounded',
                      getStepStatusColor(step.status)
                    )}
                  >
                    {getStepStatusText(step.status)}
                  </span>
                </div>

                {step.error && (
                  <div className="mt-2 text-sm text-red-600">
                    {step.error}
                  </div>
                )}

                {step.output && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">输出：</div>
                    <div className="text-sm bg-white p-2 rounded border max-h-20 overflow-y-auto">
                      {typeof step.output === 'string'
                        ? step.output.substring(0, 100) + (step.output.length > 100 ? '...' : '')
                        : JSON.stringify(step.output).substring(0, 100) + '...'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 工作流时间 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            开始时间：{new Date(workflow.startTime).toLocaleString('zh-CN')}
          </span>
          {workflow.endTime && (
            <span>
              结束时间：{new Date(workflow.endTime).toLocaleString('zh-CN')}
            </span>
          )}
        </div>
        {workflow.endTime && (
          <div className="text-sm text-gray-500 mt-1">
            耗时：{Math.round((new Date(workflow.endTime).getTime() - new Date(workflow.startTime).getTime()) / 1000)} 秒
          </div>
        )}
      </div>
    </div>
  );
}
