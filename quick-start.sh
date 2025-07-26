#!/bin/bash

# Dandolo API Quick Start Script
# Test your Dandolo API key and get started immediately
#
# Usage:
#   ./quick-start.sh
#   ./quick-start.sh dk_your_api_key_here

set -e

DANDOLO_BASE_URL="https://judicious-hornet-148.convex.cloud"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    local status=$1
    local message=$2
    case $status in
        "success") echo -e "${GREEN}✅ $message${NC}" ;;
        "error") echo -e "${RED}❌ $message${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "info") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        *) echo "$message" ;;
    esac
}

validate_api_key() {
    local key=$1
    if [[ ! $key =~ ^(dk_|ak_).{18,} ]]; then
        print_status "error" "Invalid API key format. Expected: dk_xxx or ak_xxx (minimum 20 characters)"
        return 1
    fi
    return 0
}

test_connection() {
    local api_key=$1
    print_status "info" "Testing API connection..."
    
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST "${DANDOLO_BASE_URL}/v1/chat/completions" \
        -H "Authorization: Bearer $api_key" \
        -H "Content-Type: application/json" \
        -d '{
            "model": "auto-select",
            "messages": [{"role": "user", "content": "Say \"Connection successful!\""}],
            "max_tokens": 20
        }')
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        local content=$(echo "$body" | jq -r '.choices[0].message.content' 2>/dev/null || echo "Response received")
        print_status "success" "Connection test passed: $content"
        return 0
    else
        print_status "error" "Connection failed (HTTP $http_code): $body"
        return 1
    fi
}

check_balance() {
    local api_key=$1
    print_status "info" "Checking API balance..."
    
    local response=$(curl -s -w "\n%{http_code}" \
        -X GET "${DANDOLO_BASE_URL}/api/v1/balance" \
        -H "Authorization: Bearer $api_key")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        if command -v jq >/dev/null 2>&1; then
            local used=$(echo "$body" | jq -r '.balance.used')
            local limit=$(echo "$body" | jq -r '.balance.limit') 
            local remaining=$(echo "$body" | jq -r '.balance.remaining')
            local usage_pct=$(echo "scale=1; $used * 100 / $limit" | bc -l 2>/dev/null || echo "N/A")
            
            if (( $(echo "$usage_pct < 80" | bc -l 2>/dev/null || echo 0) )); then
                print_status "success" "Usage: $used/$limit (${usage_pct}%) - $remaining remaining"
            else
                print_status "warning" "High usage: $used/$limit (${usage_pct}%) - $remaining remaining"
            fi
        else
            print_status "success" "Balance check passed (install 'jq' for detailed info)"
        fi
        return 0
    else
        print_status "warning" "Balance check failed (HTTP $http_code)"
        return 1
    fi
}

list_models() {
    local api_key=$1
    print_status "info" "Fetching available models..."
    
    local response=$(curl -s -w "\n%{http_code}" \
        -X GET "${DANDOLO_BASE_URL}/v1/models" \
        -H "Authorization: Bearer $api_key")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        if command -v jq >/dev/null 2>&1; then
            local model_count=$(echo "$body" | jq '.data | length')
            local models=$(echo "$body" | jq -r '.data[0:5][].id' | tr '\n' ', ' | sed 's/,$//')
            print_status "success" "Found $model_count models: $models..."
        else
            print_status "success" "Models fetched successfully (install 'jq' for details)"
        fi
        return 0
    else
        print_status "warning" "Models fetch failed (HTTP $http_code)"
        return 1
    fi
}

show_curl_examples() {
    local api_key=$1
    
    echo
    print_status "info" "🚀 Ready to integrate! Here are some curl examples:"
    echo
    
    cat << EOF
# Basic chat completion:
curl -X POST "${DANDOLO_BASE_URL}/v1/chat/completions" \\
  -H "Authorization: Bearer $api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "auto-select",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant"},
      {"role": "user", "content": "Explain quantum computing in simple terms"}
    ],
    "temperature": 0.7,
    "max_tokens": 1000
  }'

