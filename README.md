# Dandolo.ai

**Decentralized AI Inference Platform - Anonymous, Uncensored, Reliable**

[![Deploy Status](https://img.shields.io/badge/status-live-brightgreen)](https://dandolo.ai)
[![API Status](https://img.shields.io/badge/API-operational-blue)](https://dandolo.ai/developers)
[![Venice.ai Network](https://img.shields.io/badge/Venice.ai-powered-orange)](https://venice.ai)

Dandolo.ai is a decentralized AI inference platform that provides anonymous access to Venice.ai's uncensored model network. Built for developers who value privacy, reliability, and openness.

## 🏆 Why Dandolo Wins

### vs Venice.ai Direct Access

| Feature | Dandolo.ai | Venice.ai Direct |
|---------|------------|------------------|
| **Setup Complexity** | ✅ Zero config | ❌ Manual provider management |
| **Model Selection** | ✅ Intelligent auto-routing | ❌ Manual model picking |
| **Rate Limiting** | ✅ Built-in protection | ❌ DIY rate limiting |
| **Error Handling** | ✅ Automatic failover | ❌ Manual retry logic |
| **Provider Health** | ✅ Real-time monitoring | ❌ No health checks |
| **Cost Optimization** | ✅ Best price routing | ❌ Fixed provider costs |
| **API Compatibility** | ✅ OpenAI + Venice APIs | ✅ Venice API only |
| **Character Support** | ✅ Venice.ai characters | ✅ Venice.ai characters |
| **Security Features** | ✅ Enterprise-grade | ❌ Basic auth only |

### vs OpenRoute.ai

| Feature | Dandolo.ai | OpenRoute.ai |
|---------|------------|--------------|
| **Network Coverage** | ✅ Venice.ai + more | ✅ Multiple providers |
| **Pricing Model** | ✅ Transparent, no markup | ❌ Hidden markups |
| **Developer Tools** | ✅ Native SDKs + CLI | ❌ Basic REST only |
| **Privacy Protection** | ✅ Zero-knowledge design | ❌ Request logging |
| **Agent Features** | ✅ Built for AI agents | ❌ Generic proxy |
| **Streaming Quality** | ✅ Real-time + SSE | ✅ Basic streaming |
| **Framework Support** | ✅ LangChain, AutoGen, etc | ❌ DIY integration |
| **Context Management** | ✅ Automatic handling | ❌ Manual context |

### vs OpenAI API

| Feature | Dandolo.ai | OpenAI API |
|---------|------------|------------|
| **Model Diversity** | ✅ Venice.ai models | ❌ OpenAI models only |
| **Censorship Resistance** | ✅ Decentralized | ❌ Centralized control |
| **Privacy** | ✅ Zero data retention | ❌ Data stored indefinitely |
| **Cost** | ✅ Competitive pricing | ❌ Premium pricing |
| **Availability** | ✅ Multi-provider redundancy | ❌ Single point of failure |
| **API Compatibility** | ✅ Standard chat completions API | ✅ Native Venice.ai API |

## 🚀 Key Features

### 🎯 Decentralized Access
- **Multiple Providers** - Access Venice.ai models through multiple provider nodes
- **Automatic Routing** - Smart distribution across available providers
- **Provider Health Monitoring** - Real-time validation of provider status
- **Failover Support** - Automatic switching when providers are unavailable

### 💡 Developer-Friendly
- **Standard API** - Compatible with chat completions format
- **Framework Ready** - Works with LangChain, AutoGen, CrewAI, and custom agents
- **Venice.ai Characters** - Full support for character connections
- **Comprehensive Documentation** - Examples and guides at dandolo.ai/developers

### 🔒 Privacy-First Design
- **Anonymous Access** - No signup required for basic usage
- **Zero Data Retention** - No conversation storage or logging
- **Wallet-Based Auth** - Cryptographic authentication for API keys
- **Decentralized Architecture** - No single point of control

### 💰 Transparent Usage
- **Pay-Per-Token** - No subscriptions or hidden fees
- **Usage Tracking** - Monitor your consumption and limits
- **Points Rewards** - Earn points for providing compute resources

## ⚡ Quick Start (2 Minutes to Success)

### 1. Get Your API Key (30 seconds)

Visit [dandolo.ai/developers](https://dandolo.ai/developers) and generate an API key:
- **Agent Keys (`ak_`)** - For production use, 5,000 requests/day
- **Developer Keys (`dk_`)** - For development, 500 requests/day
- **Anonymous** - No signup needed, 50 requests/day

### 2. Use the API (No SDK required)

The Dandolo API is compatible with standard chat completions format. No special SDKs needed - use curl, requests, or any HTTP client.

### 3. Start Building (60 seconds)

```python
# Python using requests
import requests

response = requests.post(
    "https://dandolo.ai/v1/chat/completions",
    headers={"Authorization": "Bearer ak_your_key"},
    json={
        "messages": [{"role": "user", "content": "Hello, world!"}],
        "model": "auto"  # Let Dandolo choose the best model
    }
)
print(response.json()["choices"][0]["message"]["content"])
```

```javascript
// JavaScript/Node.js
const response = await fetch('https://dandolo.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ak_your_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello, world!' }],
    model: 'auto'
  })
});
const data = await response.json();
console.log(data.choices[0].message.content);
```

```bash
# curl - works everywhere
curl -X POST https://dandolo.ai/v1/chat/completions \
  -H "Authorization: Bearer ak_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello, world!"}],
    "model": "auto"
  }'
```

### 4. Connect to Venice.ai Characters (Bonus)

```python
# Connect to specialized Venice.ai characters
response = requests.post(
    "https://dandolo.ai/v1/chat/completions",
    headers={"Authorization": "Bearer ak_your_key"},
    json={
        "messages": [{"role": "user", "content": "Hello! Can you give me advice about horses?"}],
        "model": "llama-3.3-70b",
        "venice_parameters": {
            "character_slug": "my-horse-advisor"
        }
    }
)
print(response.json()["choices"][0]["message"]["content"])
```

```bash
# Character connection via curl
curl -X POST https://dandolo.ai/v1/chat/completions \
  -H "Authorization: Bearer ak_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello! Can you give me advice about horses?"}],
    "model": "llama-3.3-70b",
    "venice_parameters": {
      "character_slug": "my-horse-advisor"
    }
  }'
```

**That's it!** No configuration, no provider setup, no model management. Just results.

## 🔄 Migration Guides

### From Venice.ai Direct

**Before (Venice.ai):**
```python
import requests
# Manual provider management, error handling...
headers = {"Authorization": "Bearer your-venice-key"}
response = requests.post(
    "https://api.venice.ai/api/v1/chat/completions",
    headers=headers,
    json={"messages": [...], "model": "specific-model-id"}
)
```

**After (Dandolo):**
```python
import requests
# Simplified with automatic routing and failover
response = requests.post(
    "https://dandolo.ai/v1/chat/completions",
    headers={"Authorization": "Bearer ak_your_key"},
    json={"messages": [...], "model": "auto"}
)
```

### From OpenRoute.ai

**Before (OpenRoute.ai):**
```python
import openai
# Hidden markups, limited transparency
openai.api_base = "https://openrouter.ai/api/v1"
openai.api_key = "sk-or-your-key"
response = openai.ChatCompletion.create(
    model="anthropic/claude-3-sonnet",
    messages=[...]
)
```

**After (Dandolo):**
```python
import requests
# Transparent access to Venice.ai models
response = requests.post(
    "https://dandolo.ai/v1/chat/completions",
    headers={"Authorization": "Bearer ak_your_key"},
    json={"messages": [...], "model": "auto"}
)
```

### From OpenAI API

**Before (OpenAI):**
```python
import openai
openai.api_key = "sk-your-openai-key"
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[...]
)
```

**After (Dandolo):**
```python
import requests
# Access uncensored Venice.ai models
response = requests.post(
    "https://dandolo.ai/v1/chat/completions",
    headers={"Authorization": "Bearer ak_your_key"},
    json={"messages": [...], "model": "auto"}
)
```

## Agent Framework Integration

### CrewAI
```python
from crewai import Agent, Task, Crew
import requests

class DandoloLLM:
    def __init__(self, api_key, model="auto-select"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://dandolo.ai"
    
    def __call__(self, prompt):
        response = requests.post(
            f"{self.base_url}/v1/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "messages": [{"role": "user", "content": prompt}],
                "model": self.model
            }
        )
        return response.json()["choices"][0]["message"]["content"]

llm = DandoloLLM(api_key="ak_your_agent_key")

agent = Agent(
    role="Data Analyst",
    goal="Analyze complex datasets",
    llm=llm,
    allow_delegation=False
)
```

### AutoGen
```python
from autogen import ConversableAgent
import requests

def dandolo_llm_config(api_key, model="auto-select"):
    def llm_call(messages, **kwargs):
        response = requests.post(
            "https://dandolo.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"messages": messages, "model": model}
        )
        return response.json()["choices"][0]["message"]["content"]
    return llm_call

agent = ConversableAgent(
    name="analyst",
    llm_config={"config_list": [dandolo_llm_config("ak_your_agent_key")]}
)
```

### LangChain
```python
from langchain.llms.base import LLM
from langchain.schema import HumanMessage
import requests

class DandoloLLM(LLM):
    api_key: str
    model: str = "auto-select"
    
    def _call(self, prompt: str, stop=None, **kwargs):
        response = requests.post(
            "https://dandolo.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "messages": [{"role": "user", "content": prompt}],
                "model": self.model
            }
        )
        return response.json()["choices"][0]["message"]["content"]
    
    @property
    def _llm_type(self):
        return "dandolo"

llm = DandoloLLM(api_key="ak_your_agent_key")
response = llm("Process this data autonomously")
```

## API Reference

### Endpoints

| Endpoint | Purpose | Rate Limit | Auth |
|----------|---------|------------|------|
| `POST /v1/chat/completions` | Chat completions (Venice.ai models) | See below | API Key |
| `POST /chat` | Anonymous chat | 50/day | Session |

### Rate Limits

- **Agent Keys (`ak_`)**: 5,000 requests/day
- **Developer Keys (`dk_`)**: 500 requests/day
- **Anonymous**: 50 requests/day

### Response Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1640995200
Retry-After: 3600
```

## Available Models

Dandolo provides access to Venice.ai's model network:

- Access to Venice.ai's available models
- Support for text generation and chat completions
- Image generation capabilities (where available)
- Character connections to specialized Venice.ai personas

Use `model: "auto"` for automatic selection or specify a particular Venice.ai model ID.

### Venice.ai Character Support

Connect to specialized Venice.ai characters for domain-specific expertise:

```python
# Example: Horse advisor character
response = client.chat.completions.create(
    messages=[{"role": "user", "content": "What's the best horse breed for beginners?"}],
    model="llama-3.3-70b",
    venice_parameters={
        "character_slug": "my-horse-advisor"
    }
)
```

All Venice.ai characters are supported through the `venice_parameters.character_slug` field.

## Privacy & Security

- **Zero Data Retention** - No conversation storage or logging
- **Anonymous by Design** - No tracking or profiling
- **Wallet-Based Authentication** - Cryptographic key generation
- **Decentralized Architecture** - No single point of control

## Agent Framework Integration

Dandolo works with any framework that supports HTTP requests:

- **CrewAI** - Multi-agent collaboration
- **AutoGen** - Microsoft's agent framework  
- **LangChain** - LLM application framework
- **Custom Agents** - Direct HTTP integration
- **Any Framework** - Standard chat completions API

Example for any framework:
```python
import requests

def call_dandolo(messages, api_key):
    return requests.post(
        "https://dandolo.ai/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"messages": messages, "model": "auto"}
    ).json()
```

## Getting Started

1. **Visit** [dandolo.ai/developers](https://dandolo.ai/developers)
2. **Connect** your Ethereum wallet (for API key generation)
3. **Generate** an API key (`dk_` for dev, `ak_` for production)
4. **Start building** with the examples above

## Links

- **Platform**: [dandolo.ai](https://dandolo.ai)
- **Documentation**: [dandolo.ai/developers](https://dandolo.ai/developers)
- **GitHub Issues**: Report bugs and feature requests here

---

*Decentralized AI inference for the sovereignty era.*