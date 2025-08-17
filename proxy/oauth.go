package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

// OAuthClient handles OAuth 2.0 operations
type OAuthClient struct {
	httpClient *HTTPClient
	logger     interface {
		Printf(format string, v ...interface{})
	}
}

// NewOAuthClient creates a new OAuth client
func NewOAuthClient(logger interface {
	Printf(format string, v ...interface{})
}) *OAuthClient {
	return &OAuthClient{
		httpClient: NewHTTPClient(),
		logger:     logger,
	}
}

// ExchangeCodeForTokens exchanges authorization code for access tokens
func (c *OAuthClient) ExchangeCodeForTokens(ctx context.Context, req *OAuthCodeRequest) (*OAuthTokenResponse, error) {
	// Validate and clean required fields
	if req.TokenURL == "" {
		return c.createOAuthErrorResponse("invalid_request", "Missing Token URL", "Token URL is required"), nil
	}
	
	// Trim whitespace from client credentials
	req.ClientID = strings.TrimSpace(req.ClientID)
	req.ClientSecret = strings.TrimSpace(req.ClientSecret)
	req.Code = strings.TrimSpace(req.Code)
	req.RedirectURI = strings.TrimSpace(req.RedirectURI)
	
	if req.ClientID == "" {
		return c.createOAuthErrorResponse("invalid_request", "Missing Client ID", "Client ID is required"), nil
	}
	if req.ClientSecret == "" {
		return c.createOAuthErrorResponse("invalid_request", "Missing Client Secret", "Client Secret is required"), nil
	}
	if req.Code == "" {
		return c.createOAuthErrorResponse("invalid_request", "Missing Authorization Code", "Authorization code is required"), nil
	}
	if req.RedirectURI == "" {
		return c.createOAuthErrorResponse("invalid_request", "Missing Redirect URI", "Redirect URI is required"), nil
	}

	// Prepare token exchange request
	formData := url.Values{}
	formData.Set("grant_type", "authorization_code")
	formData.Set("client_id", req.ClientID)
	formData.Set("client_secret", req.ClientSecret)
	formData.Set("code", req.Code)
	formData.Set("redirect_uri", req.RedirectURI)
	
	if req.Scope != "" {
		formData.Set("scope", req.Scope)
	}


	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", req.TokenURL, strings.NewReader(formData.Encode()))
	if err != nil {
		return c.createOAuthErrorResponse("server_error", "Request Creation Failed", fmt.Sprintf("Failed to create token request: %v", err)), nil
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", fmt.Sprintf("rb-slingshot/%s (https://requestbite.com/slingshot)", Version))
	
	// GitHub and many OAuth providers prefer Basic Auth for client credentials
	// Try Basic Auth if the URL contains "github.com"
	if strings.Contains(req.TokenURL, "github.com") {
		httpReq.SetBasicAuth(req.ClientID, req.ClientSecret)
		
		// Remove client credentials from form data when using Basic Auth
		formData.Del("client_id")
		formData.Del("client_secret")
		
		// Recreate request body without client credentials
		httpReq.Body = io.NopCloser(strings.NewReader(formData.Encode()))
		httpReq.ContentLength = int64(len(formData.Encode()))
	}

	c.logger.Printf("OAuth token exchange: POST %s", req.TokenURL)

	// Execute request
	resp, err := c.httpClient.client.Do(httpReq)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return c.createOAuthErrorResponse("timeout", "Request Timeout", "The OAuth server took too long to respond"), nil
		}
		return c.createOAuthErrorResponse("server_error", "Connection Failed", fmt.Sprintf("Failed to connect to OAuth server: %v", err)), nil
	}
	defer resp.Body.Close()

	// Parse response
	var tokenResponse map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		return c.createOAuthErrorResponse("server_error", "Invalid Response", fmt.Sprintf("Failed to parse OAuth server response: %v", err)), nil
	}

	// Check for OAuth error response
	if errorType, hasError := tokenResponse["error"]; hasError {
		errorDesc := ""
		if desc, ok := tokenResponse["error_description"]; ok {
			if descStr, ok := desc.(string); ok {
				errorDesc = descStr
			}
		}
		
		errorTypeStr, ok := errorType.(string)
		if !ok {
			errorTypeStr = "unknown_error"
		}

		return c.createOAuthErrorResponse(errorTypeStr, "OAuth Error", errorDesc), nil
	}

	// Check for required access_token
	accessToken, ok := tokenResponse["access_token"].(string)
	if !ok || accessToken == "" {
		return c.createOAuthErrorResponse("server_error", "Invalid Token Response", "OAuth server did not return an access token"), nil
	}

	// Build successful response
	response := &OAuthTokenResponse{
		Success:     true,
		AccessToken: accessToken,
		TokenType:   "Bearer", // Default to Bearer
	}

	// Extract optional fields
	if tokenType, ok := tokenResponse["token_type"].(string); ok && tokenType != "" {
		response.TokenType = tokenType
	}

	if refreshToken, ok := tokenResponse["refresh_token"].(string); ok && refreshToken != "" {
		response.RefreshToken = refreshToken
	}

	if scope, ok := tokenResponse["scope"].(string); ok && scope != "" {
		response.Scope = scope
	}

	// Handle expires_in (can be string or number)
	if expiresIn, ok := tokenResponse["expires_in"]; ok {
		switch v := expiresIn.(type) {
		case float64:
			response.ExpiresIn = int(v)
		case string:
			if parsed, err := strconv.Atoi(v); err == nil {
				response.ExpiresIn = parsed
			}
		}
	}

	return response, nil
}

