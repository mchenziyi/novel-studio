'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Shortcut {
  key: string;
  label: string;
  action: () => void;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts: Shortcut[] = [
    {
      key: '/',
      label: '搜索',
      action: () => router.push('/search'),
      metaKey: true,
    },
    {
      key: 'h',
      label: '仪表盘',
      action: () => router.push('/'),
      metaKey: true,
    },
    {
      key: 'c',
      label: '章节管理',
      action: () => router.push('/chapters'),
      metaKey: true,
    },
    {
      key: 'a',
      label: 'Agent 工作台',
      action: () => router.push('/agent'),
      metaKey: true,
    },
    {
      key: 'g',
      label: 'ChatAgent',
      action: () => router.push('/agent/chat'),
      metaKey: true,
    },
    {
      key: '?',
      label: '快捷键帮助',
      action: () => setShowHelp(!showHelp),
      shiftKey: true,
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框中的快捷键
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.metaKey ? (e.metaKey || e.ctrlKey) : true;
        const shiftMatch = shortcut.shiftKey ? e.shiftKey : true;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (metaMatch && shiftMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }

      // ESC 关闭帮助
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelp]);

  return (
    <>
      {/* 快捷键帮助按钮 */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="fixed bottom-4 right-4 w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors shadow-lg z-50"
        title="键盘快捷键 (?)"
      >
        ?
      </button>

      {/* 快捷键帮助弹窗 */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">键盘快捷键</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-600">{shortcut.label}</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                    {shortcut.metaKey && '⌘+'}
                    {shortcut.shiftKey && '⇧+'}
                    {shortcut.key.toUpperCase()}
                  </kbd>
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-gray-50 rounded-b-xl">
              <p className="text-sm text-gray-500">
                按 <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">ESC</kbd> 关闭
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
