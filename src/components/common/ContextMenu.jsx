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
    const menuHeight = 120; // Approximate menu height
    const menuWidth = 160; // Menu width to match original (w-40 = 160px)
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Check if we're on mobile (screen width < 768px)
    const isMobile = window.innerWidth < 768;
    
    // Calculate position based on the original HTML template logic
    let left, top;
    
    if (isMobile) {
      // Mobile: position to the left of the button
      left = triggerRect.left - menuWidth - 4; // Menu width + 4px gap
      // Ensure menu doesn't go off-screen to the left
      if (left < 4) left = 4;
    } else {
      // Desktop: position to the right of the button
      left = triggerRect.right + 4; // 4px gap to the right of button
    }
    
    // Position the top left corner just below the 3-dots button
    top = triggerRect.bottom + 2; // Small 2px gap below the button
    
    // Check if menu goes below viewport and adjust if needed
    if (top + menuHeight > viewport.height) {
      top = triggerRect.top - menuHeight - 2;
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
      class="fixed z-50 w-40 bg-white py-1 shadow-lg ring-1 ring-black/5 rounded-md"
      style={{ 
        top: `${position.top}px`, 
        left: `${position.left}px`,
        minWidth: '120px'
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
              class={`block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer ${
                item.disabled ? 'opacity-50 cursor-not-allowed' : ''
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