'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface SearchResult {
  type: 'chapter' | 'character' | 'foreshadowing';
  id: string;
  title: string;
  content: string;
  matches: {
    text: string;
    index: number;
    context: string;
  }[];
  score: number;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<'all' | 'chapter' | 'character' | 'foreshadowing'>('all');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q, filter);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string, type: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=${type}&limit=50`);
      const data = await response.json();
      setResults(data.results);
      setTotal(data.total);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      performSearch(query.trim(), filter);
    }
  };

  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter);
    if (query.trim()) {
      performSearch(query.trim(), newFilter);
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-[#fef08a] text-[#171717] px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'chapter': return '章节';
      case 'character': return '角色';
      case 'foreshadowing': return '伏笔';
      default: return '未知';
    }
  };

  const getLink = (result: SearchResult) => {
    switch (result.type) {
      case 'chapter': return `/chapters/${result.id}`;
      case 'character': return `/characters`;
      case 'foreshadowing': return `/foreshadowing`;
      default: return '#';
    }
  };

  return (
    <div className="min-h-full bg-[#fafafa]">
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-[32px] font-semibold text-[#171717] tracking-tight">搜索</h1>
          <p className="text-[15px] text-[#737373] mt-1">
            搜索章节、角色、伏笔
          </p>
        </div>

        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a3a3a3]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词搜索..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-[#e8e8e8] rounded-2xl text-[16px] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#171717] transition-colors"
              autoFocus
            />
          </div>
        </form>

        {/* 筛选器 */}
        <div className="flex gap-2 mb-8">
          {(['all', 'chapter', 'character', 'foreshadowing'] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleFilterChange(type)}
              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-150 ${
                filter === type
                  ? 'bg-[#171717] text-white'
                  : 'bg-white text-[#525252] border border-[#e8e8e8] hover:border-[#d4d4d4]'
              }`}
            >
              {type === 'all' ? '全部' : getTypeLabel(type)}
            </button>
          ))}
        </div>

        {/* 搜索结果 */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" />
          </div>
        ) : query.length < 2 ? (
          <div className="text-center py-16">
            <div className="text-[48px] mb-4">🔍</div>
            <p className="text-[15px] text-[#737373]">输入至少 2 个字符开始搜索</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-[48px] mb-4">😕</div>
            <p className="text-[15px] text-[#737373]">
              没有找到与 "<span className="font-medium text-[#171717]">{query}</span>" 相关的结果
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[13px] text-[#a3a3a3] mb-4">
              找到 {total} 个结果
            </p>

            <div className="space-y-3">
              {results.map((result, index) => (
                <Link
                  key={`${result.type}-${result.id}-${index}`}
                  href={getLink(result)}
                  className="block bg-white rounded-xl border border-[#e8e8e8] p-5 hover:border-[#d4d4d4] transition-all duration-150"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 text-[11px] font-medium bg-[#f5f5f5] text-[#525252] rounded-full">
                        {getTypeLabel(result.type)}
                      </span>
                      <h3 className="text-[14px] font-medium text-[#171717]">
                        {highlightText(result.title, query)}
                      </h3>
                    </div>
                    <span className="text-[12px] text-[#a3a3a3]">
                      {result.matches.length} 个匹配
                    </span>
                  </div>

                  <div className="text-[13px] text-[#525252] line-clamp-2 mb-3">
                    {highlightText(result.content.substring(0, 150), query)}...
                  </div>

                  {/* 匹配上下文 */}
                  {result.matches.length > 0 && (
                    <div className="space-y-2">
                      {result.matches.slice(0, 2).map((match, matchIndex) => (
                        <div
                          key={matchIndex}
                          className="text-[12px] text-[#737373] bg-[#fafafa] p-3 rounded-lg font-mono"
                        >
                          ...{highlightText(match.context, query)}...
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
