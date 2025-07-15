#!/bin/bash

# Test script for standalone proxy server
# Start the proxy server and test it with curl

echo "Testing RequestBite Slingshot Proxy standalone server..."
echo "================================================"

# Test 1: Simple GET request
echo "Test 1: Simple GET request"
curl -s -X POST http://localhost:8080/proxy/request \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "url": "https://httpbin.org/get",
    "timeout": 10
  }' | jq '.'

echo -e "\n"

# Test 2: POST request with body
echo "Test 2: POST request with JSON body"
curl -s -X POST http://localhost:8080/proxy/request \
  -H "Content-Type: application/json" \
  -d '{
    "method": "POST",
    "url": "https://httpbin.org/post",
    "headers": ["Content-Type: application/json"],
    "body": "{\"test\": \"data\"}",
    "timeout": 10
  }' | jq '.'

echo -e "\n"

# Test 3: Error handling (invalid URL)
echo "Test 3: Error handling (invalid URL)"
curl -s -X POST http://localhost:8080/proxy/request \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "url": "invalid-url",
    "timeout": 10
  }' | jq '.'

echo -e "\n"

# Test 4: Form data request
echo "Test 4: Form data request"
curl -s -X POST "http://localhost:8080/proxy/form?url=https://httpbin.org/post&method=POST&contentType=application/x-www-form-urlencoded" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "field1=value1&field2=value2" | jq '.'

echo -e "\n"

# Test 5: OPTIONS request (CORS)
echo "Test 5: OPTIONS request (CORS)"
curl -s -X OPTIONS http://localhost:8080/proxy/request \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n"
echo "All tests completed!"

