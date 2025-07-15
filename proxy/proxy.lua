#!/usr/bin/env lua

--[[
RequestBite Slingshot Proxy
A Lua-based HTTP proxy server that mirrors Django ProxyRequestView and ProxyFormDataView functionality.
Supports both standalone server and OpenResty/Nginx integration.

Usage:
  Standalone: lua proxy.lua --port 8080
  OpenResty: Include in nginx.conf location block
]]

local json = require('cjson')
local socket = require('socket')
local http = require('socket.http')
local ltn12 = require('ltn12')
local mime = require('mime')
local url = require('socket.url')

-- Configuration
local config = {
    default_timeout = 60,
    max_response_size = 10 * 1024 * 1024, -- 10MB
    user_agent = 'rb-slingshot-lua/0.0.1',
    buffer_size = 8192
}

-- Global state for request cancellation
local active_requests = {}
local request_counter = 0

-- Utility functions
local function generate_request_id()
    request_counter = request_counter + 1
    return tostring(request_counter)
end

local function is_binary_content(content_type)
    if not content_type then return false end
    
    local binary_types = {
        'image/', 'video/', 'audio/', 'application/pdf',
        'application/zip', 'application/octet-stream',
        'application/msword', 'application/vnd.',
        'application/x-', 'font/'
    }
    
    content_type = content_type:lower()
    for _, binary_type in ipairs(binary_types) do
        if content_type:find(binary_type, 1, true) then
            return true
        end
    end
    return false
end

local function format_response_time(time_ms)
    return string.format("%.2f ms", time_ms)
end

local function format_response_size(size_bytes)
    if size_bytes >= 1024 * 1024 then
        return string.format("%.2f MB", size_bytes / (1024 * 1024))
    elseif size_bytes >= 1024 then
        return string.format("%.2f KB", size_bytes / 1024)
    else
        return string.format("%d B", size_bytes)
    end
end

local function parse_headers(headers_array)
    local headers = {}
    if headers_array then
        for _, header_string in ipairs(headers_array) do
            local key, value = header_string:match("^([^:]+):%s*(.+)$")
            if key and value then
                headers[key:lower()] = value:gsub("^%s+", ""):gsub("%s+$", "")
            end
        end
    end
    return headers
end

local function parse_form_headers(headers_string)
    local headers = {}
    if headers_string then
        for header_string in headers_string:gmatch("[^,]+") do
            local key, value = header_string:match("^%s*([^:]+):%s*(.+)%s*$")
            if key and value then
                headers[key:lower()] = value
            end
        end
    end
    return headers
end

local function substitute_path_params(target_url, path_params)
    if not path_params then return target_url end
    
    local result_url = target_url
    for param_name, param_value in pairs(path_params) do
        local pattern = ":" .. param_name:gsub(":", "")
        result_url = result_url:gsub(pattern, url.escape(param_value))
    end
    return result_url
end

local function create_error_response(error_type, error_title, error_message, response_time)
    return {
        success = false,
        error_type = error_type,
        error_title = error_title,
        error_message = error_message,
        cancelled = false,
        response_time = response_time and format_response_time(response_time) or nil,
        response_status = nil,
        response_headers = {},
        response_data = nil,
        response_size = nil
    }
end

local function create_cancelled_response(response_time)
    return {
        success = false,
        cancelled = true,
        response_time = response_time and format_response_time(response_time) or nil,
        response_status = nil,
        response_headers = {},
        response_data = nil,
        response_size = nil
    }
end

local function validate_url(target_url)
    if not target_url or target_url == "" then
        return false, "URL is required"
    end
    
    local parsed = url.parse(target_url)
    if not parsed.scheme or not parsed.host then
        return false, "Invalid URL format"
    end
    
    if parsed.scheme ~= "http" and parsed.scheme ~= "https" then
        return false, "Only HTTP and HTTPS schemes are supported"
    end
    
    return true, nil
end

