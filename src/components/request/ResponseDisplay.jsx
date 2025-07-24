import { useState } from 'preact/hooks';
import { WelcomeMessage } from '../common/WelcomeMessage';
import { Toast, useToast } from '../common/Toast';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { EditorView } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';
import { ansiColors, cleanAnsiText } from '../codemirror/ansiExtension.js';

// Map of response headers to their URL-friendly names (matching Django implementation)
const RESPONSE_HEADER_SLUGS = {
  // Standard response headers
  'Accept-Ranges': 'accept-ranges',
  'Access-Control-Allow-Origin': 'access-control-allow-origin',
  'Age': 'age',
  'Allow': 'allow',
  'Cache-Control': 'cache-control',
  'Connection': 'connection',
  'Content-Disposition': 'content-disposition',
  'Content-Encoding': 'content-encoding',
  'Content-Language': 'content-language',
  'Content-Length': 'content-length',
  'Content-Location': 'content-location',
  'Content-Range': 'content-range',
  'Content-Type': 'content-type',
  'Date': 'date',
  'ETag': 'etag',
  'Expires': 'expires',
  'Last-Modified': 'last-modified',
  'Location': 'location',
  'Pragma': 'pragma',
  'Proxy-Authenticate': 'proxy-authenticate',
  'Refresh': 'refresh',
  'Retry-After': 'retry-after',
  'Server': 'server',
  'Set-Cookie': 'set-cookie',
  'Strict-Transport-Security': 'strict-transport-security',
  'Transfer-Encoding': 'transfer-encoding',
  'Vary': 'vary',
  'Via': 'via',
  'WWW-Authenticate': 'www-authenticate',
  'X-Content-Type-Options': 'x-content-type-options',
  'X-Frame-Options': 'x-frame-options',
  'X-XSS-Protection': 'x-xss-protection'
};

// Map of status codes to their URL-friendly names (matching Django implementation)
const STATUS_CODE_SLUGS = {
  // 1xx - Informational
  100: '100-continue',
  101: '101-switching-protocols',
  102: '102-processing',
  103: '103-early-hints',
  // 2xx - Success
  200: '200-ok',
  201: '201-created',
  202: '202-accepted',
  203: '203-non-authoritative-information',
  204: '204-no-content',
  205: '205-reset-content',
  206: '206-partial-content',
  207: '207-multi-status',
  208: '208-already-reported',
  226: '226-im-used',
  // 3xx - Redirection
  300: '300-multiple-choices',
  301: '301-moved-permanently',
  302: '302-found',
  303: '303-see-other',
  304: '304-not-modified',
  305: '305-use-proxy',
  307: '307-temporary-redirect',
  308: '308-permanent-redirect',
  // 4xx - Client Errors
  400: '400-bad-request',
  401: '401-unauthorized',
  402: '402-payment-required',
  403: '403-forbidden',
  404: '404-not-found',
  405: '405-method-not-allowed',
  406: '406-not-acceptable',
  407: '407-proxy-authentication-required',
  408: '408-request-timeout',
  409: '409-conflict',
  410: '410-gone',
  411: '411-length-required',
  412: '412-precondition-failed',
  413: '413-payload-too-large',
  414: '414-uri-too-long',
  415: '415-unsupported-media-type',
  416: '416-range-not-satisfiable',
  417: '417-expectation-failed',
  418: '418-im-a-teapot',
  421: '421-misdirected-request',
  422: '422-unprocessable-entity',
  423: '423-locked',
  424: '424-failed-dependency',
  425: '425-too-early',
  426: '426-upgrade-required',
  428: '428-precondition-required',
  429: '429-too-many-requests',
  431: '431-request-header-fields-too-large',
  451: '451-unavailable-for-legal-reasons',
  // 5xx - Server Errors
  500: '500-internal-server-error',
  501: '501-not-implemented',
  502: '502-bad-gateway',
  503: '503-service-unavailable',
  504: '504-gateway-timeout',
  505: '505-http-version-not-supported',
  506: '506-variant-also-negotiates',
  507: '507-insufficient-storage',
  508: '508-loop-detected',
  510: '510-not-extended',
  511: '511-network-authentication-required'
};

// Convert header names to camel case matching the Django implementation
const convertToCamelCase = (headerName) => {
  // Special case handling for common headers
  const commonHeaders = {
    'content-type': 'Content-Type',
    'content-length': 'Content-Length',
    'user-agent': 'User-Agent',
    'accept-encoding': 'Accept-Encoding',
    'accept-language': 'Accept-Language',
    'cache-control': 'Cache-Control',
    'set-cookie': 'Set-Cookie',
    'www-authenticate': 'WWW-Authenticate',
    'x-forwarded-for': 'X-Forwarded-For',
    'x-requested-with': 'X-Requested-With',
    'x-csrf-token': 'X-CSRF-Token',
    'authorization': 'Authorization',
    'etag': 'ETag'
  };

  // Check if it's a common header with standard casing
  const lowerHeader = headerName.toLowerCase();
  if (commonHeaders[lowerHeader]) {
    return commonHeaders[lowerHeader];
  }

  // Otherwise, convert to camel case
  const parts = headerName.split('-');
  const formattedParts = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) {
      formattedParts.push('');
      continue;
    }

    // Special case for abbreviations, like 'X-RQ-API'
    if (part.length <= 2) {
      formattedParts.push(part.toUpperCase());
    } else {
      // Capitalize first letter of each part
      formattedParts.push(part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
    }
  }

  return formattedParts.join('-');
};

