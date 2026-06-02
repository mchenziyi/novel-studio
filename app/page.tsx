'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useNovel } from '@/lib/novel-context';

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
  const { currentNovelId } = useNovel();
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
  }, [currentNovelId]);

  const loadStats = async () => {
    try {
      const [chaptersRes, syncRes, foreshadowingRes, charactersRes] = await Promise.all([
        fetch(`/api/chapters?novelId=${currentNovelId}`),
        fetch(`/api/files?novelId=${currentNovelId}`),
        fetch(`/api/foreshadowing?novelId=${currentNovelId}`),
        fetch(`/api/characters?novelId=${currentNovelId}`),
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
        <div className="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#fafafa]">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* 页面标题 */}
        <div className="mb-10">
          <h1 className="text-[32px] font-semibold text-[#171717] tracking-tight leading-tight">
            概览
          </h1>
          <p className="text-[15px] text-[#737373] mt-1">
            项目状态与快速入口
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard
            label="总章节"
            value={stats.totalChapters}
            suffix="章"
            href="/chapters"
          />
          <StatCard
            label="总字数"
            value={stats.totalWords.toLocaleString()}
            suffix="字"
          />
          <StatCard
            label="角色"
            value={stats.characterCount}
            suffix="个"
            href="/characters"
          />
          <StatCard
            label="伏笔"
            value={stats.foreshadowingCount}
            suffix="条"
            href="/foreshadowing"
          />
        </div>

        {/* 进度条 */}
        <div className="bg-white rounded-2xl border border-[#e8e8e8] p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-medium text-[#171717]">写作进度</h2>
              <p className="text-[13px] text-[#737373] mt-0.5">
                当前第 {stats.currentChapter} 章，平均每章 {stats.avgWordsPerChapter.toLocaleString()} 字
              </p>
            </div>
            <span className="text-[13px] font-medium text-[#171717]">
              {((stats.currentChapter / 100) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-[#f5f5f5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#171717] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(stats.currentChapter / 100) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 最近编辑 */}
          <div className="bg-white rounded-2xl border border-[#e8e8e8]">
            <div className="px-6 py-4 border-b border-[#e8e8e8]">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-medium text-[#171717]">最近编辑</h2>
                <Link href="/chapters" className="text-[13px] text-[#737373] hover:text-[#171717] transition-colors">
                  查看全部
                </Link>
              </div>
            </div>
            <div className="divide-y divide-[#f5f5f5]">
              {stats.recentChapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  href={`/chapters/${chapter.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-[#fafafa] transition-colors"
                >
                  <div>
                    <div className="text-[14px] font-medium text-[#171717]">
                      第{chapter.id}章 {chapter.title}
                    </div>
                    <div className="text-[12px] text-[#a3a3a3] mt-0.5">
                      {chapter.wordCount.toLocaleString()} 字
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-[#d4d4d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
              {stats.recentChapters.length === 0 && (
                <div className="px-6 py-8 text-center text-[13px] text-[#a3a3a3]">
                  暂无章节
                </div>
              )}
            </div>
          </div>

          {/* 快速操作 */}
          <div className="bg-white rounded-2xl border border-[#e8e8e8]">
            <div className="px-6 py-4 border-b border-[#e8e8e8]">
              <h2 className="text-[15px] font-medium text-[#171717]">快速操作</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <QuickAction
                href="/agent/chat"
                icon={<ChatIcon />}
                title="AI 对话"
                description="智能写作助手"
              />
              <QuickAction
                href="/chapters"
                icon={<ChapterIcon />}
                title="章节管理"
                description="编辑章节内容"
              />
              <QuickAction
                href="/outline"
                icon={<OutlineIcon />}
                title="大纲"
                description="查看故事结构"
              />
              <QuickAction
                href="/search"
                icon={<SearchIcon />}
                title="搜索"
                description="全文搜索"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix, href }: {
  label: string;
  value: string | number;
  suffix?: string;
  href?: string;
}) {
  const content = (
    <div className="bg-white rounded-2xl border border-[#e8e8e8] p-5 hover:border-[#d4d4d4] transition-colors">
      <div className="text-[12px] text-[#a3a3a3] uppercase tracking-wider mb-2">{label}</div>
      <div className="text-[28px] font-semibold text-[#171717] tracking-tight">
        {value}
        {suffix && <span className="text-[14px] font-normal text-[#a3a3a3] ml-1">{suffix}</span>}
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
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-4 rounded-xl hover:bg-[#fafafa] transition-colors group"
    >
      <div className="w-9 h-9 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-[#525252] group-hover:bg-[#171717] group-hover:text-white transition-all">
        {icon}
      </div>
      <div>
        <div className="text-[13px] font-medium text-[#171717]">{title}</div>
        <div className="text-[12px] text-[#a3a3a3] mt-0.5">{description}</div>
      </div>
    </Link>
  );
}

// 图标组件
function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ChapterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function OutlineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
