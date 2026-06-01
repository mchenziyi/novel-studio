import { useState, useEffect, useCallback } from 'react';
import { Chapter } from '@/types';

interface UseChaptersOptions {
  autoFetch?: boolean;
}

export function useChapters(options: UseChaptersOptions = {}) {
  const { autoFetch = true } = options;
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChapters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/chapters');
      if (!response.ok) {
        throw new Error('Failed to fetch chapters');
      }
      const data = await response.json();
      setChapters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChapter = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/chapters/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chapter');
      }
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateChapter = useCallback(async (id: string, content: string) => {
    setLoading(true);
    setError(null);
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
      const data = await response.json();
      setChapters((prev) =>
        prev.map((ch) => (ch.id === id ? { ...ch, ...data } : ch))
      );
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchChapters();
    }
  }, [autoFetch, fetchChapters]);

  return {
    chapters,
    loading,
    error,
    fetchChapters,
    fetchChapter,
    updateChapter,
  };
}
