import { cn } from '@/lib/utils';
import { Character } from '@/types';
import { useEffect, useRef, useState } from 'react';

interface CharacterGraphProps {
  characters: Character[];
  loading?: boolean;
  width?: number;
  height?: number;
}

export function CharacterGraph({
  characters,
  loading = false,
  width = 800,
  height = 600,
}: CharacterGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  useEffect(() => {
    if (loading || characters.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 计算节点位置
    const nodes = characters.map((char, index) => {
      const angle = (2 * Math.PI * index) / characters.length;
      const radius = Math.min(width, height) * 0.35;
      return {
        id: char.id,
        name: char.name,
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
        role: char.role,
        status: char.status,
        relations: char.relations,
      };
    });

    // 绘制连线
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    nodes.forEach((node) => {
      if (!Array.isArray(node.relations)) return;
      node.relations.forEach((relation) => {
        const targetNode = nodes.find((n) => n.name === relation.target);
        if (targetNode) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.stroke();
        }
      });
    });

    // 绘制节点
    nodes.forEach((node) => {
      // 节点背景
      ctx.beginPath();
      ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI);
      ctx.fillStyle =
        node.role === 'protagonist'
          ? '#3b82f6'
          : node.role === 'antagonist'
          ? '#ef4444'
          : '#6b7280';
      ctx.fill();

      // 节点边框
      ctx.strokeStyle =
        node.status === 'alive'
          ? '#22c55e'
          : node.status === 'dead'
          ? '#ef4444'
          : '#9ca3af';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 节点文字
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name.charAt(0), node.x, node.y);

      // 名称标签
      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.fillText(node.name, node.x, node.y + 30);
    });
  }, [characters, loading, width, height]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-lg"
        style={{ width, height }}
      >
        <div className="animate-pulse text-gray-400">加载中...</div>
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-lg"
        style={{ width, height }}
      >
        <div className="text-gray-400">暂无角色数据</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="bg-white rounded-lg shadow"
      />

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow">
        <div className="text-sm font-semibold mb-2">图例</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            <span>主角</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span>反派</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
            <span>配角</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 border-2 border-green-500 rounded-full"></span>
            <span>存活</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 border-2 border-red-500 rounded-full"></span>
            <span>死亡</span>
          </div>
        </div>
      </div>
    </div>
  );
}
