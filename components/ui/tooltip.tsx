import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef, useState, useRef, useEffect } from 'react';

interface TooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content'> {
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  children: React.ReactNode;
}

const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  ({ className, content, position = 'top', delay = 200, children, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const showTooltip = () => {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, delay);
    };

    const hideTooltip = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsVisible(false);
    };

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    const positions = {
      top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    };

    const arrows = {
      top: 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900',
      bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900',
      left: 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900',
      right: 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900',
    };

    return (
      <div
        className="relative inline-block"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        ref={ref}
        {...props}
      >
        {children}
        {isVisible && (
          <div
            ref={tooltipRef}
            className={cn(
              'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap',
              positions[position],
              className
            )}
          >
            {content}
            <div
              className={cn(
                'absolute w-0 h-0 border-4 border-transparent',
                arrows[position]
              )}
            />
          </div>
        )}
      </div>
    );
  }
);

Tooltip.displayName = 'Tooltip';

export { Tooltip };
export type { TooltipProps };
