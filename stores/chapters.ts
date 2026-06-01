import { create } from 'zustand';
import { Chapter, ChapterVersion } from '@/types';

interface ChaptersState {
  chapters: Chapter[];
  currentChapter: Chapter | null;
  versions: ChapterVersion[];
  loading: boolean;
  error: string | null;

  // Actions
  setChapters: (chapters: Chapter[]) => void;
  setCurrentChapter: (chapter: Chapter | null) => void;
  setVersions: (versions: ChapterVersion[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Async Actions
  fetchChapters: () => Promise<void>;
  fetchChapter: (id: string) => Promise<void>;
  updateChapter: (id: string, content: string) => Promise<void>;
  fetchVersions: (chapterId: string) => Promise<void>;
}

export const useChaptersStore = create<ChaptersState>((set, get) => ({
  chapters: [],
  currentChapter: null,
  versions: [],
  loading: false,
  error: null,

  setChapters: (chapters) => set({ chapters }),
  setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
  setVersions: (versions) => set({ versions }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchChapters: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/chapters');
      if (!response.ok) {
        throw new Error('Failed to fetch chapters');
      }
      const chapters = await response.json();
      set({ chapters, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  fetchChapter: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/chapters/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chapter');
      }
      const chapter = await response.json();
      set({ currentChapter: chapter, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  updateChapter: async (id, content) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/chapters/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        throw new Error('Failed to update chapter');
      }
      const chapter = await response.json();
      set({ currentChapter: chapter, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  fetchVersions: async (chapterId) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/chapters/${chapterId}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch versions');
      }
      const versions = await response.json();
      set({ versions, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },
}));
