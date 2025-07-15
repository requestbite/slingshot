# RequestBite Slingshot Proxy

A Lua-based HTTP proxy server for sending raw and form-data requests to any
HTTP target. This proxy can be used to bypass CORS restrictions and provides
additional features like request cancellation and binary content handling.

## Features

- **Two proxy modes**:  
  JSON-based requests and form data requests
- **Request cancellation**:  
  Active requests can be cancelled if the client disconnects
- **Binary content handling**:  
  Binary responses are base64-encoded in JSON output
- **Flexible deployment**:  
  Can run as standalone server or integrate with OpenResty/Nginx
- **Error handling**:  
  Comprehensive error handling with proper HTTP status codes
- **Path parameter substitution**:  
  Supports `:param` syntax for URL path parameters
- **Multiple content types**:  
  Supports raw, form-data, and URL-encoded request bodies

## Installation

### Prerequisites

Required Lua modules:

```bash
# Ubuntu/Debian:
sudo apt-get install luarocks

# CentOS/RHEL:
sudo yum install luarocks

# Install required modules
luarocks install lua-cjson
luarocks install luasocket
luarocks install lua-resty-http  # For OpenResty only
```

### For OpenResty/Nginx

Additional requirements:

```bash
# Install OpenResty
# Ubuntu/Debian:
sudo apt-get install openresty

# CentOS/RHEL:
sudo yum install openresty
```

## Usage

### 1. Standalone Server

Run the proxy as a standalone HTTP server:

```bash
# Default port 8080
lua proxy.lua --port 8080

# Custom port
lua proxy.lua --port 3000
```

The server will listen on the specified port and handle requests at:

- `POST /proxy/request` - JSON-based requests
- `POST /proxy/form` - Form data requests
- `OPTIONS /proxy/request` - CORS preflight requests
- `OPTIONS /proxy/form` - CORS preflight requests

### 2. OpenResty/Nginx Integration

Add to your Nginx configuration:

```nginx
# nginx.conf
http {
    lua_package_path "/path/to/requestbite-slingshot/proxy/?.lua;;";
    
    server {
        listen 80;
        server_name your-domain.com;
        
        location /proxy/request {
            access_by_lua_block {
                local proxy = require('proxy')
                proxy.openresty_handler()
            }
        }
        
        location /proxy/form {
            access_by_lua_block {
                local proxy = require('proxy')
                proxy.openresty_handler()
            }
        }
    }
}
```

Or use content_by_lua_block for more control:

```nginx
location /proxy/ {
    content_by_lua_block {
        local proxy = require('proxy')
        proxy.openresty_handler()
    }
}
```

### 3. Programmatic Usage

Use as a Lua module in your application:

```lua
local proxy = require('proxy')

-- JSON request
local request_data = {
    method = "GET",
    url = "https://api.example.com/data",
    headers = {"Authorization: Bearer token123"},
    timeout = 30
}

local result = proxy.proxy_request_view(request_data)
print(require('cjson').encode(result))

-- Form data request
local query_params = {
    url = "https://api.example.com/submit",
    method = "POST",
    contentType = "application/x-www-form-urlencoded"
}

local form_data = {
    name = "John Doe",
    email = "john@example.com"
}

local result = proxy.proxy_form_data_view(query_params, form_data, {})
print(require('cjson').encode(result))
```

## API Reference

### JSON Request Format (POST /proxy/request)

```json
{
    "method": "GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS",
    "url": "https://api.example.com/endpoint",
    "headers": [
        "Authorization: Bearer token123",
        "Content-Type: application/json"
    ],
    "body": "request body content",
    "path_params": {
        ":id": "123",
        ":name": "example"
    },
    "timeout": 30,
    "followRedirects": true
}
```

### Form Data Request Format (POST /proxy/form)

Query parameters:

- `url` (required): Target URL
- `method`: HTTP method (default: POST)
- `contentType`: Content type (default: application/x-www-form-urlencoded)
- `headers`: Comma-separated headers
- `timeout`: Request timeout in seconds
- `followRedirects`: Boolean for redirect handling
- `path_params`: JSON string of path parameters

Form data: Standard form fields in request body

### Response Format

#### Success Response

