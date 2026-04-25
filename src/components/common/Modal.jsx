import { useEffect } from 'preact/hooks';
import { Portal } from './Portal';
import { Button } from './Button';

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl'
  };

  useEffect(() => {
    if (isOpen) {
      // Lock body scroll and hide scrollbars to prevent background scrolling
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      // Store original values
      document.body.dataset.originalOverflow = document.body.style.overflow;
      document.body.dataset.originalPaddingRight = document.body.style.paddingRight;
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      // Cleanup on unmount
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    // Handle escape on input fields directly to bypass browser blur behavior
    const handleInputEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      // Use keyup to fire after input blur completes
      document.addEventListener('keyup', handleEscape, true);

      // Also add direct listeners to input fields to catch escape before blur
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('keydown', handleInputEscape, true);
      });

      return () => {
        document.removeEventListener('keyup', handleEscape, true);
        inputs.forEach(input => {
          input.removeEventListener('keydown', handleInputEscape, true);
        });
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div class="relative z-60" role="dialog" aria-modal="true" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
        WebkitTransform: 'translate3d(0,0,0)',
        transform: 'translate3d(0,0,0)'
      }}>
        <div class="fixed inset-0 bg-gray-500/75 dark:bg-neutral-dark-400/75 transition-opacity" aria-hidden="true" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 58
        }}></div>
        <div class="fixed inset-0 z-60 w-screen overflow-y-auto" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 60,
          WebkitOverflowScrolling: 'touch'
        }}>
          <div class="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:px-4 sm:py-0">
            <div
              class={`relative transform overflow-hidden rounded-lg bg-white dark:bg-surface-dark-elevated px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 w-full ${sizeClasses[size]} sm:p-6`}
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <Button
                    onClick={onClose}
                    type="button"
                    variant="none"
                    className="cursor-pointer text-gray-400 hover:text-gray-600 dark:text-neutral-dark-400 dark:hover:text-neutral-dark-600 p-1 transition-colors focus-visible:outline-solid focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-gray-300 rounded-sm"
                  >
                    <span class="sr-only">Close</span>
                    <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>

                <div class="mt-0">
                  <h3 class="text-base font-semibold text-gray-900 dark:text-neutral-dark-900 text-center sm:text-left">{title}</h3>

                  {/* Content */}
                  <div class="mt-2">
                    {children}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
