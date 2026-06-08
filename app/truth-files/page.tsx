'use client';

import { useState, useEffect } from 'react';
import { useNovel } from '@/lib/novel-context';
import { cn } from '@/lib/utils';

interface TruthFileMeta {
  name: string;
  label: string;
  description: string;
  icon: string;
  size: number;
}

export default function TruthFilesPage() {
  const { currentNovelId } = useNovel();
  const [files, setFiles] = useState<TruthFileMeta[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [currentNovelId]);

  useEffect(() => {
    if (selected) loadContent(selected);
  }, [selected]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/truth-files?novelId=${currentNovelId}`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadContent = async (fileName: string) => {
    setLoadingContent(true);
    try {
      const res = await fetch(`/api/truth-files?novelId=${currentNovelId}&file=${encodeURIComponent(fileName)}`);
      const data = await res.json();
      setContent(data.content || '');
    } catch {
      setContent('加载失败');
    } finally {
      setLoadingContent(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">真相文件</h1>
        <p className="text-sm text-gray-500 mt-1">
          小说的长期记忆文件，记录世界状态、角色矩阵、伏笔追踪等核心数据
        </p>
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-5">
        {/* 左侧文件列表 */}
        <div className="bg-white rounded-lg border border-[#e8e8e8] overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-gray-400 text-sm">加载中…</div>
          ) : files.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">暂无真相文件</div>
          ) : (
            files.map((file) => (
              <button
                key={file.name}
                onClick={() => setSelected(file.name)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-[#f0f0f0] hover:bg-gray-50 transition-colors',
                  selected === file.name && 'bg-blue-50/60 border-l-2 border-l-blue-400'
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base">{file.icon}</span>
                  <span className="text-sm font-medium">{file.label}</span>
                </div>
                <div className="text-[11px] text-gray-400 truncate">{file.description}</div>
                <div className="text-[10px] text-gray-300 mt-1 font-mono">
                  {file.name} · {file.size.toLocaleString()} 字符
                </div>
              </button>
            ))
          )}
        </div>

        {/* 右侧内容区 */}
        <div className="bg-white rounded-lg border border-[#e8e8e8] min-h-[600px]">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
              <span className="text-3xl">📁</span>
              <div className="text-sm">选择左侧文件开始查看</div>
            </div>
          ) : (
            <div className="p-5">
              <div className="mb-4 pb-3 border-b border-[#f0f0f0]">
                <h2 className="text-lg font-semibold">
                  {files.find(f => f.name === selected)?.icon}{' '}
                  {files.find(f => f.name === selected)?.label}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {files.find(f => f.name === selected)?.description}
                </p>
              </div>

              {loadingContent ? (
                <div className="text-center text-gray-400 py-12">加载内容中…</div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans bg-gray-50 rounded-lg p-4 border border-[#f0f0f0]">
                    {content}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
