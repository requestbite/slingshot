import { useEffect, useRef, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';

export function Portal({ children }) {
  const containerRef = useRef();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Create container element if it doesn't exist
    if (!containerRef.current) {
      containerRef.current = document.createElement('div');
      containerRef.current.className = 'modal-portal';
      containerRef.current.style.cssText = `
        position: relative;
        z-index: 9999;
        pointer-events: none;
      `;
      document.body.appendChild(containerRef.current);
      // Trigger re-render now that container exists
      setMounted(true);
    }

    const container = containerRef.current;

    return () => {
      // Clean up when component unmounts
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  }, []);

  if (!containerRef.current) {
    return null;
  }

  return createPortal(
    <div style={{ pointerEvents: 'auto' }}>
      {children}
    </div>,
    containerRef.current
  );
}