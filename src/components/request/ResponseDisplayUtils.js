import { cleanAnsiText } from '../codemirror/ansiExtension.js';

// Map of response headers to their URL-friendly names
export const RESPONSE_HEADER_SLUGS = {
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

// Map of status codes to their URL-friendly names
export const STATUS_CODE_SLUGS = {
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

// Supported image MIME types
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml'
];

// Convert header names to camel case
export const convertToCamelCase = (headerName) => {
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
export const processStatusCode = (statusCode, statusText) => {
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
export const processResponseHeaders = (responseHeaders) => {
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

// Helper function to check if content type is a supported image
export const isSupportedImageType = (contentType) => {
  if (!contentType) return false;
  const lowerType = contentType.toLowerCase().split(';')[0].trim();
  return SUPPORTED_IMAGE_TYPES.includes(lowerType);
};

// Helper function to extract filename from Content-Disposition header
export const extractFilename = (headers) => {
  if (!headers || !Array.isArray(headers)) return null;

  const contentDisposition = headers.find(h =>
    h.name && h.name.toLowerCase() === 'content-disposition'
  );

  if (!contentDisposition) return null;

  // Parse Content-Disposition header for filename
  // Examples:
  // - attachment; filename="image.png"
  // - attachment; filename*=UTF-8''image.png
  // - inline; filename=data.json
  const value = contentDisposition.value;

  // Try filename="..." first
  let match = value.match(/filename\s*=\s*"([^"]+)"/i);
  if (match) return match[1];

  // Try filename=... (unquoted)
  match = value.match(/filename\s*=\s*([^;,\s]+)/i);
  if (match) return match[1];

  // Try filename*=UTF-8''... (RFC 5987)
  match = value.match(/filename\*\s*=\s*UTF-8''([^;,\s]+)/i);
  if (match) return decodeURIComponent(match[1]);

  return null;
};

// Helper function to get download filename
export const getDownloadFilename = (response) => {
  // First try to get filename from Content-Disposition header
  const filename = extractFilename(response.headers);
  if (filename) return filename;

  // Fall back to generic name based on content type
  const contentTypeHeader = response.headers?.find(h =>
    h.name && h.name.toLowerCase() === 'content-type'
  );

  if (contentTypeHeader && isSupportedImageType(contentTypeHeader.value)) {
    // For images, use appropriate extension
    const contentType = contentTypeHeader.value.toLowerCase().split(';')[0].trim();
    const extension = contentType.replace('image/', '');
    return `image.${extension === 'jpeg' ? 'jpg' : extension}`;
  }

  // Default for any other binary content
  return 'binary.dat';
};

// Helper function to create download blob and trigger download
export const downloadBinaryContent = (response) => {
  if (!response.binaryData && !response.responseData) return;

  let data;
  let mimeType = 'application/octet-stream';

  // Get content type from headers
  const contentTypeHeader = response.headers?.find(h =>
    h.name && h.name.toLowerCase() === 'content-type'
  );
  if (contentTypeHeader) {
    mimeType = contentTypeHeader.value.split(';')[0].trim();
  }

  // Handle binary data (base64 encoded)
  if (response.binaryData) {
    try {
      // Convert base64 to binary
      const binaryString = atob(response.binaryData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      data = bytes;
    } catch (error) {
      console.error('Failed to decode binary data:', error);
      return;
    }
  } else if (response.responseData) {
    // Handle text data
    data = new TextEncoder().encode(response.responseData);
  } else {
    return;
  }

  // Create blob and download
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const filename = getDownloadFilename(response);

  // Create temporary download link
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up the URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

// Helper function to detect if content is JSON
export const isJsonContent = (content) => {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'));
};

// Helper function to detect if content type is HTML
export const isHtmlContentType = (contentType) => {
  if (!contentType) return false;
  return contentType.toLowerCase().includes('text/html');
};

// Helper function to detect if content type is Server-Sent Events
export const isSSEContentType = (contentType) => {
  if (!contentType) return false;
  return contentType.toLowerCase().includes('text/event-stream');
};

// Helper function to prettify JSON content
export const prettifyJsonContent = (content, contentType) => {
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
export const getOriginalResponseContent = (response) => {
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
export const processResponseContent = (response, collection) => {
  // Handle streaming response content
  if (response.isStreamingComplete && response.finalStreamedContent) {
    return response.finalStreamedContent;
  }

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

// Get status color based on status code
export const getStatusColor = (status) => {
  if (status >= 200 && status < 300) return 'bg-green-100 text-green-800 dark:bg-green-400 dark:text-gray-800';
  if (status >= 300 && status < 400) return 'bg-yellow-100 text-yellow-800 dark:bg-orange-300 dark:text-gray-800';
  return 'bg-red-100 text-red-800 dark:bg-rose-400 dark:text-gray-800';
};

// Find the JSON Schema for a given status code and content type from parsed response schemas.
// Tries exact status code match, then wildcard (e.g. "2XX"), then content type match with fallbacks.
export const findMatchingResponseSchema = (parsedSchemas, statusCode, contentType) => {
  if (!parsedSchemas || !statusCode) return null;

  const statusStr = String(statusCode);

  // Exact status code match first
  let statusEntry = parsedSchemas[statusStr];

  // Wildcard match: "2XX" / "2xx" for any 2xx status
  if (!statusEntry) {
    const firstDigit = statusStr[0];
    for (const key of [`${firstDigit}XX`, `${firstDigit}xx`]) {
      if (parsedSchemas[key]) {
        statusEntry = parsedSchemas[key];
        break;
      }
    }
  }

  if (!statusEntry || !statusEntry.content) return null;

  // Normalise content type: strip parameters like "; charset=utf-8"
  const normCT = contentType ? contentType.split(';')[0].trim().toLowerCase() : 'application/json';

  // Exact match
  let contentEntry = statusEntry.content[normCT];

  // Case-insensitive match
  if (!contentEntry) {
    for (const [ct, entry] of Object.entries(statusEntry.content)) {
      if (ct.toLowerCase() === normCT) {
        contentEntry = entry;
        break;
      }
    }
  }

  // JSON family fallback
  if (!contentEntry && normCT.includes('json')) {
    contentEntry = statusEntry.content['application/json'];
  }

  // Single-entry fallback
  if (!contentEntry) {
    const entries = Object.values(statusEntry.content);
    if (entries.length === 1) contentEntry = entries[0];
  }

  return contentEntry?.schema || null;
};