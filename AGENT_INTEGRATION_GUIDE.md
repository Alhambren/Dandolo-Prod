# Dandolo AI Agent Integration Guide

**Complete guide for AI agents to integrate with Dandolo's decentralized AI inference platform**

---

## 🚀 Quick Start (5 minutes)

### 1. Get Your API Key
Visit [https://dandolo.ai/developers](https://dandolo.ai/developers) and choose:
- **Developer Key (`dk_`)**: 500 requests/day - Perfect for testing
- **Agent Key (`ak_`)**: 5,000 requests/day - Production ready

### 2. Test Connection
```bash
# Test your key immediately
curl https://dandolo-prod.vercel.app/api/api/v1/chat/completions \
  -H "Authorization: Bearer dk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto-select",
    "messages": [{"role": "user", "content": "Hello! Test connection."}]
  }'
```

### 3. Expected Response
```json
{
  "id": "chat-xxx",
  "object": "chat.completion", 
  "created": 1234567890,
  "model": "llama-3.3-70b",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! Your connection to Dandolo is working perfectly..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 28,
    "total_tokens": 40
  }
}
```

✅ **If you see this response, you're ready to integrate!**

---

## 🔑 Authentication

All endpoints require API key authentication:

```http
Authorization: Bearer dk_your_developer_key
# OR
Authorization: Bearer ak_your_agent_key
```

**Key Differences:**
- `dk_` keys: 500 requests/day, ideal for development/testing
- `ak_` keys: 5,000 requests/day, production-grade limits

---

## 📡 Core API Endpoints

### Base URL
```
https://dandolo-prod.vercel.app
```

### 1. Chat Completions (Primary Endpoint)
```http
POST /api/api/v1/chat/completions
```

**Standard OpenAI-compatible format:**
```json
{
  "model": "auto-select",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "Explain quantum computing"}
  ],
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": false
}
```

### 2. Available Models
```http
GET /api/api/v1/models
Authorization: Bearer your_key
```

### 3. Usage Balance
```http
GET /api/v1/balance
Authorization: Bearer your_key
```

Returns:
```json
{
  "balance": {
    "used": 45,
    "limit": 500,
    "remaining": 455,
    "keyType": "developer"
  }
}
```

### 4. Image Generation
```http
POST /v1/images/generations
```

```json
{
  "model": "flux-schnell",
  "prompt": "A beautiful sunset over mountains",
  "width": 1024,
  "height": 1024,
  "steps": 4
}
```

### 5. Text Embeddings
```http
POST /v1/embeddings
```

```json
{
  "model": "text-embedding-ada-002",
  "input": "The quick brown fox jumps over the lazy dog"
}
```

---

## 🛠️ Integration Examples

### Python (Requests)
```python
import requests

def dandolo_chat(messages, api_key):
    response = requests.post(
        "https://dandolo-prod.vercel.app/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": "auto-select",
            "messages": messages,
            "temperature": 0.7
        }
    )
    return response.json()

# Usage
result = dandolo_chat([
    {"role": "user", "content": "Hello!"}
], "dk_your_key")

print(result['choices'][0]['message']['content'])
```

### Python (OpenAI SDK Compatible)
```python
# Use with any OpenAI-compatible client
import openai

client = openai.OpenAI(
    api_key="dk_your_dandolo_key",
    base_url="https://dandolo-prod.vercel.app/v1"
)

response = client.chat.completions.create(
    model="auto-select",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
```

### JavaScript/Node.js
```javascript
const DANDOLO_CONFIG = {
  apiKey: 'ak_your_agent_key',
  baseURL: 'https://dandolo-prod.vercel.app/v1'
};

async function callDandolo(messages) {
  const response = await fetch(`${DANDOLO_CONFIG.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DANDOLO_CONFIG.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'auto-select',
      messages: messages
    })
  });
  
  return await response.json();
}

// Usage
const result = await callDandolo([
  { role: 'user', content: 'Hello from my agent!' }
]);
```

### cURL Examples
```bash
# Basic chat
curl https://dandolo-prod.vercel.app/api/v1/chat/completions \
  -H "Authorization: Bearer dk_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto-select",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Check balance
