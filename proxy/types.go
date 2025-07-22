package main

import (
	"fmt"
	"time"
)

// ProxyRequest represents the JSON request structure matching the Lua API
type ProxyRequest struct {
	Method          string            `json:"method"`
	URL             string            `json:"url"`
	Headers         []string          `json:"headers"`
	Body            string            `json:"body,omitempty"`
	Timeout         int               `json:"timeout,omitempty"`
	FollowRedirects *bool             `json:"followRedirects,omitempty"`
	PathParams      map[string]string `json:"path_params,omitempty"`
}

// FormProxyRequest represents form data request parameters
type FormProxyRequest struct {
	URL             string            `json:"url"`
	Method          string            `json:"method"`
	Timeout         int               `json:"timeout,omitempty"`
	FollowRedirects *bool             `json:"followRedirects,omitempty"`
	ContentType     string            `json:"contentType,omitempty"`
	Headers         string            `json:"headers,omitempty"`
	PathParams      string            `json:"path_params,omitempty"`
}

// ProxyResponse represents the response structure matching the Lua API
type ProxyResponse struct {
	Success         bool              `json:"success"`
	ResponseStatus  int               `json:"response_status,omitempty"`
	ResponseHeaders map[string]string `json:"response_headers,omitempty"`
	ResponseData    string            `json:"response_data,omitempty"`
	ResponseSize    string            `json:"response_size,omitempty"`
	ResponseTime    string            `json:"response_time,omitempty"`
	ContentType     string            `json:"content_type,omitempty"`
	IsBinary        bool              `json:"is_binary,omitempty"`
	Cancelled       bool              `json:"cancelled,omitempty"`

	// Error fields (when success = false)
	ErrorType    string `json:"error_type,omitempty"`
	ErrorTitle   string `json:"error_title,omitempty"`
	ErrorMessage string `json:"error_message,omitempty"`
}

// ProxyError represents different types of proxy errors
type ProxyError struct {
	Type    string
	Title   string
	Message string
}

func (e *ProxyError) Error() string {
	return e.Message
}

// Predefined error types matching Lua implementation
var (
	URLValidationError = &ProxyError{
		Type:  "url_validation_error",
		Title: "Invalid URL",
	}
	TimeoutError = &ProxyError{
		Type:  "timeout",
		Title: "Request Timed Out",
	}
	ConnectionError = &ProxyError{
		Type:  "connection_error",
		Title: "Connection Failed",
	}
	RedirectNotFollowedError = &ProxyError{
		Type:  "redirect_not_followed",
		Title: "Redirect Not Followed",
	}
)

// RequestMetrics holds timing and size information
type RequestMetrics struct {
	StartTime    time.Time
	EndTime      time.Time
	ResponseSize int64
}

// GetDuration returns the total request duration in milliseconds
func (m *RequestMetrics) GetDuration() float64 {
	return float64(m.EndTime.Sub(m.StartTime).Nanoseconds()) / 1000000
}

// FormatDuration returns formatted duration string
func (m *RequestMetrics) FormatDuration() string {
	return fmt.Sprintf("%.2f ms", m.GetDuration())
}

// FormatSize returns formatted size string
func (m *RequestMetrics) FormatSize() string {
	size := m.ResponseSize
	if size >= 1024*1024 {
		return fmt.Sprintf("%.2f MB", float64(size)/(1024*1024))
	} else if size >= 1024 {
		return fmt.Sprintf("%.2f KB", float64(size)/1024)
	}
	return fmt.Sprintf("%d B", size)
}