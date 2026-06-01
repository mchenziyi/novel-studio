import { cn } from '@/lib/utils';

interface WritingProgressProps {
  chapters: {
    id: string;
    title: string;
    wordCount: number;
    status?: string;
  }[];
  loading?: boolean;
}

export function WritingProgress({ chapters, loading = false }: WritingProgressProps) {
  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">暂无章节数据</p>
      </div>
    );
  }

  // 计算统计数据
  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  const avgWords = Math.round(totalWords / chapters.length);
  const maxWords = Math.max(...chapters.map((ch) => ch.wordCount));
  const minWords = Math.min(...chapters.map((ch) => ch.wordCount));

  // 按状态分组
  const statusGroups = chapters.reduce((groups, ch) => {
    const status = ch.status || 'unknown';
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(ch);
    return groups;
  }, {} as Record<string, typeof chapters>);

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-4">写作进度</h3>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-3 rounded-lg shadow">
          <div className="text-sm text-gray-500">总字数</div>
          <div className="text-2xl font-bold text-blue-600">
            {totalWords.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow">
          <div className="text-sm text-gray-500">章节数</div>
          <div className="text-2xl font-bold text-green-600">
            {chapters.length}
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow">
          <div className="text-sm text-gray-500">平均字数</div>
          <div className="text-2xl font-bold text-purple-600">
            {avgWords.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow">
          <div className="text-sm text-gray-500">字数范围</div>
          <div className="text-2xl font-bold text-orange-600">
            {minWords.toLocaleString()} - {maxWords.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 字数分布图 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-4">字数分布</h4>
        <div className="flex items-end justify-between h-40 space-x-1">
          {chapters.slice(0, 20).map((chapter, index) => {
            const heightPercent = (chapter.wordCount / maxWords) * 100;
            return (
              <div
                key={chapter.id}
                className="flex-1 flex flex-col items-center"
              >
                <div
                  className={cn(
                    'w-full rounded-t',
                    chapter.status === 'completed'
                      ? 'bg-green-500'
                      : chapter.status === 'writing'
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                  )}
                  style={{ height: `${heightPercent}%` }}
                />
                <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left">
                  {chapter.id}
                </div>
              </div>
            );
          })}
        </div>
        {chapters.length > 20 && (
          <div className="text-xs text-gray-500 text-center mt-2">
            显示前 20 章，共 {chapters.length} 章
          </div>
        )}
      </div>

      {/* 状态分布 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h4 className="text-sm font-medium text-gray-700 mb-4">状态分布</h4>
        <div className="space-y-3">
          {Object.entries(statusGroups).map(([status, statusChapters]) => {
            const percent = (statusChapters.length / chapters.length) * 100;
            const statusColors: Record<string, string> = {
              completed: 'bg-green-500',
              writing: 'bg-yellow-500',
              planned: 'bg-blue-500',
              unknown: 'bg-gray-500',
            };
            const statusLabels: Record<string, string> = {
              completed: '已完成',
              writing: '写作中',
              planned: '计划中',
              unknown: '未知',
            };

            return (
              <div key={status} className="flex items-center space-x-3">
                <div className="w-24 text-sm text-gray-600">
                  {statusLabels[status] || status}
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', statusColors[status] || 'bg-gray-500')}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-sm text-gray-500 text-right">
                  {statusChapters.length} 章 ({percent.toFixed(1)}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
