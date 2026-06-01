'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Chapter, ChapterVersion } from '@/types';
import { diffLines } from 'diff';
import { AiEditSidebar } from '@/components/chapters/ai-edit-sidebar';

export default function ChapterEditPage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = params.id as string;

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [versions, setVersions] = useState<ChapterVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ChapterVersion | null>(null);
  const [diffResult, setDiffResult] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // AI 编辑相关状态
  const [selectedText, setSelectedText] = useState('');
  const [showAiSidebar, setShowAiSidebar] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadChapter();
    loadVersions();
  }, [chapterId]);

  // 监听内容变化
  useEffect(() => {
    setHasChanges(content !== originalContent);

    // 更新字数统计
    const text = content.replace(/[#*\-\[\]()]/g, '').trim();
    setCharCount(text.length);
    setWordCount(text.split(/\s+/).filter(w => w.length > 0).length);

    // 自动保存
    if (autoSaveEnabled && content !== originalContent && content.length > 0) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        handleSave(true);
      }, 30000); // 30秒后自动保存
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [content, originalContent, autoSaveEnabled]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        // 撤销由浏览器处理
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, originalContent]);

  // 处理文本选择
  useEffect(() => {
    const handleSelectionChange = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // 只在 textarea 获得焦点时处理
      if (document.activeElement !== textarea) {
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.substring(start, end);

      if (selected.length > 0) {
        setSelectedText(selected);
      } else {
        setSelectedText('');
      }
    };

    // 监听 selectionchange 事件
    document.addEventListener('selectionchange', handleSelectionChange);

    // 也监听 mouseup 作为备用
    const handleMouseUp = () => {
      setTimeout(handleSelectionChange, 10);
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (textarea) {
        textarea.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [content]);

  // 应用 AI 编辑结果
  const handleApplyAiEdit = (original: string, modified: string) => {
    // 在内容中查找原文并替换
    const index = content.indexOf(original);
    if (index !== -1) {
      const newContent = content.substring(0, index) + modified + content.substring(index + original.length);
      setContent(newContent);
    }
  };

  const loadChapter = async () => {
    try {
      const response = await fetch(`/api/chapters/${chapterId}`);
      const data = await response.json();
      setChapter(data);
      setContent(data.content);
      setOriginalContent(data.content);
    } catch (error) {
      console.error('Failed to load chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    try {
      const response = await fetch(`/api/chapters/${chapterId}/history`);
      const data = await response.json();
      setVersions(data);
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  };

  const handleSave = async (isAutoSave = false) => {
    if (!isAutoSave) {
      setSaving(true);
    }

    try {
      const response = await fetch(`/api/chapters/${chapterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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

        if (!isAutoSave) {
          // 显示保存成功提示
        }
      }
    } catch (error) {
      console.error('Failed to save chapter:', error);
      if (!isAutoSave) {
        alert('保存失败');
      }
    } finally {
      if (!isAutoSave) {
        setSaving(false);
      }
    }
  };

  const handleCompare = async (version: ChapterVersion) => {
    setSelectedVersion(version);
    setShowDiff(true);

    // 使用 diff 库计算差异
    const currentContent = content;
    const versionContent = version.content;

    const diff = diffLines(versionContent, currentContent);
    const result: any[] = [];
    let oldLineNum = 1;
    let newLineNum = 1;

    for (const part of diff) {
      const lines = part.value.split('\n').filter((_, i, arr) =>
        i < arr.length - 1 || arr[arr.length - 1] !== ''
      );

      for (const line of lines) {
        if (part.added) {
          result.push({ type: 'added', newLineNum: newLineNum++, content: line });
        } else if (part.removed) {
          result.push({ type: 'removed', oldLineNum: oldLineNum++, content: line });
        } else {
          result.push({ type: 'unchanged', oldLineNum: oldLineNum++, newLineNum: newLineNum++, content: line });
        }
      }
    }

    setDiffResult(result);
  };

  const handleRollback = async (version: ChapterVersion) => {
    if (!confirm(`确定要回滚到版本 ${version.id} 吗？当前未保存的修改将丢失。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/chapters/${chapterId}/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          versionId: version.id,
        }),
      });

      if (response.ok) {
        await loadChapter();
        await loadVersions();
        setShowVersions(false);
        setShowDiff(false);
      }
    } catch (error) {
      console.error('Failed to rollback:', error);
      alert('回滚失败');
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(content);
  };

  const handleFormatContent = () => {
    // 简单的格式化：去除多余空行
    const formatted = content
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+|\s+$/g, '');
    setContent(formatted);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-xl font-semibold mb-2">章节不存在</h2>
          <p className="text-gray-500 mb-4">找不到 ID 为 {chapterId} 的章节</p>
          <button
            onClick={() => router.push('/chapters')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            返回章节列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部工具栏 */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/chapters')}
              className="text-gray-500 hover:text-gray-700"
            >
              ← 返回
            </button>
            <div>
              <h1 className="text-lg font-semibold">
                第{chapter.id}章 {chapter.title}
              </h1>
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
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="rounded"
              />
              <span>自动保存</span>
            </label>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                showPreview ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              } hover:bg-gray-200`}
            >
              {showPreview ? '编辑' : '预览'}
            </button>

            <button
              onClick={() => setShowVersions(!showVersions)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                showVersions ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              } hover:bg-gray-200`}
            >
              版本历史 ({versions.length})
            </button>

            <button
              onClick={handleCopyContent}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
            >
              复制
            </button>

            <button
              onClick={handleFormatContent}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
            >
              格式化
            </button>

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

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 编辑器 */}
        <div className="flex-1 flex flex-col">
          {showPreview ? (
            <div className="flex-1 overflow-y-auto p-8 bg-white">
              <div className="max-w-3xl mx-auto prose prose-lg">
                {content.split('\n').map((line, index) => {
                  if (line.startsWith('# ')) {
                    return <h1 key={index}>{line.substring(2)}</h1>;
                  } else if (line.startsWith('## ')) {
                    return <h2 key={index}>{line.substring(3)}</h2>;
                  } else if (line.startsWith('### ')) {
                    return <h3 key={index}>{line.substring(4)}</h3>;
                  } else if (line.trim() === '') {
                    return <br key={index} />;
                  } else {
                    return <p key={index}>{line}</p>;
                  }
                })}
              </div>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 p-8 font-mono text-base leading-relaxed resize-none focus:outline-none bg-white"
              placeholder="开始写作..."
              spellCheck={false}
            />
          )}

          {/* 底部状态栏 */}
          <div className="bg-gray-50 border-t px-6 py-2 flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>字符数: {charCount.toLocaleString()}</span>
              <span>|</span>
              <span>行数: {content.split('\n').length}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>版本: {versions.length}</span>
              {hasChanges && (
                <span className="text-orange-500">● 未保存的修改</span>
              )}
            </div>
          </div>
        </div>

        {/* 版本历史面板 */}
        {showVersions && (
          <div className="w-80 border-l bg-gray-50 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">版本历史</h3>
                <button
                  onClick={() => setShowVersions(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-gray-400">
                        v{versions.length - index}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(version.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {version.source === 'manual' ? '手动保存' :
                       version.source === 'agent' ? `Agent: ${version.agentName}` :
                       version.source === 'rollback' ? '版本回滚' : version.source}
                    </div>
                    {version.description && (
                      <div className="text-xs text-gray-400 mb-2">{version.description}</div>
                    )}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCompare(version)}
                        className="flex-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                      >
                        对比
                      </button>
                      {index > 0 && (
                        <button
                          onClick={() => handleRollback(version)}
                          className="flex-1 text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                        >
                          回滚
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Diff 面板 */}
      {showDiff && selectedVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-4/5 h-4/5 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                版本对比：v{versions.findIndex(v => v.id === selectedVersion.id) + 1} → 当前版本
              </h3>
              <button
                onClick={() => setShowDiff(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
              {diffResult.map((diff, index) => (
                <div
                  key={index}
                  className={`px-4 py-1 ${
                    diff.type === 'added'
                      ? 'bg-green-50 text-green-800 border-l-4 border-green-400'
                      : diff.type === 'removed'
                      ? 'bg-red-50 text-red-800 border-l-4 border-red-400'
                      : 'bg-white'
                  }`}
                >
                  <span className="inline-block w-16 text-gray-400 select-none">
                    {diff.type === 'added'
                      ? `+${diff.newLineNum}`
                      : diff.type === 'removed'
                      ? `-${diff.oldLineNum}`
                      : ` ${diff.oldLineNum}`}
                  </span>
                  <span className="ml-2">{diff.content}</span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end space-x-2">
              <button
                onClick={() => {
                  handleRollback(selectedVersion);
                  setShowDiff(false);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                回滚到此版本
              </button>
              <button
                onClick={() => setShowDiff(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 编辑侧边栏 */}
      {showAiSidebar && (
        <AiEditSidebar
          selectedText={selectedText}
          fullContent={content}
          onApply={handleApplyAiEdit}
          chapterId={chapterId}
        />
      )}
    </div>
  );
}
