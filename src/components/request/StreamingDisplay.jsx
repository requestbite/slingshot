import { useEffect, useRef, useState } from 'preact/hooks';

export function StreamingDisplay({ streamedChunks, isStreaming, onCancel, response }) {
  const containerRef = useRef(null);
  const [wasCancelled, setWasCancelled] = useState(false);

  // Handle cancel button click
  const handleCancel = () => {
    if (onCancel) {
      setWasCancelled(true);
      onCancel();
    }
  };

  // Auto-scroll to bottom when new chunks arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [streamedChunks, wasCancelled]);

  return (
    <div class="relative">
      <div
        ref={containerRef}
        class="streaming-display-container bg-gray-700 text-white font-mono text-xs rounded-md border border-gray-600 p-4 min-h-[200px] whitespace-pre-wrap break-words"
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

      {/* Floating Cancel Request Button - only show during streaming */}
      {isStreaming && onCancel && !wasCancelled && (
        <div class="fixed bottom-4 right-4 z-50">
          <button
            onClick={handleCancel}
            class="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm font-medium cursor-pointer shadow-lg border border-red-300"
          >
            Cancel Request
          </button>
        </div>
      )}
    </div>
  );
}
