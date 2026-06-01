import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef, useEffect, useState } from 'react';

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ className, isOpen, onClose, size = 'md', closeOnOverlay = true, closeOnEscape = true, children, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      if (isOpen) {
        setIsVisible(true);
      } else {
        const timer = setTimeout(() => setIsVisible(false), 300);
        return () => clearTimeout(timer);
      }
    }, [isOpen]);

    useEffect(() => {
      if (closeOnEscape) {
        const handleEscape = (e: KeyboardEvent) => {
          if (e.key === 'Escape' && isOpen) {
            onClose();
          }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
      }
    }, [isOpen, onClose, closeOnEscape]);

    if (!isVisible) return null;

    const sizes = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-full mx-4',
    };

    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          isOpen ? 'opacity-100' : 'opacity-0',
          'transition-opacity duration-300'
        )}
        {...props}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={closeOnOverlay ? onClose : undefined}
        />

        {/* Modal content */}
        <div
          className={cn(
            'relative bg-white rounded-lg shadow-xl transform transition-all duration-300',
            isOpen ? 'scale-100' : 'scale-95',
            sizes[size],
            className
          )}
          ref={ref}
        >
          {children}
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
}

const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className, onClose, children, ...props }, ref) => {
    return (
      <div
        className={cn('flex items-center justify-between px-6 py-4 border-b', className)}
        ref={ref}
        {...props}
      >
        <div className="text-lg font-semibold">{children}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

ModalHeader.displayName = 'ModalHeader';

interface ModalContentProps extends HTMLAttributes<HTMLDivElement> {}

const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn('px-6 py-4', className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModalContent.displayName = 'ModalContent';

interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {}

const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn('flex items-center justify-end space-x-2 px-6 py-4 border-t', className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModalFooter.displayName = 'ModalFooter';

export { Modal, ModalHeader, ModalContent, ModalFooter };
export type { ModalProps, ModalHeaderProps, ModalContentProps, ModalFooterProps };
