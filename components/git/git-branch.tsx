import { cn } from '@/lib/utils';
import { useState } from 'react';

interface GitBranchProps {
  branches: string[];
  currentBranch: string;
  loading?: boolean;
  onBranchSelect?: (branch: string) => void;
  onBranchCreate?: (branchName: string) => Promise<void>;
  onBranchSwitch?: (branchName: string) => Promise<void>;
}

export function GitBranch({
  branches,
  currentBranch,
  loading = false,
  onBranchSelect,
  onBranchCreate,
  onBranchSwitch,
}: GitBranchProps) {
  const [newBranchName, setNewBranchName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;

    setIsCreating(true);
    try {
      await onBranchCreate?.(newBranchName);
      setNewBranchName('');
    } catch (error) {
      console.error('Failed to create branch:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSwitchBranch = async (branch: string) => {
    if (branch === currentBranch) return;

    try {
      await onBranchSwitch?.(branch);
    } catch (error) {
      console.error('Failed to switch branch:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-4">分支管理</h3>

      {/* 当前分支 */}
      <div className="mb-4 p-3 bg-white rounded-lg">
        <div className="text-sm text-gray-600 mb-1">当前分支</div>
        <div className="font-mono text-blue-600">{currentBranch}</div>
      </div>

      {/* 分支列表 */}
      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">所有分支</div>
        <div className="max-h-60 overflow-y-auto space-y-1">
          {branches.map((branch) => (
            <div
              key={branch}
              className={cn(
                'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors',
                branch === currentBranch
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-100'
              )}
              onClick={() => {
                onBranchSelect?.(branch);
                handleSwitchBranch(branch);
              }}
            >
              <div className="flex items-center space-x-2">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    branch === currentBranch ? 'bg-blue-500' : 'bg-gray-400'
                  )}
                />
                <span className="font-mono text-sm">{branch}</span>
              </div>
              {branch === currentBranch && (
                <span className="text-xs text-blue-500">当前</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 创建新分支 */}
      {onBranchCreate && (
        <div>
          <div className="text-sm text-gray-600 mb-2">创建新分支</div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="新分支名称..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isCreating}
            />
            <button
              onClick={handleCreateBranch}
              disabled={isCreating || !newBranchName.trim()}
              className={cn(
                'px-4 py-2 text-sm rounded-lg font-medium transition-colors',
                isCreating || !newBranchName.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
              )}
            >
              {isCreating ? '创建中...' : '创建'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
