/**
 * Parses a curl command and converts it back to request data
 * Based on common curl parsing patterns and command line argument processing
 */

import { generateUUID } from './uuid.js';

export function parseCurlCommand(curlCommand) {
  if (!curlCommand || typeof curlCommand !== 'string') {
    throw new Error('Invalid curl command');
  }

  // Initialize default request data
  const requestData = {
    method: 'GET',
    url: '',
    headers: [],
    queryParams: [],
    pathParams: [],
    bodyType: 'none',
    bodyContent: '',
    contentType: 'application/json',
    formData: [],
    urlEncodedData: [],
    followRedirects: true,
    timeout: 30
  };

  // Remove leading/trailing whitespace and normalize line breaks
  const normalizedCommand = curlCommand
    .trim()
    .replace(/\\\s*\n\s*/g, ' ') // Handle multi-line commands with backslash
    .replace(/\s+/g, ' '); // Normalize whitespace

  // Check if it starts with 'curl'
  if (!normalizedCommand.toLowerCase().startsWith('curl')) {
    throw new Error('Command must start with "curl"');
  }

  // Tokenize the command into arguments
  const tokens = tokenizeCurlCommand(normalizedCommand);
  
  // Remove 'curl' from the beginning
  tokens.shift();

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    if (token.startsWith('-')) {
      // Handle options
      switch (token) {
        case '-X':
        case '--request':
          if (i + 1 < tokens.length) {
            requestData.method = tokens[i + 1].toUpperCase();
            i += 2;
          } else {
            throw new Error('Missing value for -X option');
          }
          break;

        case '-H':
        case '--header':
          if (i + 1 < tokens.length) {
            const headerValue = tokens[i + 1];
            const [key, ...valueParts] = headerValue.split(':');
            if (key && valueParts.length > 0) {
              const value = valueParts.join(':').trim();
              requestData.headers.push({
                id: generateUUID(),
                key: key.trim(),
                value: value,
                enabled: true
              });
            }
            i += 2;
          } else {
            throw new Error('Missing value for -H option');
          }
          break;

        case '-d':
        case '--data':
        case '--data-raw':
          if (i + 1 < tokens.length) {
            const dataValue = tokens[i + 1];
            
            // Check if it looks like URL-encoded data
            if (dataValue.includes('=') && dataValue.includes('&')) {
              requestData.bodyType = 'url-encoded';
              requestData.urlEncodedData = parseUrlEncodedData(dataValue);
            } else {
              requestData.bodyType = 'raw';
              requestData.bodyContent = dataValue;
            }
            i += 2;
          } else {
            throw new Error('Missing value for -d option');
          }
          break;

        case '-F':
        case '--form':
          if (i + 1 < tokens.length) {
            const formValue = tokens[i + 1];
            const formField = parseFormField(formValue);
            if (formField) {
              requestData.bodyType = 'form-data';
              requestData.formData.push(formField);
            }
            i += 2;
          } else {
            throw new Error('Missing value for -F option');
          }
          break;

        case '--max-time':
          if (i + 1 < tokens.length) {
            const timeout = parseInt(tokens[i + 1], 10);
            if (!isNaN(timeout)) {
              requestData.timeout = timeout;
            }
            i += 2;
          } else {
            throw new Error('Missing value for --max-time option');
          }
          break;

        case '--max-redirs':
          if (i + 1 < tokens.length) {
            const maxRedirs = parseInt(tokens[i + 1], 10);
            requestData.followRedirects = maxRedirs > 0;
            i += 2;
          } else {
            throw new Error('Missing value for --max-redirs option');
          }
          break;

        case '-L':
        case '--location':
          requestData.followRedirects = true;
          i++;
          break;

        case '-v':
        case '--verbose':
        case '-s':
        case '--silent':
        case '-S':
        case '--show-error':
          // Ignore these options (they don't affect the request structure)
          i++;
          break;

        default:
          // Skip unknown options
          if (token.startsWith('--') && i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
            i += 2; // Skip option and its value
          } else {
            i++;
          }
          break;
      }
    } else {
      // This should be the URL
      if (!requestData.url) {
        requestData.url = token;
        
        // Parse query parameters from URL
        const queryParams = parseQueryParams(token);
        if (queryParams.length > 0) {
          requestData.queryParams = queryParams;
        }
      }
      i++;
    }
  }

  if (!requestData.url) {
    throw new Error('No URL found in curl command');
  }

  // Auto-detect content type if not set and we have a body
  if (requestData.bodyType === 'raw' && requestData.bodyContent) {
    const contentTypeHeader = requestData.headers.find(h => 
      h.key.toLowerCase() === 'content-type'
    );
    if (contentTypeHeader) {
      requestData.contentType = contentTypeHeader.value;
    } else {
      // Try to guess content type from body content
      if (requestData.bodyContent.trim().startsWith('{') || requestData.bodyContent.trim().startsWith('[')) {
        requestData.contentType = 'application/json';
      } else if (requestData.bodyContent.trim().startsWith('<')) {
        requestData.contentType = 'application/xml';
      }
    }
  }

  return requestData;
}

/**
 * Tokenizes a curl command into individual arguments, respecting quotes
 */
function tokenizeCurlCommand(command) {
  const tokens = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let escaped = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      continue;
    }

    if (inQuotes && char === quoteChar) {
      inQuotes = false;
      quoteChar = '';
      continue;
    }

    if (!inQuotes && char === ' ') {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parses URL-encoded form data
 */
function parseUrlEncodedData(data) {
  const fields = [];
  const pairs = data.split('&');
  
  pairs.forEach(pair => {
    const [key, value] = pair.split('=');
    if (key) {
      fields.push({
        id: generateUUID(),
        key: decodeURIComponent(key),
        value: value ? decodeURIComponent(value) : '',
        enabled: true
      });
    }
  });

  return fields;
}

/**
 * Parses a form field from -F option
 */
function parseFormField(fieldValue) {
  const [key, value] = fieldValue.split('=');
  if (!key) return null;

  // Check if it's a file upload
  if (value && value.startsWith('@')) {
    return {
      id: generateUUID(),
      key: key,
      value: value.substring(1), // Remove @ prefix
      type: 'file',
      enabled: true
    };
  } else {
    return {
      id: generateUUID(),
      key: key,
      value: value || '',
      type: 'text',
      enabled: true
    };
  }
}

/**
 * Parses query parameters from URL
 */
function parseQueryParams(url) {
  const params = [];
  
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.forEach((value, key) => {
      params.push({
        id: generateUUID(),
        key: key,
        value: value,
        enabled: true
      });
    });
  } catch (_error) {
    // If URL parsing fails, try to extract query string manually
    const queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      const queryString = url.substring(queryIndex + 1);
      const pairs = queryString.split('&');
      
      pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) {
          params.push({
            id: generateUUID(),
            key: decodeURIComponent(key),
            value: value ? decodeURIComponent(value) : '',
            enabled: true
          });
        }
      });
    }
  }

  return params;
}

/**
 * Validates a curl command before parsing
 */
export function validateCurlCommand(curlCommand) {
  const errors = [];

  if (!curlCommand || typeof curlCommand !== 'string') {
    errors.push('Curl command is required');
    return errors;
  }

  const trimmed = curlCommand.trim();
  
  if (!trimmed) {
    errors.push('Curl command cannot be empty');
    return errors;
  }

  if (!trimmed.toLowerCase().startsWith('curl')) {
    errors.push('Command must start with "curl"');
  }

  // Check for basic structure
  if (trimmed.length < 10) {
    errors.push('Curl command appears to be too short');
  }

  return errors;
}