-- HTTP request executor
local function execute_http_request(method, target_url, headers, body, timeout, follow_redirects, request_id)
    local start_time = socket.gettime() * 1000
    
    -- Mark request as active
    active_requests[request_id] = {
        start_time = start_time,
        cancelled = false
    }
    
    -- Validate URL
    local valid, error_msg = validate_url(target_url)
    if not valid then
        active_requests[request_id] = nil
        return create_error_response("url_validation_error", "Invalid URL", error_msg, socket.gettime() * 1000 - start_time)
    end
    
    -- Set default headers
    local request_headers = {}
    for k, v in pairs(headers or {}) do
        request_headers[k] = v
    end
    
    -- Add default User-Agent if not provided
    if not request_headers['user-agent'] then
        request_headers['user-agent'] = config.user_agent
    end
    
    -- Add Content-Length for POST/PUT requests with body
    if body and (method == "POST" or method == "PUT" or method == "PATCH") then
        request_headers['content-length'] = tostring(#body)
    end
    
    -- Prepare request
    local response_body = {}
    
    local request_config = {
        method = method,
        url = target_url,
        headers = request_headers,
        sink = ltn12.sink.table(response_body),
        source = body and ltn12.source.string(body) or nil
    }
    
    -- Set timeout
    socket.TIMEOUT = timeout or config.default_timeout
    
    -- Execute request
    local response, status_code, response_headers_raw = http.request(request_config)
    local end_time = socket.gettime() * 1000
    local response_time = end_time - start_time
    
    -- Clean up active requests
    local was_cancelled = active_requests[request_id] and active_requests[request_id].cancelled
    active_requests[request_id] = nil
    
    -- Handle cancellation
    if was_cancelled then
        return create_cancelled_response(response_time)
    end
    
    -- Handle connection errors
    if not response then
        local error_msg = status_code or "Unknown connection error"
        if error_msg:find("timeout") then
            return create_error_response("timeout", "Request Timed Out", "The server took too long to respond.", response_time)
        else
            return create_error_response("connection_error", "Connection Failed", "Failed to connect to server: " .. error_msg, response_time)
        end
    end
    
    -- Parse status code
    local status = tonumber(status_code) or 0
    
    -- Process response headers
    local processed_headers = {}
    if response_headers_raw then
        for k, v in pairs(response_headers_raw) do
            processed_headers[k:lower()] = v
        end
    end
    
    -- Process response body
    local response_content = table.concat(response_body)
    local response_size = #response_content
    local content_type = processed_headers['content-type'] or ''
    
    -- Handle binary content
    if is_binary_content(content_type) then
        response_content = mime.b64(response_content)
        return {
            success = true,
            response_status = status,
            response_headers = processed_headers,
            response_data = response_content,
            response_size = format_response_size(response_size),
            response_time = format_response_time(response_time),
            content_type = content_type,
            is_binary = true,
            cancelled = false
        }
    end
    
    -- Handle text content
    return {
        success = true,
        response_status = status,
        response_headers = processed_headers,
        response_data = response_content,
        response_size = format_response_size(response_size),
        response_time = format_response_time(response_time),
        content_type = content_type,
        is_binary = false,
        cancelled = false
    }
end

-- ProxyRequestView equivalent
local function proxy_request_view(request_data)
    local request_id = generate_request_id()
    
    -- Parse JSON input
    local parsed_request
    if type(request_data) == "string" then
        local success, result = pcall(json.decode, request_data)
        if not success then
            return create_error_response("request_format_error", "Invalid JSON", "Failed to parse JSON request: " .. result)
        end
        parsed_request = result
    else
        parsed_request = request_data
    end
    
    -- Validate required fields
    if not parsed_request.method then
        return create_error_response("request_format_error", "Missing Method", "HTTP method is required")
    end
    
    if not parsed_request.url then
        return create_error_response("request_format_error", "Missing URL", "URL is required")
    end
    
    -- Process request parameters
    local method = parsed_request.method:upper()
    local target_url = parsed_request.url
    local headers = parse_headers(parsed_request.headers)
    local body = parsed_request.body
    local timeout = tonumber(parsed_request.timeout) or config.default_timeout
    local follow_redirects = parsed_request.followRedirects
    local path_params = parsed_request.path_params
    
    -- Substitute path parameters
    if path_params then
        target_url = substitute_path_params(target_url, path_params)
    end
    
    -- Execute request
    return execute_http_request(method, target_url, headers, body, timeout, follow_redirects, request_id)
end

-- ProxyFormDataView equivalent
local function proxy_form_data_view(query_params, form_data, files)
    local request_id = generate_request_id()
    
    -- Parse query parameters
    local method = (query_params.method or "POST"):upper()
    local target_url = query_params.url
    local timeout = tonumber(query_params.timeout) or config.default_timeout
    local follow_redirects = query_params.followRedirects
    local content_type = query_params.contentType or "application/x-www-form-urlencoded"
    local headers = parse_form_headers(query_params.headers)
    local path_params = query_params.path_params and json.decode(query_params.path_params) or nil
    
    -- Validate required fields
    if not target_url then
        return create_error_response("request_format_error", "Missing URL", "URL is required")
    end
    
    -- Substitute path parameters
    if path_params then
        target_url = substitute_path_params(target_url, path_params)
    end
    
    -- Process form data
    local body = nil
    if content_type == "application/x-www-form-urlencoded" then
        local form_parts = {}
        for key, value in pairs(form_data or {}) do
            table.insert(form_parts, url.escape(key) .. "=" .. url.escape(value))
        end
        body = table.concat(form_parts, "&")
        headers['content-type'] = content_type
    elseif content_type == "multipart/form-data" then
        -- Basic multipart implementation (simplified)
        local boundary = "----formdata" .. tostring(os.time())
        local form_parts = {}
        
        -- Add form fields
        for key, value in pairs(form_data or {}) do
            table.insert(form_parts, "--" .. boundary)
            table.insert(form_parts, 'Content-Disposition: form-data; name="' .. key .. '"')
            table.insert(form_parts, "")
            table.insert(form_parts, value)
        end
        
        -- Add files (simplified - assumes files are already in memory)
        for key, file_data in pairs(files or {}) do
            table.insert(form_parts, "--" .. boundary)
            table.insert(form_parts, 'Content-Disposition: form-data; name="' .. key .. '"; filename="' .. (file_data.filename or "file") .. '"')
            table.insert(form_parts, 'Content-Type: ' .. (file_data.content_type or "application/octet-stream"))
            table.insert(form_parts, "")
            table.insert(form_parts, file_data.content)
        end
        
        table.insert(form_parts, "--" .. boundary .. "--")
        body = table.concat(form_parts, "\r\n")
        headers['content-type'] = "multipart/form-data; boundary=" .. boundary
    end
    
    -- Execute request
    return execute_http_request(method, target_url, headers, body, timeout, follow_redirects, request_id)
end

-- Request cancellation function
local function cancel_request(request_id)
    if active_requests[request_id] then
        active_requests[request_id].cancelled = true
        return true
    end
    return false
end

-- OpenResty/Nginx integration
local function openresty_handler()
    if not ngx then
        error("OpenResty/Nginx environment not detected")
    end
    
    local method = ngx.var.request_method
    local uri = ngx.var.uri
    
    -- Set response headers
    ngx.header['Content-Type'] = 'application/json'
    ngx.header['Access-Control-Allow-Origin'] = '*'
    ngx.header['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    ngx.header['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    
    -- Handle OPTIONS requests
    if method == "OPTIONS" then
        ngx.status = 200
        ngx.say("{}")
        return
    end
    
    -- Handle POST requests
    if method == "POST" then
        ngx.req.read_body()
        local body = ngx.req.get_body_data()
        
        if uri == "/proxy/request" then
            local result = proxy_request_view(body)
            ngx.say(json.encode(result))
        elseif uri == "/proxy/form" then
            local args = ngx.req.get_uri_args()
            local post_args = ngx.req.get_post_args()
            local result = proxy_form_data_view(args, post_args, {})
            ngx.say(json.encode(result))
        else
            ngx.status = 404
            ngx.say('{"error": "Not found"}')
        end
    else
        ngx.status = 405
        ngx.say('{"error": "Method not allowed"}')
    end
end

-- Standalone server implementation
local function standalone_server(port)
    port = port or 8080
    
    local server = socket.bind("*", port)
    if not server then
        error("Failed to bind to port " .. port)
    end
    
    -- Set server to non-blocking mode
    server:settimeout(0.1)
    
    print("RequestBite Slingshot Proxy listening on port " .. port)
    print("Press Ctrl+C to stop")
    
    while true do
        local client = server:accept()
        if client then
            -- Set client timeout
            client:settimeout(10)
            
            -- Simple HTTP request parsing
            local request_line, err = client:receive()
            
            if request_line then
                local method, path, version = request_line:match("^(%S+)%s+(%S+)%s+(.+)$")
                
                if not method or not path then
                    -- Invalid request line
                    local error_response = "HTTP/1.1 400 Bad Request\r\n" ..
                        "Content-Type: application/json\r\n" ..
                        "Content-Length: 27\r\n" ..
                        "Connection: close\r\n\r\n" ..
                        '{"error": "Bad Request"}'
                    client:send(error_response)
                    client:close()
                else
                
                -- Parse path and query string
                local base_path, query_string = path:match("^([^?]*)%??(.*)")
                base_path = base_path or path
                
                -- Simple URL decode function
                local function url_decode(str)
                    if not str then return str end
                    str = str:gsub("+", " ")
                    str = str:gsub("%%(%x%x)", function(h) return string.char(tonumber(h, 16)) end)
                    return str
                end
                
                -- Parse query parameters
                local query_params = {}
                if query_string and query_string ~= "" then
                    for key, value in query_string:gmatch("([^&=]+)=([^&]*)") do
                        query_params[url_decode(key)] = url_decode(value)
                    end
                end
                
                -- Read headers
                local headers = {}
                local content_length = 0
                repeat
                    local line = client:receive()
                    if line and line ~= "" then
                        local key, value = line:match("^([^:]+):%s*(.+)$")
                        if key then
                            headers[key:lower()] = value
                            if key:lower() == "content-length" then
                                content_length = tonumber(value) or 0
                            end
                        end
                    end
                until not line or line == ""
                
                -- Read body
                local body = ""
                if content_length > 0 then
                    body = client:receive(content_length)
                    if not body then
                        body = ""
                    end
                end
                
                -- Process request
                local response_data = ""
                local status_code = "200 OK"
                
                if method == "POST" and base_path == "/proxy/request" then
                    -- Parse JSON to get target URL and method
                    local target_url = "unknown"
                    local target_method = "unknown"
                    if body then
                        local success, parsed = pcall(json.decode, body)
                        if success and parsed.url and parsed.method then
                            target_url = parsed.url
                            target_method = parsed.method
                        end
                    end
                    print(target_method .. " " .. target_url)
                    
                    local result = proxy_request_view(body)
                    response_data = json.encode(result)
                elseif method == "POST" and base_path == "/proxy/form" then
                    -- Get target URL and method from query params
                    local target_url = query_params.url or "unknown"
                    local target_method = query_params.method or "POST"
                    print(target_method .. " " .. target_url)
                    
                    -- Parse form data from body
                    local form_data = {}
                    if body then
                        for key, value in body:gmatch("([^&=]+)=([^&]*)") do
                            form_data[url_decode(key)] = url_decode(value)
                        end
                    end
                    local result = proxy_form_data_view(query_params, form_data, {})
                    response_data = json.encode(result)
                elseif method == "OPTIONS" then
                    -- Handle CORS preflight
                    print("OPTIONS " .. base_path .. " (CORS preflight)")
                    local options_response = {
                        success = true,
                        message = "CORS preflight response",
                        allowed_methods = {"GET", "POST", "PUT", "DELETE", "OPTIONS"},
                        allowed_headers = {"Content-Type", "Authorization", "X-Requested-With"},
                        max_age = 86400
                    }
                    response_data = json.encode(options_response)
                else
                    status_code = "404 Not Found"
                    response_data = '{"error": "Not found", "method": "' .. method .. '", "path": "' .. base_path .. '"}'
                end
                
                -- Send response
                local response = "HTTP/1.1 " .. status_code .. "\r\n" ..
                    "Content-Type: application/json\r\n" ..
                    "Content-Length: " .. #response_data .. "\r\n" ..
                    "Access-Control-Allow-Origin: *\r\n" ..
                    "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n" ..
                    "Access-Control-Allow-Headers: Content-Type, Authorization\r\n" ..
                    "Connection: close\r\n\r\n" ..
                    response_data
                
                client:send(response)
                end
            end
            client:close()
        end
        
        -- Small delay to prevent busy loop
        socket.sleep(0.01)
    end
end

-- Main entry point
local function main()
    if arg and #arg > 0 and arg[1] == "--port" then
        local port = tonumber(arg[2]) or 8080
        standalone_server(port)
    elseif ngx then
        -- OpenResty/Nginx environment
        openresty_handler()
    else
        -- Return module for require()
        return {
            proxy_request_view = proxy_request_view,
            proxy_form_data_view = proxy_form_data_view,
            cancel_request = cancel_request,
            openresty_handler = openresty_handler,
            standalone_server = standalone_server
        }
    end
end

-- Execute main or return module
if arg and #arg > 0 then
    -- Command line execution
    main()
else
    -- Module require - return the module table
    return {
        proxy_request_view = proxy_request_view,
        proxy_form_data_view = proxy_form_data_view,
        cancel_request = cancel_request,
        openresty_handler = openresty_handler,
        standalone_server = standalone_server
    }
end