package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

// ProxyServer handles HTTP proxy requests
type ProxyServer struct {
	port             int
	httpClient       *HTTPClient
	server           *http.Server
	logger           *log.Logger
	blockedHostnames []string // Configurable list of hostnames to block (prevents loops)
}

// NewProxyServer creates a new proxy server instance
func NewProxyServer(port int) (*ProxyServer, error) {
	logger := log.New(log.Writer(), "[PROXY] ", log.LstdFlags)

	// CONFIGURABLE: List of hostnames to block to prevent loops
	// Add/remove hostnames as needed for your deployment
	blockedHostnames := []string{
		"p.requestbite.com",
		"dev.p.requestbite.com",
	}

	return &ProxyServer{
		port:             port,
		httpClient:       NewHTTPClient(),
		logger:           logger,
		blockedHostnames: blockedHostnames,
	}, nil
}

// Start starts the HTTP server
func (s *ProxyServer) Start() error {
	router := mux.NewRouter()

	// CORS middleware
	router.Use(s.corsMiddleware)

	// Request logging middleware
	router.Use(s.loggingMiddleware)

	// API endpoints
	router.HandleFunc("/proxy/request", s.handleJSONRequest).Methods("POST", "OPTIONS")
	router.HandleFunc("/proxy/form", s.handleFormRequest).Methods("POST", "OPTIONS")

	// Health check endpoint
	router.HandleFunc("/health", s.handleHealthCheck).Methods("GET", "OPTIONS")

	s.server = &http.Server{
		Addr:    fmt.Sprintf(":%d", s.port),
		Handler: router,
	}

	return s.server.ListenAndServe()
}

// Stop stops the HTTP server gracefully
func (s *ProxyServer) Stop(ctx context.Context) error {
	if s.server != nil {
		return s.server.Shutdown(ctx)
	}
	return nil
}

// isLoopbackRequest checks if a request URL would create a loop back to this proxy
func (s *ProxyServer) isLoopbackRequest(targetURL string) bool {
	// Parse the target URL
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return false // Invalid URL, let validation handle it
	}

	// Allow /health endpoint on any hostname (required for proxy health checks)
	if parsedURL.Path == "/health" {
		return false
	}

	// Extract hostname (ignore port)
	targetHost := parsedURL.Hostname()

	// Check if target hostname is in our blocked list
	return s.isBlockedHostname(targetHost)
}

// isBlockedHostname checks if a hostname is in the blocked list
func (s *ProxyServer) isBlockedHostname(hostname string) bool {
	// Check against the configurable blocked hostnames list
	for _, blockedHost := range s.blockedHostnames {
		if strings.EqualFold(hostname, blockedHost) {
			return true
		}
	}
	return false
}

