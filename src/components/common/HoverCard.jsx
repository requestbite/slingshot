import { createContext } from 'preact';
import { cloneElement } from 'preact';
import { useState, useEffect, useRef, useContext, useCallback } from 'preact/hooks';
import { Portal } from './Portal';

const HoverCardContext = createContext(null);

/**
 * HoverCard Component
 *
 * A card that appears when hovering over a trigger element, for previewing content.
 *
 * @param {Object} props
 * @param {preact.ComponentChildren} props.children - Must include HoverCardTrigger and HoverCardContent
 * @param {number} [props.openDelay=700] - Delay in ms before opening
 * @param {number} [props.closeDelay=300] - Delay in ms before closing
 */
export function HoverCard({ children, openDelay = 700, closeDelay = 300 }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const openCard = useCallback(() => {
    clearTimeout(closeTimerRef.current);
    openTimerRef.current = setTimeout(() => setIsOpen(true), openDelay);
  }, [openDelay]);

  const closeCard = useCallback(() => {
    clearTimeout(openTimerRef.current);
    closeTimerRef.current = setTimeout(() => setIsOpen(false), closeDelay);
  }, [closeDelay]);

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(openTimerRef.current);
      clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <HoverCardContext.Provider value={{ isOpen, openCard, closeCard, cancelClose, triggerRef }}>
      {children}
    </HoverCardContext.Provider>
  );
}

/**
 * HoverCardTrigger Component
 *
 * Wraps the element that triggers the hover card.
 *
 * @param {Object} props
 * @param {preact.ComponentChildren} props.children - The trigger element
 * @param {boolean} [props.asChild=false] - Merge props onto the child element instead of wrapping in a span
 */
export function HoverCardTrigger({ children, asChild = false }) {
  const { openCard, closeCard, triggerRef } = useContext(HoverCardContext);

  const handlers = {
    onMouseEnter: openCard,
    onMouseLeave: closeCard,
    onFocus: openCard,
    onBlur: closeCard,
  };

  if (asChild && children) {
    return cloneElement(children, { ref: triggerRef, ...handlers });
  }

  return (
    <span ref={triggerRef} {...handlers} style={{ display: 'inline-block' }}>
      {children}
    </span>
  );
}

/**
 * HoverCardContent Component
 *
 * The content displayed when the hover card is open.
 *
 * @param {Object} props
 * @param {preact.ComponentChildren} props.children - Card content
 * @param {'top'|'bottom'|'left'|'right'} [props.side='bottom'] - Preferred side to display on
 * @param {'start'|'center'|'end'} [props.align='center'] - Alignment relative to trigger
 * @param {number} [props.sideOffset=4] - Offset in px from the trigger
 * @param {string} [props.className] - Additional CSS classes
 */
export function HoverCardContent({ children, side = 'bottom', align = 'center', sideOffset = 4, className = '' }) {
  const { isOpen, closeCard, cancelClose, triggerRef } = useContext(HoverCardContext);
  const contentRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(false);
      requestAnimationFrame(() => {
        calculatePosition();
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const calculatePosition = () => {
    if (!triggerRef.current || !contentRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };

    let top = 0;
    let left = 0;

    if (side === 'bottom') {
      top = triggerRect.bottom + sideOffset;
      if (align === 'center') left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
      else if (align === 'start') left = triggerRect.left;
      else if (align === 'end') left = triggerRect.right - contentRect.width;
    } else if (side === 'top') {
      top = triggerRect.top - contentRect.height - sideOffset;
      if (align === 'center') left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
      else if (align === 'start') left = triggerRect.left;
      else if (align === 'end') left = triggerRect.right - contentRect.width;
    } else if (side === 'left') {
      left = triggerRect.left - contentRect.width - sideOffset;
      if (align === 'center') top = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2;
      else if (align === 'start') top = triggerRect.top;
      else if (align === 'end') top = triggerRect.bottom - contentRect.height;
    } else if (side === 'right') {
      left = triggerRect.right + sideOffset;
      if (align === 'center') top = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2;
      else if (align === 'start') top = triggerRect.top;
      else if (align === 'end') top = triggerRect.bottom - contentRect.height;
    }

    // Clamp to viewport with 8px margin
    left = Math.max(8, Math.min(left, viewport.width - contentRect.width - 8));
    top = Math.max(8, Math.min(top, viewport.height - contentRect.height - 8));

    setPosition({ top, left });
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        ref={contentRef}
        class={`fixed z-50 w-64 rounded-md border border-gray-200 dark:border-neutral-dark-300 bg-white dark:bg-surface-dark-elevated p-4 text-gray-900 dark:text-neutral-dark-900 shadow-md transition-[opacity,transform] duration-150 origin-top ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} ${className}`}
        style={{ top: `${position.top}px`, left: `${position.left}px`, visibility: visible ? 'visible' : 'hidden' }}
        onMouseEnter={cancelClose}
        onMouseLeave={closeCard}
      >
        {children}
      </div>
    </Portal>
  );
}
