/**
 * Generates a curl command from request data
 * Based on common curl export patterns and HTTP client implementations
 */

export function generateCurlCommand(requestData) {
  const parts = ['curl'];
  
  // Add HTTP method (only if not GET, as GET is default)
  if (requestData.method && requestData.method !== 'GET') {
    parts.push('-X', escapeShellArg(requestData.method));
  }
  
  // Process URL with path parameters
  let url = requestData.url || '';
  
  // Replace path parameters
  if (requestData.pathParams && requestData.pathParams.length > 0) {
    requestData.pathParams.forEach(param => {
      if (param.enabled && param.key) {
        // Handle both {param} and :param formats
        const curlyPattern = `{${param.key}}`;
        const colonPattern = `:${param.key}`;
        const replacement = encodeURIComponent(param.value || '');
        url = url.replace(new RegExp(curlyPattern.replace(/[{}]/g, '\\$&'), 'g'), replacement);
        url = url.replace(new RegExp(colonPattern.replace(/[:]/g, '\\$&'), 'g'), replacement);
      }
    });
  }
  
  // Add query parameters
  if (requestData.queryParams && requestData.queryParams.length > 0) {
    const enabledParams = requestData.queryParams.filter(param => param.enabled && param.key);
    if (enabledParams.length > 0) {
      const queryString = enabledParams
        .map(param => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value || '')}`)
        .join('&');
      url = url + (url.includes('?') ? '&' : '?') + queryString;
    }
  }
  
  // Add URL (always quoted)
  parts.push(escapeShellArg(url));
  
  // Add headers
  if (requestData.headers && requestData.headers.length > 0) {
    requestData.headers.forEach(header => {
      if (header.enabled && header.key) {
        parts.push('-H', escapeShellArg(`${header.key}: ${header.value || ''}`));
      }
    });
  }
  
  // Add body based on body type
  if (requestData.bodyType && requestData.bodyType !== 'none' && !['GET', 'HEAD'].includes(requestData.method)) {
    switch (requestData.bodyType) {
      case 'raw':
        if (requestData.bodyContent) {
          // Add content-type header if not already present and we have a content type
          const hasContentType = requestData.headers?.some(h => 
            h.enabled && h.key.toLowerCase() === 'content-type'
          );
          if (!hasContentType && requestData.contentType) {
            parts.push('-H', escapeShellArg(`Content-Type: ${requestData.contentType}`));
          }
          parts.push('-d', escapeShellArg(requestData.bodyContent));
        }
        break;
        
      case 'form-data':
        if (requestData.formData && requestData.formData.length > 0) {
          requestData.formData.forEach(field => {
            if (field.enabled && field.key) {
              if (field.type === 'file') {
                parts.push('-F', escapeShellArg(`${field.key}=@${field.value || 'filename'}`));
              } else {
                parts.push('-F', escapeShellArg(`${field.key}=${field.value || ''}`));
              }
            }
          });
        }
        break;
        
      case 'url-encoded':
        if (requestData.urlEncodedData && requestData.urlEncodedData.length > 0) {
          const enabledFields = requestData.urlEncodedData.filter(field => field.enabled && field.key);
          if (enabledFields.length > 0) {
            const formData = enabledFields
              .map(field => `${encodeURIComponent(field.key)}=${encodeURIComponent(field.value || '')}`)
              .join('&');
            parts.push('-H', escapeShellArg('Content-Type: application/x-www-form-urlencoded'));
            parts.push('-d', escapeShellArg(formData));
          }
        }
        break;
    }
  }
  
  // Add settings
  if (requestData.followRedirects === false) {
    parts.push('--max-redirs', '0');
  }
  
  if (requestData.timeout && requestData.timeout !== 30) {
    parts.push('--max-time', requestData.timeout.toString());
  }
  
  // Add common options for better debugging
  parts.push('-v'); // Verbose mode to show headers
  
  return parts.join(' ');
}

/**
 * Escapes a string for safe use in shell commands
 */
function escapeShellArg(arg) {
  if (typeof arg !== 'string') {
    arg = String(arg);
  }
  
  // If the argument contains special characters, wrap in single quotes
  // and escape any single quotes within
  if (/[^\w@%+=:,./-]/.test(arg)) {
    return "'" + arg.replace(/'/g, "'\"'\"'") + "'";
  }
  
  return arg;
}

/**
 * Generates a formatted curl command with proper line breaks for readability
 */
export function generateFormattedCurlCommand(requestData) {
  const parts = ['curl'];
  
  // Add HTTP method
  if (requestData.method && requestData.method !== 'GET') {
    parts.push(`  -X ${escapeShellArg(requestData.method)}`);
  }
  
  // Process URL
  let url = requestData.url || '';
  
  // Replace path parameters
  if (requestData.pathParams && requestData.pathParams.length > 0) {
    requestData.pathParams.forEach(param => {
      if (param.enabled && param.key) {
        // Handle both {param} and :param formats
        const curlyPattern = `{${param.key}}`;
        const colonPattern = `:${param.key}`;
        const replacement = encodeURIComponent(param.value || '');
        url = url.replace(new RegExp(curlyPattern.replace(/[{}]/g, '\\$&'), 'g'), replacement);
        url = url.replace(new RegExp(colonPattern.replace(/[:]/g, '\\$&'), 'g'), replacement);
      }
    });
  }
  
  // Add query parameters
  if (requestData.queryParams && requestData.queryParams.length > 0) {
    const enabledParams = requestData.queryParams.filter(param => param.enabled && param.key);
    if (enabledParams.length > 0) {
      const queryString = enabledParams
        .map(param => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value || '')}`)
        .join('&');
      url = url + (url.includes('?') ? '&' : '?') + queryString;
    }
  }
  
  // Add headers
  if (requestData.headers && requestData.headers.length > 0) {
    requestData.headers.forEach(header => {
      if (header.enabled && header.key) {
        parts.push(`  -H ${escapeShellArg(`${header.key}: ${header.value || ''}`)}`);
      }
    });
  }
  
  // Add body
  if (requestData.bodyType && requestData.bodyType !== 'none' && !['GET', 'HEAD'].includes(requestData.method)) {
    switch (requestData.bodyType) {
      case 'raw':
        if (requestData.bodyContent) {
          const hasContentType = requestData.headers?.some(h => 
            h.enabled && h.key.toLowerCase() === 'content-type'
          );
          if (!hasContentType && requestData.contentType) {
            parts.push(`  -H ${escapeShellArg(`Content-Type: ${requestData.contentType}`)}`);
          }
          parts.push(`  -d ${escapeShellArg(requestData.bodyContent)}`);
        }
        break;
        
      case 'form-data':
        if (requestData.formData && requestData.formData.length > 0) {
          requestData.formData.forEach(field => {
            if (field.enabled && field.key) {
              if (field.type === 'file') {
                parts.push(`  -F ${escapeShellArg(`${field.key}=@${field.value || 'filename'}`)}`);
              } else {
                parts.push(`  -F ${escapeShellArg(`${field.key}=${field.value || ''}`)}`);
              }
            }
          });
        }
        break;
        
      case 'url-encoded':
        if (requestData.urlEncodedData && requestData.urlEncodedData.length > 0) {
          const enabledFields = requestData.urlEncodedData.filter(field => field.enabled && field.key);
          if (enabledFields.length > 0) {
            const formData = enabledFields
              .map(field => `${encodeURIComponent(field.key)}=${encodeURIComponent(field.value || '')}`)
              .join('&');
            parts.push(`  -H ${escapeShellArg('Content-Type: application/x-www-form-urlencoded')}`);
            parts.push(`  -d ${escapeShellArg(formData)}`);
          }
        }
        break;
    }
  }
  
  // Add settings
  if (requestData.followRedirects === false) {
    parts.push('  --max-redirs 0');
  }
  
  if (requestData.timeout && requestData.timeout !== 30) {
    parts.push(`  --max-time ${requestData.timeout}`);
  }
  
  // Add URL at the end
  parts.push(`  ${escapeShellArg(url)}`);
  
  return parts.join(' \\\n');
}