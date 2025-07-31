import { useEffect, useRef } from 'preact/hooks';
import { createPortal } from 'preact/compat';

export function Portal({ children }) {
  const containerRef = useRef();

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