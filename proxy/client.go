package main

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// HTTPClient handles HTTP requests with proper timeout and redirect control
type HTTPClient struct {
	client *http.Client
}

// NewHTTPClient creates a new HTTP client with sensible defaults
func NewHTTPClient() *HTTPClient {
	transport := &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     30 * time.Second,
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: false,
		},
	}

	return &HTTPClient{
		client: &http.Client{
			Transport: transport,
			// Don't follow redirects by default - we'll handle this manually
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
}

// ExecuteRequest executes an HTTP request with proper timeout and redirect handling
func (c *HTTPClient) ExecuteRequest(ctx context.Context, req *ProxyRequest) (*ProxyResponse, error) {
	metrics := &RequestMetrics{
		StartTime: time.Now(),
	}

	// Validate URL
	if err := c.validateURL(req.URL); err != nil {
		return c.createErrorResponse(URLValidationError, err.Error(), metrics), nil
	}

	// Parse headers
	headers := c.parseHeaders(req.Headers)

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, req.Method, req.URL, strings.NewReader(req.Body))
	if err != nil {
		return c.createErrorResponse(URLValidationError, fmt.Sprintf("Failed to create request: %v", err), metrics), nil
	}

	// Set headers
	for key, value := range headers {
		httpReq.Header.Set(key, value)
	}

	// Set default User-Agent if not provided
	if httpReq.Header.Get("User-Agent") == "" {
		httpReq.Header.Set("User-Agent", fmt.Sprintf("rb-slingshot/%s (https://requestbite.com/slingshot)", Version))
	}

	// Set Content-Length for POST/PUT/PATCH requests with body
	if req.Body != "" && (req.Method == "POST" || req.Method == "PUT" || req.Method == "PATCH") {
		httpReq.Header.Set("Content-Length", fmt.Sprintf("%d", len(req.Body)))
	}

	// Handle redirects based on followRedirects setting
	followRedirects := true // default
	if req.FollowRedirects != nil {
		followRedirects = *req.FollowRedirects
	}

	// Execute request with potential redirect handling
	resp, err := c.executeWithRedirects(ctx, httpReq, followRedirects, metrics)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return c.createErrorResponse(TimeoutError, "The server took too long to respond.", metrics), nil
		}

		// Check if this is a redirect error when redirects are disabled
		if strings.Contains(err.Error(), "redirect") && !followRedirects {
			return c.createErrorResponse(RedirectNotFollowedError, "Server attempted to redirect but followRedirects is disabled.", metrics), nil
		}

		return c.createErrorResponse(ConnectionError, fmt.Sprintf("Failed to connect to server: %v", err), metrics), nil
	}

	defer resp.Body.Close()
	metrics.EndTime = time.Now()

	// Check for redirects when follow_redirects is false
	if !followRedirects && resp.StatusCode >= 300 && resp.StatusCode < 400 {
		return c.createErrorResponse(RedirectNotFollowedError,
			fmt.Sprintf("Server returned %d redirect but following redirects is disabled. Please check your settings.", resp.StatusCode),
			metrics), nil
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.createErrorResponse(ConnectionError, fmt.Sprintf("Failed to read response: %v", err), metrics), nil
	}

	metrics.ResponseSize = int64(len(body))

	// Process response
	return c.processResponse(resp, body, metrics, req.PassThrough), nil
}

