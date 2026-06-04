'use client';

import { useState, useEffect } from 'react';
import { useNovel } from '@/lib/novel-context';

interface NovelWritingConfig {
  targetTotalWords: number;
  minWordsPerChapter: number;
  maxWordsPerChapter: number;
  writingStyleRules: string[];
  forbiddenPatterns: string[];
  coreSettings: string[];
}

export function NovelConfigPanel() {
  const { currentNovelId } = useNovel();
  const [config, setConfig] = useState<NovelWritingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [currentNovelId]);

  const loadConfig = async () => {
    try {
      const res = await fetch(`/api/novels/${currentNovelId}/config`);
      const raw = await res.json();
      // Go 后端返回 map[string]string，值可能是逗号分隔的字符串
      // v1 前端期望 string[]，需要转换
      const parseArr = (v: any): string[] => {
        if (Array.isArray(v)) return v;
        if (typeof v === 'string' && v.trim()) return v.split(',').map(s => s.trim()).filter(Boolean);
        return [];
      };
      const parseNum = (v: any, def: number): number => {
        if (typeof v === 'number') return v;
        const n = parseInt(v, 10);
        return isNaN(n) ? def : n;
      };
      setConfig({
        targetTotalWords: parseNum(raw.targetTotalWords, 0),
        minWordsPerChapter: parseNum(raw.minWordsPerChapter, 2000),
        maxWordsPerChapter: parseNum(raw.maxWordsPerChapter, 5000),
        writingStyleRules: parseArr(raw.writingStyleRules),
        forbiddenPatterns: parseArr(raw.forbiddenPatterns),
        coreSettings: parseArr(raw.coreSettings),
      });
    } catch (e) {
      console.error('Failed to load config:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (updates: Partial<NovelWritingConfig>) => {
    setSaving(true);
    try {
      // 发送前将 string[] 转为逗号分隔字符串（Go 后端存储格式）
      const payload: Record<string, any> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (Array.isArray(v)) {
          payload[k] = v.join(',');
        } else {
          payload[k] = v;
        }
      }
      await fetch(`/api/novels/${currentNovelId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setConfig(prev => prev ? { ...prev, ...updates } : prev);
    } catch (e) {
      console.error('Failed to save config:', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return <div className="text-[13px] text-[#a3a3a3]">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 字数配置 */}
      <div>
        <h3 className="text-[14px] font-medium text-[#171717] mb-3">字数规范</h3>
        <div className="grid grid-cols-3 gap-4">
          <NumberField
            label="目标总字数"
            value={config.targetTotalWords}
            onChange={v => saveConfig({ targetTotalWords: v })}
            suffix="字"
          />
          <NumberField
            label="每章最低字数"
            value={config.minWordsPerChapter}
            onChange={v => saveConfig({ minWordsPerChapter: v })}
            suffix="字"
          />
          <NumberField
            label="每章最高字数"
            value={config.maxWordsPerChapter}
            onChange={v => saveConfig({ maxWordsPerChapter: v })}
            suffix="字"
          />
        </div>
      </div>

      {/* 文风规则 */}
      <StringListField
        label="文风规则"
        description="AI 写作时必须遵循的风格要求"
        items={config.writingStyleRules}
        onChange={v => saveConfig({ writingStyleRules: v })}
      />

      {/* 禁止写法 */}
      <StringListField
        label="禁止写法"
        description="AI 写作时绝对不能出现的模式"
        items={config.forbiddenPatterns}
        onChange={v => saveConfig({ forbiddenPatterns: v })}
        danger
      />

      {/* 核心设定 */}
      <StringListField
        label="核心设定"
        description="贯穿全书的核心原则"
        items={config.coreSettings}
        onChange={v => saveConfig({ coreSettings: v })}
      />

      {saving && <p className="text-[12px] text-[#a3a3a3]">保存中...</p>}
    </div>
  );
}

function NumberField({ label, value, onChange, suffix }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <div>
      <label className="block text-[12px] text-[#737373] mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={e => onChange(parseInt(e.target.value) || 0)}
          className="w-full px-3 py-2 bg-white border border-[#e8e8e8] rounded-lg text-[13px] focus:outline-none focus:border-[#171717]"
        />
        <span className="text-[12px] text-[#a3a3a3] whitespace-nowrap">{suffix}</span>
      </div>
    </div>
  );
}

function StringListField({ label, description, items, onChange, danger }: {
  label: string;
  description: string;
  items: string[];
  onChange: (v: string[]) => void;
  danger?: boolean;
}) {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div>
      <h3 className="text-[14px] font-medium text-[#171717] mb-1">{label}</h3>
      <p className="text-[12px] text-[#a3a3a3] mb-3">{description}</p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={e => updateItem(i, e.target.value)}
              className={`flex-1 px-3 py-2 bg-white border rounded-lg text-[13px] focus:outline-none focus:border-[#171717] ${
                danger ? 'border-[#fecaca] bg-[#fef2f2]' : 'border-[#e8e8e8]'
              }`}
            />
            <button
              onClick={() => removeItem(i)}
              className="p-1.5 text-[#a3a3a3] hover:text-[#dc2626] hover:bg-[#fef2f2] rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="添加新规则..."
            className={`flex-1 px-3 py-2 bg-white border rounded-lg text-[13px] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#171717] ${
              danger ? 'border-[#fecaca]' : 'border-[#e8e8e8]'
            }`}
          />
          <button
            onClick={addItem}
            className="px-3 py-2 bg-[#f5f5f5] text-[#525252] text-[13px] rounded-lg hover:bg-[#e8e8e8] transition-colors"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
