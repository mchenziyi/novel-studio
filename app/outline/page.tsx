'use client';

import { useState, useEffect } from 'react';
import { useNovel } from '@/lib/novel-context';
import { renderMarkdown } from '@/lib/render-markdown';

export default function OutlinePage() {
  const { currentNovelId } = useNovel();
  const [outline, setOutline] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOutline();
  }, [currentNovelId]);

  const loadOutline = async () => {
    try {
      const response = await fetch(`/api/outline?novelId=${currentNovelId}`);
      const data = await response.json();
      setOutline(data);
    } catch (error) {
      console.error('Failed to load outline:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  if (!outline || !outline.content) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl text-[#a3a3a3]">大纲不存在</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-[28px] font-semibold text-[#171717] mb-6 tracking-tight">大纲</h1>
      <div
        className="bg-white rounded-xl border border-[#e8e8e8] p-8 text-[14px] leading-[1.8] text-[#171717] outline-content"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(outline.content) }}
      />
    </div>
  );
}