// ExecuteStreamingRequest handles streaming SSE requests
// Returns a channel for receiving the initial metadata response and an error channel
func (c *HTTPClient) ExecuteStreamingRequest(ctx context.Context, req *ProxyRequest, responseWriter http.ResponseWriter) error {
	metrics := &RequestMetrics{
		StartTime: time.Now(),
	}

	// Validate URL
	if err := c.validateURL(req.URL); err != nil {
		errorResp := c.createStreamingErrorResponse(URLValidationError, err.Error(), metrics)
		return c.writeStreamingErrorResponse(responseWriter, errorResp)
	}

	// Parse headers
	headers := c.parseHeaders(req.Headers)

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, req.Method, req.URL, strings.NewReader(req.Body))
	if err != nil {
		errorResp := c.createStreamingErrorResponse(URLValidationError, fmt.Sprintf("Failed to create request: %v", err), metrics)
		return c.writeStreamingErrorResponse(responseWriter, errorResp)
	}

	// Set headers
	for key, value := range headers {
		httpReq.Header.Set(key, value)
	}

	// Set default User-Agent if not provided
	if httpReq.Header.Get("User-Agent") == "" {
		httpReq.Header.Set("User-Agent", fmt.Sprintf("rb-slingshot/%s (https://requestbite.com/slingshot)", Version))
	}

	// Set Content-Length for POST/PUT/PATCH requests with body
	if req.Body != "" && (req.Method == "POST" || req.Method == "PUT" || req.Method == "PATCH") {
		httpReq.Header.Set("Content-Length", fmt.Sprintf("%d", len(req.Body)))
	}

	// Handle redirects based on followRedirects setting
	followRedirects := true // default
	if req.FollowRedirects != nil {
		followRedirects = *req.FollowRedirects
	}

	// Execute request with potential redirect handling
	resp, err := c.executeWithRedirects(ctx, httpReq, followRedirects, metrics)
	if err != nil {
		var errorResp *StreamingResponse
		if ctx.Err() == context.DeadlineExceeded {
			errorResp = c.createStreamingErrorResponse(TimeoutError, "The server took too long to respond.", metrics)
		} else if strings.Contains(err.Error(), "redirect") && !followRedirects {
			errorResp = c.createStreamingErrorResponse(RedirectNotFollowedError, "Server attempted to redirect but followRedirects is disabled.", metrics)
		} else {
			errorResp = c.createStreamingErrorResponse(ConnectionError, fmt.Sprintf("Failed to connect to server: %v", err), metrics)
		}
		return c.writeStreamingErrorResponse(responseWriter, errorResp)
	}

	defer resp.Body.Close()

	// Check for redirects when follow_redirects is false
	if !followRedirects && resp.StatusCode >= 300 && resp.StatusCode < 400 {
		errorResp := c.createStreamingErrorResponse(RedirectNotFollowedError,
			fmt.Sprintf("Server returned %d redirect but following redirects is disabled. Please check your settings.", resp.StatusCode),
			metrics)
		return c.writeStreamingErrorResponse(responseWriter, errorResp)
	}

	// Check if this is actually an SSE response
	if !c.isSSEResponse(resp) {
		log.Printf("[SSE-DEBUG] Not an SSE response, falling back to standard processing")
		// If it's not SSE, fall back to regular processing
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			errorResp := c.createStreamingErrorResponse(ConnectionError, fmt.Sprintf("Failed to read response: %v", err), metrics)
			return c.writeStreamingErrorResponse(responseWriter, errorResp)
		}

		// Complete the metrics timing
		metrics.EndTime = time.Now()
		metrics.ResponseSize = int64(len(body))

		// Write the standard response instead of streaming
		standardResp := c.processResponse(resp, body, metrics, false)
		responseWriter.Header().Set("Content-Type", "application/json")
		return json.NewEncoder(responseWriter).Encode(standardResp)
	}

	log.Printf("[SSE-DEBUG] Confirmed SSE response, starting streaming")

	// This is an SSE response - prepare for streaming
	streamingResp := c.createStreamingResponse(resp)

	// Set response headers for streaming (mixed content: JSON metadata + SSE data)
	responseWriter.Header().Set("Content-Type", "text/plain; charset=utf-8")
	responseWriter.Header().Set("Transfer-Encoding", "chunked")
	responseWriter.Header().Set("Cache-Control", "no-cache")
	responseWriter.Header().Set("Connection", "keep-alive")
	responseWriter.Header().Set("X-Slingshot-Streaming", "true") // Custom header for browser detection

	// Serialize metadata to JSON (single line, no newlines)
	metadataBytes, err := json.Marshal(streamingResp)
	if err != nil {
		return fmt.Errorf("failed to serialize streaming metadata: %v", err)
	}

	log.Printf("[SSE-DEBUG] Writing metadata: %s", string(metadataBytes))

	// Write metadata as first line
	if _, err := responseWriter.Write(metadataBytes); err != nil {
		return fmt.Errorf("failed to write streaming metadata: %v", err)
	}

	// Write separator newline
	if _, err := responseWriter.Write([]byte("\n")); err != nil {
		return fmt.Errorf("failed to write metadata separator: %v", err)
	}

	// Flush the metadata + separator immediately
	if flusher, ok := responseWriter.(http.Flusher); ok {
		flusher.Flush()
		log.Printf("[SSE-DEBUG] Flushed metadata to client")
	}

	log.Printf("[SSE-DEBUG] Starting SSE data stream")

	// Stream the SSE data with immediate flushing (no buffering)
	if err := c.streamResponseWithFlush(responseWriter, resp.Body); err != nil {
		log.Printf("[SSE-DEBUG] Error during SSE streaming: %v", err)
		// Check if this is a timeout error and provide specific error message
		if strings.Contains(err.Error(), "context deadline exceeded") || strings.Contains(err.Error(), "context canceled") {
			return fmt.Errorf("streaming timeout: %v", err)
		}
		return fmt.Errorf("failed to stream response: %v", err)
	}

	log.Printf("[SSE-DEBUG] SSE streaming completed")
	return nil
}

