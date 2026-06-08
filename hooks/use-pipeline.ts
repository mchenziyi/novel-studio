import { useState, useCallback, useRef } from 'react';
import { PipelineSSEEvent, PipelineStep, AuditResult, PipelineConfig } from '@/types/pipeline';

// Frontend hook for consuming the SSE pipeline stream

interface UsePipelineOptions {
  novelId?: string;
  model?: string;
  config?: Partial<PipelineConfig>;
}

interface PipelineState {
  pipelineId: string | null;
  status: 'idle' | 'running' | 'completed' | 'failed';
  steps: PipelineStep[];
  currentStepIndex: number;
  auditResult: {
    passed: boolean;
    overallScore: number;
    totalIssues: number;
    criticalCount: number;
    summary: string;
  } | null;
  error: string | null;
  content: string | null;
  retryCount: number;
  durationMs: number | null;
  events: PipelineSSEEvent[];
}

export function usePipeline(options: UsePipelineOptions = {}) {
  const { novelId = 'default', model = 'mimo', config } = options;
  const [state, setState] = useState<PipelineState>({
    pipelineId: null,
    status: 'idle',
    steps: [],
    currentStepIndex: -1,
    auditResult: null,
    error: null,
    content: null,
    retryCount: 0,
    durationMs: null,
    events: [],
  });
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setState({
      pipelineId: null,
      status: 'idle',
      steps: [],
      currentStepIndex: -1,
      auditResult: null,
      error: null,
      content: null,
      retryCount: 0,
      durationMs: null,
      events: [],
    });
  }, []);

  const start = useCallback(async (chapterId: number) => {
    // 如果正在运行，先中止
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setState(prev => ({
      ...prev,
      status: 'running',
      pipelineId: null,
      steps: [],
      currentStepIndex: -1,
      auditResult: null,
      error: null,
      content: null,
      retryCount: 0,
      durationMs: null,
      events: [],
    }));

    try {
      const response = await fetch('/api/agent/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          novelId,
          model,
          ...config,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const event: PipelineSSEEvent = JSON.parse(line.slice(6));
            handleEvent(event);
          } catch {
            // 忽略格式错误的事件
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setState(prev => ({
        ...prev,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, [novelId, model, config]);

  const handleEvent = (event: PipelineSSEEvent) => {
    setState(prev => {
      const newEvents = [...prev.events, event];

      switch (event.type) {
        case 'pipeline_start':
          return {
            ...prev,
            pipelineId: event.pipelineId,
            status: 'running',
            events: newEvents,
          };

        case 'step_start': {
          const steps = [...prev.steps];
          const idx = event.data.stepIndex;
          while (steps.length <= idx) {
            steps.push({ agentId: 'reviser', status: 'pending' });
          }
          steps[idx] = {
            ...steps[idx],
            agentId: event.data.agentId || steps[idx].agentId,
            status: 'running',
            startedAt: event.timestamp,
          };
          return { ...prev, steps, currentStepIndex: idx, events: newEvents };
        }

        case 'step_complete': {
          const steps = [...prev.steps];
          const idx = event.data.stepIndex;
          if (steps[idx]) {
            steps[idx] = {
              ...steps[idx],
              status: 'completed',
              output: event.data.output,
              completedAt: event.timestamp,
            };
          }
          return { ...prev, steps, events: newEvents };
        }

        case 'step_failed': {
          const steps = [...prev.steps];
          const idx = event.data.stepIndex;
          if (steps[idx]) {
            steps[idx] = {
              ...steps[idx],
              status: 'failed',
              error: event.data.error,
              completedAt: event.timestamp,
            };
          }
          return { ...prev, steps, events: newEvents };
        }

        case 'step_progress': {
          return {
            ...prev,
            auditResult: event.data.auditResult || prev.auditResult,
            events: newEvents,
          };
        }

        case 'pipeline_complete':
          return {
            ...prev,
            status: 'completed',
            content: event.data.content,
            auditResult: event.data.auditResult,
            retryCount: event.data.retryCount || 0,
            durationMs: event.data.durationMs || null,
            events: newEvents,
          };

        case 'pipeline_error':
          return {
            ...prev,
            status: 'failed',
            error: event.data.error,
            events: newEvents,
          };

        default:
          return { ...prev, events: newEvents };
      }
    });
  };

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState(prev => ({ ...prev, status: 'failed', error: '用户取消' }));
  }, []);

  return {
    ...state,
    start,
    abort,
    reset,
  };
}
