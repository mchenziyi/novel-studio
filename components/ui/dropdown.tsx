import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef, useState, useRef, useEffect } from 'react';

interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  trigger: React.ReactNode;
  align?: 'left' | 'right';
  width?: 'auto' | 'full';
}

const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  ({ className, trigger, align = 'left', width = 'auto', children, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const alignments = {
      left: 'left-0',
      right: 'right-0',
    };

    const widths = {
      auto: 'w-auto',
      full: 'w-full',
    };

    return (
      <div
        className="relative inline-block"
        ref={dropdownRef}
        {...props}
      >
        <div onClick={() => setIsOpen(!isOpen)}>
          {trigger}
        </div>
        {isOpen && (
          <div
            className={cn(
              'absolute z-50 mt-1 bg-white rounded-lg shadow-lg border',
              alignments[align],
              widths[width],
              className
            )}
            ref={ref}
          >
            {children}
          </div>
        )}
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';

interface DropdownItemProps extends HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
}

const DropdownItem = forwardRef<HTMLDivElement, DropdownItemProps>(
  ({ className, disabled = false, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          'px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
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

DropdownItem.displayName = 'DropdownItem';

interface DropdownSeparatorProps extends HTMLAttributes<HTMLDivElement> {}

const DropdownSeparator = forwardRef<HTMLDivElement, DropdownSeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className={cn('my-1 border-t border-gray-200', className)}
        ref={ref}
        {...props}
      />
    );
  }
);

DropdownSeparator.displayName = 'DropdownSeparator';

export { Dropdown, DropdownItem, DropdownSeparator };
export type { DropdownProps, DropdownItemProps, DropdownSeparatorProps };
