import { useEffect, useRef } from 'preact/hooks';

export function StreamingDisplay({ streamedChunks, isStreaming }) {
  const containerRef = useRef(null);

  // Auto-scroll to bottom when new chunks arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [streamedChunks]);

  return (
    <div
      ref={containerRef}
      class="streaming-display-container"
      style={{
        backgroundColor: '#2d3748',
        color: '#ffffff',
        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
        fontSize: '12px',
        borderRadius: '0.375rem',
        border: '1px solid #44475a',
        padding: '16px',
        minHeight: '200px',
        maxHeight: '400px',
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}
    >
      {streamedChunks.length === 0 && isStreaming && (
        <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
          Waiting for streaming data...
        </div>
      )}

      {streamedChunks.map((chunk, index) => (
        <div
          key={index}
          class="streaming-chunk"
          style={{
            marginBottom: '8px',
            paddingBottom: '4px',
            borderBottom: index < streamedChunks.length - 1 ? '1px solid #374151' : 'none'
          }}
        >
          {chunk}
        </div>
      ))}

      {isStreaming && (
        <div
          style={{
            color: '#10b981',
            fontStyle: 'italic',
            marginTop: streamedChunks.length > 0 ? '8px' : '0'
          }}
        >
          ● Streaming...
        </div>
      )}
    </div>
  );
}