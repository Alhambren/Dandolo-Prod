#!/bin/bash

# Quick test of the new API endpoint
echo "🧪 Testing new API endpoint: https://api.dandolo.ai/v1/chat/completions"
echo ""

# Test OPTIONS request (CORS preflight)
echo "1. Testing OPTIONS request (CORS):"
curl -X OPTIONS https://api.dandolo.ai/v1/chat/completions -I
echo ""

# Test POST without auth (should return 401)
echo "2. Testing POST without authentication (expecting 401):"
curl -X POST https://api.dandolo.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "test"}]}' \
  -w "HTTP Status: %{http_code}\n" \
  -s
echo ""

# Test with API key if provided
if [ ! -z "$1" ]; then
    echo "3. Testing with API key:"
    curl -X POST https://api.dandolo.ai/v1/chat/completions \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $1" \
      -d '{
        "messages": [{"role": "user", "content": "Hello! This is a test."}],
        "model": "auto-select",
        "max_tokens": 50
      }' \
      -w "\nHTTP Status: %{http_code}\n" \
      -s
else
    echo "3. Skipped API key test (provide key as first argument)"
fi

echo ""
echo "Usage: $0 [api_key]"
echo "Example: $0 dk_your_developer_key"