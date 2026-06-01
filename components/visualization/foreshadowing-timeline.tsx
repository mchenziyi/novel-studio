import { cn } from '@/lib/utils';

interface Foreshadowing {
  id: string;
  name: string;
  status: 'planted' | 'progressing' | 'resolved';
  plantedChapter: number;
  resolvedChapter?: number;
  relatedChapters: number[];
  description: string;
}

interface ForeshadowingTimelineProps {
  foreshadowing: Foreshadowing[];
  loading?: boolean;
  maxChapter?: number;
}

export function ForeshadowingTimeline({
  foreshadowing,
  loading = false,
  maxChapter = 100,
}: ForeshadowingTimelineProps) {
  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (foreshadowing.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">暂无伏笔数据</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planted':
        return 'bg-blue-500';
      case 'progressing':
        return 'bg-yellow-500';
      case 'resolved':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planted':
        return '已埋设';
      case 'progressing':
        return '推进中';
      case 'resolved':
        return '已回收';
      default:
        return status;
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-4">伏笔追踪</h3>

      {/* 时间线 */}
      <div className="relative">
        {/* 章节刻度 */}
        <div className="flex justify-between mb-2 text-xs text-gray-500">
          <span>第1章</span>
          <span>第{Math.floor(maxChapter / 4)}章</span>
          <span>第{Math.floor(maxChapter / 2)}章</span>
          <span>第{Math.floor((maxChapter * 3) / 4)}章</span>
          <span>第{maxChapter}章</span>
        </div>

        {/* 时间线条 */}
        <div className="relative h-2 bg-gray-200 rounded-full mb-6">
          <div
            className="absolute h-full bg-blue-200 rounded-full"
            style={{ width: '100%' }}
          />
        </div>

        {/* 伏笔条目 */}
        <div className="space-y-3">
          {foreshadowing.map((item) => {
            const startPercent = (item.plantedChapter / maxChapter) * 100;
            const endPercent = item.resolvedChapter
              ? (item.resolvedChapter / maxChapter) * 100
              : 100;
            const widthPercent = endPercent - startPercent;

            return (
              <div key={item.id} className="relative">
                {/* 伏笔条 */}
                <div className="relative h-8 bg-gray-100 rounded">
                  <div
                    className={cn(
                      'absolute h-full rounded',
                      getStatusColor(item.status)
                    )}
                    style={{
                      left: `${startPercent}%`,
                      width: `${widthPercent}%`,
                      opacity: 0.7,
                    }}
                  />
                  <div
                    className="absolute h-full flex items-center px-2"
                    style={{
                      left: `${startPercent}%`,
                      width: `${widthPercent}%`,
                    }}
                  >
                    <span className="text-xs text-white font-medium truncate">
                      {item.name}
                    </span>
                  </div>
                </div>

                {/* 伏笔信息 */}
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        getStatusColor(item.status)
                      )}
                    />
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>第{item.plantedChapter}章</span>
                    {item.resolvedChapter && (
                      <span>→ 第{item.resolvedChapter}章</span>
                    )}
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded',
                        item.status === 'planted'
                          ? 'bg-blue-100 text-blue-800'
                          : item.status === 'progressing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      )}
                    >
                      {getStatusText(item.status)}
                    </span>
                  </div>
                </div>

                {/* 相关章节 */}
                {item.relatedChapters.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.relatedChapters.map((chapter) => (
                      <span
                        key={chapter}
                        className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded"
                      >
                        第{chapter}章
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
          <span className="text-xs text-gray-600">已埋设</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
          <span className="text-xs text-gray-600">推进中</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          <span className="text-xs text-gray-600">已回收</span>
        </div>
      </div>
    </div>
  );
}
