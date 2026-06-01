'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const typeClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
  };

  const typeIcons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div
      className={`${typeClasses[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 transform transition-all duration-300 ease-in-out`}
    >
      <span className="font-bold">{typeIcons[toast.type]}</span>
      <span>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-auto hover:opacity-75"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 全局添加 toast 的方法
  useEffect(() => {
    window.addToast = (toast: Omit<Toast, 'id'>) => {
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { ...toast, id }]);
    };

    return () => {
      delete window.addToast;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

// 全局类型声明
declare global {
  interface Window {
    addToast?: (toast: Omit<Toast, 'id'>) => void;
  }
}

// 便捷函数
export function showToast(toast: Omit<Toast, 'id'>) {
  if (typeof window !== 'undefined' && window.addToast) {
    window.addToast(toast);
  }
}