// Process status code to make documented ones clickable
const processStatusCode = (statusCode, statusText) => {
  if (statusCode === null || statusCode === undefined) {
    return { text: "N/A", isClickable: false };
  }

  // Parse the status code as an integer if it's a string
  let statusInt;
  try {
    statusInt = parseInt(String(statusCode));
  } catch (error) {
    // If it's not a valid integer, return as plain text
    return { text: `${statusCode} ${statusText || ''}`.trim(), isClickable: false };
  }

  // Check if we have documentation for this status code
  const statusSlug = STATUS_CODE_SLUGS[statusInt];
  const displayText = `${statusInt} ${statusText || ''}`.trim();

  if (statusSlug) {
    return {
      text: displayText,
      isClickable: true,
      url: `https://docs.requestbite.com/http/status-codes/${statusSlug}/`
    };
  } else {
    return { text: displayText, isClickable: false };
  }
};

// Process response headers to make documented ones clickable
const processResponseHeaders = (responseHeaders) => {
  if (!responseHeaders) {
    return [];
  }

  const processedHeaders = [];

  responseHeaders.forEach((header) => {
    // Convert to proper camel case
    const formattedKey = convertToCamelCase(header.name);

    // Check if we have documentation for this header
    const headerSlug = RESPONSE_HEADER_SLUGS[formattedKey];

    if (headerSlug) {
      // Create clickable link data
      processedHeaders.push({
        name: formattedKey,
        value: header.value,
        isClickable: true,
        url: `https://docs.requestbite.com/http/response-headers/${headerSlug}/`
      });
    } else {
      // No documentation for this header, just display as text
      processedHeaders.push({
        name: formattedKey,
        value: header.value,
        isClickable: false
      });
    }
  });

  return processedHeaders;
};

export function ResponseDisplay({ response, isLoading, onCancel, collection }) {
  const [showHeaders, setShowHeaders] = useState(true);
  const [activeTab, setActiveTab] = useState('body');
  const [isToastVisible, showToast, hideToast] = useToast();

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
  if (!response.status && !response.responseData && !response.cancelled && response.success !== false) {
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

  // Process the status code and headers for the current response
  const processedStatus = response ? processStatusCode(response.status, response.statusText) : null;
  const processedHeaders = response ? processResponseHeaders(response.headers) : [];

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

  // Helper function to detect if content is JSON
  const isJsonContent = (content) => {
    if (!content || typeof content !== 'string') return false;
    const trimmed = content.trim();
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'));
  };

  // Helper function to prettify JSON content
  const prettifyJsonContent = (content, contentType) => {
    if (!content) return content;

    // Check if content type indicates JSON or if content looks like JSON
    const isJson = contentType.includes('application/json') || isJsonContent(content);

    if (isJson) {
      try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      } catch (error) {
        // If parsing fails, return original content
        return content;
      }
    }

    return content;
  };

  // Helper function to get original response content (with ANSI sequences)
  const getOriginalResponseContent = (response) => {
    if (!response.responseData) return '';

    let content = response.responseData;

    // Handle potential encoding issues
    if (typeof content === 'string') {
      try {
        // Try to decode if it's been improperly encoded
        content = decodeURIComponent(escape(content));
      } catch (error) {
        // If decoding fails, use original content
        content = response.responseData;
      }
    }

    return content;
  };

  // Helper function to ensure UTF-8 encoding for response content
  const processResponseContent = (response) => {
    if (!response.responseData) return '';

    // Ensure UTF-8 encoding by default
    let content = response.responseData;

    // Handle potential encoding issues
    if (typeof content === 'string') {
      try {
        // Try to decode if it's been improperly encoded
        content = decodeURIComponent(escape(content));
      } catch (error) {
        // If decoding fails, use original content
        content = response.responseData;
      }
    }

    // Get content type for prettification
    const contentTypeHeader = response.headers?.find(h =>
      h.name.toLowerCase() === 'content-type'
    );
    const contentType = contentTypeHeader?.value || '';

    // For text/plain with ANSI parsing enabled, clean the content for CodeMirror
    // but let the ANSI extension handle the styling
    if (contentType.includes('text/plain') && collection?.parse_ansi_colors !== false) {
      return cleanAnsiText(content);
    }

    // Prettify JSON content
    return prettifyJsonContent(content, contentType);
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
                      processedStatus?.text || `${response.status} ${response.statusText || ''}`
                    )}
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
                    <span class="text-gray-500 font-normal ml-1">({processedHeaders.length})</span>
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
                    onClick={() => copyToClipboard(processResponseContent(response))}
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
            {processedHeaders && processedHeaders.length > 0 && (
              <div id="response-headers-section">
                <div class="max-w-full overflow-auto" style={{ display: showHeaders ? 'block' : 'none' }}>
                  <table class="border-collapse text-xs w-full mb-2 mt-4 table-fixed">
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
                    value={processResponseContent(response)}
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
