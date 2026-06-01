'use client';

import { useState, useRef, useEffect } from 'react';
import { diffChars, diffWords, diffLines } from 'diff';

interface AiEditSidebarProps {
  selectedText: string;
  fullContent: string;
  onApply: (original: string, modified: string) => void;
  chapterId: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  diff?: {
    original: string;
    modified: string;
  };
}

interface DiffPart {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export function AiEditSidebar({ selectedText, fullContent, onApply, chapterId }: AiEditSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [diffMode, setDiffMode] = useState<'char' | 'word' | 'line'>('word');
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null);
  const [diffParts, setDiffParts] = useState<DiffPart[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 当选中文本变化时，自动添加到输入框
  useEffect(() => {
    if (selectedText) {
      setInput(`请帮我修改这段文字：\n"${selectedText}"`);
      inputRef.current?.focus();
    }
  }, [selectedText]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 计算 diff
  useEffect(() => {
    if (expandedDiff) {
      const msg = messages.find(m => m.id === expandedDiff);
      if (msg?.diff) {
        computeDiff(msg.diff.original, msg.diff.modified, diffMode);
      }
    }
  }, [expandedDiff, diffMode, messages]);

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

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // 提取选中的文字（如果有）
      const selectedMatch = input.match(/请帮我修改这段文字：[\s\S]*?"([\s\S]+?)"/);
      const textToEdit = selectedMatch ? selectedMatch[1] : selectedText;
      const instruction = selectedMatch ? input.replace(selectedMatch[0], '').trim() : input;

      const response = await fetch('/api/ai/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedText: textToEdit || fullContent.substring(0, 500),
          instruction: instruction || '请帮我改进这段文字',
          fullContent,
        }),
      });

      const data = await response.json();

      if (data.error) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `错误：${data.error}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } else {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `已生成修改建议，点击下方查看差异并应用。`,
          timestamp: new Date(),
          diff: {
            original: data.original,
            modified: data.modified,
          },
        };
        setMessages(prev => [...prev, assistantMessage]);
        setExpandedDiff(assistantMessage.id);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '请求失败，请检查网络连接',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleApply = (message: Message) => {
    if (message.diff) {
      onApply(message.diff.original, message.diff.modified);
    }
  };

  return (
    <div className="w-[400px] h-full flex flex-col bg-white border-l border-[#e8e8e8]">
      {/* 头部 */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-[#e8e8e8] bg-[#fafafa]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#525252]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-[13px] font-medium text-[#171717]">AI 编辑助手</span>
        </div>
        {selectedText && (
          <span className="text-[11px] text-[#a3a3a3] px-2 py-0.5 bg-[#f5f5f5] rounded">
            已选中 {selectedText.length} 字
          </span>
        )}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-xl bg-[#f5f5f5] flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#a3a3a3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-[13px] text-[#737373] max-w-[200px]">
              选中文字后输入修改要求，或直接描述你想要的修改
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            {/* 消息内容 */}
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[90%] rounded-xl px-3 py-2 text-[13px] ${
                  msg.role === 'user'
                    ? 'bg-[#171717] text-white'
                    : 'bg-[#f5f5f5] text-[#171717]'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/50' : 'text-[#a3a3a3]'}`}>
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Diff 预览 */}
            {msg.diff && (
              <div className="ml-0">
                <div className="bg-[#fafafa] rounded-xl border border-[#e8e8e8] overflow-hidden">
                  {/* Diff 头部 */}
                  <div className="px-3 py-2 flex items-center justify-between bg-[#f5f5f5] border-b border-[#e8e8e8]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedDiff(expandedDiff === msg.id ? null : msg.id)}
                        className="text-[12px] font-medium text-[#525252] hover:text-[#171717]"
                      >
                        {expandedDiff === msg.id ? '收起差异' : '查看差异'}
                      </button>
                      {expandedDiff === msg.id && (
                        <div className="flex gap-1">
                          {(['char', 'word', 'line'] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setDiffMode(mode)}
                              className={`px-1.5 py-0.5 text-[10px] rounded ${
                                diffMode === mode
                                  ? 'bg-[#171717] text-white'
                                  : 'bg-white text-[#525252] hover:bg-[#e8e8e8]'
                              }`}
                            >
                              {mode === 'char' ? '字' : mode === 'word' ? '词' : '行'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleApply(msg)}
                      className="px-2.5 py-1 text-[11px] font-medium text-white bg-[#171717] rounded-lg hover:bg-[#404040] transition-colors"
                    >
                      应用修改
                    </button>
                  </div>

                  {/* Diff 内容 */}
                  {expandedDiff === msg.id && (
                    <div className="p-3 max-h-48 overflow-y-auto font-mono text-[12px] leading-5">
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
                  )}

                  {/* 统计 */}
                  {expandedDiff === msg.id && (
                    <div className="px-3 py-1.5 border-t border-[#e8e8e8] flex items-center gap-3 text-[10px] text-[#a3a3a3]">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
                        +{diffParts.filter(p => p.type === 'added').reduce((acc, p) => acc + p.value.length, 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#991b1b]" />
                        -{diffParts.filter(p => p.type === 'removed').reduce((acc, p) => acc + p.value.length, 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#f5f5f5] rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[#a3a3a3] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#a3a3a3] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#a3a3a3] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="p-3 border-t border-[#e8e8e8]">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入修改要求..."
            className="flex-1 px-3 py-2 bg-[#f5f5f5] border-none rounded-lg text-[13px] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-1 focus:ring-[#171717] resize-none"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-[#171717] text-white text-[13px] font-medium rounded-lg hover:bg-[#404040] transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-[#a3a3a3] mt-1.5">
          Enter 发送，Shift+Enter 换行
        </p>
      </div>
    </div>
  );
}
