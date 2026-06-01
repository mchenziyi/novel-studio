import { cn } from '@/lib/utils';
import { GitCommit } from '@/types';

interface GitLogProps {
  commits: GitCommit[];
  loading?: boolean;
  maxCount?: number;
  onCommitSelect?: (commit: GitCommit) => void;
}

export function GitLog({
  commits,
  loading = false,
  maxCount = 50,
  onCommitSelect,
}: GitLogProps) {
  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">没有提交历史</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {commits.slice(0, maxCount).map((commit, index) => (
        <div
          key={commit.hash}
          className={cn(
            'p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer',
            onCommitSelect && 'hover:bg-gray-50'
          )}
          onClick={() => onCommitSelect?.(commit)}
        >
          <div className="flex items-start space-x-4">
            {/* 提交图标 */}
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm font-mono">
                {commit.hash.substring(0, 7)}
              </span>
            </div>

            {/* 提交信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {commit.message}
                </p>
                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                  {new Date(commit.date).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{commit.author}</span>
                <span className="font-mono">{commit.hash.substring(0, 7)}</span>
              </div>

              {commit.body && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {commit.body}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {commits.length > maxCount && (
        <div className="text-center py-2">
          <span className="text-sm text-gray-500">
            显示 {maxCount} / {commits.length} 个提交
          </span>
        </div>
      )}
    </div>
  );
}
