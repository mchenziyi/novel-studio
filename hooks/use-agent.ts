import { useState, useCallback } from 'react';
import { AgentType, Workflow } from '@/types';

interface UseAgentOptions {
  defaultModel?: string;
}

export function useAgent(options: UseAgentOptions = {}) {
  const { defaultModel = 'claude' } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);

  const runAgent = useCallback(
    async (agentId: AgentType, chapterId: number, model?: string) => {
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const response = await fetch(`/api/agent/${agentId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chapterId,
            model: model || defaultModel,
          }),
        });
        if (!response.ok) {
          throw new Error(`Failed to run ${agentId} agent`);
        }
        const data = await response.json();
        setResult(data.result);
        return data.result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [defaultModel]
  );

  const runWorkflow = useCallback(
    async (chapterId: number, model?: string) => {
      setLoading(true);
      setError(null);
      setWorkflow(null);
      try {
        const response = await fetch('/api/agent/workflow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chapterId,
            model: model || defaultModel,
          }),
        });
        if (!response.ok) {
          throw new Error('Failed to run workflow');
        }
        const data = await response.json();
        setWorkflow(data.workflow);
        return data.workflow;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [defaultModel]
  );

  return {
    loading,
    error,
    result,
    workflow,
    runAgent,
    runWorkflow,
  };
}
