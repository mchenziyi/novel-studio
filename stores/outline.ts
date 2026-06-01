import { create } from 'zustand';
import { Outline } from '@/types';

interface OutlineState {
  outline: Outline | null;
  loading: boolean;
  error: string | null;

  // Actions
  setOutline: (outline: Outline | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Async Actions
  fetchOutline: () => Promise<void>;
}

export const useOutlineStore = create<OutlineState>((set, get) => ({
  outline: null,
  loading: false,
  error: null,

  setOutline: (outline) => set({ outline }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchOutline: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/outline');
      if (!response.ok) {
        throw new Error('Failed to fetch outline');
      }
      const outline = await response.json();
      set({ outline, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },
}));
