'use client';

import { useState, useEffect } from 'react';
import { Chapter } from '@/types';

export default function ChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'synced' | 'pending' | 'audit'>('all');

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

  const filteredChapters = chapters.filter(chapter => {
    const matchesSearch = chapter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chapter.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || chapter.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">章节管理</h1>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索章节标题或内容..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg ${
                filterStatus === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterStatus('synced')}
              className={`px-4 py-2 rounded-lg ${
                filterStatus === 'synced'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              已同步
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg ${
                filterStatus === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              待同步
            </button>
            <button
              onClick={() => setFilterStatus('audit')}
              className={`px-4 py-2 rounded-lg ${
                filterStatus === 'audit'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              待审计
            </button>
          </div>
        </div>
      </div>

      {/* 章节列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="grid grid-cols-1 divide-y">
          {filteredChapters.map((chapter) => (
            <a
              key={chapter.id}
              href={`/chapters/${chapter.id}`}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {chapter.id}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{chapter.title}</div>
                    <div className="text-sm text-gray-500">
                      {chapter.wordCount.toLocaleString()} 字
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {chapter.status === 'synced' && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      已同步
                    </span>
                  )}
                  {chapter.status === 'pending' && (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                      待同步
                    </span>
                  )}
                  {chapter.status === 'audit' && (
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                      待审计
                    </span>
                  )}
                  <span className="text-gray-400">→</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="mt-6 text-sm text-gray-500">
        共 {filteredChapters.length} 章，{chapters.length} 章总计
      </div>
    </div>
  );
}
