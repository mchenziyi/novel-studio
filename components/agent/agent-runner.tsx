import { cn } from '@/lib/utils';
import { useState } from 'react';
import { AgentType } from '@/types';

interface AgentRunnerProps {
  agentId: AgentType;
  agentName: string;
  chapterId: number;
  loading?: boolean;
  onRun: (agentId: AgentType, chapterId: number) => Promise<void>;
}

export function AgentRunner({
  agentId,
  agentName,
  chapterId,
  loading = false,
  onRun,
}: AgentRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      await onRun(agentId, chapterId);
    } catch (error) {
      console.error('Failed to run agent:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-4">运行 {agentName}</h3>

      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">章节 ID</div>
        <div className="font-mono text-lg">{chapterId}</div>
      </div>

      <button
        onClick={handleRun}
        disabled={isRunning || loading}
        className={cn(
          'w-full px-4 py-2 rounded-lg font-medium transition-colors',
          isRunning || loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        )}
      >
        {isRunning ? (
          <span className="flex items-center justify-center space-x-2">
            <span className="animate-spin">⏳</span>
            <span>运行中...</span>
          </span>
        ) : (
          `运行 ${agentName}`
        )}
      </button>

      {isRunning && (
        <div className="mt-4 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <span className="animate-pulse">●</span>
            <span>Agent 正在处理中...</span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            这可能需要一些时间，请耐心等待
          </div>
        </div>
      )}
    </div>
  );
}
