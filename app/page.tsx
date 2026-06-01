'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalChapters: number;
  totalWords: number;
  currentChapter: number;
  pendingSync: number;
  avgWordsPerChapter: number;
  foreshadowingCount: number;
  characterCount: number;
  recentChapters: any[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalChapters: 0,
    totalWords: 0,
    currentChapter: 0,
    pendingSync: 0,
    avgWordsPerChapter: 0,
    foreshadowingCount: 0,
    characterCount: 0,
    recentChapters: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [chaptersRes, syncRes, foreshadowingRes, charactersRes] = await Promise.all([
        fetch('/api/chapters'),
        fetch('/api/files'),
        fetch('/api/foreshadowing'),
        fetch('/api/characters'),
      ]);

      const chapters = await chaptersRes.json();
      const syncStatus = await syncRes.json();
      const foreshadowing = await foreshadowingRes.json();
      const characters = await charactersRes.json();

      const totalWords = chapters.reduce((sum: number, ch: any) => sum + ch.wordCount, 0);

      setStats({
        totalChapters: chapters.length,
        totalWords,
        currentChapter: syncStatus.latestChapter || 0,
        pendingSync: syncStatus.pendingChapters?.length || 0,
        avgWordsPerChapter: chapters.length > 0 ? Math.round(totalWords / chapters.length) : 0,
        foreshadowingCount: foreshadowing.length,
        characterCount: characters.length,
        recentChapters: chapters.slice(-5).reverse(),
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900">仪表盘</h1>
        <p className="text-gray-500 mt-1">《开局屠村现场-他们说我疯了》项目概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="总章数"
          value={stats.totalChapters}
          icon="📖"
          color="blue"
          href="/chapters"
        />
        <StatCard
          title="总字数"
          value={stats.totalWords.toLocaleString()}
          icon="✍️"
          color="green"
          suffix="字"
        />
        <StatCard
          title="当前进度"
          value={`第${stats.currentChapter}章`}
          icon="📍"
          color="purple"
          subtitle={`${stats.pendingSync} 待同步`}
        />
        <StatCard
          title="平均每章"
          value={stats.avgWordsPerChapter.toLocaleString()}
          icon="📊"
          color="orange"
          suffix="字"
        />
      </div>

      {/* 第二行统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="角色数量"
          value={stats.characterCount}
          icon="👥"
          color="indigo"
          href="/characters"
        />
        <StatCard
          title="伏笔数量"
          value={stats.foreshadowingCount}
          icon="🔗"
          color="pink"
          href="/foreshadowing"
        />
        <StatCard
          title="写作状态"
          value={stats.pendingSync === 0 ? '正常' : '待同步'}
          icon={stats.pendingSync === 0 ? '✅' : '⚠️'}
          color={stats.pendingSync === 0 ? 'green' : 'yellow'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 最近编辑章节 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">最近编辑</h2>
              <Link href="/chapters" className="text-sm text-blue-500 hover:text-blue-600">
                查看全部
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentChapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/chapters/${chapter.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      第{chapter.id}章 {chapter.title}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {chapter.wordCount.toLocaleString()} 字
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 快速操作 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">快速操作</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <QuickAction
              href="/chapters"
              icon="📖"
              title="章节管理"
              description="查看和编辑章节"
            />
            <QuickAction
              href="/agent/chat"
              icon="💬"
              title="ChatAgent"
              description="AI 辅助写作"
            />
            <QuickAction
              href="/outline"
              icon="📋"
              title="大纲管理"
              description="查看和编辑大纲"
            />
            <QuickAction
              href="/foreshadowing"
              icon="🔗"
              title="伏笔追踪"
              description="管理伏笔和钩子"
            />
            <QuickAction
              href="/characters"
              icon="👥"
              title="角色管理"
              description="查看角色信息"
            />
            <QuickAction
              href="/agent"
              icon="🤖"
              title="Agent 工作台"
              description="运行 AI Agent"
            />
          </div>
        </div>
      </div>

      {/* 写作进度 */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">写作进度</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">当前章节进度</span>
              <span className="text-sm font-medium text-gray-900">
                第 {stats.currentChapter} 章 / 预计 100 章
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(stats.currentChapter / 100) * 100}%` }}
              />
            </div>
            <div className="text-right text-xs text-gray-500 mt-1">
              {((stats.currentChapter / 100) * 100).toFixed(1)}% 完成
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalWords.toLocaleString()}</div>
              <div className="text-xs text-gray-500">总字数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalChapters}</div>
              <div className="text-xs text-gray-500">已完成章节</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.avgWordsPerChapter.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">平均字数/章</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, href, suffix, subtitle }: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  href?: string;
  suffix?: string;
  subtitle?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    indigo: 'from-indigo-500 to-indigo-600',
    pink: 'from-pink-500 to-pink-600',
    yellow: 'from-yellow-500 to-yellow-600',
  };

  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {value}
            {suffix && <span className="text-sm font-normal text-gray-500 ml-1">{suffix}</span>}
          </p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color] || colorClasses.blue} flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function QuickAction({ href, icon, title, description }: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-medium text-gray-900">{title}</div>
      <div className="text-sm text-gray-500">{description}</div>
    </Link>
  );
}