curl https://dandolo-prod.vercel.app/api/v1/balance \
  -H "Authorization: Bearer dk_your_key"

# List models
curl https://dandolo-prod.vercel.app/api/v1/models \
  -H "Authorization: Bearer dk_your_key"
```

---

## 🤖 Agent Framework Integration

### LangChain
```python
from langchain.llms.base import LLM
from typing import Optional, List, Mapping, Any
import requests

class DandoloLLM(LLM):
    api_key: str
    base_url: str = "https://dandolo-prod.vercel.app/v1"
    
    @property
    def _llm_type(self) -> str:
        return "dandolo"
    
    def _call(self, prompt: str, stop: Optional[List[str]] = None) -> str:
        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": "auto-select",
                "messages": [{"role": "user", "content": prompt}]
            }
        )
        return response.json()['choices'][0]['message']['content']

# Usage
llm = DandoloLLM(api_key="ak_your_agent_key")
result = llm("Explain quantum computing")
```

### AutoGen
```python
import autogen

config_list = [{
    "model": "auto-select",
    "api_key": "ak_your_agent_key",
    "base_url": "https://dandolo-prod.vercel.app/v1"
}]

assistant = autogen.AssistantAgent(
    name="assistant",
    llm_config={"config_list": config_list}
)

user = autogen.UserProxyAgent(
    name="user",
    human_input_mode="NEVER"
)

# Start conversation
user.initiate_chat(assistant, message="Hello from AutoGen!")
```

### CrewAI
```python
from crewai import Agent, Task, Crew
from langchain.llms import OpenAI

# Configure Dandolo as OpenAI-compatible
dandolo_llm = OpenAI(
    api_key="ak_your_agent_key",
    base_url="https://dandolo-prod.vercel.app/v1",
    model="auto-select"
)

researcher = Agent(
    role='Research Analyst',
    goal='Provide accurate research',
    backstory='Expert research analyst',
    llm=dandolo_llm
)

task = Task(
    description='Research quantum computing',
    agent=researcher
)

crew = Crew(agents=[researcher], tasks=[task])
result = crew.kickoff()
```

---

## 🧪 Testing Your Integration

### 1. Connection Test Script
```python
import requests
import sys

