'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Chapter } from '@/types';

export default function ChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    try {
      const response = await fetch('/api/chapters');
      const data = await response.json();
      setChapters(data);
    } catch (error) {
      console.error('Failed to load chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChapters = chapters
    .filter(chapter =>
      chapter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chapter.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const idA = parseInt(a.id);
      const idB = parseInt(b.id);
      return sortOrder === 'desc' ? idB - idA : idA - idB;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#fafafa]">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-[32px] font-semibold text-[#171717] tracking-tight">章节</h1>
          <p className="text-[15px] text-[#737373] mt-1">
            共 {chapters.length} 章
          </p>
        </div>

        {/* 搜索和排序 */}
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a3a3a3]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="搜索章节..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e8e8e8] rounded-xl text-[14px] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#171717] transition-colors"
            />
          </div>
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e8e8e8] rounded-xl text-[13px] font-medium text-[#525252] hover:border-[#d4d4d4] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sortOrder === 'desc' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
              )}
            </svg>
            {sortOrder === 'desc' ? '倒序' : '正序'}
          </button>
        </div>

        {/* 章节列表 */}
        <div className="space-y-2">
          {filteredChapters.map((chapter, index) => (
            <Link
              key={chapter.id}
              href={`/chapters/${chapter.id}`}
              className="block bg-white rounded-xl border border-[#e8e8e8] hover:border-[#d4d4d4] transition-all duration-150"
            >
              <div className="flex items-center gap-5 px-5 py-4">
                <div className="w-10 h-10 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-[14px] font-semibold text-[#525252]">
                  {chapter.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-[#171717] truncate">
                    {chapter.title}
                  </div>
                  <div className="text-[12px] text-[#a3a3a3] mt-0.5">
                    {chapter.wordCount.toLocaleString()} 字
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {chapter.status === 'synced' && (
                    <span className="px-2.5 py-1 text-[11px] font-medium bg-[#f0fdf4] text-[#16a34a] rounded-full">
                      已同步
                    </span>
                  )}
                  {chapter.status === 'pending' && (
                    <span className="px-2.5 py-1 text-[11px] font-medium bg-[#fefce8] text-[#ca8a04] rounded-full">
                      待同步
                    </span>
                  )}
                  {chapter.status === 'audit' && (
                    <span className="px-2.5 py-1 text-[11px] font-medium bg-[#faf5ff] text-[#9333ea] rounded-full">
                      待审计
                    </span>
                  )}
                  <svg className="w-4 h-4 text-[#d4d4d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}

          {filteredChapters.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#e8e8e8]">
              <div className="text-[14px] text-[#a3a3a3]">
                {searchTerm ? '没有找到匹配的章节' : '暂无章节'}
              </div>
            </div>
          )}
        </div>

        {/* 底部统计 */}
        {searchTerm && filteredChapters.length > 0 && (
          <div className="mt-4 text-[12px] text-[#a3a3a3]">
            找到 {filteredChapters.length} 个结果
          </div>
        )}
      </div>
    </div>
  );
}
