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

export default function ChatAgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chapterId, setChapterId] = useState<number>(75);
  const [contextType, setContextType] = useState<ContextType>('brainstorm');
  const [model, setModel] = useState<'claude' | 'deepseek' | 'gpt'>('claude');
  const [showDiff, setShowDiff] = useState(false);
  const [currentDiff, setCurrentDiff] = useState<Change[]>([]);
  const [originalContent, setOriginalContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contextOptions = [
    { value: 'brainstorm', label: '头脑风暴', icon: '💡' },
    { value: 'write', label: '写作', icon: '✍️' },
    { value: 'edit', label: '编辑', icon: '📝' },
    { value: 'analyze', label: '分析', icon: '🔍' },
  ];

  const modelOptions = [
    { value: 'claude', label: 'Claude' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'gpt', label: 'GPT' },
  ];

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
        alert('章节已保存');
        setShowDiff(false);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('保存失败');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* 左侧：聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 配置栏 */}
        <div className="bg-white border-b p-4">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">模式</label>
              <div className="flex space-x-2">
                {contextOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setContextType(opt.value as ContextType)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      contextType === opt.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">模型</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as any)}
                className="px-3 py-1 border rounded-lg"
              >
                {modelOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {(contextType === 'write' || contextType === 'edit') && (
              <div>
                <label className="block text-sm text-gray-500 mb-1">章节 ID</label>
                <input
                  type="number"
                  value={chapterId}
                  onChange={(e) => setChapterId(parseInt(e.target.value))}
                  className="w-20 px-3 py-1 border rounded-lg"
                />
              </div>
            )}
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-20">
              <div className="text-4xl mb-4">💬</div>
              <h2 className="text-xl font-semibold mb-2">ChatAgent 写作助手</h2>
              <p className="max-w-md mx-auto">
                {contextType === 'brainstorm' && '开始头脑风暴，讨论情节、角色、世界观等问题'}
                {contextType === 'write' && '告诉我你想写什么内容，我来帮你生成章节'}
                {contextType === 'edit' && '粘贴需要修改的内容，告诉我如何改进'}
                {contextType === 'analyze' && '粘贴需要分析的内容，我来帮你分析'}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-4 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white shadow'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.diff && (
                  <button
                    onClick={() => {
                      setOriginalContent(msg.diff!.oldContent);
                      setEditedContent(msg.diff!.newContent);
                      setShowDiff(true);
                    }}
                    className="mt-2 text-sm underline"
                  >
                    查看修改差异
                  </button>
                )}
                <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white shadow rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-gray-500">思考中...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <div className="bg-white border-t p-4">
          <div className="flex space-x-2">
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
              className="flex-1 px-4 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      </div>

      {/* 右侧：Diff 预览 */}
      {showDiff && currentDiff.length > 0 && (
        <div className="w-1/2 border-l bg-gray-50 flex flex-col">
          <div className="bg-white border-b p-4 flex items-center justify-between">
            <h3 className="font-semibold">修改预览</h3>
            <div className="flex space-x-2">
              <button
                onClick={handleSaveChapter}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                保存到章节
              </button>
              <button
                onClick={() => setShowDiff(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                关闭
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
            {currentDiff.map((part, index) => {
              const lines = part.value.split('\n').filter((_, i, arr) =>
                i < arr.length - 1 || arr[arr.length - 1] !== ''
              );

              return lines.map((line, lineIndex) => (
                <div
                  key={`${index}-${lineIndex}`}
                  className={`px-2 py-0.5 ${
                    part.added
                      ? 'bg-green-100 text-green-800'
                      : part.removed
                      ? 'bg-red-100 text-red-800'
                      : ''
                  }`}
                >
                  <span className="select-none text-gray-400 mr-2">
                    {part.added ? '+' : part.removed ? '-' : ' '}
                  </span>
                  {line}
                </div>
              ));
            })}
          </div>
        </div>
      )}
    </div>
  );
}
