'use client';

import { useState, useEffect } from 'react';
import { useNovel } from '@/lib/novel-context';

interface StyleProfile {
  id: number;
  name: string;
  fingerprint: {
    sentenceLength?: { avg?: number; shortPercent?: number };
    topWords?: string[];
    textLength?: number;
    sentenceCount?: number;
  };
  llmGuide: string;
  isActive: boolean;
}

export function StylePanel() {
  const { currentNovelId } = useNovel();
  const [profiles, setProfiles] = useState<StyleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importName, setImportName] = useState('');
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => { loadProfiles(); }, [currentNovelId]);

  const loadProfiles = async () => {
    try {
      const res = await fetch(`/api/style?novelId=${currentNovelId}`);
      setProfiles(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleImport = async () => {
    if (!importName.trim() || !importText.trim()) return;
    setImporting(true);
    try {
      const res = await fetch('/api/style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novelId: currentNovelId, name: importName, referenceText: importText }),
      });
      if (res.ok) {
        setShowImport(false);
        setImportName('');
        setImportText('');
        await loadProfiles();
      }
    } catch (e) { console.error(e); }
    finally { setImporting(false); }
  };

  const toggleActive = async (id: number, activate: boolean) => {
    try {
      await fetch('/api/style', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, novelId: currentNovelId, isActive: activate }),
      });
      await loadProfiles();
    } catch (e) { console.error(e); }
  };

  const activeProfile = profiles.find(p => p.isActive);

  if (loading) return <div className="text-[13px] text-[#a3a3a3]">加载中...</div>;

  return (
    <div>
      {/* 当前激活的文风 */}
      {activeProfile ? (
        <div className="mb-4 p-4 bg-[#f5f5f5] rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[14px] font-medium text-[#171717]">{activeProfile.name}</span>
            <span className="px-2 py-0.5 text-[11px] bg-[#171717] text-white rounded-full">已激活</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[12px] text-[#525252]">
            <div>平均句长：<span className="font-medium text-[#171717]">{activeProfile.fingerprint?.sentenceLength?.avg || '?'} 字</span></div>
            <div>短句占比：<span className="font-medium text-[#171717]">{activeProfile.fingerprint?.sentenceLength?.shortPercent || '?'}%</span></div>
          </div>
          {activeProfile.llmGuide && (
            <p className="mt-2 text-[12px] text-[#737373] italic">"{activeProfile.llmGuide}"</p>
          )}
        </div>
      ) : (
        <p className="text-[13px] text-[#a3a3a3] mb-4">当前没有激活的文风配置。导入参考文本后 AI 写作会自动模仿该风格。</p>
      )}

      {/* 已有文风列表 */}
      {profiles.length > 0 && (
        <div className="space-y-2 mb-4">
          {profiles.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-white border border-[#e8e8e8] rounded-lg">
              <div>
                <span className="text-[13px] font-medium text-[#171717]">{p.name}</span>
                <span className="text-[12px] text-[#a3a3a3] ml-2">
                  {p.fingerprint?.sentenceLength?.avg || '?'}字/句
                </span>
              </div>
              <button
                onClick={() => toggleActive(p.id, !p.isActive)}
                className={`px-3 py-1 text-[12px] rounded-lg transition-colors ${
                  p.isActive ? 'bg-[#171717] text-white' : 'bg-[#f5f5f5] text-[#525252] hover:bg-[#e8e8e8]'
                }`}
              >
                {p.isActive ? '已激活' : '激活'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 导入按钮 */}
      {!showImport ? (
        <button
          onClick={() => setShowImport(true)}
          className="w-full px-4 py-2.5 text-[13px] text-[#525252] bg-white border border-[#e8e8e8] rounded-lg hover:bg-[#fafafa] transition-colors"
        >
          + 导入文风
        </button>
      ) : (
        <div className="p-4 bg-white border border-[#e8e8e8] rounded-lg space-y-3">
          <input
            type="text"
            value={importName}
            onChange={e => setImportName(e.target.value)}
            placeholder="文风名称（如：余华风格）"
            className="w-full px-3 py-2 bg-[#f5f5f5] border-none rounded-lg text-[13px] focus:outline-none focus:ring-1 focus:ring-[#171717]"
          />
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder="粘贴参考文本（至少 500 字）..."
            rows={4}
            className="w-full px-3 py-2 bg-[#f5f5f5] border-none rounded-lg text-[13px] focus:outline-none focus:ring-1 focus:ring-[#171717] resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(false)}
              className="flex-1 px-3 py-2 text-[13px] text-[#525252] bg-[#f5f5f5] rounded-lg hover:bg-[#e8e8e8]"
            >取消</button>
            <button
              onClick={handleImport}
              disabled={importing || !importName.trim() || importText.trim().length < 200}
              className="flex-1 px-3 py-2 text-[13px] text-white bg-[#171717] rounded-lg hover:bg-[#404040] disabled:opacity-50"
            >{importing ? '分析中...' : '导入'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
