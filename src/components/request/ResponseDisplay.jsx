import { useState } from 'preact/hooks';
import { WelcomeMessage } from '../common/WelcomeMessage';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { EditorView } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';

export function ResponseDisplay({ response, isLoading, onCancel }) {
  const [showHeaders, setShowHeaders] = useState(true);
  const [activeTab, setActiveTab] = useState('body');

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

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-800';
    if (status >= 300 && status < 400) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Show toast notification
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
    }

    return baseExtensions;
  };

  // Helper function to detect if content is JSON
  const isJsonContent = (content) => {
    if (!content || typeof content !== 'string') return false;
    const trimmed = content.trim();
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'));
  };

  return (
    <div id="response-section">
      <div id="response-container">
        <div id="response-details-wrapper">

          {/* Response Metadata - matching Django template structure */}
          <div class="mb-4 overflow-x-auto scrollbar-hide" style="-ms-overflow-style: none; scrollbar-width: none;">
            <style>
              {`::-webkit-scrollbar { display: none; }`}
            </style>
            <div class="flex items-center justify-between flex-nowrap min-w-max">
              <div class="flex items-center space-x-4 flex-nowrap">
                <div class="flex items-center space-x-2 whitespace-nowrap">
                  <span class="text-sm font-medium text-gray-700">Status:</span>
                  <span class={`px-2 py-1 text-sm rounded-md ${getStatusColor(response.status)}`}>
                    {response.status} {response.statusText}
                  </span>
                </div>
                <div class="flex items-center space-x-2 whitespace-nowrap">
                  <span class="text-sm font-medium text-gray-700">Time:</span>
                  <span class="px-2 py-1 text-sm bg-blue-50 text-blue-700 rounded-md whitespace-nowrap">
                    {response.responseTime}
                  </span>
                </div>
                <div class="flex items-center space-x-2 whitespace-nowrap">
                  <span class="text-sm font-medium text-gray-700">Size:</span>
                  <span class="px-2 py-1 text-sm bg-amber-50 text-amber-700 rounded-md whitespace-nowrap">
                    {response.responseSize}
                  </span>
                </div>
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
                    <span class="text-gray-500 font-normal ml-1">({response.headers?.length || 0})</span>
                  </button>
                  {response.saved && response.receivedAt && (
                    <span class="text-xs text-gray-400 font-normal whitespace-nowrap mr-4">
                      Cached response from {new Date(response.receivedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Copy Response Button */}
              {response.responseData && (
                <div class="flex items-center">
                  <button
                    onClick={() => copyToClipboard(response.responseData)}
                    class="inline-flex items-center text-sky-500 hover:text-sky-700 cursor-pointer"
                  >
                    <span class="inline-block w-4 h-4 mr-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full">
                        <path d="M20 2H10c-1.103 0-2 .897-2 2v4H4c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2v-4h4c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zM4 20V10h10l.002 10H4zm16-6h-4v-4c0-1.103-.897-2-2-2h-4V4h10v10z"></path>
                      </svg>
                    </span>
                    Copy
                  </button>
                </div>
              )}
            </div>

            {/* Response Headers Collapsible Section */}
            {response.headers && response.headers.length > 0 && (
              <div id="response-headers-section">
                <div class="max-w-full overflow-auto" style={{ display: showHeaders ? 'block' : 'none' }}>
                  <table class="border-collapse text-xs w-full mb-2 mt-4 table-fixed">
                    <colgroup>
                      <col style="width: 25%;" />
                      <col style="width: 75%;" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th class="py-1 border-b border-slate-200 text-left font-mono font-bold">Name</th>
                        <th class="py-1 border-b border-slate-200 text-left font-mono font-bold">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {response.headers.map((header, index) => (
                        <tr key={index}>
                          <td class="border-b border-slate-100 py-1 pr-3 font-mono whitespace-nowrap overflow-hidden text-ellipsis truncate">
                            {header.name}
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
          </div>

          {/* Response Body */}
          <div>
            <div class="response-container">
              {/* No response body message */}
              {!response.responseData && (
                <div class="rounded-md bg-gray-50 p-4 mb-4 text-sm text-gray-600 font-medium">
                  No response body received.
                </div>
              )}

              {/* CodeMirror editor for response body */}
              {response.responseData && (
                <div>
                  <CodeMirror
                    value={response.responseData}
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
                      border: '1px solid #44475a',
                      borderRadius: '0.375rem',
                      fontSize: '12px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
