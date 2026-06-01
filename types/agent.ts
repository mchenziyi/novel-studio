export type AgentType = 'planner' | 'composer' | 'writer' | 'observer' | 'settler' | 'auditor' | 'reviser';

export interface Agent {
  id: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface AgentTask {
  id: string;
  agentId: AgentType;
  chapterId: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input?: any;
  output?: any;
  error?: string;
  startTime: Date;
  endTime?: Date;
}

export interface WorkflowStep {
  agentId: AgentType;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: any;
  error?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  chapterId: number;
  startTime: Date;
  endTime?: Date;
}
