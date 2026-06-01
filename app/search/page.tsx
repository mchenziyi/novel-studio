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
        <mark key={index} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chapter': return '📖';
      case 'character': return '👤';
      case 'foreshadowing': return '🔗';
      default: return '📄';
    }
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
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">搜索</h1>

      {/* 搜索框 */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex space-x-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索章节内容、角色、伏笔..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            搜索
          </button>
        </div>
      </form>

      {/* 筛选器 */}
      <div className="flex space-x-2 mb-6">
        {(['all', 'chapter', 'character', 'foreshadowing'] as const).map((type) => (
          <button
            key={type}
            onClick={() => handleFilterChange(type)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === type
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type === 'all' ? '全部' : getTypeLabel(type)}
          </button>
        ))}
      </div>

      {/* 搜索结果 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : query.length < 2 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">🔍</div>
          <p>输入至少 2 个字符开始搜索</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">😕</div>
          <p>没有找到与 "{query}" 相关的结果</p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            找到 {total} 个结果
          </p>

          <div className="space-y-4">
            {results.map((result, index) => (
              <Link
                key={`${result.type}-${result.id}-${index}`}
                href={getLink(result)}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getTypeIcon(result.type)}</span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {getTypeLabel(result.type)}
                    </span>
                    <h3 className="font-medium text-gray-900">
                      {highlightText(result.title, query)}
                    </h3>
                  </div>
                  <span className="text-xs text-gray-400">
                    {result.matches.length} 个匹配
                  </span>
                </div>

                <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {highlightText(result.content.substring(0, 150), query)}...
                </div>

                {/* 匹配上下文 */}
                {result.matches.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {result.matches.slice(0, 2).map((match, matchIndex) => (
                      <div
                        key={matchIndex}
                        className="text-xs bg-gray-50 p-2 rounded font-mono"
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
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
