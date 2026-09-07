import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Portal } from './Portal';
import { Button } from './Button';

const NO_OFFSET = { x: 0, y: 0 };

// Keeps a value inside [lo, hi] even when the two are inverted, which happens
// when the panel is larger than the viewport on that axis.
function clamp(value, lo, hi) {
  return Math.min(Math.max(value, Math.min(lo, hi)), Math.max(lo, hi));
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl'
  };

  // The panel is tracked as state, not a plain ref: Portal renders null on its
  // first pass and only mounts its container in an effect, so the panel lands
  // in the DOM a render later than this component. A callback ref re-runs the
  // measurement at the moment the node actually attaches.
  const [panelEl, setPanelEl] = useState(null);
  const dragRef = useRef(null);
  // Desktop mode: the panel is capped by its max-width instead of stretching
  // across the whole row. Only then is there anywhere to drag it to.
  const [isDraggable, setIsDraggable] = useState(false);
  const [offset, setOffset] = useState(NO_OFFSET);
  const [isDragging, setIsDragging] = useState(false);

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

  // Every open starts from the centered position.
  useEffect(() => {
    if (!isOpen) {
      dragRef.current = null;
      setIsDragging(false);
      setOffset(NO_OFFSET);
    }
  }, [isOpen]);

  // Compare the panel against the space it is laid out in: when it is narrower
  // it has been capped by max-width (desktop), when it fills the row it is the
  // full-width mobile layout and stays exactly as it was.
  useLayoutEffect(() => {
    if (!isOpen) return;

    const measure = () => {
      const row = panelEl?.parentElement;
      if (!row) return;
      const style = window.getComputedStyle(row);
      const available = row.clientWidth
        - parseFloat(style.paddingLeft || 0)
        - parseFloat(style.paddingRight || 0);
      setIsDraggable(panelEl.offsetWidth < available - 1);
    };

    measure();

    // A resize invalidates the offset we clamped against, so drop back to the
    // centered position rather than leaving the panel half off-screen.
    const handleResize = () => {
      dragRef.current = null;
      setIsDragging(false);
      setOffset(NO_OFFSET);
      measure();
    };
    window.addEventListener('resize', handleResize);

    let observer;
    if (typeof ResizeObserver !== 'undefined' && panelEl) {
      observer = new ResizeObserver(measure);
      observer.observe(panelEl);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [isOpen, size, panelEl]);

  useEffect(() => {
    if (!isDraggable) {
      dragRef.current = null;
      setIsDragging(false);
      setOffset(NO_OFFSET);
    }
  }, [isDraggable]);

  const handlePointerDown = useCallback((e) => {
    if (!isDraggable || (e.button !== undefined && e.button !== 0)) return;
    if (!panelEl) return;

    // Bounds are taken once, at grab time: the pointer may not travel further
    // than what keeps the panel fully inside the viewport.
    const rect = panelEl.getBoundingClientRect();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
      minDx: -rect.left,
      maxDx: window.innerWidth - rect.right,
      minDy: -rect.top,
      maxDy: window.innerHeight - rect.bottom
    };

    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsDragging(true);
  }, [isDraggable, offset.x, offset.y, panelEl]);

  const handlePointerMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setOffset({
      x: drag.originX + clamp(e.clientX - drag.startX, drag.minDx, drag.maxDx),
      y: drag.originY + clamp(e.clientY - drag.startY, drag.minDy, drag.maxDy)
    });
  }, []);

  const handlePointerUp = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  if (!isOpen) return null;

  const panelStyle = isDraggable
    ? {
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        // transition-all would smear movement into an animation. It has to stay
        // off while displaced too, not just while dragging: the last
        // pointermove and the pointerup batch into one render, so re-enabling
        // it on release would animate that final step.
        transition: isDragging || offset.x !== 0 || offset.y !== 0 ? 'none' : undefined
      }
    : undefined;

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
        <div class="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/60 transition-opacity" aria-hidden="true" style={{
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
              ref={setPanelEl}
              class={`relative transform overflow-hidden rounded-lg bg-white dark:bg-surface-dark-elevated px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 w-full ${sizeClasses[size]} sm:p-6 ${isDragging ? 'select-none' : ''}`}
              style={panelStyle}
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
                  {/* The title band doubles as the drag handle on desktop; the
                      negative margins stretch it across the panel's own top
                      padding so the whole strip is grabbable. The close button
                      is positioned above it and keeps taking its own clicks. */}
                  <div
                    class={`-mx-4 -mt-5 px-4 pt-5 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 ${isDraggable ? 'cursor-move' : ''}`}
                    style={isDraggable ? { touchAction: 'none' } : undefined}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
                    <h3 class="text-base font-semibold text-gray-900 dark:text-neutral-dark-900 text-center sm:text-left">{title}</h3>
                  </div>

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
