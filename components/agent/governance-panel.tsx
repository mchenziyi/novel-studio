'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface GovernancePanelProps {
  novelId: string;
}

const DOCS = [
  {
    type: 'author_intent',
    label: '📖 作者意图',
    description: '这本书长期想成为什么——核心主题、风格方向、终局愿景',
    placeholder: '例如：\n- 这是一个关于"疯子"的反套路仙侠故事\n- 主角表面疯癫实则精于算计\n- 终局：主角主动异化终结异仙时代\n- 风格：短句为主，物理比喻，不解释',
  },
  {
    type: 'current_focus',
    label: '🎯 当前焦点',
    description: '最近 1-3 章要把注意力拉回哪里——当前矛盾、伏笔推进、角色发展',
    placeholder: '例如：\n- 本卷重点推进阿萝身世之谜\n- 第 75-77 章聚焦镇祟司内部权斗\n- 回收"三笔账"伏笔线\n- 让周醒和阿萝关系出现裂痕',
  },
];

export function GovernancePanel({ novelId }: GovernancePanelProps) {
  const [contents, setContents] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDocs();
  }, [novelId]);

  const loadDocs = async () => {
    try {
      const res = await fetch(`/api/governance?novelId=${novelId}`);
      const data = await res.json();
      const map: Record<string, string> = {};
      for (const doc of data.docs || []) {
        map[doc.doc_type] = doc.content;
      }
      setContents(map);
    } catch {
      // ignore
    }
  };

  const handleSave = async (docType: string) => {
    setSaving(true);
    try {
      await fetch('/api/governance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novelId, docType, content: editText }),
      });
      setContents(prev => ({ ...prev, [docType]: editText }));
      setEditing(null);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {DOCS.map(doc => {
        const content = contents[doc.type] || '';
        const isEditing = editing === doc.type;

        return (
          <div key={doc.type} className="border border-[#e8e8e8] rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50/60 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">{doc.label}</span>
                <span className="text-[10px] text-gray-400 ml-2">{doc.description}</span>
              </div>
              {isEditing ? (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setEditing(null)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-0.5"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleSave(doc.type)}
                    disabled={saving}
                    className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {saving ? '保存中…' : '保存'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditText(content);
                    setEditing(doc.type);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-0.5"
                >
                  {content ? '编辑' : '添加'}
                </button>
              )}
            </div>

            <div className="px-3 py-2">
              {isEditing ? (
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  placeholder={doc.placeholder}
                  rows={6}
                  className="w-full text-sm text-gray-700 bg-white border border-[#e0e0e0] rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-300 resize-y font-sans"
                />
              ) : content ? (
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
                  {content}
                </pre>
              ) : (
                <p className="text-xs text-gray-400 italic">未设置</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
