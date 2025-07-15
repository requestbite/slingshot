#!/usr/bin/env lua

--[[
Test script for the RequestBite Slingshot Proxy
Run this script to test the proxy functionality
]]

local proxy = require('proxy')
local json = require('cjson')

-- Test configuration
local tests = {
    {
        name = "Simple GET request",
        type = "request",
        data = {
            method = "GET",
            url = "https://httpbin.org/get",
            headers = {"User-Agent: Test Client"}
        }
    },
    {
        name = "POST request with JSON body",
        type = "request",
        data = {
            method = "POST",
            url = "https://httpbin.org/post",
            headers = {
                "Content-Type: application/json",
                "User-Agent: Test Client"
            },
            body = '{"test": "data", "number": 42}'
        }
    },
    {
        name = "Path parameter substitution",
        type = "request",
        data = {
            method = "GET",
            url = "https://httpbin.org/status/:code",
            path_params = {
                [":code"] = "200"
            }
        }
    },
    {
        name = "Form data request",
        type = "form",
        query_params = {
            url = "https://httpbin.org/post",
            method = "POST",
            contentType = "application/x-www-form-urlencoded"
        },
        form_data = {
            field1 = "value1",
            field2 = "value2"
        }
    },
    {
        name = "Invalid URL test",
        type = "request",
        data = {
            method = "GET",
            url = "invalid-url"
        }
    },
    {
        name = "Timeout test",
        type = "request",
        data = {
            method = "GET",
            url = "https://httpbin.org/delay/2",
            timeout = 1
        }
    }
}

-- Helper function to print test results
local function print_test_result(test_name, result)
    print("\n" .. string.rep("=", 60))
    print("Test: " .. test_name)
    print(string.rep("=", 60))
    
    if result.success then
        print("✓ SUCCESS")
        print("Status: " .. (result.response_status or "N/A"))
        print("Time: " .. (result.response_time or "N/A"))
        print("Size: " .. (result.response_size or "N/A"))
        print("Binary: " .. (result.is_binary and "Yes" or "No"))
        
        if result.response_headers then
            print("Headers:")
            for k, v in pairs(result.response_headers) do
                print("  " .. k .. ": " .. v)
            end
        end
        
        if result.response_data then
            local data = result.response_data
            if #data > 200 then
                data = data:sub(1, 200) .. "... (truncated)"
            end
            print("Response: " .. data)
        end
    else
        print("✗ FAILED")
        if result.cancelled then
            print("Reason: Request was cancelled")
        else
            print("Error Type: " .. (result.error_type or "unknown"))
            print("Error Title: " .. (result.error_title or "N/A"))
            print("Error Message: " .. (result.error_message or "N/A"))
        end
        print("Time: " .. (result.response_time or "N/A"))
    end
end

-- Run tests
print("Starting RequestBite Slingshot Proxy Tests")
print("==========================================")

for i, test in ipairs(tests) do
    print("\nRunning test " .. i .. "/" .. #tests .. ": " .. test.name)
    
    local result
    if test.type == "request" then
        result = proxy.proxy_request_view(test.data)
    elseif test.type == "form" then
        result = proxy.proxy_form_data_view(test.query_params, test.form_data or {}, test.files or {})
    end
    
    print_test_result(test.name, result)
    
    -- Small delay between tests
    os.execute("sleep 0.5")
end

print("\n" .. string.rep("=", 60))
print("All tests completed!")
print(string.rep("=", 60))