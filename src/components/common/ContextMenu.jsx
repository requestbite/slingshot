import { useState, useEffect, useRef } from 'preact/hooks';

export function ContextMenu({ isOpen, onClose, trigger, children, items = [] }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef();
  const triggerRef = useRef();

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
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let top = triggerRect.bottom + 4;
    let left = triggerRect.right - 120; // Menu width approximation

    // Adjust if menu would go below viewport
    if (top + menuRect.height > viewport.height) {
      top = triggerRect.top - menuRect.height - 4;
    }

    // Adjust if menu would go outside left edge
    if (left < 8) {
      left = 8;
    }

    // Adjust if menu would go outside right edge
    if (left + 120 > viewport.width - 8) {
      left = viewport.width - 120 - 8;
    }

    setPosition({ top, left });
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
      class="fixed z-50 min-w-[120px] bg-white py-1 shadow-lg ring-1 ring-black/5 rounded-md"
      style={{ 
        top: `${position.top}px`, 
        left: `${position.left}px`,
        transform: 'translateY(0)' 
      }}
    >
      {children || (
        items.map((item, index) => (
          <button
            key={index}
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            class={`w-full text-left px-3 py-2 text-sm transition-colors ${
              item.disabled 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            } ${item.destructive ? 'text-red-600 hover:text-red-700' : ''}`}
          >
            {item.icon && (
              <span class="inline-block w-4 h-4 mr-2">
                {item.icon}
              </span>
            )}
            {item.label}
          </button>
        ))
      )}
    </div>
  );
}