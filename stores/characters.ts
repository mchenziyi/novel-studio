import { create } from 'zustand';
import { Character } from '@/types';

interface CharactersState {
  characters: Character[];
  currentCharacter: Character | null;
  loading: boolean;
  error: string | null;

  // Actions
  setCharacters: (characters: Character[]) => void;
  setCurrentCharacter: (character: Character | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Async Actions
  fetchCharacters: () => Promise<void>;
  fetchCharacter: (id: string) => Promise<void>;
}

export const useCharactersStore = create<CharactersState>((set, get) => ({
  characters: [],
  currentCharacter: null,
  loading: false,
  error: null,

  setCharacters: (characters) => set({ characters }),
  setCurrentCharacter: (character) => set({ currentCharacter: character }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchCharacters: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/characters');
      if (!response.ok) {
        throw new Error('Failed to fetch characters');
      }
      const characters = await response.json();
      set({ characters, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  fetchCharacter: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/characters/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch character');
      }
      const character = await response.json();
      set({ currentCharacter: character, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },
}));
