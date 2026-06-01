import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
}

const Loading = forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, size = 'md', variant = 'spinner', ...props }, ref) => {
    const sizes = {
      sm: 'w-4 h-4',
      md: 'w-8 h-8',
      lg: 'w-12 h-12',
    };

    if (variant === 'spinner') {
      return (
        <div
          className={cn('flex items-center justify-center', className)}
          ref={ref}
          {...props}
        >
          <div
            className={cn(
              'border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin',
              sizes[size]
            )}
          />
        </div>
      );
    }

    if (variant === 'dots') {
      return (
        <div
          className={cn('flex items-center justify-center space-x-2', className)}
          ref={ref}
          {...props}
        >
          <div
            className={cn(
              'bg-blue-500 rounded-full animate-bounce',
              size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'
            )}
            style={{ animationDelay: '0ms' }}
          />
          <div
            className={cn(
              'bg-blue-500 rounded-full animate-bounce',
              size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'
            )}
            style={{ animationDelay: '150ms' }}
          />
          <div
            className={cn(
              'bg-blue-500 rounded-full animate-bounce',
              size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'
            )}
            style={{ animationDelay: '300ms' }}
          />
        </div>
      );
    }

    return (
      <div
        className={cn('flex items-center justify-center', className)}
        ref={ref}
        {...props}
      >
        <div
          className={cn(
            'bg-blue-500 rounded-full animate-pulse',
            sizes[size]
          )}
        />
      </div>
    );
  }
);

Loading.displayName = 'Loading';

export { Loading };
export type { LoadingProps };
