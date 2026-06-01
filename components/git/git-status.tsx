import { cn } from '@/lib/utils';
import { GitStatus as GitStatusType } from '@/types';

interface GitStatusProps {
  status: GitStatusType | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export function GitStatus({ status, loading = false, onRefresh }: GitStatusProps) {
  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">无法加载 Git 状态</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-2 text-sm text-blue-500 hover:text-blue-700"
          >
            重试
          </button>
        )}
      </div>
    );
  }

  const totalChanges =
    status.modified.length +
    status.created.length +
    status.deleted.length +
    status.renamed.length +
    status.notAdded.length;

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Git 状态</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            刷新
          </button>
        )}
      </div>

      <div className="space-y-2 text-sm">
        {/* 当前分支 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">当前分支</span>
          <span className="font-mono">{status.current || 'detached'}</span>
        </div>

        {/* 跟踪分支 */}
        {status.tracking && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">跟踪分支</span>
            <span className="font-mono">{status.tracking}</span>
          </div>
        )}

        {/* 领先/落后 */}
        {(status.ahead > 0 || status.behind > 0) && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">同步状态</span>
            <span>
              {status.ahead > 0 && (
                <span className="text-green-600">↑{status.ahead}</span>
              )}
              {status.behind > 0 && (
                <span className="text-red-600">↓{status.behind}</span>
              )}
            </span>
          </div>
        )}

        {/* 工作区状态 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">工作区</span>
          <span className={cn(
            'px-2 py-0.5 rounded text-xs',
            status.isClean
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          )}>
            {status.isClean ? '干净' : `${totalChanges} 个变更`}
          </span>
        </div>

        {/* 暂存区 */}
        {status.staged.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">暂存区</span>
            <span className="text-blue-600">{status.staged.length} 个文件</span>
          </div>
        )}

        {/* 详细变更 */}
        {totalChanges > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-gray-600 mb-2">变更详情：</div>
            <div className="space-y-1">
              {status.modified.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  <span>修改：{status.modified.length} 个文件</span>
                </div>
              )}
              {status.created.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>新增：{status.created.length} 个文件</span>
                </div>
              )}
              {status.deleted.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>删除：{status.deleted.length} 个文件</span>
                </div>
              )}
              {status.renamed.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>重命名：{status.renamed.length} 个文件</span>
                </div>
              )}
              {status.notAdded.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                  <span>未跟踪：{status.notAdded.length} 个文件</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
