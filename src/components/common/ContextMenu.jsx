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
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      class="fixed z-50 bg-white py-1 shadow-lg ring-1 ring-black/5 rounded-md"
      style={{
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        width: width ? `${width}px` : '176px', // w-44 = 176px default
        minWidth: width ? `${width}px` : '120px',
        visibility: menuPosition.top === 0 && menuPosition.left === 0 ? 'hidden' : 'visible'
      }}
    >
      {children || (
        items.map((item, index) => (
          item.divider ? (
            <div key={index} class="border-t border-gray-200 my-1"></div>
          ) : (
            <button
              key={index}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              class={`block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''
                } ${item.destructive ? 'text-red-600 hover:text-red-700' : ''}`}
            >
              {item.icon && (
                <span class="inline-block w-4 h-4 mr-2">
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          )
        ))
      )}
    </div>
  );
}
