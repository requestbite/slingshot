/**
 * Request submission utility using RequestBite Slingshot Proxy
 * Submits requests through the Lua proxy to avoid CORS issues
 */

export class RequestSubmitter {
  constructor(proxyUrl = import.meta.env.VITE_PROXY_HOST || 'http://localhost:8080') {
    this.proxyUrl = proxyUrl;
    this.abortController = null;
    this.onStreamMetadata = null;
    this.onStreamData = null;
  }

  /**
   * Update the proxy URL (useful when settings change)
   */
  updateProxyUrl(newProxyUrl) {
    this.proxyUrl = newProxyUrl;
  }

  /**
   * Set streaming callbacks for real-time updates
   */
  setStreamingCallbacks(onMetadata, onData) {
    this.onStreamMetadata = onMetadata;
    this.onStreamData = onData;
  }

  /**
   * Get current proxy URL from settings or fallback
   */
  getCurrentProxyUrl() {
    // Check localStorage for custom proxy settings
    try {
      const savedSettings = localStorage.getItem('slingshot-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.proxyType === 'custom' && settings.customProxyUrl) {
          return settings.customProxyUrl;
        }
      }
    } catch (error) {
      console.warn('Failed to load proxy settings from localStorage:', error);
    }
    
    // Fall back to environment variable or default
    return import.meta.env.VITE_PROXY_HOST || 'http://localhost:8080';
  }

  /**
   * Submit a request through the proxy
   * @param {Object} requestData - The request configuration
   * @returns {Promise<Object>} - Response data with metadata
   */
  async submitRequest(requestData) {
    // Create new abort controller for this request
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    
    try {
      // Validate request
      const validationError = this.validateRequest(requestData);
      if (validationError) {
        return this.createErrorResponse('url_validation_error', 'Invalid URL', validationError, startTime);
      }

      // Determine proxy method based on body type
      const useFormProxy = this.shouldUseFormProxy(requestData);
      
      let proxyResponse;
      if (useFormProxy) {
        proxyResponse = await this.submitFormRequest(requestData);
      } else {
        proxyResponse = await this.submitJsonRequest(requestData);
      }
      
      // Process proxy response (skip for passThrough mode which is already processed)
      if (requestData.passThrough && proxyResponse.success && 'responseData' in proxyResponse) {
        // PassThrough response is already in final format, just add timing
        const endTime = performance.now();
        return {
          ...proxyResponse,
          responseTime: this.formatResponseTime(endTime - startTime),
          rawResponseTime: endTime - startTime,
          receivedAt: new Date().toISOString()
        };
      }
      
      return this.processProxyResponse(proxyResponse, startTime);
      
    } catch (error) {
      const endTime = performance.now();
      
      if (error.name === 'AbortError') {
        return this.createCancelledResponse(startTime);
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return this.createErrorResponse('connection_error', 'Proxy Connection Failed', `Failed to connect to proxy: ${error.message}`, startTime);
      }
      
      return this.createErrorResponse('unknown_error', 'Request Failed', error.message, startTime);
    }
  }

  /**
   * Determine if request should use form proxy endpoint
   */
  shouldUseFormProxy(requestData) {
    return requestData.bodyType === 'form-data' || requestData.bodyType === 'url-encoded';
  }

  /**
   * Submit request via JSON proxy endpoint
   */
  async submitJsonRequest(requestData) {
    const proxyRequest = {
      method: requestData.method,
      url: this.processUrl(requestData.url, requestData.pathParams),
      headers: this.formatHeadersForProxy(requestData.headers),
      timeout: requestData.timeout || 30,
      followRedirects: requestData.followRedirects !== false,
      streaming: true // Always enable streaming for SSE auto-detection
    };

    // Add passThrough parameter if specified
    if (requestData.passThrough) {
      proxyRequest.passThrough = requestData.passThrough;
    }

    // Add body for applicable methods
    if (!['GET', 'HEAD', 'OPTIONS'].includes(requestData.method)) {
      if (requestData.bodyType === 'raw' && requestData.bodyContent) {
        proxyRequest.body = requestData.bodyContent;
        
        // Add content-type header if not already present
        const hasContentType = proxyRequest.headers.some(h => 
          h.toLowerCase().startsWith('content-type:')
        );
        if (!hasContentType && requestData.contentType) {
          proxyRequest.headers.push(`Content-Type: ${requestData.contentType}`);
        }
      }
    }

    // Add path parameters (convert from {param} to :param format for proxy)
    if (requestData.pathParams && requestData.pathParams.length > 0) {
      proxyRequest.path_params = {};
      requestData.pathParams.forEach(param => {
        if (param.enabled && param.key && param.value) {
          proxyRequest.path_params[`:${param.key}`] = param.value;
        }
      });
    }

    const currentProxyUrl = this.getCurrentProxyUrl();
    const response = await fetch(`${currentProxyUrl}/proxy/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(proxyRequest),
      signal: this.abortController.signal
    });

    if (!response.ok) {
      throw new Error(`Proxy request failed: ${response.status} ${response.statusText}`);
    }

    // Handle passThrough mode - proxy returns raw content, not JSON
    if (requestData.passThrough) {
      const rawContent = await response.text();
      const contentType = response.headers.get('content-type') || '';

      // Create a response object that mimics the normal proxy response format
      // but with the raw content as responseData
      return {
        success: true,
        responseData: rawContent,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        rawHeaders: Object.fromEntries(response.headers.entries()),
        responseStatus: response.status,
        cancelled: false
      };
    }

    // Check if this is a streaming response by looking for our custom header
    // Browser strips Transfer-Encoding headers, so we use X-Slingshot-Streaming instead
    const isStreaming = response.headers.get('x-slingshot-streaming') === 'true';
    const transferEncoding = response.headers.get('transfer-encoding') || '';
    console.log('🔍 Response analysis:', {
      transferEncoding,
      hasBody: !!response.body,
      hasReader: response.body && response.body.getReader,
      contentType: response.headers.get('content-type'),
      isChunked: transferEncoding.includes('chunked'),
      customStreamingHeader: response.headers.get('x-slingshot-streaming'),
      isStreaming
    });

    if (isStreaming && response.body && response.body.getReader) {
      console.log('🚀 Detected streaming response, starting handleStreamingResponse');
      return this.handleStreamingResponse(response);
    }

    // Normal JSON response - parse it directly
    console.log('📄 Detected normal JSON response');
    return await response.json();
  }

  /**
   * Handle streaming response with ReadableStream processing
   */
  async handleStreamingResponse(response) {
    console.log('📡 Starting handleStreamingResponse');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let metadataReceived = false;
    let metadata = null;
    let streamedContent = '';
    let readerOwnershipTransferred = false;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        if (!metadataReceived) {
          // Look for JSON metadata at start (should be first line)
          const lines = buffer.split('\n');
          if (lines.length > 1) {
            const jsonLine = lines[0];
            try {
              metadata = JSON.parse(jsonLine);
              metadataReceived = true;

              // Remove processed JSON line from buffer
              buffer = lines.slice(1).join('\n');

              // Check if this is actually a streaming response
              if (metadata.success && !('response_data' in metadata) && !('responseData' in metadata)) {
                console.log('✅ Detected streaming metadata:', metadata);
                // This is streaming metadata, notify component
                if (this.onStreamMetadata) {
                  console.log('📢 Calling onStreamMetadata callback');
                  this.onStreamMetadata(metadata);
                } else {
                  console.log('⚠️ No onStreamMetadata callback set!');
                }

                // Start background streaming and return immediately
                console.log('🔄 Starting background streaming');

                // Send any initial buffer content immediately
                if (buffer.length > 0) {
                  console.log('📤 Sending initial buffer content:', buffer.length, 'chars');
                  if (this.onStreamData) {
                    this.onStreamData(buffer);
                  }
                  streamedContent += buffer;
                }

                // Transfer ownership of the reader to background streaming
                // We don't release the lock here since the background function will handle it
                readerOwnershipTransferred = true;
                this.continueStreamingInBackground(reader, decoder, '', streamedContent);

                // Return streaming response immediately to exit loading state
                const streamingResponse = {
                  success: true,
                  isStreaming: true,
                  streamingStarted: true,
                  metadata: metadata,
                  receivedAt: new Date().toISOString()
                };
                console.log('🎯 Returning streaming response immediately:', streamingResponse);

                // Important: Don't release the reader here - it's now owned by background streaming
                // We return early, so the finally block shouldn't run
                return streamingResponse;
              } else {
                console.log('📄 Normal response detected, returning directly:', metadata);
                // This is a normal response, return it directly
                return metadata;
              }
            } catch (e) {
              // Not valid JSON yet, continue reading
            }
          }
        } else {
          // We have metadata, now streaming SSE data
          const newContent = buffer;
          buffer = '';
          streamedContent += newContent;

          // Notify component of new streaming data
          if (this.onStreamData) {
            this.onStreamData(newContent);
          }
        }
      }
    } finally {
      // Only release the lock if we still own the reader
      if (!readerOwnershipTransferred) {
        try {
          reader.releaseLock();
        } catch (e) {
          console.log('Reader lock already released or unavailable');
        }
      }
    }

    // Streaming completed, return final result
    const endTime = performance.now();
    return {
      success: true,
      isStreaming: true,
      streamingComplete: true,
      metadata: metadata,
      streamedContent: streamedContent,
      totalDataReceived: streamedContent.length,
      receivedAt: new Date().toISOString()
    };
  }

  /**
   * Continue streaming in the background after initial response
   */
  async continueStreamingInBackground(reader, decoder, initialBuffer, initialStreamedContent) {
    let buffer = initialBuffer;
    let streamedContent = initialStreamedContent;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Stream all new content
        const newContent = buffer;
        buffer = '';
        streamedContent += newContent;

        // Notify component of new streaming data
        if (this.onStreamData) {
          console.log('📤 Sending streaming data to callback:', newContent.length, 'chars');
          this.onStreamData(newContent);
        }
      }
    } catch (error) {
      console.error('Background streaming error:', error);
    } finally {
      try {
        reader.releaseLock();
      } catch (e) {
        // Reader might already be released
      }
    }

    // Notify completion
    if (this.onStreamData) {
      this.onStreamData(null); // null indicates streaming completed
    }
  }

  /**
   * Submit request via form proxy endpoint
   */
  async submitFormRequest(requestData) {
    const queryParams = new URLSearchParams();
    
    // Add required query parameters
    queryParams.set('url', this.processUrl(requestData.url, requestData.pathParams));
    queryParams.set('method', requestData.method);
    queryParams.set('timeout', requestData.timeout || 30);
    queryParams.set('followRedirects', requestData.followRedirects !== false);

    // Add content type
    if (requestData.bodyType === 'form-data') {
      queryParams.set('contentType', 'multipart/form-data');
    } else if (requestData.bodyType === 'url-encoded') {
      queryParams.set('contentType', 'application/x-www-form-urlencoded');
    }

    // Add headers
    if (requestData.headers && requestData.headers.length > 0) {
      const headerStrings = requestData.headers
        .filter(h => h.enabled && h.key && h.value)
        .map(h => `${h.key}: ${h.value}`);
      if (headerStrings.length > 0) {
        queryParams.set('headers', headerStrings.join(','));
      }
    }

    // Add path parameters
    if (requestData.pathParams && requestData.pathParams.length > 0) {
      const pathParams = {};
      requestData.pathParams.forEach(param => {
        if (param.enabled && param.key && param.value) {
          pathParams[`:${param.key}`] = param.value;
        }
      });
      if (Object.keys(pathParams).length > 0) {
        queryParams.set('path_params', JSON.stringify(pathParams));
      }
    }

    // Prepare form body
    let body;
    let contentTypeHeader;

    if (requestData.bodyType === 'form-data') {
      // Use FormData for multipart
      body = new FormData();
      requestData.formData?.forEach(field => {
        if (field.enabled && field.key) {
          if (field.type === 'file' && field.value instanceof File) {
            body.append(field.key, field.value);
          } else if (field.type === 'text' && field.value) {
            body.append(field.key, field.value);
          }
        }
      });
    } else if (requestData.bodyType === 'url-encoded') {
      // Use URLSearchParams for url-encoded
      const formParams = new URLSearchParams();
      requestData.urlEncodedData?.forEach(field => {
        if (field.enabled && field.key) {
          formParams.set(field.key, field.value || '');
        }
      });
      body = formParams.toString();
      contentTypeHeader = 'application/x-www-form-urlencoded';
    }

    const fetchOptions = {
      method: 'POST',
      body,
      signal: this.abortController.signal
    };

    // Set content-type header if needed (FormData sets its own boundary)
    if (contentTypeHeader) {
      fetchOptions.headers = {
        'Content-Type': contentTypeHeader
      };
    }

    const currentProxyUrl = this.getCurrentProxyUrl();
    const response = await fetch(`${currentProxyUrl}/proxy/form?${queryParams}`, fetchOptions);

    if (!response.ok) {
      throw new Error(`Proxy form request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Cancel the current request
   */
  cancelRequest() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Validate request data
   */
  validateRequest(requestData) {
    if (!requestData.url) {
      return 'URL is required';
    }
    
    try {
      // Normalize URL by adding http:// if no protocol is specified
      let normalizedUrl = requestData.url;
      if (!normalizedUrl.match(/^https?:\/\//i)) {
        normalizedUrl = `http://${normalizedUrl}`;
      }
      
      new URL(normalizedUrl);
    } catch {
      return 'Invalid URL format';
    }
    
    return null;
  }

  /**
   * Process proxy response and convert to expected format
   */
  processProxyResponse(proxyResponse, startTime) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    // Handle proxy errors
    if (!proxyResponse.success) {
      if (proxyResponse.cancelled) {
        return this.createCancelledResponse(startTime);
      }
      
      return {
        success: false,
        errorType: proxyResponse.error_type,
        errorTitle: proxyResponse.error_title,
        errorMessage: proxyResponse.error_message,
        responseTime: this.formatResponseTime(responseTime),
        rawResponseTime: responseTime,
        cancelled: false,
        receivedAt: new Date().toISOString()
      };
    }

    // Handle successful proxy response
    const processedHeaders = this.processResponseHeaders(proxyResponse.response_headers || {});
    
    return {
      success: true,
      status: proxyResponse.response_status,
      statusText: this.getStatusText(proxyResponse.response_status),
      headers: processedHeaders,
      responseTime: proxyResponse.response_time || this.formatResponseTime(responseTime),
      responseSize: proxyResponse.response_size || this.formatResponseSize(0),
      responseData: proxyResponse.is_binary ? 
        `[Binary content - ${proxyResponse.response_size || '0 B'}]` : 
        (proxyResponse.response_data || ''),
      rawHeaders: proxyResponse.response_headers || {},
      rawResponseTime: responseTime,
      rawResponseSize: 0, // Proxy doesn't provide raw size
      cancelled: false,
      receivedAt: new Date().toISOString(),
      isBinary: proxyResponse.is_binary || false,
      binaryData: proxyResponse.is_binary ? proxyResponse.response_data : null
    };
  }

  /**
   * Format headers for proxy request (array of "Key: Value" strings)
   */
  formatHeadersForProxy(headers = []) {
    return headers
      .filter(h => h.enabled && h.key && h.value)
      .map(h => `${h.key}: ${h.value}`);
  }

  /**
   * Process URL with path parameters (client-side for display)
   */
  processUrl(url, pathParams = []) {
    let processedUrl = url;
    
    // Add http:// prefix if no protocol is specified
    if (processedUrl && !processedUrl.match(/^https?:\/\//i)) {
      processedUrl = `http://${processedUrl}`;
    }
    
    // Replace path parameters :param with values for URL display
    // The proxy will handle the actual :param substitution
    pathParams?.forEach(param => {
      if (param.enabled && param.key) {
        const pattern = `:${param.key}`;
        // Replace with value if provided, otherwise keep the original :param pattern
        const replacement = param.value ? encodeURIComponent(param.value) : pattern;
        processedUrl = processedUrl.replace(new RegExp(pattern, 'g'), replacement);
      }
    });
    
    return processedUrl;
  }

  /**
   * Get HTTP status text
   */
  getStatusText(status) {
    const statusTexts = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    };
    return statusTexts[status] || 'Unknown';
  }

  /**
   * Process response headers with camel case and documentation links
   */
  processResponseHeaders(headers) {
    return Object.entries(headers).map(([key, value]) => ({
      name: this.toCamelCase(key),
      value: value,
      isClickable: this.hasDocumentation(key)
    }));
  }

  /**
   * Convert header name to camel case
   */
  toCamelCase(headerName) {
    return headerName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('-');
  }

  /**
   * Check if header has documentation (simplified for now)
   */
  hasDocumentation(headerName) {
    const documentedHeaders = [
      'content-type', 'cache-control', 'authorization', 'accept',
      'user-agent', 'referer', 'origin', 'host', 'cookie', 'set-cookie'
    ];
    return documentedHeaders.includes(headerName.toLowerCase());
  }

  /**
   * Format response time
   */
  formatResponseTime(timeMs) {
    return `${timeMs.toFixed(2)} ms`;
  }

  /**
   * Format response size
   */
  formatResponseSize(sizeBytes) {
    if (sizeBytes >= 1024 * 1024) {
      return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (sizeBytes >= 1024) {
      return `${(sizeBytes / 1024).toFixed(2)} KB`;
    } else {
      return `${sizeBytes} B`;
    }
  }

  /**
   * Create error response object
   */
  createErrorResponse(errorType, errorTitle, errorMessage, startTime) {
    const endTime = performance.now();
    
    return {
      success: false,
      errorType,
      errorTitle,
      errorMessage,
      responseTime: this.formatResponseTime(endTime - startTime),
      rawResponseTime: endTime - startTime,
      cancelled: false,
      receivedAt: new Date().toISOString()
    };
  }

  /**
   * Create cancelled response object
   */
  createCancelledResponse(startTime) {
    const endTime = performance.now();
    
    return {
      success: false,
      cancelled: true,
      responseTime: this.formatResponseTime(endTime - startTime),
      rawResponseTime: endTime - startTime,
      receivedAt: new Date().toISOString()
    };
  }
}

// Get proxy URL from settings or environment variable
function getProxyUrl() {
  // Check localStorage for custom proxy settings
  try {
    const savedSettings = localStorage.getItem('slingshot-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.proxyType === 'custom' && settings.customProxyUrl) {
        return settings.customProxyUrl;
      }
    }
  } catch (error) {
    console.warn('Failed to load proxy settings from localStorage:', error);
  }
  
  // Fall back to environment variable or default
  return import.meta.env.VITE_PROXY_HOST || 'http://localhost:8080';
}

// Export singleton instance with dynamic proxy URL
export const requestSubmitter = new RequestSubmitter(getProxyUrl());