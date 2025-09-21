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
  const [prettifiedChunks, setPrettifiedChunks] = useState(new Set());
  const lastScrollTimeRef = useRef(0);


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

  // Toggle JSON prettification for a specific chunk
  const togglePrettifyChunk = (index) => {
    setPrettifiedChunks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Format JSON with prettification if enabled for this chunk
  const formatChunkContent = (chunk, index) => {
    const isJSON = isValidJSON(chunk);
    const isPrettified = prettifiedChunks.has(index);

    if (!isJSON) {
      return chunk;
    }

    if (isPrettified) {
      try {
        const jsonPart = extractJSONFromSSE(chunk);
        const parsed = JSON.parse(jsonPart);
        const prettified = JSON.stringify(parsed, null, 2);

        // Handle SSE format
        const dataMatch = chunk.match(/^(data:\\s*)/m);
        if (dataMatch) {
          return dataMatch[1] + prettified;
        }
        return prettified;
      } catch {
        return chunk;
      }
    }

    return chunk;
  };

  // Auto-scroll when new chunks arrive during streaming
  useEffect(() => {
    if (!isStreaming || !autoScroll || !containerRef.current) return;

    const container = containerRef.current;

    // Scroll to bottom smoothly but efficiently during streaming
    const scrollToBottom = () => {
      const now = Date.now();
      const timeSinceLastScroll = now - lastScrollTimeRef.current;

      // Only use instant scrolling for very rapid updates (< 50ms apart)
      // For normal streaming (1 second intervals), always use smooth scrolling
      const shouldUseSmooth = timeSinceLastScroll > 50;

      // Scroll the container smoothly
      if (shouldUseSmooth) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
        lastScrollTimeRef.current = now;
      } else {
        // For extremely rapid updates, use instant scroll to keep up
        container.scrollTop = container.scrollHeight;
      }

      // Check if container is visible on screen and scroll window only if needed
      requestAnimationFrame(() => {
        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const isContainerBelowFold = containerRect.bottom > window.innerHeight;

          if (isContainerBelowFold) {
            // Show the "No scroll" button
            setShowNoScrollButton(true);

            // Only scroll window enough to bring the container into view, not to the very bottom
            const scrollTarget = window.scrollY + (containerRect.bottom - window.innerHeight) + 20; // 20px padding
            window.scrollTo({
              top: scrollTarget,
              behavior: shouldUseSmooth ? 'smooth' : 'instant'
            });
          }
        }
      });
    };

    scrollToBottom();
  }, [streamedChunks, isStreaming, autoScroll]);

  // Handle manual scrolling - if user scrolls up significantly, disable auto-scroll
  useEffect(() => {
    if (!isStreaming) return;

    let scrollTimeout;

    const handleContainerScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      // Debounce scroll detection to avoid conflicts with rapid auto-scrolling
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (scrollFromBottom > 100 && autoScroll) {
          setAutoScroll(false);
          setShowNoScrollButton(false);
        }
      }, 150); // Debounce manual scroll detection
    };

    const handleWindowScroll = () => {
      // If user manually scrolls the window up significantly, disable auto-scroll
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollFromBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
        if (scrollFromBottom > 200 && autoScroll) {
          setAutoScroll(false);
          setShowNoScrollButton(false);
        }
      }, 150); // Debounce manual scroll detection
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleContainerScroll);
      window.addEventListener('scroll', handleWindowScroll);
      return () => {
        clearTimeout(scrollTimeout);
        container.removeEventListener('scroll', handleContainerScroll);
        window.removeEventListener('scroll', handleWindowScroll);
      };
    }
  }, [isStreaming, autoScroll]);

  return (
    <div class="relative">
      <div
        ref={containerRef}
        class="streaming-display-container text-white font-mono text-xs rounded-md border border-gray-600 min-h-[200px] whitespace-pre overflow-x-auto"
        style="padding: 10px 16px 10px 8px; background-color: #282a36;"
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
          const formattedChunk = formatChunkContent(chunk, index);
          const isPrettified = prettifiedChunks.has(index);
          return (
            <div
              key={index}
              class={`streaming-chunk flex items-start group ${index < streamedChunks.length - 1 ? 'mb-2 pb-2 border-b border-gray-700' : 'mb-0'}`}
            >
              {/* Button gutter */}
              <div class="flex-shrink-0 w-12 mr-2 flex justify-center space-x-1">
                {/* Copy button */}
                <button
                  onClick={() => copyChunkToClipboard(chunk)}
                  class="bg-gray-700 text-gray-400 hover:text-white cursor-pointer p-1 rounded transition-colors duration-200"
                  title="Copy chunk data"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3">
                    <path d="M20 2H10c-1.103 0-2 .897-2 2v4H4c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2v-4h4c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zM4 20V10h10l.002 10H4zm16-6h-4v-4c0-1.103-.897-2-2-2h-4V4h10v10z"></path>
                  </svg>
                </button>

                {/* Prettify JSON button */}
                <button
                  onClick={() => togglePrettifyChunk(index)}
                  disabled={!isJSON}
                  class={`p-1 rounded transition-colors duration-200 ${!isJSON
                    ? 'text-gray-500 cursor-default'
                    : isPrettified
                      ? 'bg-sky-100 text-sky-700 hover:bg-sky-200 cursor-pointer'
                      : 'bg-gray-700 text-gray-400 hover:text-white cursor-pointer'
                    }`}
                  title={!isJSON ? "Not valid JSON" : isPrettified ? "Minimize JSON" : "Prettify JSON"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3">
                    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" /><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
                  </svg>
                </button>
              </div>

              {/* Chunk content */}
              <div class="flex-1 min-w-0 my-1">
                {isJSON ? (
                  <div dangerouslySetInnerHTML={{ __html: highlightJSON(formattedChunk) }} />
                ) : (
                  formattedChunk
                )}
              </div>
            </div>
          );
        })}

        {(wasCancelled || response?.cancelled) && !isStreaming && (
          <div class="streaming-chunk flex items-start mb-0.5 pb-0.5 mt-2">
            <div class="flex-shrink-0 w-12 mr-2"></div>
            <div class="flex-1 text-red-400 italic">
              {wasCancelled ? 'Request cancelled by user.' : 'Request cancelled by user.'}
            </div>
          </div>
        )}

        {response?.timedOut && !isStreaming && (
          <div class="streaming-chunk flex items-start mb-0.5 pb-0.5 mt-2">
            <div class="flex-shrink-0 w-12 mr-2"></div>
            <div class="flex-1 text-orange-400 italic">
              Request timed out.
            </div>
          </div>
        )}

        {isStreaming && !wasCancelled && (
          <div class="flex items-start my-2">
            <div class="flex-shrink-0 w-12 my-2 ml-2"></div>
            <div class="flex-1 text-green-400 italic">
              ● Streaming...
            </div>
          </div>
        )}
      </div>

      {/* Floating buttons - only show during streaming */}
      {isStreaming && !wasCancelled && (
        <div class="fixed bottom-8 right-8 z-50 flex items-center space-x-2">
          {/* No scroll button - only show when auto-scrolling is active */}
          {showNoScrollButton && (
            <button
              onClick={handleNoScroll}
              class="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-sm font-medium cursor-pointer shadow-lg border border-blue-300"
            >
              Stop Scroll
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
