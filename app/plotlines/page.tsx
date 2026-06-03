'use client';

import { useState, useEffect } from 'react';
import { useNovel } from '@/lib/novel-context';

interface Plotline {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'resolved';
  startChapter: number | null;
  endChapter: number | null;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: '进行中', color: 'bg-green-50 text-green-700 border border-green-200' },
  paused: { label: '暂停', color: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  resolved: { label: '已完成', color: 'bg-gray-50 text-gray-600 border border-gray-200' },
};

export default function PlotlinesPage() {
  const { currentNovelId } = useNovel();
  const [plotlines, setPlotlines] = useState<Plotline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlotline, setSelectedPlotline] = useState<Plotline | null>(null);

  useEffect(() => { loadPlotlines(); }, [currentNovelId]);

  const loadPlotlines = async () => {
    try {
      const res = await fetch(`/api/plotlines?novelId=${currentNovelId}`);
      setPlotlines(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-full bg-[#fafafa]">
      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="mb-10">
          <h1 className="text-[32px] font-semibold text-[#171717] tracking-tight">情节线</h1>
          <p className="text-[15px] text-[#737373] mt-1">管理故事的主线和支线进度</p>
        </div>
        {plotlines.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e8e8e8] p-12 text-center">
            <div className="text-[40px] mb-4">📖</div>
            <p className="text-[14px] text-[#a3a3a3]">AI 对话中讨论情节线时会自动记录到此处</p>
          </div>
        ) : (
          <div className="flex gap-6">
            <div className="w-80 space-y-2">
              {plotlines.map(p => (
                <button key={p.id} onClick={() => setSelectedPlotline(p)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${selectedPlotline?.id === p.id ? 'border-[#171717] bg-white' : 'border-[#e8e8e8] bg-white hover:border-[#d4d4d4]'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[14px] font-medium text-[#171717]">{p.name}</span>
                    <span className={`px-2 py-0.5 text-[11px] rounded-full ${STATUS_MAP[p.status]?.color}`}>{STATUS_MAP[p.status]?.label}</span>
                  </div>
                  <p className="text-[12px] text-[#737373] line-clamp-2">{p.description}</p>
                  {(p.startChapter || p.endChapter) && (
                    <p className="text-[11px] text-[#a3a3a3] mt-1">第{p.startChapter || '?'}章 ~ 第{p.endChapter || '?'}章</p>
                  )}
                </button>
              ))}
            </div>
            {selectedPlotline && (
              <div className="flex-1 bg-white rounded-xl border border-[#e8e8e8] p-6">
                <h2 className="text-[20px] font-semibold text-[#171717] mb-2">{selectedPlotline.name}</h2>
                <p className="text-[14px] text-[#525252] mb-4">{selectedPlotline.description}</p>
                <span className={`px-2.5 py-1 text-[12px] rounded-full ${STATUS_MAP[selectedPlotline.status]?.color}`}>{STATUS_MAP[selectedPlotline.status]?.label}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