// handleJSONRequest handles /proxy/request endpoint
func (s *ProxyServer) handleJSONRequest(w http.ResponseWriter, r *http.Request) {
	// Handle OPTIONS for CORS preflight
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Parse request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		s.writeErrorResponse(w, "request_format_error", "Failed to read request body", err.Error())
		return
	}

	var req ProxyRequest
	if err := json.Unmarshal(body, &req); err != nil {
		s.writeErrorResponse(w, "request_format_error", "Invalid JSON", fmt.Sprintf("Failed to parse JSON request: %v", err))
		return
	}

	// Validate required fields
	if req.Method == "" {
		s.writeErrorResponse(w, "request_format_error", "Missing Method", "HTTP method is required")
		return
	}

	if req.URL == "" {
		s.writeErrorResponse(w, "request_format_error", "Missing URL", "URL is required")
		return
	}

	// Set default timeout if not provided
	if req.Timeout == 0 {
		req.Timeout = 60 // default 60 seconds
	}

	// Substitute path parameters if provided
	if req.PathParams != nil {
		req.URL = s.httpClient.substitutePathParams(req.URL, req.PathParams)
	}

	// Check for self-loop AFTER path parameter substitution
	if s.isLoopbackRequest(req.URL) {
		s.logger.Printf("BLOCKED loop request to: %s", req.URL)
		s.writeLoopErrorResponse(w, "Request could create an infinite loop to this proxy server")
		return
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(r.Context(), time.Duration(req.Timeout)*time.Second)
	defer cancel()

	// Log the request
	s.logger.Printf("%s %s", req.Method, req.URL)

	// Check if streaming is requested
	if req.Streaming {
		s.logger.Printf("Streaming mode enabled for request")
		// Execute the streaming request
		if err := s.httpClient.ExecuteStreamingRequest(ctx, &req, w); err != nil {
			s.logger.Printf("Streaming request failed: %v", err)
			// Check for specific error types
			if strings.Contains(err.Error(), "streaming timeout") {
				s.writeErrorResponse(w, StreamingTimeoutError.Type, StreamingTimeoutError.Title, err.Error())
			} else {
				// If streaming fails, try to write an error response if headers haven't been sent
				s.writeErrorResponse(w, "unknown_error", "Streaming Request Failed", err.Error())
			}
		}
		return
	}

	// Execute the standard request
	response, err := s.httpClient.ExecuteRequest(ctx, &req)
	if err != nil {
		s.logger.Printf("Request failed: %v", err)
		s.writeErrorResponse(w, "unknown_error", "Request Failed", err.Error())
		return
	}

	// Handle pass-through mode
	if req.PassThrough && response.Success {
		// Remove the application/json content-type that was set earlier
		w.Header().Del("Content-Type")

		// Set content-type header to match the proxied response
		if response.ContentType != "" {
			w.Header().Set("Content-Type", response.ContentType)
		}

		// Write raw response body directly
		if _, err := w.Write(response.RawResponseBody); err != nil {
			s.logger.Printf("Failed to write pass-through response: %v", err)
		}
		return
	}

	// Normal mode - write JSON response (Content-Type already set to application/json)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		s.logger.Printf("Failed to encode response: %v", err)
	}
}

