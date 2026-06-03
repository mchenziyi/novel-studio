'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useNovel } from '@/lib/novel-context';

interface Foreshadowing {
  id: string;
  name: string;
  status: 'planted' | 'progressing' | 'resolved';
  plantedChapter: number;
  resolvedChapter?: number;
  relatedChapters: number[];
  description: string;
  section?: string;
}

export default function ForeshadowingPage() {
  const { currentNovelId } = useNovel();
  const [foreshadowing, setForeshadowing] = useState<Foreshadowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'planted' | 'progressing' | 'resolved'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'chapter' | 'status' | 'name'>('chapter');
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'stats'>('list');

  useEffect(() => {
    loadForeshadowing();
  }, [currentNovelId]);

  const loadForeshadowing = async () => {
    try {
      const response = await fetch(`/api/foreshadowing?novelId=${currentNovelId}`);
      const data = await response.json();
      setForeshadowing(data);
    } catch (error) {
      console.error('Failed to load foreshadowing:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredForeshadowing = foreshadowing
    .filter(item => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          item.name.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term) ||
          item.id.toLowerCase().includes(term)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'chapter':
          return a.plantedChapter - b.plantedChapter;
        case 'status':
          const statusOrder = { planted: 0, progressing: 1, resolved: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'progressing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planted': return '已埋设';
      case 'progressing': return '推进中';
      case 'resolved': return '已回收';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planted': return '🌱';
      case 'progressing': return '🔄';
      case 'resolved': return '✅';
      default: return '❓';
    }
  };

  // 统计数据
  const stats = {
    total: foreshadowing.length,
    planted: foreshadowing.filter(f => f.status === 'planted').length,
    progressing: foreshadowing.filter(f => f.status === 'progressing').length,
    resolved: foreshadowing.filter(f => f.status === 'resolved').length,
  };

  const resolutionRate = stats.total > 0 ? (stats.resolved / stats.total * 100).toFixed(1) : '0';

  // 按章节分组
  const chapterGroups = foreshadowing.reduce((groups, item) => {
    const chapter = item.plantedChapter;
    if (!groups[chapter]) {
      groups[chapter] = [];
    }
    groups[chapter].push(item);
    return groups;
  }, {} as Record<number, Foreshadowing[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">伏笔追踪</h1>
        <p className="text-gray-500 mt-1">管理和追踪小说中的伏笔、钩子和悬念</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总伏笔数</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
              🔗
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已埋设</p>
              <p className="text-3xl font-bold text-blue-600">{stats.planted}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
              🌱
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">推进中</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.progressing}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center text-2xl">
              🔄
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已回收</p>
              <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-xs text-gray-400 mt-1">回收率: {resolutionRate}%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
              ✅
            </div>
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* 搜索 */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索伏笔..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-4">
            {/* 状态筛选 */}
            <div className="flex space-x-2">
              {(['all', 'planted', 'progressing', 'resolved'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filterStatus === status
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? '全部' : getStatusText(status)}
                </button>
              ))}
            </div>

            {/* 排序 */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="chapter">按章节</option>
              <option value="status">按状态</option>
              <option value="name">按名称</option>
            </select>

            {/* 视图模式 */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'list' ? 'bg-white shadow' : 'text-gray-600'
                }`}
              >
                列表
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'timeline' ? 'bg-white shadow' : 'text-gray-600'
                }`}
              >
                时间线
              </button>
              <button
                onClick={() => setViewMode('stats')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'stats' ? 'bg-white shadow' : 'text-gray-600'
                }`}
              >
                统计
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredForeshadowing.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-500">没有找到匹配的伏笔</p>
            </div>
          ) : (
            filteredForeshadowing.map((item, index) => (
              <div
                key={item.id || `hook-${index}`}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getStatusIcon(item.status)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusColor(item.status)}`}>
                          {getStatusText(item.status)}
                        </span>
                        <span className="text-sm text-gray-500">
                          第{item.plantedChapter}章埋设
                        </span>
                        {item.resolvedChapter && (
                          <span className="text-sm text-green-600">
                            → 第{item.resolvedChapter}章回收
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-gray-400">{item.id}</span>
                </div>

                <p className="text-gray-600 mb-4">{item.description}</p>

                {item.relatedChapters && item.relatedChapters.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-500 mr-2">关联章节:</span>
                    <div className="inline-flex flex-wrap gap-2">
                      {item.relatedChapters.slice(0, 10).map((chapter) => (
                        <Link
                          key={chapter}
                          href={`/chapters/${String(chapter).padStart(4, '0')}`}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-blue-100 hover:text-blue-700 transition-colors text-sm"
                        >
                          第{chapter}章
                        </Link>
                      ))}
                      {item.relatedChapters.length > 10 && (
                        <span className="px-2 py-1 text-gray-400 text-sm">
                          +{item.relatedChapters.length - 10} 更多
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {viewMode === 'timeline' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-6">伏笔时间线</h2>

          {/* 时间线 */}
          <div className="relative">
            {/* 章节刻度 */}
            <div className="flex justify-between mb-4 text-xs text-gray-500">
              {[1, 20, 40, 60, 80, 100].map(ch => (
                <span key={ch}>第{ch}章</span>
              ))}
            </div>

            {/* 时间线条 */}
            <div className="h-2 bg-gray-200 rounded-full mb-8">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                style={{ width: `${(Math.max(...foreshadowing.map(f => f.plantedChapter)) / 100) * 100}%` }}
              />
            </div>

            {/* 伏笔条目 */}
            <div className="space-y-4">
              {Object.entries(chapterGroups)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([chapter, items]) => (
                  <div key={chapter} className="flex items-start space-x-4">
                    <div className="w-20 text-right">
                      <span className="text-sm font-medium text-gray-600">第{chapter}章</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border ${getStatusColor(item.status)}`}
                        >
                          <div className="flex items-center space-x-2">
                            <span>{getStatusIcon(item.status)}</span>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <p className="text-sm mt-1 opacity-75">{item.description.substring(0, 100)}...</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 状态分布 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold mb-4">状态分布</h3>
            <div className="space-y-4">
              {[
                { status: 'planted', label: '已埋设', color: 'bg-blue-500' },
                { status: 'progressing', label: '推进中', color: 'bg-yellow-500' },
                { status: 'resolved', label: '已回收', color: 'bg-green-500' },
              ].map(({ status, label, color }) => {
                const count = foreshadowing.filter(f => f.status === status).length;
                const percent = stats.total > 0 ? (count / stats.total * 100) : 0;

                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">{label}</span>
                      <span className="text-sm font-medium">{count} ({percent.toFixed(1)}%)</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 章节分布 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold mb-4">章节分布 (Top 10)</h3>
            <div className="space-y-3">
              {Object.entries(chapterGroups)
                .sort(([, a], [, b]) => b.length - a.length)
                .slice(0, 10)
                .map(([chapter, items]) => (
                  <div key={chapter} className="flex items-center space-x-3">
                    <span className="w-16 text-sm text-gray-600">第{chapter}章</span>
                    <div className="flex-1">
                      <div className="h-6 bg-gray-200 rounded overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded"
                          style={{ width: `${(items.length / Math.max(...Object.values(chapterGroups).map(g => g.length))) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-8 text-sm font-medium text-right">{items.length}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* 最近埋设的伏笔 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold mb-4">最近埋设</h3>
            <div className="space-y-3">
              {foreshadowing
                .filter(f => f.status === 'planted')
                .sort((a, b) => b.plantedChapter - a.plantedChapter)
                .slice(0, 5)
                .map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                    <span>🌱</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">第{item.plantedChapter}章</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* 最近回收的伏笔 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold mb-4">最近回收</h3>
            <div className="space-y-3">
              {foreshadowing
                .filter(f => f.status === 'resolved')
                .sort((a, b) => (b.resolvedChapter || 0) - (a.resolvedChapter || 0))
                .slice(0, 5)
                .map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-2 bg-green-50 rounded">
                    <span>✅</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-green-600">
                        第{item.plantedChapter}章 → 第{item.resolvedChapter}章
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
