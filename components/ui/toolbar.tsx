import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'transparent' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
}

const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white shadow',
      transparent: 'bg-transparent',
      bordered: 'bg-white border',
    };

    const sizes = {
      sm: 'px-2 py-1',
      md: 'px-4 py-2',
      lg: 'px-6 py-3',
    };

    return (
      <div
        className={cn(
          'flex items-center space-x-2',
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Toolbar.displayName = 'Toolbar';

interface ToolbarButtonProps extends HTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  disabled?: boolean;
}

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ className, active = false, disabled = false, children, ...props }, ref) => {
    return (
      <button
        className={cn(
          'p-2 rounded-md transition-colors',
          active
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ToolbarButton.displayName = 'ToolbarButton';

interface ToolbarSeparatorProps extends HTMLAttributes<HTMLDivElement> {}

const ToolbarSeparator = forwardRef<HTMLDivElement, ToolbarSeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className={cn('w-px h-6 bg-gray-300', className)}
        ref={ref}
        {...props}
      />
    );
  }
);

ToolbarSeparator.displayName = 'ToolbarSeparator';

export { Toolbar, ToolbarButton, ToolbarSeparator };
export type { ToolbarProps, ToolbarButtonProps, ToolbarSeparatorProps };
