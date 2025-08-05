# Dandolo.ai API Documentation

> **Complete API reference for the superior AI inference platform**

## Table of Contents

- [Authentication](#authentication)
- [Base URLs & Endpoints](#base-urls--endpoints)
- [Rate Limits](#rate-limits)
- [Error Handling](#error-handling)
- [Chat Completions API](#chat-completions-api)
- [Models API](#models-api)
- [Usage & Billing API](#usage--billing-api)
- [Streaming](#streaming)
- [WebSocket Real-time](#websocket-real-time)
- [SDKs](#sdks)

## Authentication

### API Key Types

| Key Type | Prefix | Daily Limit | Use Case |
|----------|--------|-------------|----------|
| **Agent Keys** | `ak_` | 5,000 requests | Production AI agents |
| **Developer Keys** | `dk_` | 1,000 requests | Development & testing |
| **Anonymous** | None | 50 requests | Quick trials |

### Authentication Methods

**Bearer Token (Recommended):**
```http
Authorization: Bearer ak_your_api_key_here
```

**Header Authentication:**
```http
X-API-Key: ak_your_api_key_here
```

**Query Parameter (Not recommended for production):**
```http
GET /v1/models?api_key=ak_your_api_key_here
```

## Base URLs & Endpoints

### Primary API Base
```
https://dandolo-prod.vercel.app
```

### OpenAI Compatible Base
```
https://dandolo-prod.vercel.app/v1
```

### Venice.ai Proxy Base
```
https://dandolo-prod.vercel.app/api
```

## Rate Limits

### Current Limits

| Key Type | Requests/Day | Requests/Second | Tokens/Minute |
|----------|--------------|-----------------|---------------|
| Agent Keys (`ak_`) | 5,000 | 10 | 50,000 |
| Developer Keys (`dk_`) | 1,000 | 5 | 25,000 |
| Anonymous | 50 | 1 | 2,500 |

### Rate Limit Headers

Every response includes rate limit information:

```http
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4847
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 3600
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "type": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Try again in 3600 seconds.",
    "code": 429,
    "details": {
      "limit": 5000,
      "remaining": 0,
      "reset_time": 1640995200,
      "retry_after": 3600
    }
  }
}
```

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "type": "invalid_request",
    "message": "The request was invalid",
    "code": 400,
    "details": {
      "field": "messages",
      "issue": "messages array cannot be empty"
    },
    "request_id": "req_abc123",
    "documentation_url": "https://docs.dandolo.ai/errors#invalid_request"
  }
}
```

### Error Types

| Error Type | HTTP Code | Description |
|------------|-----------|-------------|
| `invalid_request` | 400 | Malformed request |
| `authentication_error` | 401 | Invalid API key |
| `permission_denied` | 403 | Insufficient permissions |
| `not_found` | 404 | Endpoint or resource not found |
| `rate_limit_exceeded` | 429 | Rate limit exceeded |
| `server_error` | 500 | Internal server error |
| `service_unavailable` | 503 | Service temporarily unavailable |

## Chat Completions API

### Create Chat Completion

**Endpoint:** `POST /v1/chat/completions`

**OpenAI Compatible:** ✅ 100% compatible with OpenAI ChatCompletion API

#### Basic Request

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user", 
      "content": "Hello, how are you?"
    }
  ],
  "model": "auto-select",
  "max_tokens": 1000,
  "temperature": 0.7
}
```

#### Advanced Request (Agent Features)

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Analyze this data and provide insights"
    }
  ],
  "model": "auto-select",
  "temperature": 0.3,
  "max_tokens": 2000,
  "stream": false,
  "agent_instructions": {
    "task_type": "analysis",
    "output_format": "structured",
    "creativity_level": "low"
  },
  "context_window": "extended",
  "failover_enabled": true,
  "cost_optimization": true
}
```

#### Venice.ai Character Connection

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello! Can you give me advice about horses?"
    }
  ],
  "model": "llama-3.3-70b",
  "venice_parameters": {
    "character_slug": "my-horse-advisor"
  }
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messages` | Array | ✅ | Array of conversation messages |
| `model` | String | ❌ | Model ID or "auto-select" (default) |
| `max_tokens` | Integer | ❌ | Maximum tokens to generate (default: 1000) |
| `temperature` | Float | ❌ | Randomness 0.0-2.0 (default: 0.7) |
| `top_p` | Float | ❌ | Nucleus sampling (default: 1.0) |
| `stream` | Boolean | ❌ | Enable streaming (default: false) |
| `stop` | String/Array | ❌ | Stop sequences |
| `presence_penalty` | Float | ❌ | Presence penalty -2.0 to 2.0 |
| `frequency_penalty` | Float | ❌ | Frequency penalty -2.0 to 2.0 |
| `user` | String | ❌ | User identifier for tracking |
| `venice_parameters` | Object | ❌ | Venice.ai-specific parameters (character connections, etc.) |

#### Venice.ai Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `venice_parameters.character_slug` | String | Connect to a specific Venice.ai character |
| `venice_parameters.system_prompt` | String | Override system prompt |
| `venice_parameters.custom_parameters` | Object | Additional Venice.ai parameters |

#### Agent-Enhanced Parameters (Agent Keys Only)

| Parameter | Type | Description |
|-----------|------|-------------|
| `agent_instructions` | Object | Task-specific instructions |
| `context_window` | String | "standard", "extended", "maximum" |
| `failover_enabled` | Boolean | Enable automatic failover |
| `cost_optimization` | Boolean | Optimize for cost vs speed |
| `quality_preference` | String | "speed", "balanced", "quality" |

#### Response

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1640995200,
  "model": "claude-3-sonnet-20240229",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well, thank you for asking. How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 23,
    "completion_tokens": 17,
    "total_tokens": 40
  },
  "metadata": {
    "provider": "anthropic",
    "actual_model": "claude-3-sonnet-20240229",
    "processing_time_ms": 1247,
    "cost_usd": 0.002,
    "region": "us-east-1"
  }
}
```

### Streaming Chat Completions

**Endpoint:** `POST /v1/chat/completions` with `"stream": true`

#### Request

```json
{
  "messages": [
    {"role": "user", "content": "Write a story about AI"}
  ],
  "model": "auto-select",
  "stream": true,
  "max_tokens": 1000
}
```

#### Server-Sent Events Response

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1640995200,"model":"claude-3-sonnet","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1640995200,"model":"claude-3-sonnet","choices":[{"index":0,"delta":{"content":"Once"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1640995200,"model":"claude-3-sonnet","choices":[{"index":0,"delta":{"content":" upon"},"finish_reason":null}]}

data: [DONE]
```

## Models API

### List Available Models

**Endpoint:** `GET /v1/models`

#### Response

```json
{
  "object": "list",
  "data": [
    {
      "id": "auto-select",
      "object": "model",
      "created": 1640995200,
      "owned_by": "dandolo",
      "permission": [],
      "root": "auto-select",
      "parent": null,
      "capabilities": ["chat", "completion"],
      "description": "Automatically selects the best model for your task",
      "context_window": 200000,
      "cost_per_1k_tokens": 0.002
    },
    {
      "id": "claude-3-sonnet-20240229",
      "object": "model", 
      "created": 1640995200,
      "owned_by": "anthropic",
      "capabilities": ["chat", "analysis", "coding"],
      "context_window": 200000,
      "cost_per_1k_tokens": 0.003,
      "provider": "anthropic",
      "category": "reasoning"
    }
  ]
}
```

### Get Model Details

**Endpoint:** `GET /v1/models/{model_id}`

#### Response

```json
{
  "id": "claude-3-sonnet-20240229",
  "object": "model",
  "created": 1640995200,
  "owned_by": "anthropic",
  "capabilities": ["chat", "analysis", "coding", "reasoning"],
  "context_window": 200000,
  "cost_per_1k_tokens": 0.003,
  "provider": "anthropic",
  "category": "reasoning",
  "description": "Advanced reasoning and analysis model",
  "parameters": {
    "max_tokens": 4096,
    "temperature_range": [0.0, 1.0],
    "supports_streaming": true,
    "supports_function_calling": true
  },
  "performance": {
    "average_latency_ms": 1200,
    "tokens_per_second": 150,
    "uptime_percentage": 99.9
  }
}
```

## Usage & Billing API

### Get Usage Statistics

**Endpoint:** `GET /v1/usage`

#### Response

```json
{
  "object": "usage",
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "daily_usage": {
    "requests": 45,
    "limit": 5000,
    "percentage": 0.9
  },
  "tokens": {
    "prompt_tokens": 12450,
    "completion_tokens": 8900,
    "total_tokens": 21350
  },
  "costs": {
    "total_usd": 4.27,
    "prompt_cost_usd": 2.49,
    "completion_cost_usd": 1.78
  },
  "models_used": [
    {
      "model": "claude-3-sonnet-20240229",
      "requests": 30,
      "tokens": 15000,
      "cost_usd": 3.00
    },
    {
      "model": "auto-select",
      "requests": 15,
      "tokens": 6350,
      "cost_usd": 1.27
    }
  ]
}
```

### Get Current Balance

**Endpoint:** `GET /v1/balance`

#### Response

```json
{
  "object": "balance",
  "remaining_requests": 4955,
  "daily_limit": 5000,
  "reset_time": 1640995200,
  "reset_in_seconds": 3600,
  "credits": {
    "balance": 47.83,
    "currency": "USD"
  },
  "subscription": {
    "type": "agent",
    "status": "active"
  }
}
```

## WebSocket Real-time API

### Connection

**Endpoint:** `wss://dandolo.ai/v1/realtime`

#### Authentication

```javascript
const ws = new WebSocket('wss://dandolo.ai/v1/realtime', {
  headers: {
    'Authorization': 'Bearer ak_your_api_key'
  }
});
```

#### Message Format

```json
{
  "type": "conversation.item.create",
  "item": {
    "type": "message",
    "role": "user",
    "content": [
      {
        "type": "input_text",
        "text": "Hello, can you hear me?"
      }
    ]
  }
}
```

## SDKs

### TypeScript/JavaScript

```bash
npm install @dandolo/agent-sdk
```

```typescript
import Dandolo from '@dandolo/agent-sdk';

const client = new Dandolo({
  apiKey: 'ak_your_key',
  baseURL: 'https://dandolo-prod.vercel.app' // optional
});
```

### Python

```bash
pip install dandolo-sdk
```

```python
from dandolo import Dandolo

client = Dandolo(
    api_key="ak_your_key",
    base_url="https://dandolo-prod.vercel.app"  # optional
)
```

### Go (Coming Soon)

```bash
go get github.com/dandolo-ai/go-sdk
```

```go
import "github.com/dandolo-ai/go-sdk"

client := dandolo.NewClient("ak_your_key")
```

## Code Examples

### Simple Chat

```python
response = client.chat.completions.create(
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)
```

### Venice.ai Character Connection

```python
# Connect to a specific Venice.ai character
response = client.chat.completions.create(
    messages=[
        {"role": "user", "content": "Hello! Can you give me advice about horses?"}
    ],
    model="llama-3.3-70b",
    venice_parameters={
        "character_slug": "my-horse-advisor"
    }
)
print(response.choices[0].message.content)
```

```javascript
// JavaScript/Node.js example
const response = await fetch('https://dandolo-prod.vercel.app/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ak_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Hello! Can you give me advice about horses?' }
    ],
    model: 'llama-3.3-70b',
    venice_parameters: {
      character_slug: 'my-horse-advisor'
    }
  })
});

const result = await response.json();
console.log(result.choices[0].message.content);
```

```bash
# cURL example
curl -X POST https://dandolo-prod.vercel.app/v1/chat/completions \
  -H "Authorization: Bearer ak_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello! Can you give me advice about horses?"}
    ],
    "model": "llama-3.3-70b",
    "venice_parameters": {
      "character_slug": "my-horse-advisor"
    }
  }'
```

### Streaming Response

```python
for chunk in client.chat.completions.create(
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
):
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

### Function Calling

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"}
                }
            }
        }
    }
]

response = client.chat.completions.create(
    messages=[{"role": "user", "content": "What's the weather in Paris?"}],
    tools=tools,
    tool_choice="auto"
)
```

### Error Handling

```python
from dandolo.exceptions import RateLimitError, AuthenticationError

try:
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": "Hello"}]
    )
except RateLimitError as e:
    print(f"Rate limited. Retry after: {e.retry_after} seconds")
except AuthenticationError:
    print("Invalid API key")
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Best Practices

### 1. Use Auto-Select for Model Selection

```python
# ✅ Good - Let Dandolo choose the best model
response = client.chat.completions.create(
    messages=[{"role": "user", "content": "Analyze this code"}],
    model="auto-select"
)

# ❌ Avoid - Manual model selection unless necessary
response = client.chat.completions.create(
    messages=[{"role": "user", "content": "Analyze this code"}],
    model="specific-model-id"
)
```

### 2. Implement Proper Error Handling

```python
import time
from dandolo.exceptions import RateLimitError

def make_request_with_retry(client, messages, max_retries=3):
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(messages=messages)
        except RateLimitError as e:
            if attempt < max_retries - 1:
                time.sleep(e.retry_after)
                continue
            raise
        except Exception:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
                continue
            raise
```

### 3. Monitor Usage

```python
# Check usage before making expensive requests
usage = client.usage()
if usage.daily_usage.percentage > 0.9:
    print("Approaching daily limit")
```

### 4. Use Streaming for Long Responses

```python
# ✅ Good for long content
def stream_response(messages):
    for chunk in client.chat.completions.create(
        messages=messages,
        stream=True
    ):
        if content := chunk.choices[0].delta.content:
            yield content

# ❌ Avoid for long responses
response = client.chat.completions.create(
    messages=long_conversation,
    stream=False  # May timeout for very long responses
)
```

## Support

- **Documentation**: [docs.dandolo.ai](https://docs.dandolo.ai)
- **API Status**: [status.dandolo.ai](https://status.dandolo.ai)
- **Support Email**: [support@dandolo.ai](mailto:support@dandolo.ai)
- **Discord**: [discord.gg/dandolo](https://discord.gg/dandolo)

---

*Last updated: January 2025*