def test_dandolo_connection(api_key):
    print(f"🧪 Testing Dandolo API connection...")
    
    # Test 1: Basic chat
    try:
        response = requests.post(
            "https://dandolo-prod.vercel.app/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "auto-select",
                "messages": [{"role": "user", "content": "Say 'Connection successful!'"}]
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Chat endpoint: {data['choices'][0]['message']['content']}")
        else:
            print(f"❌ Chat endpoint failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False
    
    # Test 2: Balance check
    try:
        balance_response = requests.get(
            "https://dandolo-prod.vercel.app/api/v1/balance",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        
        if balance_response.status_code == 200:
            balance = balance_response.json()['balance']
            print(f"✅ Balance: {balance['remaining']}/{balance['limit']} requests remaining")
        else:
            print(f"⚠️  Balance check failed: {balance_response.status_code}")
            
    except Exception as e:
        print(f"⚠️  Balance check error: {e}")
    
    # Test 3: Models list
    try:
        models_response = requests.get(
            "https://dandolo-prod.vercel.app/api/v1/models",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        
        if models_response.status_code == 200:
            models = models_response.json()['data']
            print(f"✅ Available models: {len(models)} models found")
        else:
            print(f"⚠️  Models endpoint failed: {models_response.status_code}")
            
    except Exception as e:
        print(f"⚠️  Models check error: {e}")
    
    print(f"🎉 Integration test complete!")
    return True

# Run test
if __name__ == "__main__":
    api_key = input("Enter your Dandolo API key: ").strip()
    test_dandolo_connection(api_key)
```

### 2. Performance Test
```python
import time
import requests
import statistics

def performance_test(api_key, num_requests=5):
    print(f"🏃‍♂️ Running performance test ({num_requests} requests)...")
    
    times = []
    for i in range(num_requests):
        start = time.time()
        
        response = requests.post(
            "https://dandolo-prod.vercel.app/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "auto-select",
                "messages": [{"role": "user", "content": f"Count to {i+1}"}],
                "max_tokens": 50
            }
        )
        
        end = time.time()
        
        if response.status_code == 200:
            times.append(end - start)
            print(f"  Request {i+1}: {times[-1]:.2f}s")
        else:
            print(f"  Request {i+1}: FAILED ({response.status_code})")
    
    if times:
        print(f"📊 Performance Results:")
        print(f"  Average: {statistics.mean(times):.2f}s")
        print(f"  Median: {statistics.median(times):.2f}s")
        print(f"  Min: {min(times):.2f}s")
        print(f"  Max: {max(times):.2f}s")

# performance_test("dk_your_key")
```

---

## ❌ Error Handling

### Common Error Codes
```python
def handle_dandolo_response(response):
    if response.status_code == 200:
        return response.json()
    
    error_handlers = {
        401: "Invalid API key. Check your key format and permissions.",
        429: "Rate limit exceeded. Wait before retrying.",
        503: "No active providers available. Try again in a few minutes.",
        500: "Internal server error. Contact support if persistent."
    }
    
    error_msg = error_handlers.get(response.status_code, f"Unknown error: {response.status_code}")
    
    try:
        error_detail = response.json().get('error', '')
        full_error = f"{error_msg} Details: {error_detail}"
    except:
        full_error = error_msg
    
    raise Exception(full_error)

# Usage in your agent
try:
    response = requests.post(url, headers=headers, json=payload)
    result = handle_dandolo_response(response)
    # Process successful result
except Exception as e:
    print(f"Dandolo API error: {e}")
    # Handle error (retry, fallback, etc.)
```

### Retry Logic
```python
import time
import random

def dandolo_with_retry(api_key, messages, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = requests.post(
                "https://dandolo-prod.vercel.app/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"model": "auto-select", "messages": messages},
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:  # Rate limited
                wait_time = (2 ** attempt) + random.uniform(0, 1)
                print(f"Rate limited. Waiting {wait_time:.1f}s...")
                time.sleep(wait_time)
                continue
            else:
                response.raise_for_status()
                
        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                print(f"Timeout on attempt {attempt + 1}. Retrying...")
                time.sleep(2 ** attempt)
                continue
            raise
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                print(f"Request failed on attempt {attempt + 1}: {e}")
                time.sleep(2 ** attempt)
                continue
            raise
    
    raise Exception(f"Max retries ({max_retries}) exceeded")
```

---

## 🎯 Agent-Specific Best Practices

### 1. **Efficient Message Management**
```python
# For conversation agents, manage context efficiently
def manage_conversation_context(messages, max_tokens=4000):
    # Keep system message + recent messages within token limit
    if len(messages) <= 10:  # Small conversation
        return messages
    
    # Keep system message + last N messages
    system_msgs = [m for m in messages if m['role'] == 'system']
    other_msgs = [m for m in messages if m['role'] != 'system']
    
    # Keep recent context
    return system_msgs + other_msgs[-8:]  # Last 8 exchanges
```

### 2. **Batch Processing for Multiple Requests**
```python
import asyncio
import aiohttp

async def batch_dandolo_requests(api_key, request_batches):
    async with aiohttp.ClientSession() as session:
        tasks = []
        
        for batch in request_batches:
            task = asyncio.create_task(
                dandolo_async_request(session, api_key, batch)
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results

async def dandolo_async_request(session, api_key, messages):
    async with session.post(
        "https://dandolo-prod.vercel.app/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"model": "auto-select", "messages": messages}
    ) as response:
        return await response.json()
```

### 3. **Usage Monitoring**
```python
import logging

class DandoloUsageTracker:
    def __init__(self, api_key):
        self.api_key = api_key
        self.requests_made = 0
        self.tokens_used = 0
    
    async def track_usage(self):
        # Check current usage
        response = requests.get(
            "https://dandolo-prod.vercel.app/api/v1/balance",
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
        
        if response.status_code == 200:
            balance = response.json()['balance']
            usage_pct = (balance['used'] / balance['limit']) * 100
            
            if usage_pct > 80:
                logging.warning(f"High API usage: {usage_pct:.1f}% of daily limit used")
            
            return balance
        
        return None
    
    def log_request(self, response_data):
        self.requests_made += 1
        if 'usage' in response_data:
            self.tokens_used += response_data['usage']['total_tokens']
        
        logging.info(f"Request {self.requests_made}: {self.tokens_used} total tokens used")
```

---

## 🔍 Debugging & Monitoring

### Debug Mode
```python
import json

def debug_dandolo_request(api_key, messages, debug=True):
    if debug:
        print(f"🔍 Debug: Sending request to Dandolo")
        print(f"   Messages: {len(messages)}")
        print(f"   Last message: {messages[-1]['content'][:100]}...")
    
    start_time = time.time()
    
    response = requests.post(
        "https://dandolo-prod.vercel.app/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"model": "auto-select", "messages": messages}
    )
    
    end_time = time.time()
    
    if debug:
        print(f"   Response time: {end_time - start_time:.2f}s")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Model used: {data.get('model', 'unknown')}")
            print(f"   Tokens: {data.get('usage', {}).get('total_tokens', 'unknown')}")
            print(f"   Response: {data['choices'][0]['message']['content'][:100]}...")
        else:
            print(f"   Error: {response.text}")
    
    return response
```

### Health Check for Agents
```python
def agent_health_check(api_key):
    """Run before starting agent operations"""
    checks = {
        "api_connection": False,
        "balance_sufficient": False,
        "models_available": False
    }
    
    # Check API connection
    try:
        response = requests.get(
            "https://dandolo-prod.vercel.app/health",
            timeout=10
        )
        checks["api_connection"] = response.status_code == 200
    except:
        pass
    
    # Check balance
    try:
        balance_response = requests.get(
            "https://dandolo-prod.vercel.app/api/v1/balance",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        
        if balance_response.status_code == 200:
            balance = balance_response.json()['balance']
            checks["balance_sufficient"] = balance['remaining'] > 10
    except:
        pass
    
    # Check models
    try:
        models_response = requests.get(
            "https://dandolo-prod.vercel.app/api/v1/models",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        checks["models_available"] = models_response.status_code == 200
    except:
        pass
    
    all_good = all(checks.values())
    
    print(f"🏥 Agent Health Check:")
    for check, status in checks.items():
        icon = "✅" if status else "❌"
        print(f"   {icon} {check.replace('_', ' ').title()}")
    
    return all_good
```

---

## 📋 Quick Reference

### Essential URLs
- **Base URL**: `https://dandolo-prod.vercel.app`
- **Chat**: `POST /api/v1/chat/completions`
- **Models**: `GET /api/v1/models`
- **Balance**: `GET /api/v1/balance`
- **Images**: `POST /v1/images/generations`
- **Embeddings**: `POST /v1/embeddings`

### Rate Limits
- **Developer keys (`dk_`)**: 500 requests/day
- **Agent keys (`ak_`)**: 5,000 requests/day

### Supported Models
- `auto-select` - Smart routing (recommended)
- `llama-3.3-70b` - General purpose
- `claude-3-haiku` - Fast responses
- `gpt-4` - High quality reasoning
- `flux-schnell` - Image generation

---

## 🆘 Support & Troubleshooting

### Common Issues

**❌ `401 Unauthorized`**
- Check API key format (`dk_` or `ak_` prefix)
- Verify key hasn't been regenerated
- Ensure proper Authorization header

**❌ `429 Rate Limited`**
- Check daily usage with `/api/v1/balance`
- Implement exponential backoff
- Consider upgrading to agent key (`ak_`)

**❌ `503 Service Unavailable`**
- Decentralized provider temporarily unavailable
- Retry after 30-60 seconds
- Check [status page](https://dandolo.ai/status)

### Getting Help
- **Issues**: [GitHub Issues](https://github.com/dandolo-ai/platform)
- **Discord**: [Agent Developers Channel](https://discord.gg/dandolo)
- **Email**: developers@dandolo.ai

---

**🎉 You're now ready to integrate your agent with Dandolo's decentralized AI network!**

Start with the connection test script, then choose your integration method. The decentralized architecture ensures high availability and uncensored responses for your AI agents.