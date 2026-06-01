'use client';

import { useState, useRef, useEffect } from 'react';
import { diffChars, diffWords, diffLines } from 'diff';

interface AiEditPanelProps {
  selectedText: string;
  fullContent: string;
  onApply: (newText: string) => void;
  onClose: () => void;
}

interface DiffPart {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export function AiEditPanel({ selectedText, fullContent, onApply, onClose }: AiEditPanelProps) {
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    original: string;
    modified: string;
  } | null>(null);
  const [diffParts, setDiffParts] = useState<DiffPart[]>([]);
  const [diffMode, setDiffMode] = useState<'char' | 'word' | 'line'>('word');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (result) {
      computeDiff(result.original, result.modified, diffMode);
    }
  }, [result, diffMode]);

  const computeDiff = (oldText: string, newText: string, mode: 'char' | 'word' | 'line') => {
    let diff;
    switch (mode) {
      case 'char':
        diff = diffChars(oldText, newText);
        break;
      case 'word':
        diff = diffWords(oldText, newText);
        break;
      case 'line':
        diff = diffLines(oldText, newText);
        break;
    }
    setDiffParts(diff.map(part => ({
      type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
      value: part.value,
    })));
  };

  const handleSubmit = async () => {
    if (!instruction.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setDiffParts([]);

    try {
      const response = await fetch('/api/ai/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedText,
          instruction,
          fullContent,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResult({
          original: data.original,
          modified: data.modified,
        });
      }
    } catch (err) {
      setError('请求失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApply(result.modified);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-[700px] max-h-[85vh] flex flex-col animate-scaleIn">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8e8]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#f5f5f5] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#525252]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#171717]">AI 编辑</h3>
              <p className="text-[12px] text-[#a3a3a3]">选中了 {selectedText.length} 个字符</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#f5f5f5] flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-[#525252]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 选中的原文 */}
          <div className="mb-4">
            <label className="block text-[12px] font-medium text-[#525252] mb-2">选中的文字</label>
            <div className="p-3 bg-[#f5f5f5] rounded-xl text-[13px] text-[#525252] max-h-32 overflow-y-auto">
              {selectedText}
            </div>
          </div>

          {/* 修改指令 */}
          <div className="mb-4">
            <label className="block text-[12px] font-medium text-[#525252] mb-2">修改要求</label>
            <textarea
              ref={inputRef}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述你想要的修改，例如：让这段话更生动、修复语法错误、改写成对话形式..."
              className="w-full px-4 py-3 bg-white border border-[#e8e8e8] rounded-xl text-[13px] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#171717] transition-colors resize-none"
              rows={3}
            />
            <p className="text-[11px] text-[#a3a3a3] mt-1.5">
              按 ⌘+Enter 提交
            </p>
          </div>

          {/* 提交按钮 */}
          {!result && (
            <button
              onClick={handleSubmit}
              disabled={loading || !instruction.trim()}
              className="w-full py-2.5 bg-[#171717] text-white text-[13px] font-medium rounded-xl hover:bg-[#404040] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  生成中...
                </span>
              ) : (
                '生成修改'
              )}
            </button>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 p-3 bg-[#fef2f2] text-[#dc2626] text-[12px] rounded-xl">
              {error}
            </div>
          )}

          {/* Diff 对比结果 */}
          {result && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12px] font-medium text-[#525252]">修改对比</label>
                <div className="flex gap-1">
                  {(['char', 'word', 'line'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setDiffMode(mode)}
                      className={`px-2 py-1 text-[11px] rounded-md transition-colors ${
                        diffMode === mode
                          ? 'bg-[#171717] text-white'
                          : 'bg-[#f5f5f5] text-[#525252] hover:bg-[#e8e8e8]'
                      }`}
                    >
                      {mode === 'char' ? '字符' : mode === 'word' ? '词语' : '行'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-[#fafafa] rounded-xl border border-[#e8e8e8] font-mono text-[13px] leading-relaxed max-h-64 overflow-y-auto">
                {diffParts.map((part, index) => (
                  <span
                    key={index}
                    className={
                      part.type === 'added'
                        ? 'bg-[#dcfce7] text-[#166534] px-0.5 rounded'
                        : part.type === 'removed'
                        ? 'bg-[#fee2e2] text-[#991b1b] line-through px-0.5 rounded'
                        : ''
                    }
                  >
                    {part.value}
                  </span>
                ))}
              </div>

              {/* 统计 */}
              <div className="flex items-center gap-4 mt-2 text-[11px] text-[#a3a3a3]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#166534]" />
                  新增: {diffParts.filter(p => p.type === 'added').reduce((acc, p) => acc + p.value.length, 0)} 字符
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#991b1b]" />
                  删除: {diffParts.filter(p => p.type === 'removed').reduce((acc, p) => acc + p.value.length, 0)} 字符
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        {result && (
          <div className="px-6 py-4 border-t border-[#e8e8e8] flex items-center justify-between">
            <button
              onClick={() => {
                setResult(null);
                setDiffParts([]);
                setInstruction('');
              }}
              className="px-4 py-2 text-[13px] font-medium text-[#525252] hover:text-[#171717] transition-colors"
            >
              重新修改
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-[13px] font-medium text-[#525252] bg-[#f5f5f5] rounded-xl hover:bg-[#e8e8e8] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-[13px] font-medium text-white bg-[#171717] rounded-xl hover:bg-[#404040] transition-colors"
              >
                应用修改
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
