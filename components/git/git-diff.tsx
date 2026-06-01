import { cn } from '@/lib/utils';
import { GitDiffFile } from '@/types';

interface GitDiffProps {
  diff: GitDiffFile[];
  loading?: boolean;
  viewMode?: 'side-by-side' | 'unified';
  showLineNumbers?: boolean;
}

export function GitDiff({
  diff,
  loading = false,
  viewMode = 'unified',
  showLineNumbers = true,
}: GitDiffProps) {
  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (diff.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">没有变更</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {diff.map((file, fileIndex) => (
        <div key={fileIndex} className="bg-white rounded-lg shadow overflow-hidden">
          {/* 文件头 */}
          <div className="px-4 py-2 bg-gray-100 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs rounded',
                    file.status === 'added'
                      ? 'bg-green-100 text-green-800'
                      : file.status === 'deleted'
                      ? 'bg-red-100 text-red-800'
                      : file.status === 'renamed'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-yellow-100 text-yellow-800'
                  )}
                >
                  {file.status === 'added'
                    ? '新增'
                    : file.status === 'deleted'
                    ? '删除'
                    : file.status === 'renamed'
                    ? '重命名'
                    : '修改'}
                </span>
                <span className="font-mono text-sm">{file.path}</span>
                {file.oldPath && file.oldPath !== file.path && (
                  <span className="text-gray-500 text-sm">
                    (从 {file.oldPath})
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-green-600">+{file.additions}</span>
                <span className="text-red-600">-{file.deletions}</span>
              </div>
            </div>
          </div>

          {/* Diff 内容 */}
          <div className="overflow-x-auto">
            {file.hunks.map((hunk, hunkIndex) => (
              <div key={hunkIndex}>
                {/* Hunk 头 */}
                <div className="px-4 py-1 bg-gray-50 text-gray-500 text-sm">
                  @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                </div>

                {/* 变更行 */}
                {hunk.changes.map((change, changeIndex) => (
                  <div
                    key={changeIndex}
                    className={cn(
                      'flex',
                      change.type === 'add'
                        ? 'bg-green-50'
                        : change.type === 'delete'
                        ? 'bg-red-50'
                        : 'bg-white'
                    )}
                  >
                    {/* 行号 */}
                    {showLineNumbers && (
                      <div className="flex-shrink-0 w-16 px-2 py-1 text-right text-gray-400 text-sm border-r">
                        {change.oldLineNumber && (
                          <span className="inline-block w-8 text-right">
                            {change.oldLineNumber}
                          </span>
                        )}
                        {change.newLineNumber && (
                          <span className="inline-block w-8 text-right">
                            {change.newLineNumber}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 内容 */}
                    <div className="flex-1 px-4 py-1 font-mono text-sm whitespace-pre-wrap">
                      <span
                        className={cn(
                          'inline-block w-4',
                          change.type === 'add'
                            ? 'text-green-600'
                            : change.type === 'delete'
                            ? 'text-red-600'
                            : 'text-gray-400'
                        )}
                      >
                        {change.type === 'add'
                          ? '+'
                          : change.type === 'delete'
                          ? '-'
                          : ' '}
                      </span>
                      {change.content}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
