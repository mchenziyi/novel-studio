'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useNovel } from '@/lib/novel-context';

interface Chapter {
  id: string;
  title: string;
  wordCount: number;
  content: string;
}

interface WritingStats {
  totalChapters: number;
  totalWords: number;
  avgWordsPerChapter: number;
  maxWordsChapter: { id: string; title: string; wordCount: number } | null;
  minWordsChapter: { id: string; title: string; wordCount: number } | null;
  wordCountDistribution: { range: string; count: number }[];
  chapterLengths: { id: string; title: string; wordCount: number }[];
}

export default function StatsPage() {
  const { currentNovelId } = useNovel();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [stats, setStats] = useState<WritingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    try {
      const response = await fetch(`/api/chapters?novelId=${currentNovelId}`);
      const data = await response.json();
      setChapters(data);
      calculateStats(data);
    } catch (error) {
      console.error('Failed to load chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (chapters: Chapter[]) => {
    if (chapters.length === 0) {
      setStats(null);
      return;
    }

    const wordCounts = chapters.map(ch => ch.wordCount);
    const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);
    const avgWords = Math.round(totalWords / chapters.length);

    const maxWordsChapter = chapters.reduce((max, ch) =>
      ch.wordCount > (max?.wordCount || 0) ? ch : max
    , chapters[0]);

    const minWordsChapter = chapters.reduce((min, ch) =>
      ch.wordCount < (min?.wordCount || Infinity) ? ch : min
    , chapters[0]);

    // 字数分布
    const ranges = [
      { min: 0, max: 1000, label: '0-1000' },
      { min: 1000, max: 2000, label: '1000-2000' },
      { min: 2000, max: 3000, label: '2000-3000' },
      { min: 3000, max: 4000, label: '3000-4000' },
      { min: 4000, max: 5000, label: '4000-5000' },
      { min: 5000, max: Infinity, label: '5000+' },
    ];

    const wordCountDistribution = ranges.map(range => ({
      range: range.label,
      count: chapters.filter(ch =>
        ch.wordCount >= range.min && ch.wordCount < range.max
      ).length,
    }));

    // 章节长度列表
    const chapterLengths = chapters.map(ch => ({
      id: ch.id,
      title: ch.title,
      wordCount: ch.wordCount,
    }));

    setStats({
      totalChapters: chapters.length,
      totalWords,
      avgWordsPerChapter: avgWords,
      maxWordsChapter,
      minWordsChapter,
      wordCountDistribution,
      chapterLengths,
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getWordCountColor = (wordCount: number, avg: number) => {
    const ratio = wordCount / avg;
    if (ratio > 1.2) return 'text-green-600';
    if (ratio < 0.8) return 'text-orange-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-semibold mb-2">暂无数据</h2>
          <p className="text-gray-500">还没有章节数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[32px] font-semibold text-[#171717] tracking-tight">写作统计</h1>
        <p className="text-gray-500 mt-1">《开局屠村现场-他们说我疯了》写作数据分析</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总章数</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalChapters}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
              📖
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总字数</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalWords)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
              ✍️
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均字数/章</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.avgWordsPerChapter)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
              📊
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">预计总字数</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatNumber(Math.round(stats.totalWords / stats.totalChapters * 100))}
              </p>
              <p className="text-xs text-gray-400">按100章估算</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl">
              🎯
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* 字数分布 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">字数分布</h2>
          <div className="space-y-3">
            {stats.wordCountDistribution.map((item) => {
              const percent = stats.totalChapters > 0
                ? (item.count / stats.totalChapters * 100)
                : 0;

              return (
                <div key={item.range}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">{item.range} 字</span>
                    <span className="text-sm font-medium">{item.count} 章 ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 极值统计 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">极值统计</h2>
          <div className="space-y-6">
            {stats.maxWordsChapter && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">📝</span>
                  <span className="font-medium text-green-800">最长章节</span>
                </div>
                <Link
                  href={`/chapters/${stats.maxWordsChapter.id}`}
                  className="text-lg font-semibold text-green-700 hover:underline"
                >
                  第{stats.maxWordsChapter.id}章 {stats.maxWordsChapter.title}
                </Link>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatNumber(stats.maxWordsChapter.wordCount)} 字
                </p>
              </div>
            )}

            {stats.minWordsChapter && (
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">📄</span>
                  <span className="font-medium text-orange-800">最短章节</span>
                </div>
                <Link
                  href={`/chapters/${stats.minWordsChapter.id}`}
                  className="text-lg font-semibold text-orange-700 hover:underline"
                >
                  第{stats.minWordsChapter.id}章 {stats.minWordsChapter.title}
                </Link>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {formatNumber(stats.minWordsChapter.wordCount)} 字
                </p>
              </div>
            )}

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">📏</span>
                <span className="font-medium text-blue-800">字数范围</span>
              </div>
              <p className="text-lg font-semibold text-blue-700">
                {formatNumber(stats.minWordsChapter?.wordCount || 0)} - {formatNumber(stats.maxWordsChapter?.wordCount || 0)} 字
              </p>
              <p className="text-sm text-blue-600 mt-1">
                标准差: {formatNumber(Math.round(
                  Math.sqrt(
                    stats.chapterLengths.reduce((sum, ch) =>
                      sum + Math.pow(ch.wordCount - stats.avgWordsPerChapter, 2)
                    , 0) / stats.chapterLengths.length
                  )
                ))} 字
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 章节字数图表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">章节字数分布图</h2>
          <div className="text-sm text-gray-500">
            点击柱状图查看章节详情
          </div>
        </div>

        <div className="h-64 flex items-end space-x-1">
          {stats.chapterLengths.slice(0, 40).map((chapter, index) => {
            const maxWords = Math.max(...stats.chapterLengths.map(ch => ch.wordCount));
            const height = (chapter.wordCount / maxWords) * 100;

            return (
              <Link
                key={chapter.id}
                href={`/chapters/${chapter.id}`}
                className="flex-1 group relative"
              >
                <div
                  className={`w-full rounded-t transition-all duration-300 ${
                    chapter.wordCount > stats.avgWordsPerChapter * 1.2
                      ? 'bg-green-500 hover:bg-green-600'
                      : chapter.wordCount < stats.avgWordsPerChapter * 0.8
                      ? 'bg-orange-500 hover:bg-orange-600'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  style={{ height: `${height}%` }}
                />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  第{chapter.id}章: {formatNumber(chapter.wordCount)}字
                </div>
              </Link>
            );
          })}
        </div>

        {stats.chapterLengths.length > 40 && (
          <div className="text-center text-sm text-gray-500 mt-4">
            显示前 40 章，共 {stats.chapterLengths.length} 章
          </div>
        )}

        {/* 平均线 */}
        <div className="relative mt-2">
          <div className="absolute left-0 right-0 border-t-2 border-dashed border-red-400"
            style={{ bottom: `${(stats.avgWordsPerChapter / Math.max(...stats.chapterLengths.map(ch => ch.wordCount))) * 100}%` }}
          />
          <span className="absolute right-0 text-xs text-red-500"
            style={{ bottom: `${(stats.avgWordsPerChapter / Math.max(...stats.chapterLengths.map(ch => ch.wordCount))) * 100 + 2}%` }}
          >
            平均: {formatNumber(stats.avgWordsPerChapter)}字
          </span>
        </div>
      </div>

      {/* 章节列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4">章节详情</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">章节</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">标题</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">字数</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">与平均值差异</th>
              </tr>
            </thead>
            <tbody>
              {stats.chapterLengths.map((chapter) => {
                const diff = chapter.wordCount - stats.avgWordsPerChapter;
                const diffPercent = (diff / stats.avgWordsPerChapter * 100).toFixed(1);

                return (
                  <tr key={chapter.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link href={`/chapters/${chapter.id}`} className="text-blue-600 hover:underline">
                        第{chapter.id}章
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/chapters/${chapter.id}`} className="hover:text-blue-600">
                        {chapter.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatNumber(chapter.wordCount)}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono ${getWordCountColor(chapter.wordCount, stats.avgWordsPerChapter)}`}>
                      {diff > 0 ? '+' : ''}{diffPercent}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
