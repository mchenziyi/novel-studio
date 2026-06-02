'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Chapter, ChapterVersion } from '@/types';
import { useNovel } from '@/lib/novel-context';

interface ChapterEditorProps {
  chapter: Chapter;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    args: any;
    result?: any;
  }>;
}

export default function ChapterEditor({ chapter: initialChapter }: ChapterEditorProps) {
  const router = useRouter();
  const { currentNovelId } = useNovel();
  const chapterId = initialChapter.id;

  // 章节状态
  const [chapter, setChapter] = useState<Chapter>(initialChapter);
  const [content, setContent] = useState(initialChapter.content);
  const [originalContent, setOriginalContent] = useState(initialChapter.content);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [charCount, setCharCount] = useState(0);

  // 版本对比状态
  const [versions, setVersions] = useState<ChapterVersion[]>([]);
  const [previousContent, setPreviousContent] = useState<string>('');
  // diff 数据结构 - 每一行对应左右两个面板
  interface DiffRow {
    // 左面板（旧版本）
    leftLineNum: number | null;
    leftContent: string;
    leftType: 'normal' | 'removed' | 'empty';
    leftChanges?: Array<{ start: number; end: number }>;
    // 右面板（新版本）
    rightLineNum: number | null;
    rightContent: string;
    rightType: 'normal' | 'added' | 'empty';
    rightChanges?: Array<{ start: number; end: number }>;
    // 行类型
    rowType: 'unchanged' | 'added' | 'removed' | 'modified';
  }

  const [diffRows, setDiffRows] = useState<DiffRow[]>([]);

  // AI 对话状态
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [contextType, setContextType] = useState<'edit' | 'brainstorm' | 'analyze'>('edit');
  const [model, setModel] = useState<string>('');
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const isScrollSyncing = useRef(false);

  // 面板宽度状态（百分比）
  const [leftWidth, setLeftWidth] = useState(33);
  const [middleWidth, setMiddleWidth] = useState(34);
  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 加载版本历史
  useEffect(() => {
    loadVersions();
  }, [chapterId]);

  // 加载模型列表
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch('/api/models');
        const data = await response.json();
        const enabledModels = data.filter((m: any) => m.enabled).map((m: any) => ({
          id: m.id,
          name: m.name,
        }));
        setModels(enabledModels);
        if (enabledModels.length > 0 && !model) {
          const defaultModel = data.find((m: any) => m.isDefault && m.enabled);
          setModel(defaultModel?.id || enabledModels[0].id);
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };
    loadModels();
  }, []);

  // 加载章节绑定的会话
  useEffect(() => {
    const loadChapterSession = async () => {
      try {
        const response = await fetch(`/api/agent/chat?novelId=${currentNovelId}&chapterId=${chapterId}`);
        const data = await response.json();
        if (data.sessions && data.sessions.length > 0) {
          const session = data.sessions[0];
          setSessionId(session.id);
          // 加载会话消息
          const msgResponse = await fetch(`/api/agent/chat?sessionId=${session.id}`);
          const msgData = await msgResponse.json();
          if (msgData.messages) {
            setMessages(msgData.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.created_at),
              toolCalls: m.metadata ? JSON.parse(m.metadata || '{}').toolCalls : undefined,
            })));
          }
        }
      } catch (error) {
        console.error('Failed to load chapter session:', error);
      }
    };
    loadChapterSession();
  }, [chapterId, currentNovelId]);

  // 监听内容变化
  useEffect(() => {
    setHasChanges(content !== originalContent);
    const text = content.replace(/[#*\-\[\]()]/g, '').trim();
    setCharCount(text.length);

    // 自动保存
    if (content !== originalContent && content.length > 0) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => handleSave(true), 30000);
    }

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [content, originalContent]);

  // 计算 diff
  useEffect(() => {
    if (previousContent && content) {
      calculateDiff(previousContent, content);
    }
  }, [previousContent, content]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, originalContent]);

  // 处理文本选择（支持从 diff 视图选中）
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectedText('');
        setSelectionPosition(null);
        return;
      }

      const selected = selection.toString().trim();
      if (selected.length > 0) {
        // 检查选中是否在右侧面板内
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const rightPanel = rightPanelRef.current;
        
        if (rightPanel && rightPanel.contains(container)) {
          setSelectedText(selected);
          // 获取选中位置
          const rect = range.getBoundingClientRect();
          setSelectionPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
          });
        } else {
          setSelectedText('');
          setSelectionPosition(null);
        }
      } else {
        setSelectedText('');
        setSelectionPosition(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // 同步滚动处理（垂直 + 水平）
  const handleLeftScroll = () => {
    if (isScrollSyncing.current) return;
    isScrollSyncing.current = true;
    const leftPanel = leftPanelRef.current;
    const rightPanel = rightPanelRef.current;
    if (leftPanel && rightPanel) {
      rightPanel.scrollTop = leftPanel.scrollTop;
      rightPanel.scrollLeft = leftPanel.scrollLeft;
    }
    requestAnimationFrame(() => {
      isScrollSyncing.current = false;
    });
  };

  const handleRightScroll = () => {
    if (isScrollSyncing.current) return;
    isScrollSyncing.current = true;
    const leftPanel = leftPanelRef.current;
    const rightPanel = rightPanelRef.current;
    if (leftPanel && rightPanel) {
      leftPanel.scrollTop = rightPanel.scrollTop;
      leftPanel.scrollLeft = rightPanel.scrollLeft;
    }
    requestAnimationFrame(() => {
      isScrollSyncing.current = false;
    });
  };

  // 拖拽调整面板宽度
  const handleMouseDown = (side: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(side);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const containerWidth = rect.width;
      const percent = (x / containerWidth) * 100;

      if (isDragging === 'left') {
        // 拖拽左分隔条：调整左栏和中栏宽度
        const newLeft = Math.max(15, Math.min(50, percent));
        setLeftWidth(newLeft);
      } else if (isDragging === 'right') {
        // 拖拽右分隔条：调整中栏和右栏宽度
        const newMiddle = Math.max(15, Math.min(60, percent - leftWidth));
        setMiddleWidth(newMiddle);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, leftWidth]);

  const loadVersions = async () => {
    try {
      const response = await fetch(`/api/chapters/${chapterId}/history`);
      const data = await response.json();
      setVersions(data);
      // 设置上一版本内容
      if (data.length > 1) {
        setPreviousContent(data[1].content);
      } else if (data.length === 1) {
        setPreviousContent(data[0].content);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  };

  const calculateDiff = (oldText: string, newText: string) => {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const m = oldLines.length;
    const n = newLines.length;

    // LCS 算法
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // 回溯生成 diff
    let i = m, j = n;
    const rawDiff: Array<{ type: 'unchanged' | 'added' | 'removed'; oldIdx: number; newIdx: number }> = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        rawDiff.unshift({ type: 'unchanged', oldIdx: i - 1, newIdx: j - 1 });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        rawDiff.unshift({ type: 'added', oldIdx: -1, newIdx: j - 1 });
        j--;
      } else if (i > 0) {
        rawDiff.unshift({ type: 'removed', oldIdx: i - 1, newIdx: -1 });
        i--;
      }
    }

    // 合并相邻的删除+新增为修改
    const mergedDiff: Array<{ type: 'unchanged' | 'added' | 'removed' | 'modified'; oldIdx: number; newIdx: number }> = [];
    let k = 0;
    while (k < rawDiff.length) {
      if (k + 1 < rawDiff.length && rawDiff[k].type === 'removed' && rawDiff[k + 1].type === 'added') {
        mergedDiff.push({ type: 'modified', oldIdx: rawDiff[k].oldIdx, newIdx: rawDiff[k + 1].newIdx });
        k += 2;
      } else {
        mergedDiff.push(rawDiff[k]);
        k++;
      }
    }

    // 生成对齐的双面板行
    const rows: DiffRow[] = [];
    for (const item of mergedDiff) {
      switch (item.type) {
        case 'unchanged':
          rows.push({
            leftLineNum: item.oldIdx + 1,
            leftContent: oldLines[item.oldIdx],
            leftType: 'normal',
            rightLineNum: item.newIdx + 1,
            rightContent: newLines[item.newIdx],
            rightType: 'normal',
            rowType: 'unchanged',
          });
          break;
        case 'added':
          rows.push({
            leftLineNum: null,
            leftContent: '',
            leftType: 'empty',
            rightLineNum: item.newIdx + 1,
            rightContent: newLines[item.newIdx],
            rightType: 'added',
            rowType: 'added',
          });
          break;
        case 'removed':
          rows.push({
            leftLineNum: item.oldIdx + 1,
            leftContent: oldLines[item.oldIdx],
            leftType: 'removed',
            rightLineNum: null,
            rightContent: '',
            rightType: 'empty',
            rowType: 'removed',
          });
          break;
        case 'modified':
          const oldLine = oldLines[item.oldIdx];
          const newLine = newLines[item.newIdx];
          const changes = findCharChanges(oldLine, newLine);
          rows.push({
            leftLineNum: item.oldIdx + 1,
            leftContent: oldLine,
            leftType: 'removed',
            leftChanges: changes.filter(c => c.type === 'removed'),
            rightLineNum: item.newIdx + 1,
            rightContent: newLine,
            rightType: 'added',
            rightChanges: changes.filter(c => c.type === 'added'),
            rowType: 'modified',
          });
          break;
      }
    }

    setDiffRows(rows);
  };

  // 查找字符级变化
  const findCharChanges = (oldStr: string, newStr: string): Array<{ start: number; end: number; type: 'added' | 'removed' }> => {
    const changes: Array<{ start: number; end: number; type: 'added' | 'removed' }> = [];
    
    let prefixLen = 0;
    while (prefixLen < oldStr.length && prefixLen < newStr.length && oldStr[prefixLen] === newStr[prefixLen]) {
      prefixLen++;
    }
    
    let suffixLen = 0;
    while (
      suffixLen < oldStr.length - prefixLen &&
      suffixLen < newStr.length - prefixLen &&
      oldStr[oldStr.length - 1 - suffixLen] === newStr[newStr.length - 1 - suffixLen]
    ) {
      suffixLen++;
    }

    if (prefixLen < oldStr.length - suffixLen) {
      changes.push({ start: prefixLen, end: oldStr.length - suffixLen, type: 'removed' });
    }
    if (prefixLen < newStr.length - suffixLen) {
      changes.push({ start: prefixLen, end: newStr.length - suffixLen, type: 'added' });
    }

    return changes;
  };

  // 渲染行内差异高亮
  const renderInlineDiff = (
    text: string,
    changes: Array<{ start: number; end: number }>,
    highlightClass: string
  ) => {
    if (!changes || changes.length === 0) return <span>{text}</span>;

    const parts: React.JSX.Element[] = [];
    let lastIndex = 0;

    for (const change of changes) {
      if (change.start > lastIndex) {
        parts.push(<span key={`t-${lastIndex}`}>{text.substring(lastIndex, change.start)}</span>);
      }
      parts.push(
        <span key={`c-${change.start}`} className={highlightClass}>
          {text.substring(change.start, change.end)}
        </span>
      );
      lastIndex = change.end;
    }
    if (lastIndex < text.length) {
      parts.push(<span key={`t-${lastIndex}`}>{text.substring(lastIndex)}</span>);
    }

    return <>{parts}</>;
  };

  const handleSave = async (isAutoSave = false) => {
    if (!isAutoSave) setSaving(true);
    try {
      const response = await fetch(`/api/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          source: 'manual',
          description: isAutoSave ? 'Auto save' : 'Manual save',
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setChapter(data);
        setOriginalContent(content);
        setHasChanges(false);
        setLastSaved(new Date());
        await loadVersions();
      }
    } catch (error) {
      console.error('Failed to save chapter:', error);
      if (!isAutoSave) alert('保存失败');
    } finally {
      if (!isAutoSave) setSaving(false);
    }
  };

  const handleAiSend = async () => {
    if (!aiInput.trim() || aiLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: aiInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setAiLoading(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          sessionId,
          novelId: currentNovelId,
          chapterId: parseInt(chapterId),
          model,
          context: contextType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 更新 sessionId（首次对话时创建）
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          toolCalls: data.toolCalls || [],
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('AI error:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAiSend();
    }
  };

  const handleSendSelectedText = () => {
    if (selectedText) {
      setAiInput(`请帮我修改这段文字：\n"${selectedText}"\n\n修改要求：`);
      setSelectedText('');
    }
  };

  const handleApplyAiSuggestion = (newContent: string) => {
    setContent(newContent);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 工具栏 */}
      <div className="bg-white border-b px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.push('/chapters')} className="text-gray-500 hover:text-gray-700">
              ← 返回
            </button>
            <div>
              <h1 className="text-lg font-semibold">第{chapter.id}章 {chapter.title}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{charCount} 字</span>
                <span>|</span>
                <span>{hasChanges ? '已修改' : '未修改'}</span>
                {lastSaved && (
                  <>
                    <span>|</span>
                    <span>上次保存: {lastSaved.toLocaleTimeString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSave()}
              disabled={saving || !hasChanges}
              className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : '保存 (⌘S)'}
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区：三栏布局 */}
      <div ref={containerRef} style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左栏：上一版本 */}
        <div style={{ width: `${leftWidth}%`, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-500 flex-shrink-0">
            上一版本
            {versions.length > 1 && (
              <span className="ml-2 text-xs text-gray-400">
                v{versions.length - 1}
              </span>
            )}
          </div>
          <div 
            ref={leftPanelRef}
            onScroll={handleLeftScroll}
            className="flex-1 overflow-y-scroll overflow-x-auto bg-white font-mono text-[13px] leading-[24px] p-0"
          >
            {previousContent ? (
              <div style={{ minWidth: 'max-content' }}>
                {diffRows.map((row, i) => (
                  <div
                    key={i}
                    className={`flex h-[24px] ${
                      row.rowType === 'removed' || row.rowType === 'modified'
                        ? 'bg-[#ffebe9]'
                        : row.leftType === 'empty'
                        ? 'bg-[#f6f8fa]'
                        : ''
                    }`}
                  >
                    {/* 行号 */}
                    <div className="w-10 text-right pr-2 text-[#a3a3a3] select-none flex-shrink-0 border-r border-[#e5e5e5] leading-[24px]">
                      {row.leftLineNum || ''}
                    </div>
                    {/* 符号 */}
                    <div className="w-5 text-center flex-shrink-0 leading-[24px]">
                      {(row.rowType === 'removed' || row.rowType === 'modified') && (
                        <span className="text-[#cf222e]">−</span>
                      )}
                    </div>
                    {/* 内容 */}
                    <div className="flex-1 px-2 overflow-hidden leading-[24px] whitespace-nowrap">
                      {row.leftType === 'empty' ? (
                        <span>&nbsp;</span>
                      ) : row.rowType === 'modified' && row.leftChanges ? (
                        renderInlineDiff(row.leftContent, row.leftChanges, 'bg-[#ff818266]')
                      ) : (
                        <span>{row.leftContent}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-center mt-8">暂无历史版本</div>
            )}
          </div>
        </div>

        {/* 左分隔条 */}
        <div
          onMouseDown={handleMouseDown('left')}
          className={`w-1 flex-shrink-0 cursor-col-resize hover:bg-blue-400 transition-colors ${
            isDragging === 'left' ? 'bg-blue-500' : 'bg-[#e5e5e5]'
          }`}
        />

        {/* 中栏：当前版本 */}
        <div style={{ width: `${middleWidth}%`, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="px-4 py-2 bg-blue-50 border-b text-sm text-blue-600 flex-shrink-0 flex items-center justify-between">
            <div>
              当前版本
              <span className="ml-2 text-xs text-blue-400">v{versions.length}</span>
            </div>
            <button
              onClick={() => textareaRef.current?.focus()}
              className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
            >
              点击编辑
            </button>
          </div>
          <div 
            ref={rightPanelRef}
            onScroll={handleRightScroll}
            className="flex-1 overflow-y-scroll overflow-x-auto bg-white font-mono text-[13px] leading-[24px] p-0"
          >
            {diffRows.length > 0 ? (
              <div style={{ minWidth: 'max-content' }}>
                {diffRows.map((row, i) => (
                  <div
                    key={i}
                    className={`flex h-[24px] ${
                      row.rowType === 'added' || row.rowType === 'modified'
                        ? 'bg-[#dafbe1]'
                        : row.rightType === 'empty'
                        ? 'bg-[#f6f8fa]'
                        : ''
                    }`}
                  >
                    {/* 行号 */}
                    <div className="w-10 text-right pr-2 text-[#a3a3a3] select-none flex-shrink-0 border-r border-[#e5e5e5] leading-[24px]">
                      {row.rightLineNum || ''}
                    </div>
                    {/* 符号 */}
                    <div className="w-5 text-center flex-shrink-0 leading-[24px]">
                      {(row.rowType === 'added' || row.rowType === 'modified') && (
                        <span className="text-[#1a7f37]">+</span>
                      )}
                    </div>
                    {/* 内容 */}
                    <div className="flex-1 px-2 overflow-hidden leading-[24px] whitespace-nowrap">
                      {row.rightType === 'empty' ? (
                        <span>&nbsp;</span>
                      ) : row.rowType === 'modified' && row.rightChanges ? (
                        renderInlineDiff(row.rightContent, row.rightChanges, 'bg-[#56d36466]')
                      ) : (
                        <span>{row.rightContent}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4">{content}</div>
            )}
          </div>
          {/* 隐藏的 textarea 用于编辑 */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onScroll={handleRightScroll}
            className="sr-only"
            tabIndex={-1}
          />
          {/* 选中文字浮动按钮 */}
          {selectedText && selectionPosition && (
            <button
              onClick={handleSendSelectedText}
              className="fixed z-50 px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg shadow-lg hover:bg-blue-600"
              style={{
                left: `${selectionPosition.x}px`,
                top: `${selectionPosition.y}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              发送到 AI →
            </button>
          )}
        </div>

        {/* 右分隔条 */}
        <div
          onMouseDown={handleMouseDown('right')}
          className={`w-1 flex-shrink-0 cursor-col-resize hover:bg-blue-400 transition-colors ${
            isDragging === 'right' ? 'bg-blue-500' : 'bg-[#e5e5e5]'
          }`}
        />

        {/* 右栏：AI 对话 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="px-3 py-2 bg-green-50 border-b flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-green-600 font-medium">
                AI 助手
              </div>
            </div>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-2 py-1 text-[11px] bg-white border border-green-200 rounded focus:outline-none focus:ring-1 focus:ring-green-400"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-8">
                <p>选中文字后点击"发送到 AI"</p>
                <p className="mt-1">或直接输入问题</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                  {/* 工具调用展示 */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {msg.toolCalls.map((tc, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-xs opacity-75">
                          <span>🔧</span>
                          <span>{tc.toolName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <div className="p-3 border-t border-[#e8e8e8] bg-white flex-shrink-0">
            <div className="flex gap-2">
              <textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={handleAiKeyDown}
                placeholder="输入问题或修改要求..."
                className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm resize-none"
                rows={2}
              />
              <button
                onClick={handleAiSend}
                disabled={aiLoading || !aiInput.trim()}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 self-end"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Enter 发送，Shift+Enter 换行</p>
          </div>
        </div>
      </div>
    </div>
  );
}
