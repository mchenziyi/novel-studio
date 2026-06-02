'use client';

import { useState, useEffect, useRef } from 'react';
import { diffLines, Change } from 'diff';
import { useNovel } from '@/lib/novel-context';
import { renderMarkdown } from '@/lib/render-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  diff?: {
    oldContent: string;
    newContent: string;
  };
  isStreaming?: boolean;
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    args: any;
    result?: any;
  }>;
}

interface Session {
  id: string;
  title: string;
  chapter_id?: string;
  context: string;
  model?: string;
  created_at: string;
  updated_at: string;
}

type ContextType = 'write' | 'edit' | 'brainstorm' | 'analyze';

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  model: string;
}

export default function ChatAgentPage() {
  const { currentNovelId } = useNovel();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chapterId, setChapterId] = useState<number | undefined>(undefined);
  const [chaptersList, setChaptersList] = useState<Array<{id: string, title: string}>>([]);
  const [contextType, setContextType] = useState<ContextType>('brainstorm');
  const [model, setModel] = useState<string>('');
  const [models, setModels] = useState<ModelOption[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  const [currentDiff, setCurrentDiff] = useState<Change[]>([]);
  const [originalContent, setOriginalContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 会话相关状态
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(true);
  const [selectedSessions, setSelectedSessions] = useState<Record<string, boolean>>({});

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

  // 加载会话列表
  useEffect(() => {
    loadSessions();
  }, [currentNovelId]);

  // 加载章节列表
  useEffect(() => {
    const loadChaptersList = async () => {
      try {
        const response = await fetch(`/api/chapters?novelId=${currentNovelId}`);
        const data = await response.json();
        // 倒序排列，最新章节在最上面
        setChaptersList(data.reverse().map((ch: any) => ({ id: ch.id, title: ch.title })));
      } catch (error) {
        console.error('Failed to load chapters:', error);
      }
    };
    loadChaptersList();
  }, [currentNovelId]);

  // 加载章节内容
  useEffect(() => {
    const loadChapter = async () => {
      if (!chapterId) {
        setChapterContent('');
        setChapterTitle('');
        return;
      }

      setLoadingChapter(true);
      try {
        const paddedId = String(chapterId).padStart(4, '0');
        const response = await fetch(`/api/chapters/${paddedId}`);
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

  // 加载会话列表
  const loadSessions = async () => {
    try {
      const response = await fetch(`/api/agent/chat?novelId=${currentNovelId}`);
      const data = await response.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  // 加载会话消息
  const loadSessionMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/agent/chat?sessionId=${sessionId}`);
      const data = await response.json();
      if (data.messages) {
        const formattedMessages: Message[] = data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
        }));
        setMessages(formattedMessages);
      }
      if (data.session) {
        setContextType(data.session.context as ContextType);
        if (data.session.chapter_id) {
          setChapterId(parseInt(data.session.chapter_id));
        }
      }
    } catch (error) {
      console.error('Failed to load session messages:', error);
    }
  };

  // 创建新会话
  const handleNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  // 切换会话
  const handleSwitchSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    loadSessionMessages(sessionId);
  };

  // 删除会话（软删除）
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个会话吗？')) return;

    try {
      const response = await fetch(`/api/agent/chat?sessionId=${sessionId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  // 批量删除会话
  const handleBatchDelete = async () => {
    const selectedIds = Object.keys(selectedSessions).filter(id => selectedSessions[id]);
    if (selectedIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个会话吗？`)) return;

    try {
      const response = await fetch(`/api/agent/chat?batchIds=${selectedIds.join(',')}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setSessions(prev => prev.filter(s => !selectedIds.includes(s.id)));
        setSelectedSessions({});
        if (currentSessionId && selectedIds.includes(currentSessionId)) {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to batch delete sessions:', error);
    }
  };

  // 切换选中状态
  const toggleSessionSelect = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    const allSelected = sessions.every(s => selectedSessions[s.id]);
    if (allSelected) {
      setSelectedSessions({});
    } else {
      const newSelected: Record<string, boolean> = {};
      sessions.forEach(s => { newSelected[s.id] = true; });
      setSelectedSessions(newSelected);
    }
  };

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

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      toolCalls: [],
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          sessionId: currentSessionId,
          novelId: currentNovelId,
          chapterId,
          model,
          context: contextType,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let buffer = '';
      let finalData: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'chunk') {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + data.text }
                  : m
              ));
            } else if (data.type === 'done') {
              finalData = data;
            } else if (data.type === 'error') {
              console.error('Stream error:', data.error);
            }
          } catch {}
        }
      }

      if (finalData) {
        if (finalData.sessionId && !currentSessionId) {
          setCurrentSessionId(finalData.sessionId);
          loadSessions();
        }
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: finalData.message || m.content, isStreaming: false, toolCalls: finalData.toolCalls || [] }
            : m
        ));
      } else {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId ? { ...m, isStreaming: false } : m
        ));
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? { ...m, content: '网络错误，请稍后重试', isStreaming: false }
          : m
      ));
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

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-full">
      {/* 最左侧：会话列表 */}
      {showSessions && (
        <div className="w-[240px] border-r border-[#e8e8e8] bg-[#fafafa] flex flex-col">
          <div className="px-4 py-3 border-b border-[#e8e8e8]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-medium text-[#171717]">历史会话</h3>
              <button
                onClick={handleNewSession}
                className="p-1.5 text-[#525252] hover:text-[#171717] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                title="新建会话"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            {sessions.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="text-[11px] text-[#525252] hover:text-[#171717] transition-colors"
                >
                  {sessions.every(s => selectedSessions[s.id]) ? '取消全选' : '全选'}
                </button>
                {Object.values(selectedSessions).some(v => v) && (
                  <button
                    onClick={handleBatchDelete}
                    className="text-[11px] text-[#dc2626] hover:text-[#b91c1c] transition-colors"
                  >
                    删除选中 ({Object.values(selectedSessions).filter(v => v).length})
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-[#a3a3a3]">
                暂无历史会话
              </div>
            ) : (
              sessions.map(session => (
                <div
                  key={session.id}
                  onClick={() => handleSwitchSession(session.id)}
                  className={`px-3 py-3 cursor-pointer border-b border-[#f0f0f0] hover:bg-white transition-colors group ${
                    currentSessionId === session.id ? 'bg-white border-l-2 border-l-[#171717]' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSessions[session.id] || false}
                      onClick={(e) => toggleSessionSelect(session.id, e)}
                      className="mt-1 w-3.5 h-3.5 rounded border-gray-300 text-[#171717] focus:ring-[#171717] cursor-pointer"
                      readOnly
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-[#171717] truncate font-medium">
                        {session.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-[#a3a3a3]">
                          {formatTime(session.updated_at)}
                        </span>
                        {session.chapter_id && (
                          <span className="text-[11px] text-[#a3a3a3]">
                            · 第{session.chapter_id}章
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-1 text-[#a3a3a3] hover:text-[#dc2626] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 中间：聊天区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 配置栏 */}
        <div className="h-14 px-6 flex items-center gap-4 border-b border-[#e8e8e8] bg-white">
          <button
            onClick={() => setShowSessions(!showSessions)}
            className="p-1.5 text-[#525252] hover:text-[#171717] hover:bg-[#f5f5f5] rounded-lg transition-colors"
            title={showSessions ? '隐藏会话列表' : '显示会话列表'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>

          <div className="w-px h-5 bg-[#e8e8e8]" />

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
                <select
                  value={chapterId || ''}
                  onChange={(e) => setChapterId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-32 px-2 py-1 text-[13px] bg-[#f5f5f5] rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-[#171717] cursor-pointer truncate"
                >
                  <option value="">选择章节</option>
                  {chaptersList.map(ch => (
                    <option key={ch.id} value={parseInt(ch.id)}>
                      {ch.id} {ch.title}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {currentSessionId && (
            <>
              <div className="w-px h-5 bg-[#e8e8e8]" />
              <span className="text-[11px] text-[#a3a3a3]">
                会话已保存
              </span>
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
                {/* 工具调用展示 */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {msg.toolCalls.map((tc, idx) => (
                      <div 
                        key={tc.toolCallId || idx}
                        className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f5] rounded-lg text-[12px]"
                      >
                        <svg className="w-3.5 h-3.5 text-[#525252] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-[#525252] font-medium">{tc.toolName}</span>
                        {tc.result ? (
                          <svg className="w-3.5 h-3.5 text-green-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <div className="w-3.5 h-3.5 border-2 border-[#a3a3a3] border-t-transparent rounded-full animate-spin ml-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className={`text-[14px] leading-relaxed ${msg.role === 'user' ? 'chat-markdown-light' : 'chat-markdown'}`}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
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
              className="flex-1 px-4 py-3 bg-[#f5f5f5] rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-[#171717] text-[14px] placeholder:text-[#a3a3a3] resize-none"
              rows={3}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-[#171717] text-white rounded-xl hover:bg-[#404040] transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-[#a3a3a3] mt-2">
            Enter 发送，Shift+Enter 换行
            {currentSessionId && ' · 对话会自动保存'}
          </p>
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
                {chapterId 
                  ? (chapterTitle ? `第${chapterId}章 ${chapterTitle}` : `第${chapterId}章`)
                  : '未关联章节'
                }
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
