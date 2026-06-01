'use client';

import { useState, useEffect, useRef } from 'react';
import { diffLines, Change } from 'diff';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  diff?: {
    oldContent: string;
    newContent: string;
  };
}

type ContextType = 'write' | 'edit' | 'brainstorm' | 'analyze';

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  model: string;
}

export default function ChatAgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chapterId, setChapterId] = useState<number>(75);
  const [contextType, setContextType] = useState<ContextType>('brainstorm');
  const [model, setModel] = useState<string>('');
  const [models, setModels] = useState<ModelOption[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  const [currentDiff, setCurrentDiff] = useState<Change[]>([]);
  const [originalContent, setOriginalContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 章节预览相关状态
  const [chapterContent, setChapterContent] = useState<string>('');
  const [chapterTitle, setChapterTitle] = useState<string>('');
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [showChapterPreview, setShowChapterPreview] = useState(true);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const contextOptions = [
    { value: 'brainstorm', label: '头脑风暴' },
    { value: 'write', label: '写作' },
    { value: 'edit', label: '编辑' },
    { value: 'analyze', label: '分析' },
  ];

  // 加载模型列表
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch('/api/models');
        const data = await response.json();
        const enabledModels = data.filter((m: any) => m.enabled).map((m: any) => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          model: m.settings.model,
        }));
        setModels(enabledModels);

        // 设置默认模型
        const defaultModel = data.find((m: any) => m.isDefault && m.enabled);
        if (defaultModel) {
          setModel(defaultModel.id);
        } else if (enabledModels.length > 0) {
          setModel(enabledModels[0].id);
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };
    loadModels();
  }, []);

  // 加载章节内容
  useEffect(() => {
    const loadChapter = async () => {
      if (!chapterId) return;

      setLoadingChapter(true);
      try {
        const response = await fetch(`/api/chapters/${chapterId}`);
        const data = await response.json();
        setChapterContent(data.content || '');
        setChapterTitle(data.title || '');
      } catch (error) {
        console.error('Failed to load chapter:', error);
        setChapterContent('');
        setChapterTitle('');
      } finally {
        setLoadingChapter(false);
      }
    };

    loadChapter();
  }, [chapterId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 计算 diff
  useEffect(() => {
    if (originalContent && editedContent) {
      const diffResult = diffLines(originalContent, editedContent);
      setCurrentDiff(diffResult);
    }
  }, [originalContent, editedContent]);

  // 处理文本选择
  const handleTextSelect = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectedText('');
      setSelectionPosition(null);
      return;
    }

    const selected = selection.toString().trim();
    if (selected.length > 0) {
      setSelectedText(selected);

      // 获取选中位置
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
    } else {
      setSelectedText('');
      setSelectionPosition(null);
    }
  };

  // 将选中文字添加到输入框
  const handleAddToInput = () => {
    if (selectedText) {
      setInput(prev => {
        const prefix = prev ? prev + '\n\n' : '';
        return `${prefix}关于这段文字：\n"${selectedText}"\n\n请帮我修改：`;
      });
      setSelectedText('');
      setSelectionPosition(null);
      window.getSelection()?.removeAllRanges();
    }
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
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          chapterId,
          model,
          context: contextType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          diff: data.diff,
        };

        setMessages(prev => [...prev, assistantMessage]);

        // 如果有 diff，显示它
        if (data.diff) {
          setOriginalContent(data.diff.oldContent);
          setEditedContent(data.diff.newContent);
          setShowDiff(true);
        }
      } else {
        // 错误处理
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `错误：${data.error || '处理消息时出错'}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '网络错误，请稍后重试',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChapter = async () => {
    if (!editedContent || !chapterId) return;

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapterId,
          content: editedContent,
          source: 'agent',
          description: 'Updated via ChatAgent',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowDiff(false);
      }
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full">
      {/* 左侧：聊天区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 配置栏 */}
        <div className="h-14 px-6 flex items-center gap-4 border-b border-[#e8e8e8] bg-white">
          <div className="flex items-center gap-1.5">
            {contextOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setContextType(opt.value as ContextType)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  contextType === opt.value
                    ? 'bg-[#171717] text-white'
                    : 'text-[#525252] hover:text-[#171717] hover:bg-[#f5f5f5]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-[#e8e8e8]" />

          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="text-[13px] text-[#525252] bg-transparent border-none focus:outline-none cursor-pointer"
          >
            {models.length === 0 && <option value="">请先配置模型</option>}
            {models.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>

          {(contextType === 'write' || contextType === 'edit') && (
            <>
              <div className="w-px h-5 bg-[#e8e8e8]" />
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#a3a3a3]">章节</span>
                <input
                  type="number"
                  value={chapterId}
                  onChange={(e) => setChapterId(parseInt(e.target.value))}
                  className="w-16 px-2 py-1 text-[13px] text-center bg-[#f5f5f5] rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-[#171717]"
                />
              </div>
            </>
          )}
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#f5f5f5] flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-[#a3a3a3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h2 className="text-[20px] font-semibold text-[#171717] mb-2">开始对话</h2>
              <p className="text-[14px] text-[#737373] max-w-sm">
                {contextType === 'brainstorm' && '讨论情节、角色、世界观等问题'}
                {contextType === 'write' && '描述你想要写的内容，AI 帮你生成'}
                {contextType === 'edit' && '粘贴需要修改的内容，AI 帮你改进'}
                {contextType === 'analyze' && '粘贴需要分析的内容，AI 帮你分析'}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-5 py-3.5 ${
                  msg.role === 'user'
                    ? 'bg-[#171717] text-white'
                    : 'bg-white border border-[#e8e8e8]'
                }`}
              >
                <div className="text-[14px] whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                {msg.diff && (
                  <button
                    onClick={() => {
                      setOriginalContent(msg.diff!.oldContent);
                      setEditedContent(msg.diff!.newContent);
                      setShowDiff(true);
                    }}
                    className={`mt-3 text-[12px] underline ${
                      msg.role === 'user' ? 'text-white/70' : 'text-[#737373]'
                    }`}
                  >
                    查看修改差异
                  </button>
                )}
                <div className={`text-[11px] mt-2 ${msg.role === 'user' ? 'text-white/50' : 'text-[#a3a3a3]'}`}>
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#e8e8e8] rounded-2xl px-5 py-3.5">
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
        <div className="p-4 border-t border-[#e8e8e8] bg-white">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                contextType === 'brainstorm'
                  ? '讨论情节、角色、世界观...'
                  : contextType === 'write'
                  ? '描述你想要写的内容...'
                  : contextType === 'edit'
                  ? '粘贴需要修改的内容...'
                  : '粘贴需要分析的内容...'
              }
              className="flex-1 px-4 py-3 bg-[#f5f5f5] border-none rounded-xl text-[14px] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-1 focus:ring-[#171717] resize-none"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-5 py-3 bg-[#171717] text-white text-[14px] font-medium rounded-xl hover:bg-[#404040] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              发送
            </button>
          </div>
        </div>
      </div>

      {/* 右侧：Diff 预览 */}
      {showDiff && currentDiff.length > 0 && (
        <div className="w-[480px] border-l border-[#e8e8e8] bg-white flex flex-col">
          <div className="h-14 px-6 flex items-center justify-between border-b border-[#e8e8e8]">
            <h3 className="text-[14px] font-medium text-[#171717]">修改预览</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveChapter}
                className="px-4 py-1.5 bg-[#171717] text-white text-[13px] font-medium rounded-lg hover:bg-[#404040] transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => setShowDiff(false)}
                className="p-1.5 text-[#525252] hover:text-[#171717] hover:bg-[#f5f5f5] rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="font-mono text-[12px] leading-6">
              {currentDiff.map((part, index) => {
                const lines = part.value.split('\n').filter((_, i, arr) =>
                  i < arr.length - 1 || arr[arr.length - 1] !== ''
                );

                return lines.map((line, lineIndex) => (
                  <div
                    key={`${index}-${lineIndex}`}
                    className={`px-3 py-0.5 ${
                      part.added
                        ? 'bg-[#f0fdf4] text-[#16a34a]'
                        : part.removed
                        ? 'bg-[#fef2f2] text-[#dc2626]'
                        : 'text-[#525252]'
                    }`}
                  >
                    <span className="select-none text-[#d4d4d4] mr-3 inline-block w-4 text-right">
                      {part.added ? '+' : part.removed ? '-' : ' '}
                    </span>
                    {line}
                  </div>
                ));
              })}
            </div>
          </div>
        </div>
      )}

      {/* 右侧：章节预览 */}
      {showChapterPreview && !showDiff && (
        <div className="w-[400px] border-l border-[#e8e8e8] bg-white flex flex-col">
          <div className="h-14 px-6 flex items-center justify-between border-b border-[#e8e8e8]">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-medium text-[#171717]">
                {chapterTitle ? `第${chapterId}章 ${chapterTitle}` : `第${chapterId}章`}
              </h3>
              {loadingChapter && (
                <div className="w-3.5 h-3.5 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" />
              )}
            </div>
            <button
              onClick={() => setShowChapterPreview(false)}
              className="p-1.5 text-[#525252] hover:text-[#171717] hover:bg-[#f5f5f5] rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div
            ref={previewRef}
            className="flex-1 overflow-y-auto p-6 text-[14px] leading-relaxed text-[#171717] select-text"
            onMouseUp={handleTextSelect}
          >
            {chapterContent ? (
              <div className="whitespace-pre-wrap">{chapterContent}</div>
            ) : (
              <div className="flex items-center justify-center h-full text-[#a3a3a3]">
                {loadingChapter ? '加载中...' : '暂无内容'}
              </div>
            )}
          </div>

          {/* 选中文字浮动按钮 */}
          {selectedText && selectionPosition && (
            <button
              onClick={handleAddToInput}
              className="fixed z-40 flex items-center gap-1.5 px-3 py-1.5 bg-[#171717] text-white text-[12px] font-medium rounded-lg shadow-lg hover:bg-[#404040] transition-colors animate-fadeIn"
              style={{
                left: `${selectionPosition.x}px`,
                top: `${selectionPosition.y}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              发送到对话
            </button>
          )}
        </div>
      )}

      {/* 显示章节预览按钮（当面板关闭时） */}
      {!showChapterPreview && !showDiff && (
        <button
          onClick={() => setShowChapterPreview(true)}
          className="fixed right-4 bottom-4 z-30 w-10 h-10 bg-[#171717] text-white rounded-full shadow-lg hover:bg-[#404040] transition-colors flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </button>
      )}
    </div>
  );
}