// executeWithRedirects handles the request execution with manual redirect control
func (c *HTTPClient) executeWithRedirects(ctx context.Context, req *http.Request, followRedirects bool, metrics *RequestMetrics) (*http.Response, error) {
	if followRedirects {
		// Temporarily enable automatic redirects
		c.client.CheckRedirect = nil
		defer func() {
			c.client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse
			}
		}()
	}

	return c.client.Do(req)
}

// validateURL validates the URL format and scheme
func (c *HTTPClient) validateURL(urlStr string) error {
	if urlStr == "" {
		return fmt.Errorf("URL is required")
	}

	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return fmt.Errorf("Invalid URL format")
	}

	if parsedURL.Scheme == "" || parsedURL.Host == "" {
		return fmt.Errorf("Invalid URL format")
	}

	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return fmt.Errorf("Only HTTP and HTTPS schemes are supported")
	}

	return nil
}

// parseHeaders converts header array to map
func (c *HTTPClient) parseHeaders(headerArray []string) map[string]string {
	headers := make(map[string]string)

	for _, headerStr := range headerArray {
		// Parse "Key: Value" format
		parts := strings.SplitN(headerStr, ":", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			if key != "" && value != "" {
				headers[key] = value
			}
		}
	}

	return headers
}

// processResponse converts HTTP response to ProxyResponse format
func (c *HTTPClient) processResponse(resp *http.Response, body []byte, metrics *RequestMetrics, passThrough bool) *ProxyResponse {
	// Convert headers to map
	responseHeaders := make(map[string]string)
	for key, values := range resp.Header {
		if len(values) > 0 {
			responseHeaders[strings.ToLower(key)] = values[0]
		}
	}

	contentType := resp.Header.Get("Content-Type")
	isBinary := c.isBinaryContent(contentType)

	responseData := string(body)
	if isBinary {
		responseData = base64.StdEncoding.EncodeToString(body)
	}

	response := &ProxyResponse{
		Success:         true,
		ResponseStatus:  resp.StatusCode,
		ResponseHeaders: responseHeaders,
		ResponseData:    responseData,
		ResponseSize:    metrics.FormatSize(),
		ResponseTime:    metrics.FormatDuration(),
		ContentType:     contentType,
		IsBinary:        isBinary,
		Cancelled:       false,
		PassThrough:     passThrough,
	}

	// Store raw body for pass-through mode
	if passThrough {
		response.RawResponseBody = body
	}

	return response
}

