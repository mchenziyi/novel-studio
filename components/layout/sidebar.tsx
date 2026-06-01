import { cn } from '@/lib/utils';
import Link from 'next/link';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const navItems = [
    { href: '/', icon: '📊', label: '仪表盘' },
    { href: '/search', icon: '🔍', label: '搜索' },
    { href: '/chapters', icon: '📖', label: '章节管理' },
    { href: '/outline', icon: '📋', label: '大纲管理' },
    { href: '/characters', icon: '👥', label: '角色管理' },
    { href: '/foreshadowing', icon: '🔗', label: '伏笔追踪' },
    { href: '/plotlines', icon: '📈', label: '情节线' },
    { href: '/stats', icon: '📉', label: '写作统计' },
    { href: '/agent', icon: '🤖', label: 'Agent 工作台' },
    { href: '/agent/chat', icon: '💬', label: 'ChatAgent' },
    { href: '/settings', icon: '⚙️', label: '设置' },
  ];

  return (
    <aside className={cn('w-64 bg-gray-900 text-white flex flex-col', className)}>
      {/* 头部 */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">Novel Studio</h1>
        <p className="text-sm text-gray-400">小说写作 Agent 平台</p>
      </div>

      {/* 导航 */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center space-x-2 p-2 rounded hover:bg-gray-800 transition-colors"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* 底部 */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-sm text-gray-400">
          <p>版本：1.0.0</p>
          <p>项目：开局屠村现场</p>
        </div>
      </div>
    </aside>
  );
}
