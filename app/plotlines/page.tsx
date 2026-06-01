'use client';

import { useState, useEffect } from 'react';

interface Plotline {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'resolved';
  chapters: {
    chapter: number;
    event: string;
    importance: 'major' | 'minor';
  }[];
}

export default function PlotlinesPage() {
  const [plotlines, setPlotlines] = useState<Plotline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlotline, setSelectedPlotline] = useState<Plotline | null>(null);

  useEffect(() => {
    loadPlotlines();
  }, []);

  const loadPlotlines = async () => {
    try {
      // 这里应该从 API 加载情节线数据
      // 暂时使用模拟数据
      const mockPlotlines: Plotline[] = [
        {
          id: '1',
          name: '主线：屠村真相',
          description: '探索屠村事件的真相和幕后黑手',
          status: 'active',
          chapters: [
            { chapter: 1, event: '发现屠村现场', importance: 'major' },
            { chapter: 10, event: '发现第一个线索', importance: 'minor' },
            { chapter: 20, event: '揭露部分真相', importance: 'major' },
          ],
        },
        {
          id: '2',
          name: '支线：巡道衙',
          description: '巡道衙的秘密和内部斗争',
          status: 'active',
          chapters: [
            { chapter: 47, event: '进入巡道衙', importance: 'major' },
            { chapter: 55, event: '发现巡道衙秘密', importance: 'major' },
            { chapter: 70, event: '巡道衙内斗', importance: 'minor' },
          ],
        },
        {
          id: '3',
          name: '支线：阿萝身世',
          description: '阿萝的真实身份和过去',
          status: 'active',
          chapters: [
            { chapter: 47, event: '阿萝前史闪回', importance: 'major' },
            { chapter: 50, event: '阿萝名字来源', importance: 'minor' },
          ],
        },
      ];
      setPlotlines(mockPlotlines);
    } catch (error) {
      console.error('Failed to load plotlines:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '进行中';
      case 'paused':
        return '暂停';
      case 'resolved':
        return '已完成';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">情节线</h1>

      <div className="flex gap-6">
        {/* 情节线列表 */}
        <div className="w-80">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-4">情节线列表</h3>
            <div className="space-y-3">
              {plotlines.map((plotline) => (
                <div
                  key={plotline.id}
                  onClick={() => setSelectedPlotline(plotline)}
                  className={`p-4 border rounded-lg cursor-pointer ${
                    selectedPlotline?.id === plotline.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{plotline.name}</div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${getStatusColor(plotline.status)}`}
                    >
                      {getStatusText(plotline.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{plotline.description}</p>
                  <div className="text-sm text-gray-500 mt-2">
                    {plotline.chapters.length} 个事件
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 情节线详情 */}
        {selectedPlotline && (
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedPlotline.name}</h2>
                  <p className="text-gray-600">{selectedPlotline.description}</p>
                </div>
                <span
                  className={`px-3 py-1 text-sm rounded ${getStatusColor(selectedPlotline.status)}`}
                >
                  {getStatusText(selectedPlotline.status)}
                </span>
              </div>

              {/* 时间线 */}
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                <div className="space-y-6">
                  {selectedPlotline.chapters.map((event, index) => (
                    <div key={index} className="relative pl-12">
                      <div
                        className={`absolute left-2 w-5 h-5 rounded-full border-2 ${
                          event.importance === 'major'
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-gray-300 border-gray-300'
                        }`}
                      ></div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">第{event.chapter}章</span>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              event.importance === 'major'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {event.importance === 'major' ? '重要' : '次要'}
                          </span>
                        </div>
                        <p className="text-gray-600">{event.event}</p>
                        <a
                          href={`/chapters/${event.chapter}`}
                          className="text-blue-500 text-sm hover:underline mt-2 inline-block"
                        >
                          查看章节 →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