// RefreshAccessToken refreshes access tokens using refresh token
func (c *OAuthClient) RefreshAccessToken(ctx context.Context, req *OAuthRefreshRequest) (*OAuthTokenResponse, error) {
	// Validate required fields
	if req.TokenURL == "" {
		return c.createOAuthErrorResponse("invalid_request", "Missing Token URL", "Token URL is required"), nil
	}
	if req.ClientID == "" {
		return c.createOAuthErrorResponse("invalid_request", "Missing Client ID", "Client ID is required"), nil
	}
	if req.ClientSecret == "" {
		return c.createOAuthErrorResponse("invalid_request", "Missing Client Secret", "Client Secret is required"), nil
	}
	if req.RefreshToken == "" {
		return c.createOAuthErrorResponse("invalid_request", "Missing Refresh Token", "Refresh token is required"), nil
	}

	// Prepare token refresh request
	formData := url.Values{}
	formData.Set("grant_type", "refresh_token")
	formData.Set("client_id", req.ClientID)
	formData.Set("client_secret", req.ClientSecret)
	formData.Set("refresh_token", req.RefreshToken)

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", req.TokenURL, strings.NewReader(formData.Encode()))
	if err != nil {
		return c.createOAuthErrorResponse("server_error", "Request Creation Failed", fmt.Sprintf("Failed to create refresh request: %v", err)), nil
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", fmt.Sprintf("rb-slingshot/%s (https://requestbite.com/slingshot)", Version))
	
	// GitHub and many OAuth providers prefer Basic Auth for client credentials
	// Try Basic Auth if the URL contains "github.com"
	if strings.Contains(req.TokenURL, "github.com") {
		c.logger.Printf("Detected GitHub - using Basic Auth for client credentials")
		httpReq.SetBasicAuth(req.ClientID, req.ClientSecret)
		
		// Remove client credentials from form data when using Basic Auth
		formData.Del("client_id")
		formData.Del("client_secret")
		
		// Recreate request body without client credentials
		httpReq.Body = io.NopCloser(strings.NewReader(formData.Encode()))
		httpReq.ContentLength = int64(len(formData.Encode()))
		
		c.logger.Printf("Modified form data for Basic Auth: %s", formData.Encode())
	}

	c.logger.Printf("OAuth token refresh: POST %s", req.TokenURL)

	// Execute request
	resp, err := c.httpClient.client.Do(httpReq)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return c.createOAuthErrorResponse("timeout", "Request Timeout", "The OAuth server took too long to respond"), nil
		}
		return c.createOAuthErrorResponse("server_error", "Connection Failed", fmt.Sprintf("Failed to connect to OAuth server: %v", err)), nil
	}
	defer resp.Body.Close()

	// Parse response
	var tokenResponse map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		return c.createOAuthErrorResponse("server_error", "Invalid Response", fmt.Sprintf("Failed to parse OAuth server response: %v", err)), nil
	}

	// Check for OAuth error response
	if errorType, hasError := tokenResponse["error"]; hasError {
		errorDesc := ""
		if desc, ok := tokenResponse["error_description"]; ok {
			if descStr, ok := desc.(string); ok {
				errorDesc = descStr
			}
		}
		
		errorTypeStr, ok := errorType.(string)
		if !ok {
			errorTypeStr = "unknown_error"
		}

		return c.createOAuthErrorResponse(errorTypeStr, "OAuth Error", errorDesc), nil
	}

	// Check for required access_token
	accessToken, ok := tokenResponse["access_token"].(string)
	if !ok || accessToken == "" {
		return c.createOAuthErrorResponse("server_error", "Invalid Token Response", "OAuth server did not return an access token"), nil
	}

	// Build successful response
	response := &OAuthTokenResponse{
		Success:     true,
		AccessToken: accessToken,
		TokenType:   "Bearer", // Default to Bearer
	}

	// Extract optional fields
	if tokenType, ok := tokenResponse["token_type"].(string); ok && tokenType != "" {
		response.TokenType = tokenType
	}

	if refreshToken, ok := tokenResponse["refresh_token"].(string); ok && refreshToken != "" {
		response.RefreshToken = refreshToken
	}

	if scope, ok := tokenResponse["scope"].(string); ok && scope != "" {
		response.Scope = scope
	}

	// Handle expires_in (can be string or number)
	if expiresIn, ok := tokenResponse["expires_in"]; ok {
		switch v := expiresIn.(type) {
		case float64:
			response.ExpiresIn = int(v)
		case string:
			if parsed, err := strconv.Atoi(v); err == nil {
				response.ExpiresIn = parsed
			}
		}
	}

	return response, nil
}

// createOAuthErrorResponse creates a standardized OAuth error response
func (c *OAuthClient) createOAuthErrorResponse(errorType, errorTitle, errorMessage string) *OAuthTokenResponse {
	return &OAuthTokenResponse{
		Success:      false,
		ErrorType:    errorType,
		ErrorTitle:   errorTitle,
		ErrorMessage: errorMessage,
	}
}