// handleFormRequest handles /proxy/form endpoint
func (s *ProxyServer) handleFormRequest(w http.ResponseWriter, r *http.Request) {
	// Handle OPTIONS for CORS preflight
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Parse query parameters
	query := r.URL.Query()
	formReq := &FormProxyRequest{
		URL:         query.Get("url"),
		Method:      query.Get("method"),
		ContentType: query.Get("contentType"),
		Headers:     query.Get("headers"),
		PathParams:  query.Get("path_params"),
	}

	// Parse timeout
	if timeoutStr := query.Get("timeout"); timeoutStr != "" {
		if timeout, err := strconv.Atoi(timeoutStr); err == nil {
			formReq.Timeout = timeout
		}
	}

	// Parse followRedirects
	if followRedirectsStr := query.Get("followRedirects"); followRedirectsStr != "" {
		if followRedirects, err := strconv.ParseBool(followRedirectsStr); err == nil {
			formReq.FollowRedirects = &followRedirects
		}
	}

	// Validate required fields
	if formReq.URL == "" {
		s.writeErrorResponse(w, "request_format_error", "Missing URL", "URL is required")
		return
	}

	// Check for self-loop before processing
	if s.isLoopbackRequest(formReq.URL) {
		s.logger.Printf("BLOCKED loop request to: %s", formReq.URL)
		s.writeLoopErrorResponse(w, "Request could create an infinite loop to this proxy server")
		return
	}

	// Default method to POST
	if formReq.Method == "" {
		formReq.Method = "POST"
	}

	// Set default timeout
	if formReq.Timeout == 0 {
		formReq.Timeout = 60
	}

	// For multipart/form-data, pass the raw body directly to preserve structure
	var formData map[string]string
	var rawBody []byte

	if strings.Contains(r.Header.Get("Content-Type"), "multipart/form-data") {
		// For multipart, read raw body to preserve boundaries and files
		var err error
		rawBody, err = io.ReadAll(r.Body)
		if err != nil {
			s.writeErrorResponse(w, "request_format_error", "Failed to read request body", fmt.Sprintf("Error reading body: %v", err))
			return
		}
		formReq.RawBody = rawBody
		formReq.ContentType = r.Header.Get("Content-Type") // Preserve exact content-type with boundary
	} else {
		// For URL-encoded forms, parse normally
		if err := r.ParseForm(); err != nil {
			s.writeErrorResponse(w, "request_format_error", "Invalid form data", fmt.Sprintf("Failed to parse form data: %v", err))
			return
		}

		// Convert form values to map (preserve multiple values)
		formData = make(map[string]string)
		for key, values := range r.PostForm {
			if len(values) > 0 {
				// Join multiple values with comma (standard behavior)
				formData[key] = strings.Join(values, ",")
			}
		}
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(r.Context(), time.Duration(formReq.Timeout)*time.Second)
	defer cancel()

	// Log the request
	s.logger.Printf("%s %s (form)", formReq.Method, formReq.URL)

	// Execute the request
	response, err := s.httpClient.ExecuteFormRequest(ctx, formReq, formData)
	if err != nil {
		s.logger.Printf("Form request failed: %v", err)
		s.writeErrorResponse(w, "unknown_error", "Request Failed", err.Error())
		return
	}

	// Write response
	if err := json.NewEncoder(w).Encode(response); err != nil {
		s.logger.Printf("Failed to encode response: %v", err)
	}
}

// handleHealthCheck handles the health check endpoint
func (s *ProxyServer) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	// Handle OPTIONS for CORS preflight
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	healthResponse := map[string]interface{}{
		"status":     "ok",
		"version":    Version,
		"user-agent": fmt.Sprintf("rb-slingshot/%s (https://requestbite.com/slingshot)", Version),
	}

	json.NewEncoder(w).Encode(healthResponse)
}

// corsMiddleware adds CORS headers
func (s *ProxyServer) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Expose-Headers", "X-Slingshot-Streaming")
		w.Header().Set("Access-Control-Max-Age", "86400")

		next.ServeHTTP(w, r)
	})
}

// loggingMiddleware logs incoming requests
func (s *ProxyServer) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Create a response writer wrapper to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		// Log the request
		s.logger.Printf("%s %s %d %v", r.Method, r.URL.Path, wrapped.statusCode, time.Since(start))
	})
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (w *responseWriter) WriteHeader(statusCode int) {
	w.statusCode = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

// Flush implements http.Flusher interface for streaming support
func (w *responseWriter) Flush() {
	if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

// writeErrorResponse writes a standardized error response
func (s *ProxyServer) writeErrorResponse(w http.ResponseWriter, errorType, errorTitle, errorMessage string) {
	response := &ProxyResponse{
		Success:      false,
		ErrorType:    errorType,
		ErrorTitle:   errorTitle,
		ErrorMessage: errorMessage,
		Cancelled:    false,
	}

	w.WriteHeader(http.StatusOK) // Keep 200 status for API consistency
	if err := json.NewEncoder(w).Encode(response); err != nil {
		s.logger.Printf("Failed to encode error response: %v", err)
	}
}

// writeLoopErrorResponse writes an error response for loop detection with HTTP 508 status
func (s *ProxyServer) writeLoopErrorResponse(w http.ResponseWriter, errorMessage string) {
	response := &ProxyResponse{
		Success:      false,
		ErrorType:    LoopDetectedError.Type,
		ErrorTitle:   LoopDetectedError.Title,
		ErrorMessage: errorMessage,
		Cancelled:    false,
	}

	w.WriteHeader(http.StatusLoopDetected) // HTTP 508 status for loops
	if err := json.NewEncoder(w).Encode(response); err != nil {
		s.logger.Printf("Failed to encode loop error response: %v", err)
	}
}
