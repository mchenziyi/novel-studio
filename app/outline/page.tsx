'use client';

import { useState, useEffect } from 'react';
import { Outline, Volume, OutlineChapter } from '@/types';

export default function OutlinePage() {
  const [outline, setOutline] = useState<Outline | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVolume, setSelectedVolume] = useState<Volume | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<OutlineChapter | null>(null);

  useEffect(() => {
    loadOutline();
  }, []);

  const loadOutline = async () => {
    try {
      const response = await fetch('/api/outline');
      const data = await response.json();
      setOutline(data);
      if (data.volumes.length > 0) {
        setSelectedVolume(data.volumes[0]);
      }
    } catch (error) {
      console.error('Failed to load outline:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  if (!outline) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl">大纲不存在</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">大纲管理</h1>

      {/* 大纲标题和简介 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-2">{outline.title}</h2>
        <p className="text-gray-600">{outline.synopsis}</p>
      </div>

      <div className="flex gap-6">
        {/* 卷列表 */}
        <div className="w-64">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-4">卷列表</h3>
            <div className="space-y-2">
              {outline.volumes.map((volume) => (
                <button
                  key={volume.id}
                  onClick={() => {
                    setSelectedVolume(volume);
                    setSelectedChapter(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg ${
                    selectedVolume?.id === volume.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">{volume.title}</div>
                  <div className="text-sm text-gray-500">
                    {volume.chapters.length} 章
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 章节列表 */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-4">
              {selectedVolume ? selectedVolume.title : '选择一卷'}
            </h3>
            {selectedVolume && (
              <div className="space-y-3">
                {selectedVolume.chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    onClick={() => setSelectedChapter(chapter)}
                    className={`p-4 border rounded-lg cursor-pointer ${
                      selectedChapter?.id === chapter.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{chapter.title}</div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          chapter.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : chapter.status === 'writing'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {chapter.status === 'completed'
                          ? '已完成'
                          : chapter.status === 'writing'
                          ? '写作中'
                          : '计划中'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{chapter.summary}</p>
                    {chapter.keyEvents.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-1">关键事件：</div>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {chapter.keyEvents.map((event, index) => (
                            <li key={index}>{event}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 章节详情 */}
        {selectedChapter && (
          <div className="w-96">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold mb-4">章节详情</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">标题</div>
                  <div className="font-semibold">{selectedChapter.title}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">状态</div>
                  <div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        selectedChapter.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : selectedChapter.status === 'writing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedChapter.status === 'completed'
                        ? '已完成'
                        : selectedChapter.status === 'writing'
                        ? '写作中'
                        : '计划中'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">摘要</div>
                  <div className="text-sm">{selectedChapter.summary}</div>
                </div>
                {selectedChapter.keyEvents.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500 mb-2">关键事件</div>
                    <ul className="text-sm space-y-1">
                      {selectedChapter.keyEvents.map((event, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {event}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <a
                  href={`/chapters/${selectedChapter.id}`}
                  className="block w-full text-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  查看章节
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
