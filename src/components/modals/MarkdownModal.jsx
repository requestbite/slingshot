import { useState, useEffect, useRef } from 'preact/hooks';
import { MarkdownPreview } from '../common/MarkdownPreview';

export function MarkdownModal({
  isOpen,
  onClose,
  onSave,
  initialMarkdown = '',
  title = 'Markdown Editor',
  subtitle = 'Edit and preview your CommonMark Markdown below.'
}) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const textareaRef = useRef();

  useEffect(() => {
    if (isOpen) {
      setMarkdown(initialMarkdown);

      // Lock body scroll and hide scrollbars to prevent background scrolling
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      // Store original values
      document.body.dataset.originalOverflow = document.body.style.overflow;
      document.body.dataset.originalPaddingRight = document.body.style.paddingRight;

      // Auto-focus on textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
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
  }, [isOpen, initialMarkdown]);

  const handleMarkdownChange = (e) => {
    setMarkdown(e.target.value);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(markdown);
    }
    onClose();
  };

  const handleClose = () => {
    setMarkdown(initialMarkdown);
    onClose();
  };


  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    // Handle escape on input fields directly to bypass browser blur behavior
    const handleInputEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
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
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 bg-gray-500/75 transition-opacity z-50">
      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
          <div
            class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 w-full sm:p-6"
            style={{ maxWidth: '950px', maxHeight: '500px' }}
          >

            {/* Close button */}
            <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
              <button
                onClick={handleClose}
                type="button"
                class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
              >
                <span class="sr-only">Close</span>
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal content */}
            <div class="h-full flex flex-col">
              <div class="text-center mt-0 sm:text-left mb-4">
                <h3 class="text-base font-semibold text-gray-900">{title}</h3>
                <div class="mt-2 text-sm text-gray-500">{subtitle}</div>
              </div>

              <div class="flex-1 flex gap-4 min-h-0">
                <div class="flex-1">
                  <textarea
                    ref={textareaRef}
                    class="w-full h-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    placeholder="Enter your markdown here..."
                    value={markdown}
                    onInput={handleMarkdownChange}
                  />
                </div>
                <div class="flex-1">
                  <MarkdownPreview markdown={markdown} />
                </div>
              </div>

              <div class="mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSave}
                  class="inline-flex w-full justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 sm:ml-3 sm:w-auto cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}