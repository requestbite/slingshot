import { useState, useEffect } from 'preact/hooks';

/**
 * Reusable toast notification component
 * Shows a green success toast with configurable message
 */
export function Toast({
  message = "Success!",
  isVisible = false,
  onClose,
  duration = 3000,
  type = 'success'
}) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);

      // Auto-hide after duration
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Delay removing from DOM to allow fade-out animation
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!shouldRender) return null;

  const handleClose = () => {
    onClose?.();
  };

  // Different styles for different toast types
  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          border: 'border-lime-600 border-2 bg-lime-50',
          icon: (
            <svg class="size-6 text-lime-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          )
        };
      case 'error':
        return {
          border: 'border-red-600 border-2 bg-red-50',
          icon: (
            <svg class="size-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          )
        };
      case 'info':
        return {
          border: 'border-blue-600 border-2 bg-blue-50',
          icon: (
            <svg class="size-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          )
        };
      default:
        return getToastStyles('success'); // fallback to success
    }
  };

  const styles = getToastStyles();

  return (
    <div
      class={`fixed z-50 transition-all duration-300 ease-out ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-full'
        } bottom-5 left-5 right-5 sm:left-auto sm:right-5 sm:w-auto w-auto`}
    >
      <div class="flex w-full flex-col items-center sm:items-end">
        <div class={`pointer-events-auto overflow-hidden rounded-lg ring-1 ring-black/5 ${styles.border} w-full sm:w-96`}>
          <div class="p-4">
            <div class="flex items-start">
              <div class="shrink-0">
                {styles.icon}
              </div>
              <div class="ml-3 w-0 flex-1 pt-0.5">
                <p class="text-sm font-medium text-gray-600">{message}</p>
              </div>
              <div class="ml-4 flex shrink-0">
                <button
                  type="button"
                  class="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-600 focus:ring-offset-2 cursor-pointer"
                  onClick={handleClose}
                >
                  <span class="sr-only">Close</span>
                  <svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing toast notifications
 * Returns [isVisible, showToast, hideToast]
 */
export function useToast() {
  const [isVisible, setIsVisible] = useState(false);

  const showToast = () => {
    setIsVisible(true);
  };

  const hideToast = () => {
    setIsVisible(false);
  };

  return [isVisible, showToast, hideToast];
}
