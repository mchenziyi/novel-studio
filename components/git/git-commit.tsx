import { cn } from '@/lib/utils';
import { useState } from 'react';

interface GitCommitProps {
  files: string[];
  loading?: boolean;
  onCommit: (message: string, addAll: boolean) => Promise<void>;
}

export function GitCommit({ files, loading = false, onCommit }: GitCommitProps) {
  const [message, setMessage] = useState('');
  const [addAll, setAddAll] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    await onCommit(message, addAll);
    setMessage('');
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-4">提交更改</h3>

      <form onSubmit={handleSubmit}>
        {/* 文件列表 */}
        {files.length > 0 && (
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">更改的文件：</div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 text-sm"
                >
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  <span className="font-mono">{file}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 暂存选项 */}
        <div className="mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={addAll}
              onChange={(e) => setAddAll(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              暂存所有更改后提交
            </span>
          </label>
        </div>

        {/* 提交信息 */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-2">
            提交信息
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="描述您的更改..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className={cn(
            'w-full px-4 py-2 rounded-lg font-medium transition-colors',
            loading || !message.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          )}
        >
          {loading ? (
            <span className="flex items-center justify-center space-x-2">
              <span className="animate-spin">⏳</span>
              <span>提交中...</span>
            </span>
          ) : (
            '提交更改'
          )}
        </button>
      </form>
    </div>
  );
}
