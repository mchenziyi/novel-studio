import { useState, useEffect, useCallback } from 'react';
import { Character } from '@/types';

interface UseCharactersOptions {
  autoFetch?: boolean;
}

export function useCharacters(options: UseCharactersOptions = {}) {
  const { autoFetch = true } = options;
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/characters');
      if (!response.ok) {
        throw new Error('Failed to fetch characters');
      }
      const data = await response.json();
      setCharacters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCharacter = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/characters/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch character');
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

  useEffect(() => {
    if (autoFetch) {
      fetchCharacters();
    }
  }, [autoFetch, fetchCharacters]);

  return {
    characters,
    loading,
    error,
    fetchCharacters,
    fetchCharacter,
  };
}