```json
{
    "success": true,
    "response_status": 200,
    "response_headers": {
        "content-type": "application/json",
        "content-length": "1234"
    },
    "response_data": "response body content",
    "response_size": "1.21 KB",
    "response_time": "123.45 ms",
    "content_type": "application/json",
    "is_binary": false,
    "cancelled": false
}
```

#### Binary Response

```json
{
    "success": true,
    "response_status": 200,
    "response_headers": {
        "content-type": "image/png"
    },
    "response_data": "iVBORw0KGgoAAAANSUhEUgAA...",
    "response_size": "45.67 KB",
    "response_time": "89.12 ms",
    "content_type": "image/png",
    "is_binary": true,
    "cancelled": false
}
```

#### Error Response

```json
{
    "success": false,
    "error_type": "connection_error",
    "error_title": "Connection Failed",
    "error_message": "Failed to connect to server: connection refused",
    "cancelled": false,
    "response_time": "5.00 ms",
    "response_status": null,
    "response_headers": {},
    "response_data": null,
    "response_size": null
}
```

#### OPTIONS Response (CORS)

```json
{
    "success": true,
    "message": "CORS preflight response",
    "allowed_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allowed_headers": ["Content-Type", "Authorization", "X-Requested-With"],
    "max_age": 86400
}
```

## Error Types

- `request_format_error`:  
  Invalid JSON input or missing required fields
- `url_validation_error`:  
  Invalid URL format
- `connection_error`:  
  Network connection failures
- `timeout`:  
  Request timeout exceeded
- `cancelled`:  
  Request was cancelled by client

## Request Cancellation

The proxy supports request cancellation through client disconnection detection:

```lua
local proxy = require('proxy')

-- Cancel a specific request (if you have the request ID)
local cancelled = proxy.cancel_request(request_id)
```

For web applications, simply closing the connection will cancel the active request.

## Configuration

Modify the configuration at the top of `proxy.lua`:

```lua
local config = {
    default_timeout = 60,           -- Default request timeout in seconds
    max_response_size = 10 * 1024 * 1024, -- Maximum response size (10MB)
    user_agent = 'rb-slingshot-lua/0.0.1', -- Default User-Agent header
    buffer_size = 8192             -- Buffer size for reading responses
}
```

## Server Logging

The proxy provides clean, minimal logging. Each proxied request shows a one-liner with the target method and URL:

```
RequestBite Slingshot Proxy listening on port 8080
Press Ctrl+C to stop
GET https://httpbin.org/get
POST https://httpbin.org/post
OPTIONS /proxy/request (CORS preflight)
```

- **Proxied requests**: Shows the actual HTTP method and target URL being proxied
- **CORS requests**: Shows OPTIONS with endpoint and "(CORS preflight)" indicator
- **No debug clutter**: Clean output focusing on actual proxy activity

## Performance Considerations

- **Memory usage**:  
  Large responses are loaded into memory. Consider streaming for very large files.
- **Concurrency**:  
  The standalone server handles one request at a time. Use OpenResty for
  high-concurrency scenarios.
- **Timeout handling**:  
  Set appropriate timeouts to prevent hanging requests.

## Security Notes

- **CORS**:  
  The proxy adds permissive CORS headers (`Access-Control-Allow-Origin: *`).
  Restrict in production.
- **Input validation**:  
  The proxy validates URLs and request formats but doesn't sanitize all inputs.
- **Rate limiting**:  
  Consider implementing rate limiting in production deployments.

## Troubleshooting

### Common Issues

1. **Module not found**:  
   Ensure lua-cjson and luasocket are installed
2. **Port already in use**:  
   Change the port number or stop conflicting services
3. **Permission denied**:  
   Run with appropriate privileges for the chosen port
4. **SSL/TLS errors**:  
   Ensure OpenSSL is properly configured

### Debug Mode

The proxy includes minimal logging by default. For additional debugging, you can modify the script to add more verbose output:

```lua
-- Add debug prints in specific functions
print("Debug: Processing request with body: " .. (body or "nil"))
```

The current implementation provides clean one-liner logging for each proxied request, showing the target method and URL.

## License

This proxy script is part of the RequestBite Slingshot project and follows the
same license terms.
