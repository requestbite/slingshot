package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

// ProxyServer handles HTTP proxy requests
type ProxyServer struct {
	port        int
	httpClient  *HTTPClient
	oauthClient *OAuthClient
	server      *http.Server
	logger      *log.Logger
}

// NewProxyServer creates a new proxy server instance
func NewProxyServer(port int) (*ProxyServer, error) {
	logger := log.New(log.Writer(), "[PROXY] ", log.LstdFlags)
	return &ProxyServer{
		port:        port,
		httpClient:  NewHTTPClient(),
		oauthClient: NewOAuthClient(logger),
		logger:      logger,
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

	// OAuth endpoints
	router.HandleFunc("/oauth/token", s.handleOAuthTokenExchange).Methods("POST", "OPTIONS")
	router.HandleFunc("/oauth/refresh", s.handleOAuthRefresh).Methods("POST", "OPTIONS")

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

	// Create context with timeout
	ctx, cancel := context.WithTimeout(r.Context(), time.Duration(req.Timeout)*time.Second)
	defer cancel()

	// Log the request
	s.logger.Printf("%s %s", req.Method, req.URL)

	// Execute the request
	response, err := s.httpClient.ExecuteRequest(ctx, &req)
	if err != nil {
		s.logger.Printf("Request failed: %v", err)
		s.writeErrorResponse(w, "unknown_error", "Request Failed", err.Error())
		return
	}

	// Write response
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

// handleOAuthTokenExchange handles POST /oauth/token
func (s *ProxyServer) handleOAuthTokenExchange(w http.ResponseWriter, r *http.Request) {
	// Handle OPTIONS for CORS preflight
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Parse request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		s.writeOAuthErrorResponse(w, "invalid_request", "Failed to read request body", err.Error())
		return
	}

	var req OAuthCodeRequest
	if err := json.Unmarshal(body, &req); err != nil {
		s.writeOAuthErrorResponse(w, "invalid_request", "Invalid JSON", fmt.Sprintf("Failed to parse JSON request: %v", err))
		return
	}

	// Create context with timeout (30 seconds for OAuth operations)
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Exchange code for tokens
	response, err := s.oauthClient.ExchangeCodeForTokens(ctx, &req)
	if err != nil {
		s.logger.Printf("OAuth token exchange failed: %v", err)
		s.writeOAuthErrorResponse(w, "server_error", "Token Exchange Failed", err.Error())
		return
	}

	// Write response
	if err := json.NewEncoder(w).Encode(response); err != nil {
		s.logger.Printf("Failed to encode OAuth response: %v", err)
	}
}

// handleOAuthRefresh handles POST /oauth/refresh
func (s *ProxyServer) handleOAuthRefresh(w http.ResponseWriter, r *http.Request) {
	// Handle OPTIONS for CORS preflight
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Parse request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		s.writeOAuthErrorResponse(w, "invalid_request", "Failed to read request body", err.Error())
		return
	}

	var req OAuthRefreshRequest
	if err := json.Unmarshal(body, &req); err != nil {
		s.writeOAuthErrorResponse(w, "invalid_request", "Invalid JSON", fmt.Sprintf("Failed to parse JSON request: %v", err))
		return
	}

	// Create context with timeout (30 seconds for OAuth operations)
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Refresh tokens
	response, err := s.oauthClient.RefreshAccessToken(ctx, &req)
	if err != nil {
		s.logger.Printf("OAuth token refresh failed: %v", err)
		s.writeOAuthErrorResponse(w, "server_error", "Token Refresh Failed", err.Error())
		return
	}

	// Write response
	if err := json.NewEncoder(w).Encode(response); err != nil {
		s.logger.Printf("Failed to encode OAuth response: %v", err)
	}
}

// writeOAuthErrorResponse writes a standardized OAuth error response
func (s *ProxyServer) writeOAuthErrorResponse(w http.ResponseWriter, errorType, errorTitle, errorMessage string) {
	response := &OAuthTokenResponse{
		Success:      false,
		ErrorType:    errorType,
		ErrorTitle:   errorTitle,
		ErrorMessage: errorMessage,
	}

	w.WriteHeader(http.StatusOK) // Keep 200 status for API consistency
	if err := json.NewEncoder(w).Encode(response); err != nil {
		s.logger.Printf("Failed to encode OAuth error response: %v", err)
	}
}