// isBinaryContent determines if content is binary based on Content-Type
func (c *HTTPClient) isBinaryContent(contentType string) bool {
	if contentType == "" {
		return false
	}

	binaryTypes := []string{
		"image/",
		"video/",
		"audio/",
		"application/pdf",
		"application/zip",
		"application/octet-stream",
		"application/msword",
		"application/vnd.",
		"application/x-",
		"font/",
	}

	contentTypeLower := strings.ToLower(contentType)
	for _, binaryType := range binaryTypes {
		if strings.Contains(contentTypeLower, binaryType) {
			return true
		}
	}

	return false
}

// isSSEResponse determines if the response is a Server-Sent Events stream
// SSE streams should have Content-Type: text/event-stream and typically Transfer-Encoding: chunked
func (c *HTTPClient) isSSEResponse(resp *http.Response) bool {
	// Debug: Log all response headers
	log.Printf("[SSE-DEBUG] Response status: %d", resp.StatusCode)
	log.Printf("[SSE-DEBUG] Response headers:")
	for key, values := range resp.Header {
		log.Printf("[SSE-DEBUG]   %s: %v", key, values)
	}

	// Check for text/event-stream content type (primary indicator)
	contentType := strings.ToLower(resp.Header.Get("Content-Type"))
	hasEventStream := strings.Contains(contentType, "text/event-stream")
	log.Printf("[SSE-DEBUG] Content-Type: %s, hasEventStream: %v", contentType, hasEventStream)

	if !hasEventStream {
		log.Printf("[SSE-DEBUG] Not SSE - no text/event-stream content type")
		return false
	}

	// Check for streaming indicators
	transferEncoding := strings.ToLower(resp.Header.Get("Transfer-Encoding"))
	hasChunked := strings.Contains(transferEncoding, "chunked")
	log.Printf("[SSE-DEBUG] Transfer-Encoding: %s, hasChunked: %v", transferEncoding, hasChunked)

	contentLength := resp.Header.Get("Content-Length")
	noContentLength := contentLength == ""
	log.Printf("[SSE-DEBUG] Content-Length: %s, noContentLength: %v", contentLength, noContentLength)

	// For SSE, we expect either chunked encoding OR no content-length (indicating streaming)
	isSSE := hasChunked || noContentLength
	log.Printf("[SSE-DEBUG] Final SSE determination: %v (hasChunked: %v OR noContentLength: %v)", isSSE, hasChunked, noContentLength)

	return isSSE
}

// createErrorResponse creates a standardized error response
func (c *HTTPClient) createErrorResponse(errType *ProxyError, message string, metrics *RequestMetrics) *ProxyResponse {
	metrics.EndTime = time.Now()

	return &ProxyResponse{
		Success:      false,
		ErrorType:    errType.Type,
		ErrorTitle:   errType.Title,
		ErrorMessage: message,
		ResponseTime: metrics.FormatDuration(),
		Cancelled:    false,
	}
}

// substitutePathParams replaces :param patterns in URL with actual values
func (c *HTTPClient) substitutePathParams(targetURL string, pathParams map[string]string) string {
	if pathParams == nil {
		return targetURL
	}

	resultURL := targetURL
	for paramName, paramValue := range pathParams {
		// Remove leading colon from param name if present, then add it back
		cleanParamName := strings.TrimPrefix(paramName, ":")
		pattern := ":" + cleanParamName

		// URL encode the parameter value
		encodedValue := url.QueryEscape(paramValue)

		// Replace all occurrences
		resultURL = strings.ReplaceAll(resultURL, pattern, encodedValue)
	}

	return resultURL
}

