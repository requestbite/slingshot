import { useEffect, useRef, useState } from 'preact/hooks';

export function StreamingDisplay({ streamedChunks, isStreaming, onCancel, response }) {
  const containerRef = useRef(null);
  const [wasCancelled, setWasCancelled] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showNoScrollButton, setShowNoScrollButton] = useState(false);

  // Debug effect to track streaming state
  useEffect(() => {
    console.log('[StreamingDisplay] State update:', {
      isStreaming,
      autoScroll,
      chunksCount: streamedChunks.length,
      showNoScrollButton,
      hasContainer: !!containerRef.current
    });
  }, [isStreaming, autoScroll, streamedChunks.length, showNoScrollButton]);

  // Handle cancel button click
  const handleCancel = () => {
    if (onCancel) {
      setWasCancelled(true);
      onCancel();
    }
  };

  // Handle "No scroll" button click
  const handleNoScroll = () => {
    setAutoScroll(false);
    setShowNoScrollButton(false);
  };

  // Auto-scroll when new chunks arrive during streaming
  useEffect(() => {
    if (!isStreaming || !autoScroll || !containerRef.current) return;

    const container = containerRef.current;

    // Always scroll the container to bottom to show new content
    container.scrollTop = container.scrollHeight;

    // Check if the container extends below the viewport after scrolling
    setTimeout(() => {
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const isContainerBelowFold = containerRect.bottom > window.innerHeight;

        if (isContainerBelowFold) {
          // Show the "No scroll" button and auto-scroll the window
          setShowNoScrollButton(true);

          // Scroll the window to keep the container bottom in view
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    }, 50); // Small delay to let DOM update
  }, [streamedChunks, isStreaming, autoScroll]);

  // Handle manual scrolling - if user scrolls up significantly, disable auto-scroll
  useEffect(() => {
    if (!isStreaming) return;

    const handleContainerScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const scrollFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (scrollFromBottom > 100 && autoScroll) {
        setAutoScroll(false);
        setShowNoScrollButton(false);
      }
    };

    const handleWindowScroll = () => {
      // If user manually scrolls the window up significantly, disable auto-scroll
      const scrollFromBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (scrollFromBottom > 200 && autoScroll) {
        setAutoScroll(false);
        setShowNoScrollButton(false);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleContainerScroll);
      window.addEventListener('scroll', handleWindowScroll);
      return () => {
        container.removeEventListener('scroll', handleContainerScroll);
        window.removeEventListener('scroll', handleWindowScroll);
      };
    }
  }, [isStreaming, autoScroll]);

  return (
    <div class="relative">
      <div
        ref={containerRef}
        class="streaming-display-container bg-gray-700 text-white font-mono text-xs rounded-md border border-gray-600 p-4 min-h-[200px] max-h-[400px] overflow-y-auto whitespace-pre-wrap break-words"
      >
        {streamedChunks.length === 0 && isStreaming && (
          <div class="text-gray-400 italic">
            Waiting for streaming data...
          </div>
        )}

        {streamedChunks.map((chunk, index) => (
          <div
            key={index}
            class={`streaming-chunk mb-0.5 pb-0.5 ${index < streamedChunks.length - 1 ? 'border-b border-gray-600' : ''}`}
          >
            {chunk}
          </div>
        ))}

        {(wasCancelled || response?.cancelled) && !isStreaming && (
          <div class="streaming-chunk mb-0.5 pb-0.5 text-red-400 italic">
            Request cancelled by user.
          </div>
        )}

        {isStreaming && !wasCancelled && (
          <div class="text-green-400 italic">
            ● Streaming...
          </div>
        )}
      </div>

      {/* Floating buttons - only show during streaming */}
      {isStreaming && !wasCancelled && (
        <div class="fixed bottom-4 right-4 z-50 flex items-center space-x-2">
          {/* No scroll button - only show when auto-scrolling is active */}
          {showNoScrollButton && (
            <button
              onClick={handleNoScroll}
              class="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-sm font-medium cursor-pointer shadow-lg border border-blue-300"
            >
              No scroll
            </button>
          )}

          {/* Cancel Request button */}
          {onCancel && (
            <button
              onClick={handleCancel}
              class="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm font-medium cursor-pointer shadow-lg border border-red-300"
            >
              Cancel Request
            </button>
          )}
        </div>
      )}
    </div>
  );
}