# Check your usage:
curl -X GET "${DANDOLO_BASE_URL}/api/v1/balance" \\
  -H "Authorization: Bearer $api_key"

# List available models:
curl -X GET "${DANDOLO_BASE_URL}/v1/models" \\
  -H "Authorization: Bearer $api_key"

# Generate an image:
curl -X POST "${DANDOLO_BASE_URL}/v1/images/generations" \\
  -H "Authorization: Bearer $api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "flux-schnell",
    "prompt": "A beautiful sunset over mountains",
    "width": 1024,
    "height": 1024,
    "steps": 4
  }'

# Get text embeddings:
curl -X POST "${DANDOLO_BASE_URL}/v1/embeddings" \\
  -H "Authorization: Bearer $api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "text-embedding-ada-002",
    "input": "Your text to embed"
  }'
EOF
}

show_integration_examples() {
    local api_key=$1
    
    echo
    print_status "info" "💡 Integration Examples:"
    echo
    
    cat << EOF
# Python (using requests):
import requests

response = requests.post(
    "${DANDOLO_BASE_URL}/v1/chat/completions",
    headers={"Authorization": "Bearer $api_key"},
    json={
        "model": "auto-select",
        "messages": [{"role": "user", "content": "Hello!"}]
    }
)
print(response.json()['choices'][0]['message']['content'])

# JavaScript/Node.js:
const response = await fetch("${DANDOLO_BASE_URL}/v1/chat/completions", {
    method: "POST",
    headers: {
        "Authorization": "Bearer $api_key",
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        model: "auto-select",
        messages: [{role: "user", content: "Hello!"}]
    })
});
const data = await response.json();
console.log(data.choices[0].message.content);

# OpenAI Python SDK compatible:
import openai
client = openai.OpenAI(
    api_key="$api_key", 
    base_url="${DANDOLO_BASE_URL}/v1"
)
response = client.chat.completions.create(
    model="auto-select",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
EOF
}

run_basic_test() {
    local api_key=$1
    
    print_status "info" "🧪 Running basic integration test..."
    echo "=" * 50
    
    local tests_passed=0
    local total_tests=3
    
    # Test 1: Connection
    if test_connection "$api_key"; then
        ((tests_passed++))
    fi
    
    echo
    
    # Test 2: Balance
    if check_balance "$api_key"; then
        ((tests_passed++))
    fi
    
    echo
    
    # Test 3: Models
    if list_models "$api_key"; then
        ((tests_passed++))
    fi
    
    echo
    echo "=" * 50
    
    if [ $tests_passed -eq $total_tests ]; then
        print_status "success" "🎉 All tests passed ($tests_passed/$total_tests)! Your API key is working perfectly."
        return 0
    else
        print_status "warning" "⚠️  Some tests failed ($tests_passed/$total_tests). Check the errors above."
        return 1
    fi
}

main() {
    echo "🚀 Dandolo API Quick Start"
    echo "=========================="
    echo
    
    # Get API key
    local api_key="$1"
    if [ -z "$api_key" ]; then
        echo -n "Enter your Dandolo API key (dk_ or ak_): "
        read -r api_key
    fi
    
    # Validate API key
    if ! validate_api_key "$api_key"; then
        exit 1
    fi
    
    # Check dependencies
    if ! command -v curl >/dev/null 2>&1; then
        print_status "error" "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq >/dev/null 2>&1; then
        print_status "warning" "jq not found - install for better output formatting"
        echo
    fi
    
    # Run tests
    if run_basic_test "$api_key"; then
        show_curl_examples "$api_key"
        echo
        show_integration_examples "$api_key"
        echo
        print_status "success" "✅ Quick start complete! You're ready to integrate with Dandolo."
        echo
        print_status "info" "📚 For more examples, see: AGENT_INTEGRATION_GUIDE.md"
        print_status "info" "🧪 For comprehensive testing, run: python test-dandolo-integration.py"
    else
        echo
        print_status "error" "❌ Integration test failed. Please check your API key and try again."
        echo
        print_status "info" "💡 Need help? Visit https://dandolo.ai/developers or check AGENT_INTEGRATION_GUIDE.md"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"