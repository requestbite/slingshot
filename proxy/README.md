# RequestBite Slingshot Proxy

## About

Since it's almost impossible for a webapp (such as Slingshot) to make HTTP
requests to any HTTP resource due to CORS restrictions, a proxy is needed. The
proxy used for Slingshot is this one, written in Go, which you can host yourself
or run locally if you don't want to proxy your Slingshot requests through our
servers. Running it locally also provides a means for accessing APIs and other
resources that are not accessible on the public Internet, such as APIs in
development our resources behind a firewall or VPN.

## Quick Start

### Build

```bash
go build -o proxy .
```

### Run

```bash
# Start on default port 8080
./proxy

# Start on custom port
./proxy -port 8081

# Show help
./proxy -help
```

## API Endpoints

### POST /proxy/request

Executes HTTP requests from JSON payload.

**Request Body:**

```json
{
  "method": "GET",
  "url": "https://example.com/api",
  "headers": [
    "Content-Type: application/json",
    "Authorization: Bearer token"
  ],
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
  "response_headers": {
    "content-type": "application/json"
  },
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

## How to run the proxy

Run the proxy in any of the two following supported modes:

### 1. Standalone HTTP Service

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

CLI version of proxy.

```bash
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
  "user-agent": "rb-slingshot/0.1.0 (https://requestbite.com/slingshot)",
  "version": "0.1.0"
}
```

## License

Same as the parent RequestBite project.
