package main

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"io"
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
		httpReq.Header.Set("User-Agent", "rb-slingshot-go/0.1.0")
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
	return c.processResponse(resp, body, metrics), nil
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
func (c *HTTPClient) processResponse(resp *http.Response, body []byte, metrics *RequestMetrics) *ProxyResponse {
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

	return &ProxyResponse{
		Success:         true,
		ResponseStatus:  resp.StatusCode,
		ResponseHeaders: responseHeaders,
		ResponseData:    responseData,
		ResponseSize:    metrics.FormatSize(),
		ResponseTime:    metrics.FormatDuration(),
		ContentType:     contentType,
		IsBinary:        isBinary,
		Cancelled:       false,
	}
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
	if queryParams.ContentType == "application/x-www-form-urlencoded" {
		values := url.Values{}
		for key, value := range formData {
			values.Set(key, value)
		}
		req.Body = values.Encode()
		req.Headers = append(req.Headers, "Content-Type: application/x-www-form-urlencoded")
	}
	// TODO: Add multipart/form-data support

	return c.ExecuteRequest(ctx, req)
}