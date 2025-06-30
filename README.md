# Dandolo.ai

> **Decentralized AI inference for autonomous agents - no tracking, no accounts, no limits.**

[![Deploy Status](https://img.shields.io/badge/status-live-brightgreen)](https://dandolo.ai)
[![API Status](https://img.shields.io/badge/API-operational-blue)](https://dandolo.ai/api/v1/balance)
[![Venice.ai Network](https://img.shields.io/badge/Venice.ai-network-orange)](https://venice.ai)

Dandolo.ai is a privacy-first middleware layer connecting AI agents to Venice.ai's decentralized compute network. Built for autonomous systems that demand reliability, anonymity, and censorship resistance.

## Why Agents Choose Dandolo

- **🔒 Zero-Knowledge Architecture** - No conversation storage, no user tracking, complete anonymity
- **🌐 Decentralized Uptime** - Multi-provider network eliminates single points of failure  
- **⚡ Standard API Format** - Seamless integration with existing agent frameworks
- **🚫 Censorship Resistant** - Distributed infrastructure prevents access control
- **💰 Transparent Pricing** - Pay-per-use, no subscriptions, no hidden costs
- **🔄 Intelligent Routing** - Automatic model selection and failover for maximum reliability

## Quick Start for AI Agents

### 1. Get Your Agent API Key

```bash
# Connect wallet and generate agent key at:
# https://dandolo.ai/developers
```

### 2. Standard Chat Completions API

```python
import requests

# Standard chat completions endpoint
response = requests.post(
    "https://dandolo.ai/v1/chat/completions",
    headers={"Authorization": "Bearer ak_your_agent_key"},
    json={
        "messages": [
            {"role": "user", "content": "Analyze this dataset and provide insights"}
        ],
        "model": "llama-3.3-70b-instruct"  # Optional - auto-selected if omitted
    }
)

data = response.json()
print(data["choices"][0]["message"]["content"])
```

### 3. Direct Venice.ai Access

```python
# Access Venice.ai's full model catalog through Dandolo proxy
import requests

headers = {"Authorization": "Bearer ak_your_agent_key"}

# List available models
models = requests.get("https://dandolo.ai/api/models", headers=headers)

# Generate images
image_response = requests.post(
    "https://dandolo.ai/api/images/generations",
    headers=headers,
    json={
        "prompt": "A futuristic AI datacenter",
        "size": "1024x1024"
    }
)
```

## Agent Framework Integration

### CrewAI
```python
from crewai import Agent, Task, Crew
import requests

class DandoloLLM:
    def __init__(self, api_key, model="claude-3.5-sonnet"):
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

def dandolo_llm_config(api_key, model="llama-3.3-70b-instruct"):
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
    model: str = "claude-3-sonnet"
    
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

- **Code Tasks** → `deepseek-coder`, `claude-3.5-sonnet`
- **Analysis** → `claude-3-opus`, `gpt-4-turbo` 
- **General Chat** → `llama-3.3-70b-instruct`, `mixtral-8x7b-instruct`
- **Image Generation** → `flux-1.1-pro`, `dall-e-3`

Override with explicit `model` parameter or let Dandolo optimize for you.

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