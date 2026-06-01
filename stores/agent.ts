import { create } from 'zustand';
import { AgentType, AgentTask, Workflow } from '@/types';

interface AgentState {
  tasks: AgentTask[];
  workflows: Workflow[];
  currentTask: AgentTask | null;
  currentWorkflow: Workflow | null;
  loading: boolean;
  error: string | null;

  // Actions
  setTasks: (tasks: AgentTask[]) => void;
  setWorkflows: (workflows: Workflow[]) => void;
  setCurrentTask: (task: AgentTask | null) => void;
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Async Actions
  runAgent: (agentId: AgentType, chapterId: number) => Promise<void>;
  runWorkflow: (chapterId: number) => Promise<void>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  tasks: [],
  workflows: [],
  currentTask: null,
  currentWorkflow: null,
  loading: false,
  error: null,

  setTasks: (tasks) => set({ tasks }),
  setWorkflows: (workflows) => set({ workflows }),
  setCurrentTask: (task) => set({ currentTask: task }),
  setCurrentWorkflow: (workflow) => set({ currentWorkflow: workflow }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  runAgent: async (agentId, chapterId) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/agent/${agentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chapterId }),
      });
      if (!response.ok) {
        throw new Error(`Failed to run ${agentId} agent`);
      }
      const task = await response.json();
      set({ currentTask: task, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  runWorkflow: async (chapterId) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/agent/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chapterId }),
      });
      if (!response.ok) {
        throw new Error('Failed to run workflow');
      }
      const workflow = await response.json();
      set({ currentWorkflow: workflow, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },
}));
