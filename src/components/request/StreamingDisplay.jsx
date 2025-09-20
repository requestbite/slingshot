import { useEffect, useRef, useState } from 'preact/hooks';
import { Toast, useToast } from '../common/Toast';

// Extract JSON from SSE formatted chunk
function extractJSONFromSSE(text) {
  if (!text || typeof text !== 'string') return null;

  // Handle SSE format: "data: {...}" or "data:{...}"
  // Also handle multiline SSE data
  const dataMatch = text.match(/^data:\s*(.+)$/m);
  if (dataMatch) {
    return dataMatch[1].trim();
  }

  // Return original text if not SSE format
  return text.trim();
}

// Utility function to check if text contains valid JSON
function isValidJSON(text) {
  if (!text || typeof text !== 'string') return false;

  const jsonPart = extractJSONFromSSE(text);
  if (!jsonPart) return false;

  // Quick check - JSON part must start with { or [
  const trimmed = jsonPart.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;

  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

// Lightweight JSON syntax highlighting
function highlightJSON(text) {
  if (!text || typeof text !== 'string') return text;

  // Check if this is SSE format
  const dataMatch = text.match(/^(data:\s*)(.+)$/m);

  let jsonPart, prefix = '';
  if (dataMatch) {
    prefix = dataMatch[1];
    jsonPart = dataMatch[2];
  } else {
    jsonPart = text;
  }

  // Escape HTML first
  let highlighted = jsonPart
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // More precise highlighting to avoid conflicts
  // 1. First highlight complete key-value pairs with string values
  highlighted = highlighted.replace(
    /"([^"]+)"\s*:\s*"([^"]*)"/g,
    '<span style="color: #66d9ef">"$1"</span><span style="color: #ffffff">:</span><span style="color: #eaf389">"$2"</span>'
  );

  // 2. Then highlight remaining keys (for non-string values)
  highlighted = highlighted.replace(
    /"([^"]+)"\s*:/g,
    '<span style="color: #66d9ef">"$1"</span><span style="color: #ffffff">:</span>'
  );

  // 3. Finally highlight structural characters that aren't already in spans
  highlighted = highlighted.replace(
    /([{}\[\],])(?![^<]*>)/g,
    '<span style="color: #ffffff">$1</span>'
  );

  // If SSE format, add the prefix back with white color
  if (prefix) {
    highlighted = `<span style="color: #ffffff">${prefix}</span>${highlighted}`;
  }

  return highlighted;
}

export function StreamingDisplay({ streamedChunks, isStreaming, onCancel, response }) {
  const containerRef = useRef(null);
  const [wasCancelled, setWasCancelled] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showNoScrollButton, setShowNoScrollButton] = useState(false);
  const [isToastVisible, showToast, hideToast] = useToast();


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

  // Copy chunk data to clipboard
  const copyChunkToClipboard = async (chunk) => {
    try {
      // Extract only the data part (without "data:" prefix)
      const dataOnly = extractJSONFromSSE(chunk) || chunk;
      await navigator.clipboard.writeText(dataOnly);
      showToast();
    } catch (error) {
      console.error('Failed to copy chunk to clipboard:', error);
    }
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
        class="streaming-display-container bg-gray-700 text-white font-mono text-xs rounded-md border border-gray-600 min-h-[200px] max-h-[400px] overflow-y-auto whitespace-pre-wrap break-words"
        style="padding: 16px 16px 16px 8px"
      >
        {streamedChunks.length === 0 && isStreaming && (
          <div class="flex items-start">
            <div class="flex-shrink-0 w-6 mr-2"></div>
            <div class="flex-1 text-gray-400 italic">
              Waiting for streaming data...
            </div>
          </div>
        )}

        {streamedChunks.map((chunk, index) => {
          const isJSON = isValidJSON(chunk);
          return (
            <div
              key={index}
              class={`streaming-chunk flex items-start group ${index < streamedChunks.length - 1 ? 'mb-1 pb-1 border-b border-gray-600' : 'mb-0'}`}
            >
              {/* Copy button gutter */}
              <div class="flex-shrink-0 w-6 mr-2 flex justify-center">
                <button
                  onClick={() => copyChunkToClipboard(chunk)}
                  class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-white cursor-pointer p-0.5 rounded"
                  title="Copy chunk data"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3">
                    <path d="M20 2H10c-1.103 0-2 .897-2 2v4H4c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2v-4h4c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zM4 20V10h10l.002 10H4zm16-6h-4v-4c0-1.103-.897-2-2-2h-4V4h10v10z"></path>
                  </svg>
                </button>
              </div>

              {/* Chunk content */}
              <div class="flex-1 min-w-0">
                {isJSON ? (
                  <div dangerouslySetInnerHTML={{ __html: highlightJSON(chunk) }} />
                ) : (
                  chunk
                )}
              </div>
            </div>
          );
        })}

        {(wasCancelled || response?.cancelled) && !isStreaming && (
          <div class="streaming-chunk flex items-start mb-0.5 pb-0.5">
            <div class="flex-shrink-0 w-6 mr-2"></div>
            <div class="flex-1 text-red-400 italic">
              Request cancelled by user.
            </div>
          </div>
        )}

        {isStreaming && !wasCancelled && (
          <div class="flex items-start">
            <div class="flex-shrink-0 w-6 mr-2"></div>
            <div class="flex-1 text-green-400 italic">
              ● Streaming...
            </div>
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

      {/* Toast notification */}
      <Toast
        message="Chunk copied to clipboard!"
        isVisible={isToastVisible}
        onClose={hideToast}
        type="success"
      />
    </div>
  );
}
