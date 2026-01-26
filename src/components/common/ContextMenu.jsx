import { useState, useEffect, useRef } from 'preact/hooks';

export function ContextMenu({ isOpen, onClose, trigger, children, items = [], width, position = "right" }) {
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef();

  useEffect(() => {
    if (isOpen && trigger) {
      calculatePosition();
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, trigger]);

  const calculatePosition = () => {
    if (!trigger || !menuRef.current) return;

    const triggerRect = trigger.getBoundingClientRect();
    const menuHeight = 120; // Approximate menu height
    const menuWidth = width || 160; // Use provided width or default to 160px
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Check if we're on mobile (screen width < 768px)
    const isMobile = window.innerWidth < 768;

    // Calculate position
    let left, top;

    if (position === "below") {
      // Position below the trigger, aligned to bottom-left
      left = triggerRect.left;
      top = triggerRect.bottom + 4;
      
      // Ensure menu doesn't go off-screen to the right
      if (left + menuWidth > viewport.width - 8) {
        left = viewport.width - menuWidth - 8;
      }
      
      // Ensure menu doesn't go off-screen to the left
      if (left < 8) left = 8;
      
      // If it would go below viewport, position above instead
      if (top + menuHeight > viewport.height - 8) {
        top = triggerRect.top - menuHeight - 4;
      }
    } else {
      // Default "right" position behavior
      if (isMobile) {
        // Mobile: position to the left of the button
        left = triggerRect.left - menuWidth - 4;
        // Ensure menu doesn't go off-screen to the left
        if (left < 8) left = 8;
      } else {
        // Desktop: position to the right of the button
        left = triggerRect.right + 4;
        // Ensure menu doesn't go off-screen to the right
        if (left + menuWidth > viewport.width - 8) {
          left = triggerRect.left - menuWidth - 4;
        }
      }

      // Check if menu should open upward
      const spaceBelow = viewport.height - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const shouldOpenUpward = spaceBelow < menuHeight && spaceAbove > menuHeight;

      if (shouldOpenUpward) {
        // Position menu above the trigger button
        top = triggerRect.top - menuHeight - 4;
      } else {
        // Position menu below the trigger button
        top = triggerRect.bottom + 4;

        // If it would go below viewport, try to position it above
        if (top + menuHeight > viewport.height - 8) {
          top = triggerRect.top - menuHeight - 4;
        }
      }
    }

    // Ensure menu doesn't go above viewport
    if (top < 8) {
      top = 8;
    }

    setMenuPosition({ top, left });
  };

  const handleClickOutside = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target) &&
      trigger && !trigger.contains(e.target)) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleItemClick = (item) => {
    if (item.onClick) {
      item.onClick();
    }
    // Defer onClose to next tick to allow onClick handler to complete
    // This prevents state update conflicts when onClick opens a modal
    setTimeout(() => {
      onClose();
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      class="fixed z-[80] bg-white py-1 shadow-lg ring-1 ring-black/5 rounded-md"
      style={{
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        width: width ? `${width}px` : '176px', // w-44 = 176px default
        minWidth: width ? `${width}px` : '120px',
        visibility: menuPosition.top === 0 && menuPosition.left === 0 ? 'hidden' : 'visible'
      }}
    >
      {children || (
        items.map((item, index) => {
          if (item.divider) {
            return <div key={index} class="border-t border-gray-200 my-1"></div>;
          }

          if (item.sectionTitle) {
            return <div key={index} class="text-xs px-4 mt-3 mb-1 text-left text-gray-500">{item.sectionTitle}</div>;
          }

          const commonClasses = `block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer no-underline ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${item.destructive ? 'text-red-600 hover:text-red-700' : ''}`;

          const labelContent = (
            <>
              {item.icon && (
                <span class="inline-block w-4 h-4 mr-2 align-middle">
                  {item.icon}
                </span>
              )}
              <span>
                {item.label}
                {item.subtext && (
                  <>
                    <br />
                    <span class="text-xs text-gray-500">{item.subtext}</span>
                  </>
                )}
              </span>
            </>
          );

          // If item has href, render as anchor tag
          if (item.href) {
            return (
              <a
                key={index}
                href={item.href}
                target={item.target}
                onClick={(e) => {
                  if (item.onClick) {
                    if (!item.target || item.target === '_self') {
                      e.preventDefault();
                    }
                    handleItemClick(item);
                  }
                }}
                class={commonClasses}
              >
                {labelContent}
              </a>
            );
          }

          // Otherwise render as button
          return (
            <button
              key={index}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              class={commonClasses}
            >
              {labelContent}
            </button>
          );
        })
      )}
    </div>
  );
}
