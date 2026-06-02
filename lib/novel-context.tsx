'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NovelContextType {
  currentNovelId: string;
  setCurrentNovelId: (id: string) => void;
}

const NovelContext = createContext<NovelContextType>({
  currentNovelId: 'default',
  setCurrentNovelId: () => {},
});

export function NovelProvider({ children }: { children: ReactNode }) {
  const [currentNovelId, setCurrentNovelIdState] = useState<string>('default');

  // 从 localStorage 加载
  useEffect(() => {
    const saved = localStorage.getItem('currentNovelId');
    if (saved) {
      setCurrentNovelIdState(saved);
    }
  }, []);

  // 保存到 localStorage
  const setCurrentNovelId = (id: string) => {
    setCurrentNovelIdState(id);
    localStorage.setItem('currentNovelId', id);
  };

  return (
    <NovelContext.Provider value={{ currentNovelId, setCurrentNovelId }}>
      {children}
    </NovelContext.Provider>
  );
}

export function useNovel() {
  return useContext(NovelContext);
}
