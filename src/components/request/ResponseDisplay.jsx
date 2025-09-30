import { useState, useEffect, useRef } from 'preact/hooks';
import { WelcomeMessage } from '../common/WelcomeMessage';
import { Toast, useToast } from '../common/Toast';
import CodeMirror from '@uiw/react-codemirror';
import { requestSubmitter } from '../../utils/requestSubmitter';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { EditorView } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';
import { ansiColors } from '../codemirror/ansiExtension.js';
import { HtmlTabs } from './HtmlTabs';
import { HtmlPreview } from './HtmlPreview';
import { ImageDisplay } from './ImageDisplay';
import { StreamingDisplay } from './StreamingDisplay';
import {
  processStatusCode,
  processResponseHeaders,
  isSupportedImageType,
  downloadBinaryContent,
  getDownloadFilename,
  isJsonContent,
  isHtmlContentType,
  isSSEContentType,
  processResponseContent,
  getOriginalResponseContent,
  getStatusColor
} from './ResponseDisplayUtils';

export function ResponseDisplay({ response, isLoading, onCancel, onClear, isStreaming, streamedContent, streamedChunks, streamingMetadata }) {
  // Initialize headers visibility from localStorage, defaulting to false (closed)
  const [showHeaders, setShowHeaders] = useState(() => {
    try {
      const saved = localStorage.getItem('requestbite-headers-visible');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState('body');

  // Ref for CodeMirror editor to handle streaming updates
  const editorRef = useRef(null);
  const [activeHtmlTab, setActiveHtmlTab] = useState('preview');
  const [isToastVisible, showToast, hideToast] = useToast();

  // Save headers visibility preference to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('requestbite-headers-visible', JSON.stringify(showHeaders));
    } catch {
      // Ignore localStorage errors (e.g., private browsing mode)
    }
  }, [showHeaders]);

  // Auto-scroll to bottom when streaming content updates
  useEffect(() => {
    if (isStreaming && streamedContent && editorRef.current) {
      const editor = editorRef.current;
      const view = editor.view;
      if (view && view.state.doc.length > 0) {
        // Auto-scroll to bottom to show new content
        const scrollEffect = EditorView.scrollIntoView(view.state.doc.length, { y: 'end' });
        view.dispatch({
          effects: [scrollEffect]
        });
      }
    }
  }, [isStreaming, streamedContent]);

  if (isLoading) {
    return (
      <div class="flex items-center justify-center p-6 mb-4">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-sky-500 border-r-transparent mb-4"></div>
          <div class="text-sm text-gray-700 mb-3">Request in progress...</div>
          <button
            onClick={onCancel}
            class="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm font-medium cursor-pointer"
          >
            Cancel Request
          </button>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div class="px-6">
        <WelcomeMessage />
      </div>
    );
  }

  // Check if we have any response data (status, responseData, etc.)
  // If not, show welcome message even if response object exists
  // BUT: Don't show welcome message if we're in streaming mode
  if (!response.status && !response.responseData && !response.cancelled && response.success !== false && !isStreaming && !streamedContent) {
    return (
      <div class="px-6">
        <WelcomeMessage />
      </div>
    );
  }

  if (response.cancelled) {
    return (
      <div id="response-section">
        <div id="response-container">
          <div id="response-details-wrapper">
            <div id="cancelled-response-container">
              <div class="text-center py-6">
                {/* Cancelled Image */}
                <div class="mb-4">
                  <img src="/images/rabbit-timer-v1.webp" alt="Request Cancelled" class="mx-auto w-64 mb-4" />
                </div>
                {/* Cancelled Title */}
                <h4 class="text-xl font-medium text-gray-900 mb-2">Request Cancelled</h4>
                {/* Cancelled Message */}
                <div class="text-sm text-gray-600">Oh, was it that slow? Perhaps there are some connectivity issues.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!response.success) {
    return (
      <div id="response-section">
        <div id="response-container">
          <div id="response-details-wrapper">
            <div id="error-response-container">
              <div class="text-center py-6">
                {/* Error Image */}
                <div class="mb-4">
                  <img src="/images/rabbit-dizzy-v1.webp" alt="Request Error" class="mx-auto w-64 mb-4" />
                </div>
                {/* Error Title */}
                <h4 class="text-xl font-medium text-gray-900 mb-2">
                  {response.errorTitle || "Oh no, an error occurred"}
                </h4>
                {/* Error Message */}
                <div class="text-sm text-gray-600 mb-2">
                  {response.errorMessage || "Unable to complete the request"}
                </div>
                {/* Error Type */}
                <div class="text-xs font-mono text-gray-500 bg-gray-100 inline-block px-2 py-1 rounded">
                  {response.errorType || "error_type"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // Process the status code and headers for the current response
  // For SSE streaming, use streamingMetadata if available and preserve it
  let effectiveResponse = response;

  // Handle cached SSE responses from IndexedDB
  if (response?.response_type === 'SSE') {
    let storedMetadata = null;
    try {
      storedMetadata = response.streaming_metadata ? JSON.parse(response.streaming_metadata) : null;
    } catch (error) {
      console.error('Failed to parse stored SSE metadata:', error);
    }

    if (storedMetadata) {
      const status = storedMetadata.response_status || response?.response_status;
      effectiveResponse = {
        ...response,
        status: status,
        statusText: requestSubmitter.getStatusText(status),
        headers: storedMetadata.response_headers ? Object.entries(storedMetadata.response_headers).map(([key, value]) => ({
          name: key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('-'),
          value: value,
          isClickable: ['content-type', 'cache-control', 'authorization'].includes(key.toLowerCase())
        })) : (response?.headers || []),
        responseTime: 'N/A',
        responseSize: 'N/A'
      };
    }
  } else if ((isStreaming || streamingMetadata) && streamingMetadata) {
    const status = streamingMetadata.response_status || response?.status;
    effectiveResponse = {
      ...response,
      status: status,
      statusText: requestSubmitter.getStatusText(status), // Use proper status text
      headers: streamingMetadata.response_headers ? Object.entries(streamingMetadata.response_headers).map(([key, value]) => ({
        name: key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('-'),
        value: value,
        isClickable: ['content-type', 'cache-control', 'authorization'].includes(key.toLowerCase())
      })) : (response?.headers || []),
      // For SSE, always show N/A for time and size (no updates when streaming completes)
      responseTime: 'N/A',
      responseSize: 'N/A'
    };
  }

  const processedStatus = effectiveResponse ? processStatusCode(effectiveResponse.status, effectiveResponse.statusText) : null;
  const processedHeaders = effectiveResponse ? processResponseHeaders(effectiveResponse.headers) : [];

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Get CodeMirror extensions based on response content type
  const getResponseCodeMirrorExtensions = (response) => {
    const baseExtensions = [
      bracketMatching(),
      // Auto-expanding height based on content
      EditorView.theme({
        "&": {
          minHeight: "200px",
        },
        ".cm-content, .cm-gutter": {
          minHeight: "200px !important"
        },
        ".cm-scroller": {
          overflow: "auto"
        }
      }),
      // Make editor read-only
      EditorView.editable.of(false)
    ];

    // Determine content type from response headers or try to parse content
    const contentTypeHeader = response.headers?.find(h =>
      h.name.toLowerCase() === 'content-type'
    );
    const contentType = contentTypeHeader?.value || '';

    if (contentType.includes('application/json') || isJsonContent(response.responseData)) {
      return [...baseExtensions, json()];
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      return [...baseExtensions, xml()];
    } else if (contentType.includes('text/plain') && collection?.parse_ansi_colors !== false) {
      // Add ANSI color support for text/plain responses when enabled (default: true)
      // Pass the original content with ANSI sequences for styling
      const originalContent = getOriginalResponseContent(response);
      return [...baseExtensions, ansiColors(originalContent)];
    }

    return baseExtensions;
  };

  return (
    <div id="response-section" class="flex flex-col h-full">
      <div id="response-container" class="flex flex-col h-full">
        <div id="response-details-wrapper" class="flex flex-col h-full">

          {/* Response Metadata */}
          <div class="mb-4 overflow-x-auto scrollbar-hide" style="-ms-overflow-style: none; scrollbar-width: none;">
            <style>
              {`::-webkit-scrollbar { display: none; }`}
            </style>
            <div class="flex items-center justify-between flex-nowrap min-w-max">
              <div class="flex items-center space-x-4 flex-nowrap">
                <div class="flex items-center space-x-2 whitespace-nowrap">
                  <span class="text-sm font-medium text-gray-700">Status:</span>
                  <span class={`px-2 py-1 text-sm rounded-md ${getStatusColor(effectiveResponse.status)}`}>
                    {processedStatus?.isClickable ? (
                      <a
                        href={processedStatus.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="hover:underline inline-flex items-center"
                      >
                        {processedStatus.text}
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline relative -top-0.5 ml-0.5" stroke="currentColor">
                          <path d="M15 3h6v6"></path>
                          <path d="M10 14 21 3"></path>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        </svg>
                      </a>
                    ) : (
                      processedStatus?.text || `${effectiveResponse.status} ${effectiveResponse.statusText || ''}`
                    )}
                  </span>
                </div>
                <div class="flex items-center space-x-2 whitespace-nowrap">
                  <span class="text-sm font-medium text-gray-700">Time:</span>
                  <span class="px-2 py-1 text-sm bg-blue-50 text-blue-700 rounded-md whitespace-nowrap">
                    {effectiveResponse.responseTime}
                  </span>
                </div>
                <div class="flex items-center space-x-2 whitespace-nowrap">
                  <span class="text-sm font-medium text-gray-700">Size:</span>
                  <span class="px-2 py-1 text-sm bg-amber-50 text-amber-700 rounded-md whitespace-nowrap">
                    {effectiveResponse.responseSize}
                  </span>
                </div>
                {(isStreaming || streamingMetadata) && (
                  <div class="flex items-center space-x-2 whitespace-nowrap">
                    <span class="text-sm font-medium text-gray-700">Stream:</span>
                    <span class={`px-2 py-1 text-sm rounded-md whitespace-nowrap flex items-center ${isStreaming ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                      {isStreaming && (
                        <svg class="animate-spin -ml-1 mr-2 h-3 w-3 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      {isStreaming ? `Streaming... (${streamedContent ? streamedContent.length : 0} chars)` : `Completed (${streamedContent ? streamedContent.length : streamedChunks?.length || 0} chars)`}
                    </span>
                  </div>
                )}
                <div class="flex items-center space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => setShowHeaders(!showHeaders)}
                    class="flex items-center text-sm font-medium text-gray-700 cursor-pointer whitespace-nowrap mr-4"
                  >
                    <svg
                      class={`h-4 w-4 mr-1 transition-transform duration-200 ${showHeaders ? 'rotate-90' : ''}`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                    </svg>
                    Headers&nbsp;
                    <span class="text-gray-500 font-normal ml-1">({processedHeaders.length})</span>
                  </button>
                  {effectiveResponse.saved && effectiveResponse.receivedAt && (
                    <span class="text-xs text-gray-400 font-normal whitespace-nowrap mr-4">
                      Cached response from {new Date(effectiveResponse.receivedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Copy Response Button and Clear Button */}
              {(response.responseData || streamedContent || response.finalStreamedContent) && (
                <div class="flex items-center space-x-3">
                  <button
                    onClick={() => copyToClipboard(isStreaming ? streamedContent : processResponseContent(response, collection))}
                    class="inline-flex items-center text-sky-500 hover:text-sky-700 cursor-pointer"
                  >
                    <span class="inline-block w-4 h-4 mr-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full">
                        <path d="M20 2H10c-1.103 0-2 .897-2 2v4H4c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2v-4h4c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zM4 20V10h10l.002 10H4zm16-6h-4v-4c0-1.103-.897-2-2-2h-4V4h10v10z"></path>
                      </svg>
                    </span>
                    Copy
                  </button>
                  {onClear && (
                    <button
                      onClick={onClear}
                      class="inline-flex items-center text-sky-500 hover:text-sky-700 cursor-pointer"
                    >
                      <span class="inline-block w-4 h-4 mr-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full">
                          <path d="m3 6 18 0"></path>
                          <path d="m19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="m8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </span>
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Response Headers Collapsible Section */}
          {processedHeaders && processedHeaders.length > 0 && (
            <div id="response-headers-section" class="mb-4">
              <div class="max-w-full overflow-auto" style={{ display: showHeaders ? 'block' : 'none' }}>
                <table class="border-collapse text-xs w-full table-fixed">
                  <thead>
                    <tr>
                      <th class="py-1 border-b border-slate-200 text-left font-mono font-bold">Name</th>
                      <th class="py-1 border-b border-slate-200 text-left font-mono font-bold">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedHeaders.map((header, index) => (
                      <tr key={index}>
                        <td class="border-b border-slate-100 py-1 pr-3 font-mono whitespace-nowrap overflow-hidden text-ellipsis truncate">
                          {header.isClickable ? (
                            <a
                              href={header.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              class="text-sky-500 hover:text-sky-700 inline-flex items-center"
                            >
                              {header.name}
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline relative -top-0.5 ml-1" stroke="currentColor">
                                <path d="M15 3h6v6"></path>
                                <path d="M10 14 21 3"></path>
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              </svg>
                            </a>
                          ) : (
                            header.name
                          )}
                        </td>
                        <td class="border-b border-slate-100 py-1 font-mono text-indigo-600 whitespace-nowrap overflow-hidden text-ellipsis truncate">
                          {header.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Response Body */}
          <div class="flex-grow flex flex-col">
            <div class="response-container flex-grow flex flex-col">
              {/* No response body message */}
              {!response.responseData && !response.binaryData && !streamedContent && !response.finalStreamedContent && !isStreaming && (
                <div class="rounded-md bg-gray-50 p-4 mb-4 text-sm text-gray-600 font-medium">
                  No response body received.
                </div>
              )}

              {/* Download link for binary content */}
              {(response.isBinary || response.binaryData) && (
                <div class="mb-4">
                  <button
                    onClick={() => downloadBinaryContent(response)}
                    class="inline-flex items-center text-sky-500 hover:text-sky-700 cursor-pointer text-sm"
                  >
                    <span class="inline-block w-4 h-4 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full">
                        <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm-1 14.414L6.586 12 8 10.586l3 3V6h2v7.586l3-3L17.414 12 13 16.414z" />
                      </svg>
                    </span>
                    Download {getDownloadFilename(response)}
                  </button>
                </div>
              )}

              {/* Handle different content types */}
              {(() => {
                // HIGHEST PRIORITY: Check for cached SSE responses from IndexedDB by Content-Type header
                const contentTypeFromHeaders = response?.rawHeaders &&
                  (response.rawHeaders['content-type'] || response.rawHeaders['Content-Type']);

                if (contentTypeFromHeaders && isSSEContentType(contentTypeFromHeaders)) {

                  // For cached SSE responses, try to parse stored chunks, or split response data
                  let chunks = [];

                  try {
                    // First try to get stored chunks if available
                    if (response.streaming_chunks) {
                      chunks = JSON.parse(response.streaming_chunks);
                    } else if (response.responseData) {
                      // Fallback: split response data by double newlines (SSE format)
                      chunks = response.responseData.split('\n\n').filter(chunk => chunk.trim());
                    }
                  } catch (error) {
                    console.error('Failed to parse stored SSE data:', error);
                    chunks = response.responseData ? [response.responseData] : [];
                  }

                  return <StreamingDisplay streamedChunks={chunks} isStreaming={false} onCancel={onCancel} response={response} />;
                }

                // PRIORITY: Check for SSE streaming first (both during and after streaming)
                // Use streamingMetadata presence to detect SSE responses, not just isStreaming
                if (streamingMetadata && streamingMetadata.content_type) {
                  if (isSSEContentType(streamingMetadata.content_type)) {
                    return <StreamingDisplay streamedChunks={streamedChunks || []} isStreaming={isStreaming} onCancel={onCancel} response={response} />;
                  }
                }

                // Alternative check: Look for SSE content type in response headers (during and after streaming)
                if (streamingMetadata) {
                  const responseHeaders = streamingMetadata.response_headers || response?.rawHeaders || {};
                  const contentTypeFromHeaders = responseHeaders['content-type'] || responseHeaders['Content-Type'];

                  if (contentTypeFromHeaders && isSSEContentType(contentTypeFromHeaders)) {
                    return <StreamingDisplay streamedChunks={streamedChunks || []} isStreaming={isStreaming} onCancel={onCancel} response={response} />;
                  }
                }

                // Check if it's a supported image
                const contentTypeHeader = response.headers?.find(h =>
                  h.name && h.name.toLowerCase() === 'content-type'
                );
                // Also check rawHeaders for content-type (fallback for streaming responses)
                const rawContentType = response.rawHeaders && response.rawHeaders['content-type'];
                // For streaming responses, prioritize the metadata content_type
                const metadataContentType = isStreaming && streamingMetadata && streamingMetadata.content_type;
                const contentType = metadataContentType || contentTypeHeader?.value || rawContentType || '';


                if (response.binaryData && isSupportedImageType(contentType)) {
                  // Show image
                  return <ImageDisplay response={response} />;
                } else if (response.isBinary && !response.responseData) {
                  // Show binary content message
                  return (
                    <div
                      class="rounded-md p-4 text-center text-gray-600"
                      style={{
                        border: '1px solid #44475a',
                        backgroundColor: '#282a36',
                        minHeight: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <div class="text-white">
                        <div class="text-lg mb-2">Binary Content</div>
                        <div class="text-sm text-gray-300">
                          {response.responseSize || 'Unknown size'} • {contentType || 'Unknown type'}
                        </div>
                      </div>
                    </div>
                  );
                } else if (response.responseData || streamedContent || response.finalStreamedContent || isStreaming) {
                  // Check if content type is SSE (Server-Sent Events) - both during and after streaming
                  if (isSSEContentType(contentType) && (isStreaming || streamingMetadata)) {
                    // Show streaming display for SSE content (keep it even after streaming completes)
                    return <StreamingDisplay streamedChunks={streamedChunks || []} isStreaming={isStreaming} onCancel={onCancel} response={response} />;
                  } else if (isHtmlContentType(contentType)) {
                    // Show HTML preview with tabs
                    return (
                      <div class="flex flex-col flex-grow">
                        <HtmlTabs
                          activeTab={activeHtmlTab}
                          onTabChange={setActiveHtmlTab}
                        />
                        {activeHtmlTab === 'preview' ? (
                          <HtmlPreview response={response} />
                        ) : (
                          <CodeMirror
                            ref={editorRef}
                            value={isStreaming ? (streamedContent || '') : processResponseContent(response, collection)}
                            extensions={getResponseCodeMirrorExtensions(response)}
                            theme={dracula}
                            editable={false}
                            basicSetup={{
                              lineNumbers: true,
                              foldGutter: true,
                              dropCursor: false,
                              allowMultipleSelections: false,
                              indentOnInput: false,
                              bracketMatching: true,
                              closeBrackets: false,
                              autocompletion: false,
                              rectangularSelection: false,
                              searchKeymap: false,
                              highlightSelectionMatches: false
                            }}
                            style={{
                              border: '2px solid #282a36',
                              borderRadius: '0.375rem',
                              fontSize: '12px',
                              fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                            }}
                          />
                        )}
                      </div>
                    );
                  } else {
                    // Show text content with CodeMirror (existing behavior)
                    return (
                      <CodeMirror
                        ref={editorRef}
                        value={isStreaming ? (streamedContent || '') : processResponseContent(response, collection)}
                        extensions={getResponseCodeMirrorExtensions(response)}
                        theme={dracula}
                        editable={false}
                        basicSetup={{
                          lineNumbers: true,
                          foldGutter: true,
                          dropCursor: false,
                          allowMultipleSelections: false,
                          indentOnInput: false,
                          bracketMatching: true,
                          closeBrackets: false,
                          autocompletion: false,
                          rectangularSelection: false,
                          searchKeymap: false,
                          highlightSelectionMatches: false
                        }}
                        style={{
                          border: '2px solid #282a36',
                          borderRadius: '0.375rem',
                          fontSize: '12px',
                          fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                        }}
                      />
                    );
                  }
                }

                return null;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      <Toast
        message="Copied to clipboard!"
        isVisible={isToastVisible}
        onClose={hideToast}
        type="success"
      />
    </div>
  );
}
