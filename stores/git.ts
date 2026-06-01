import { create } from 'zustand';
import { GitStatus, GitCommit, GitDiffFile } from '@/types';

interface GitState {
  status: GitStatus | null;
  commits: GitCommit[];
  diff: GitDiffFile[];
  loading: boolean;
  error: string | null;

  // Actions
  setStatus: (status: GitStatus | null) => void;
  setCommits: (commits: GitCommit[]) => void;
  setDiff: (diff: GitDiffFile[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Async Actions
  fetchStatus: () => Promise<void>;
  fetchCommits: (maxCount?: number) => Promise<void>;
  fetchDiff: (filePath?: string, staged?: boolean) => Promise<void>;
  commit: (message: string) => Promise<void>;
  addFile: (filePath: string | string[]) => Promise<void>;
  addAll: () => Promise<void>;
}

export const useGitStore = create<GitState>((set, get) => ({
  status: null,
  commits: [],
  diff: [],
  loading: false,
  error: null,

  setStatus: (status) => set({ status }),
  setCommits: (commits) => set({ commits }),
  setDiff: (diff) => set({ diff }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchStatus: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/git/status');
      if (!response.ok) {
        throw new Error('Failed to fetch git status');
      }
      const status = await response.json();
      set({ status, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  fetchCommits: async (maxCount = 50) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/git/log?maxCount=${maxCount}`);
      if (!response.ok) {
        throw new Error('Failed to fetch commits');
      }
      const commits = await response.json();
      set({ commits, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  fetchDiff: async (filePath, staged = false) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filePath) params.append('filePath', filePath);
      if (staged) params.append('staged', 'true');

      const response = await fetch(`/api/git/diff?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch diff');
      }
      const diff = await response.json();
      set({ diff, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  commit: async (message) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/git/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) {
        throw new Error('Failed to commit');
      }
      // 刷新状态
      await get().fetchStatus();
      await get().fetchCommits();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  addFile: async (filePath) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/git/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      });
      if (!response.ok) {
        throw new Error('Failed to add file');
      }
      // 刷新状态
      await get().fetchStatus();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  addAll: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/git/add-all', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to add all files');
      }
      // 刷新状态
      await get().fetchStatus();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },
}));
