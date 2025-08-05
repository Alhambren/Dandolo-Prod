# Dandolo.ai

> **The Superior AI Inference Platform - Built for Developers Who Demand More**

[![Deploy Status](https://img.shields.io/badge/status-live-brightgreen)](https://dandolo.ai)
[![API Status](https://img.shields.io/badge/API-operational-blue)](https://dandolo.ai/api/v1/balance)
[![Venice.ai Network](https://img.shields.io/badge/Venice.ai-network-orange)](https://venice.ai)
[![TypeScript SDK](https://img.shields.io/badge/TypeScript-SDK-blue)](https://github.com/dandolo-ai/typescript-sdk)
[![Python SDK](https://img.shields.io/badge/Python-SDK-green)](https://github.com/dandolo-ai/python-sdk)

**Why settle for less?** Dandolo.ai delivers everything Venice.ai and OpenRoute.ai promise, plus the features you actually need. Zero-config setup, intelligent routing, comprehensive security, and the best developer experience in AI inference.

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
| **Model Diversity** | ✅ 50+ models | ❌ OpenAI models only |
| **Censorship Resistance** | ✅ Decentralized | ❌ Centralized control |
| **Privacy** | ✅ Zero data retention | ❌ Data stored indefinitely |
| **Cost** | ✅ Competitive pricing | ❌ Premium pricing |
| **Availability** | ✅ Multi-provider redundancy | ❌ Single point of failure |
| **API Compatibility** | ✅ Standard chat completions API | ✅ Native Venice.ai API |

## 🚀 What Makes Dandolo Superior

### 🎯 Built for Production
- **Zero-Config Setup** - Works instantly, no complex provider management
- **Intelligent Routing** - Automatically selects the best model for each task
- **Enterprise Security** - SOC2 compliant, zero-knowledge architecture
- **99.9% Uptime** - Multi-provider redundancy with automatic failover
- **Real-time Monitoring** - Built-in observability and health checks

### 💡 Developer Experience That Actually Works
- **Native SDKs** - TypeScript, Python, Go (coming soon)
- **Framework Integrations** - LangChain, AutoGen, CrewAI ready
- **OpenAI Compatible** - Drop-in replacement for existing code
- **Comprehensive Docs** - Examples, guides, and interactive tutorials
- **Responsive Support** - Real humans, not chatbots

### 🔒 Privacy & Security First
- **Zero Data Retention** - Your conversations, your data, your control
- **Encrypted Everything** - End-to-end encryption for all communications
- **Anonymous by Design** - No tracking, no profiling, no surveillance
- **Audit Ready** - Full compliance documentation and security reports

### 💰 Honest Pricing
- **No Hidden Markups** - Direct provider pricing with transparent fees
- **Usage-Based Billing** - Pay only for what you use, no subscriptions
- **Cost Optimization** - Automatic routing to most cost-effective providers
- **Detailed Analytics** - Track spending and optimize usage patterns

## ⚡ Quick Start (2 Minutes to Success)

### 1. Get Your API Key (30 seconds)

Visit [dandolo.ai/dashboard](https://dandolo.ai/dashboard) and generate an API key:
- **Agent Keys (`ak_`)** - For AI agents, 5,000 requests/day
- **Developer Keys (`dk_`)** - For development, 1,000 requests/day
- **Anonymous** - No signup needed, 50 requests/day

### 2. Install SDK (30 seconds)

```bash
# TypeScript/JavaScript
npm install @dandolo/agent-sdk

# Python  
pip install dandolo-sdk

# Or use REST API directly - no SDK required
```

### 3. Start Building (60 seconds)

```python
# Python
from dandolo import Dandolo

client = Dandolo(api_key="ak_your_key")
response = client.chat.completions.create(
    messages=[{"role": "user", "content": "Hello, world!"}]
)
print(response.choices[0].message.content)
```

```typescript
// TypeScript
import Dandolo from '@dandolo/agent-sdk';

const client = new Dandolo({ apiKey: 'ak_your_key' });
const response = await client.chat.completions.create({
  messages: [{ role: 'user', content: 'Hello, world!' }]
});
console.log(response.choices[0].message.content);
```

```bash
# curl (works everywhere)
curl -X POST https://dandolo.ai/v1/chat/completions \
  -H "Authorization: Bearer ak_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello, world!"}]
  }'
```

### 4. Connect to Venice.ai Characters (Bonus)

```python
# Connect to specialized Venice.ai characters
response = client.chat.completions.create(
    messages=[{"role": "user", "content": "Hello! Can you give me advice about horses?"}],
    model="llama-3.3-70b",
    venice_parameters={
        "character_slug": "my-horse-advisor"
    }
)
print(response.choices[0].message.content)
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
# Manual provider management, model selection, error handling...
headers = {"Authorization": "Bearer your-venice-key"}
response = requests.post(
    "https://api.venice.ai/api/v1/chat/completions",
    headers=headers,
    json={"messages": [...], "model": "specific-model-id"}
)
```

**After (Dandolo):**
```python
from dandolo import Dandolo
# Everything handled automatically
client = Dandolo(api_key="ak_your_key")
response = client.chat.completions.create(
    messages=[...],  # model auto-selected based on content
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
    model="anthropic/claude-3-sonnet",  # Manual model management
    messages=[...]
)
```

**After (Dandolo):**
```python
import Dandolo from '@dandolo/agent-sdk';
// Transparent pricing, intelligent routing
const client = new Dandolo({ apiKey: 'ak_your_key' });
const response = await client.chat.completions.create({
  messages: [...],  // Auto-routed to best model
});
```

### From OpenAI API

**Before (OpenAI):**
```python
import openai
openai.api_key = "sk-your-openai-key"
response = openai.ChatCompletion.create(
    model="gpt-4",  # Limited to OpenAI models
    messages=[...]
)
```

**After (Dandolo - 100% Compatible):**
```python
import openai
# Drop-in replacement
openai.api_base = "https://dandolo.ai/v1"
openai.api_key = "ak_your_dandolo_key"  # Now access 50+ models
response = openai.ChatCompletion.create(
    model="auto-select",  # Or any Venice.ai model
    messages=[...]
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
| `POST /v1/chat/completions` | Chat completions (Venice.ai models) | 1000/day | API Key |
| `POST /chat` | Anonymous chat | 50/day | Session |
| `GET /api/v1/balance` | Usage tracking | 100/day | API Key |
| `/api/*` | Venice.ai proxy | 1000/day | API Key |

### Rate Limits

- **Agent Keys (`ak_`)**: 1,000 requests/day, 10 requests/second
- **Developer Keys (`dk_`)**: 1,000 requests/day, 5 requests/second  
- **Anonymous**: 50 requests/day, 1 request/second

### Response Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1640995200
Retry-After: 3600
```

## Intelligent Model Routing

Dandolo automatically selects optimal Venice.ai models based on your request:

- **Code Tasks** → Venice.ai coding-optimized models
- **Analysis** → Venice.ai analysis-optimized models 
- **General Chat** → Venice.ai conversational models
- **Image Generation** → Venice.ai image generation models
- **Character Connections** → Venice.ai specialized characters

Override with explicit `model` parameter or let Dandolo optimize for you.

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

## Usage Monitoring

```python
import requests

# Check your agent's usage and balance
response = requests.get(
    "https://dandolo.ai/api/v1/balance",
    headers={"Authorization": "Bearer ak_your_key"}
)

data = response.json()
print(f"Requests today: {data['prompts_today']}/{data['daily_limit']}")
print(f"Points earned: {data['points_total']}")
print(f"Reset time: {data['reset_time']}")
```

## Privacy & Security

### Zero-Knowledge Design
- **No conversation storage** - Agents manage full context in requests
- **No user tracking** - Anonymous by design
- **No IP logging** - Complete privacy protection

### Agent Key Security
- AES-256-GCM encrypted storage
- Wallet-based ownership verification
- One-time key display during generation
- Secure revocation process

## Agent-Optimized Features

### Stateless Architecture
Perfect for autonomous systems - no server-side conversation memory means:
- Complete control over context windows
- No conversation limits or expiration
- Privacy by design
- Horizontal scaling capability

### High Availability
- Multiple Venice.ai providers
- Automatic failover
- Real-time health monitoring
- 99.9% uptime SLA

### Cost Optimization
- Pay only for tokens used
- No idle costs or subscriptions
- Transparent pricing
- Points-based rewards system

## Supported Agent Frameworks

- ✅ **CrewAI** - Multi-agent collaboration
- ✅ **AutoGen** - Microsoft's agent framework  
- ✅ **LangChain** - LLM application framework
- ✅ **Custom HTTP Clients** - Standard REST API integration
- ✅ **Any Agent Framework** - Venice.ai via standard chat completions

## Community & Support

- **Website**: [dandolo.ai](https://dandolo.ai)
- **Documentation**: [dandolo.ai/developers](https://dandolo.ai/developers)
- **Status Page**: [dandolo.ai/status](https://dandolo.ai/status)
- **GitHub Issues**: Report bugs and feature requests

## Getting Started

1. **Visit** [dandolo.ai/developers](https://dandolo.ai/developers)
2. **Connect** your Ethereum wallet
3. **Generate** an agent API key (`ak_` prefix)
4. **Integrate** with your existing agent framework
5. **Deploy** with confidence

---

*Built for the age of autonomous AI - where privacy, reliability, and openness aren't optional.*