// ExecuteFormRequest executes a form-based request
func (c *HTTPClient) ExecuteFormRequest(ctx context.Context, queryParams *FormProxyRequest, formData map[string]string) (*ProxyResponse, error) {

	// Build the actual ProxyRequest from form parameters
	req := &ProxyRequest{
		Method:          queryParams.Method,
		URL:             queryParams.URL,
		Timeout:         queryParams.Timeout,
		FollowRedirects: queryParams.FollowRedirects,
		PassThrough:     false, // Form requests don't support pass-through mode
	}

	// Parse headers if provided
	if queryParams.Headers != "" {
		headers := strings.Split(queryParams.Headers, ",")
		for _, header := range headers {
			trimmed := strings.TrimSpace(header)
			if trimmed != "" {
				req.Headers = append(req.Headers, trimmed)
			}
		}
	}

	// Handle path parameters
	if queryParams.PathParams != "" {
		// This would be JSON-decoded in a real implementation
		// For now, we'll assume it's handled by the form parsing
	}

	// Set content type and build body based on form data
	if len(queryParams.RawBody) > 0 {
		// Use raw body for multipart/form-data (preserves boundaries and files)
		req.Body = string(queryParams.RawBody)
		req.Headers = append(req.Headers, "Content-Type: "+queryParams.ContentType)
	} else if queryParams.ContentType == "application/x-www-form-urlencoded" {
		// Build URL-encoded body from form data
		values := url.Values{}
		for key, value := range formData {
			values.Set(key, value)
		}
		req.Body = values.Encode()
		req.Headers = append(req.Headers, "Content-Type: application/x-www-form-urlencoded")
	}

	return c.ExecuteRequest(ctx, req)
}

// createStreamingResponse creates a StreamingResponse from HTTP response
func (c *HTTPClient) createStreamingResponse(resp *http.Response) *StreamingResponse {
	// Convert headers to map
	responseHeaders := make(map[string]string)
	for key, values := range resp.Header {
		if len(values) > 0 {
			responseHeaders[strings.ToLower(key)] = values[0]
		}
	}

	contentType := resp.Header.Get("Content-Type")
	isBinary := c.isBinaryContent(contentType)

	return &StreamingResponse{
		Success:         true,
		ResponseStatus:  resp.StatusCode,
		ResponseHeaders: responseHeaders,
		ContentType:     contentType,
		IsBinary:        isBinary,
		Cancelled:       false,
	}
}

// createStreamingErrorResponse creates a StreamingResponse for errors
func (c *HTTPClient) createStreamingErrorResponse(errType *ProxyError, message string, metrics *RequestMetrics) *StreamingResponse {
	metrics.EndTime = time.Now()

	return &StreamingResponse{
		Success:      false,
		ErrorType:    errType.Type,
		ErrorTitle:   errType.Title,
		ErrorMessage: message,
		Cancelled:    false,
	}
}

// writeStreamingErrorResponse writes a streaming error response
func (c *HTTPClient) writeStreamingErrorResponse(w http.ResponseWriter, resp *StreamingResponse) error {
	w.Header().Set("Content-Type", "application/json")
	return json.NewEncoder(w).Encode(resp)
}

// streamResponseWithFlush streams data from source to destination with immediate flushing
// This ensures SSE events are sent to the client as soon as they arrive from the source
func (c *HTTPClient) streamResponseWithFlush(w http.ResponseWriter, source io.Reader) error {
	flusher, canFlush := w.(http.Flusher)
	if !canFlush {
		log.Printf("[SSE-DEBUG] Warning: ResponseWriter doesn't support flushing")
		// Fallback to regular copy if flushing not supported
		_, err := io.Copy(w, source)
		return err
	}

	// Buffer for reading data in small chunks
	buffer := make([]byte, 1024)

	for {
		// Read a chunk of data
		n, err := source.Read(buffer)
		if n > 0 {
			// Write the chunk immediately
			if _, writeErr := w.Write(buffer[:n]); writeErr != nil {
				log.Printf("[SSE-DEBUG] Write error: %v", writeErr)
				return writeErr
			}

			// Flush immediately to ensure data reaches client
			flusher.Flush()
			log.Printf("[SSE-DEBUG] Flushed %d bytes to client", n)
		}

		// Handle read errors
		if err != nil {
			if err == io.EOF {
				log.Printf("[SSE-DEBUG] Reached end of stream")
				return nil // Normal end of stream
			}
			log.Printf("[SSE-DEBUG] Read error: %v", err)
			return err
		}
	}
}
