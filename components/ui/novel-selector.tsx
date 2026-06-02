'use client';

import { useState, useEffect } from 'react';
import { useNovel } from '@/lib/novel-context';

interface Novel {
  id: string;
  title: string;
  description?: string;
  author?: string;
  status: string;
}

export function NovelSelector() {
  const { currentNovelId, setCurrentNovelId } = useNovel();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newNovelTitle, setNewNovelTitle] = useState('');
  const [newNovelDescription, setNewNovelDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const currentNovel = novels.find(n => n.id === currentNovelId);

  useEffect(() => {
    loadNovels();
  }, []);

  const loadNovels = async () => {
    try {
      const response = await fetch('/api/novels');
      const data = await response.json();
      if (data.novels) {
        setNovels(data.novels);
        // 如果没有选中的小说，默认选第一个
        if (!currentNovelId && data.novels.length > 0) {
          setCurrentNovelId(data.novels[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load novels:', error);
    }
  };

  const handleCreateNovel = async () => {
    if (!newNovelTitle.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/novels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNovelTitle,
          description: newNovelDescription,
        }),
      });

      const data = await response.json();
      if (data.success && data.novel) {
        setNovels(prev => [data.novel, ...prev]);
        setCurrentNovelId(data.novel.id);
        setShowCreateDialog(false);
        setNewNovelTitle('');
        setNewNovelDescription('');
      }
    } catch (error) {
      console.error('Failed to create novel:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* 小说选择器按钮 */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full"
      >
        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span className="flex-1 text-left truncate text-[13px]">
          {currentNovel ? currentNovel.title : '选择小说'}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {novels.map(novel => (
            <button
              key={novel.id}
              onClick={() => {
                setCurrentNovelId(novel.id);
                setShowDropdown(false);
              }}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                novel.id === currentNovelId ? 'bg-blue-50 text-blue-600' : ''
              }`}
            >
              <div className="font-medium text-[13px]">{novel.title}</div>
              {novel.description && (
                <div className="text-xs text-gray-500 truncate">{novel.description}</div>
              )}
            </button>
          ))}
          
          {/* 创建新小说按钮 */}
          <button
            onClick={() => {
              setShowDropdown(false);
              setShowCreateDialog(true);
            }}
            className="w-full px-3 py-2 text-sm text-left text-blue-600 hover:bg-blue-50 transition-colors border-t border-gray-100"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[13px]">创建新小说</span>
            </div>
          </button>
        </div>
      )}

      {/* 创建小说对话框 */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-96 p-6">
            <h3 className="text-lg font-semibold mb-4">创建新小说</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  小说标题 *
                </label>
                <input
                  type="text"
                  value={newNovelTitle}
                  onChange={(e) => setNewNovelTitle(e.target.value)}
                  placeholder="请输入小说标题"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  小说简介
                </label>
                <textarea
                  value={newNovelDescription}
                  onChange={(e) => setNewNovelDescription(e.target.value)}
                  placeholder="请输入小说简介（可选）"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateNovel}
                disabled={!newNovelTitle.trim() || loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
