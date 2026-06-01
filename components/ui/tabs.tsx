import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef, useState } from 'react';

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ className, defaultValue, value, onValueChange, children, ...props }, ref) => {
    const [activeTab, setActiveTab] = useState(value || defaultValue || '');

    const handleValueChange = (newValue: string) => {
      if (!value) {
        setActiveTab(newValue);
      }
      onValueChange?.(newValue);
    };

    return (
      <div
        className={cn('w-full', className)}
        ref={ref}
        data-active-tab={value || activeTab}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';

interface TabsListProps extends HTMLAttributes<HTMLDivElement> {}

const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          'flex border-b border-gray-200',
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

TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
}

const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, disabled = false, children, ...props }, ref) => {
    const parent = ref as any;
    const activeTab = parent?.current?.closest('[data-active-tab]')?.dataset?.activeTab || '';

    return (
      <button
        className={cn(
          'px-4 py-2 text-sm font-medium transition-colors',
          activeTab === value
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-500 hover:text-gray-700',
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

TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const parent = ref as any;
    const activeTab = parent?.current?.closest('[data-active-tab]')?.dataset?.activeTab || '';

    if (activeTab !== value) return null;

    return (
      <div
        className={cn('mt-4', className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
export type { TabsProps, TabsListProps, TabsTriggerProps, TabsContentProps };
