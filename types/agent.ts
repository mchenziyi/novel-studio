// Re-export pipeline types as the canonical agent types
export type { AgentType, PipelineStep as WorkflowStep, Pipeline as Workflow } from './pipeline';

import type { Pipeline, PipelineStep } from './pipeline';

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface AgentTask {
  id: string;
  agentId: string;
  chapterId: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input?: any;
  output?: any;
  error?: string;
  startTime: Date;
  endTime?: Date;
}
