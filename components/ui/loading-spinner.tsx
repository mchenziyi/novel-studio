'use client';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-b-2 border-blue-500',
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="mt-4 text-sm text-gray-500">{text}</p>
      )}
    </div>
  );
}

export function LoadingPage({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
