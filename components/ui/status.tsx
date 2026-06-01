import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface StatusProps extends HTMLAttributes<HTMLDivElement> {
  status: 'online' | 'offline' | 'away' | 'busy' | 'loading';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const Status = forwardRef<HTMLDivElement, StatusProps>(
  ({ className, status, size = 'md', showLabel = false, ...props }, ref) => {
    const sizes = {
      sm: 'w-2 h-2',
      md: 'w-3 h-3',
      lg: 'w-4 h-4',
    };

    const statusColors = {
      online: 'bg-green-500',
      offline: 'bg-gray-400',
      away: 'bg-yellow-500',
      busy: 'bg-red-500',
      loading: 'bg-blue-500 animate-pulse',
    };

    const statusLabels = {
      online: '在线',
      offline: '离线',
      away: '离开',
      busy: '忙碌',
      loading: '加载中',
    };

    return (
      <div
        className={cn('flex items-center space-x-2', className)}
        ref={ref}
        {...props}
      >
        <div
          className={cn(
            'rounded-full',
            sizes[size],
            statusColors[status]
          )}
        />
        {showLabel && (
          <span className="text-sm text-gray-600">
            {statusLabels[status]}
          </span>
        )}
      </div>
    );
  }
);

Status.displayName = 'Status';

export { Status };
export type { StatusProps };
