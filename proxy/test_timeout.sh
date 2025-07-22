#!/bin/bash

# Test script for the Go proxy timeout functionality
set -e

PORT=8081
PROXY_URL="http://localhost:$PORT"

echo "🚀 Starting Go proxy server on port $PORT..."
./proxy-go -port $PORT &
PROXY_PID=$!

# Wait for server to start
sleep 2

# Cleanup function
cleanup() {
    echo "🛑 Stopping proxy server..."
    kill $PROXY_PID 2>/dev/null || true
    wait $PROXY_PID 2>/dev/null || true
}
trap cleanup EXIT

echo "✅ Proxy server started with PID: $PROXY_PID"
echo ""

# Test 1: Normal request (should succeed)
echo "📋 Test 1: Normal request to httpbin.org..."
curl -X POST "$PROXY_URL/proxy/request" \
    -H "Content-Type: application/json" \
    -d '{
        "method": "GET",
        "url": "https://httpbin.org/get",
        "headers": [],
        "timeout": 10,
        "followRedirects": true
    }' | jq '.success, .response_status, .response_time'

echo ""

# Test 2: Timeout request (should fail with timeout)
echo "📋 Test 2: Timeout request (2 second timeout, 5 second delay)..."
curl -X POST "$PROXY_URL/proxy/request" \
    -H "Content-Type: application/json" \
    -d '{
        "method": "GET", 
        "url": "https://httpbin.org/delay/5",
        "headers": [],
        "timeout": 2,
        "followRedirects": true
    }' | jq '.success, .error_type, .error_title, .response_time'

echo ""

# Test 3: Redirect with followRedirects = false (should fail)
echo "📋 Test 3: Redirect with followRedirects = false..."
curl -X POST "$PROXY_URL/proxy/request" \
    -H "Content-Type: application/json" \
    -d '{
        "method": "GET",
        "url": "http://httpbin.org/redirect/1", 
        "headers": [],
        "timeout": 10,
        "followRedirects": false
    }' | jq '.success, .error_type, .error_title'

echo ""

# Test 4: Redirect with followRedirects = true (should succeed)
echo "📋 Test 4: Redirect with followRedirects = true..."
curl -X POST "$PROXY_URL/proxy/request" \
    -H "Content-Type: application/json" \
    -d '{
        "method": "GET",
        "url": "http://httpbin.org/redirect/1",
        "headers": [],
        "timeout": 10, 
        "followRedirects": true
    }' | jq '.success, .response_status'

echo ""

# Test 5: Test the original failing case from the conversation
echo "📋 Test 5: Original failing case - requestbite.com with 2s timeout..."
curl -X POST "$PROXY_URL/proxy/request" \
    -H "Content-Type: application/json" \
    -d '{
        "method": "GET",
        "url": "http://requestbite.com/delay?s=3",
        "headers": [],
        "timeout": 2,
        "followRedirects": false
    }' | jq '.success, .error_type, .error_title, .response_time'

echo ""
echo "🎉 All tests completed!"