# RequestBite Slingshot Proxy (Go)

A high-performance HTTP proxy server written in Go for RequestBite Slingshot
HTTP calls.

## Features

- **Reliable Timeout Handling**: Uses Go's `context.WithTimeout()` for guaranteed timeout enforcement
- **Proper Redirect Control**: Configurable redirect following with manual control
- **Multiple Integration Modes**: Standalone server, CLI execution
- **CORS Support**: Full browser compatibility with CORS headers
- **Binary Content Support**: Automatic binary detection and base64 encoding
- **Form Data Processing**: Support for both JSON and form-based requests
- **Health Check Endpoint**: Built-in health monitoring

## Quick Start

### Build

```bash
go build -o proxy .
```

### Run

```bash
# Start on default port 8080
./proxy-go

# Start on custom port
./proxy-go -port 8081

# Show help
./proxy-go -help
```

## API Endpoints

### POST /proxy/request

Executes HTTP requests from JSON payload.

**Request Body:**

```json
{
    "method": "GET",
    "url": "https://example.com/api",
    "headers": ["Content-Type: application/json", "Authorization: Bearer token"],
    "body": "request body content",
    "timeout": 30,
    "followRedirects": true,
    "path_params": {
        ":id": "123",
        ":category": "users"
    }
}
```

**Response:**

```json
{
    "success": true,
    "response_status": 200,
    "response_headers": {"content-type": "application/json"},
    "response_data": "response body",
    "response_size": "1.2 KB",
    "response_time": "156.78 ms",
    "content_type": "application/json",
    "is_binary": false,
    "cancelled": false
}
```

### POST /proxy/form

Executes form-based HTTP requests.

**Query Parameters:**

- `url`: Target URL (required)
- `method`: HTTP method (default: POST)
- `timeout`: Timeout in seconds (default: 60)
- `followRedirects`: Whether to follow redirects (default: true)
- `contentType`: Content type (application/x-www-form-urlencoded or multipart/form-data)
- `headers`: Comma-separated header list

**Form Data:**
Standard form data in request body.

## Key Improvements Over Lua Version

### 1. **Reliable Timeout Handling**

The Lua version used luasocket which has blocking behavior that ignores timeout settings. The Go version uses proper context cancellation:

```go
ctx, cancel := context.WithTimeout(r.Context(), time.Duration(req.Timeout)*time.Second)
defer cancel()

// This WILL timeout after the specified duration
resp, err := client.Do(httpReq.WithContext(ctx))
if ctx.Err() == context.DeadlineExceeded {
    return TimeoutError
}
```

### 2. **No External Dependencies**

- **Lua version**: Required curl subprocess calls with shell execution overhead
- **Go version**: Pure Go HTTP client with no external processes

### 3. **Better Error Handling**

Clear distinction between:

- Timeout errors (`context.DeadlineExceeded`)
- Connection errors (network failures)
- Redirect errors (when redirects are disabled)
- Validation errors (malformed URLs)

### 4. **Performance Improvements**

- Connection pooling and reuse
- No temporary file creation for request bodies
- No shell command parsing overhead
- Efficient binary content handling

## Testing

Run the timeout functionality test:

```bash
./test_timeout.sh
```

This tests:

1. Normal requests (should succeed)
2. Timeout scenarios (should fail with timeout error)
3. Redirect handling with `followRedirects: false` (should fail)
4. Redirect handling with `followRedirects: true` (should succeed)
5. The original failing case from the Lua implementation

## Integration Options

### 1. Standalone HTTP Service (Recommended)

Run the proxy as a service and configure nginx to proxy to it:

```nginx
upstream proxy_backend {
    server localhost:8080;
}

location /proxy/ {
    proxy_pass http://proxy_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### 2. Direct CLI Usage

Drop-in replacement for the Lua version:

```bash
# Instead of: lua proxy.lua --port 8080
./proxy-go -port 8080
```

## Configuration

Environment variables and configuration options can be added as needed. Currently supports:

- `-port`: Server port (default: 8080)
- `-help`: Show help information
- `-version`: Show version information

## Error Types

The proxy returns standardized error responses matching the original Lua API:

- `url_validation_error`: Invalid URL format or scheme
- `timeout`: Request exceeded specified timeout
- `connection_error`: Network connection failed
- `redirect_not_followed`: Redirect encountered but `followRedirects: false`
- `request_format_error`: Invalid JSON or missing required fields

## Monitoring

Health check endpoint available at `/health`:

```bash
curl http://localhost:8080/health
```

Returns:

```json
{
    "status": "ok",
    "version": "0.1.0",
    "uptime": "2m30s"
}
```

## License

Same as the parent RequestBite project.
