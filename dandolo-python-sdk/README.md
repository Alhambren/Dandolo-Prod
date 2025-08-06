# Dandolo Python SDK

The official Python SDK for the Dandolo decentralized AI network. Provides seamless access to uncensored AI models through a simple, OpenAI-compatible interface.

## Features

- **OpenAI-Compatible**: Drop-in replacement for OpenAI's Python client
- **Automatic Retries**: Built-in retry logic with exponential backoff
- **Error Handling**: Comprehensive error types with clear messages
- **Type Safety**: Full type hints for better development experience
- **Rate Limit Management**: Automatic handling of rate limits
- **Connection Pooling**: Efficient HTTP connection management

## Installation

```bash
pip install dandolo-ai
```

## Quick Start

```python
import dandolo

# Initialize client with your API key
client = dandolo.Dandolo(api_key="ak_your_agent_key")

# Simple chat completion
response = client.chat.completions.create(
    messages=[{"role": "user", "content": "Hello! How are you?"}]
)

print(response.choices[0].message.content)
```

## API Keys

Dandolo supports two types of API keys:

- **Developer Keys (`dk_`)**: 500 requests/day - Perfect for development and testing
- **Agent Keys (`ak_`)**: 5,000 requests/day - Ideal for production AI agents

Get your API key at [dandolo.ai](https://dandolo.ai/#portal)

## Examples

### Basic Chat Completion

```python
import dandolo

client = dandolo.Dandolo(api_key="ak_your_agent_key")

response = client.chat.completions.create(
    model="auto-select",  # Intelligent model routing
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain quantum computing briefly"}
    ],
    max_tokens=200,
    temperature=0.7
)

print(response.choices[0].message.content)
```

### Code Generation

```python
response = client.chat.completions.create(
    messages=[
        {"role": "system", "content": "You are a coding assistant."},
        {"role": "user", "content": "Write a Python function to calculate fibonacci numbers"}
    ],
    max_tokens=500
)

print(response.choices[0].message.content)
```

### Conversation Context

```python
messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What's the capital of France?"},
    {"role": "assistant", "content": "The capital of France is Paris."},
    {"role": "user", "content": "What's its population?"}
]

response = client.chat.completions.create(messages=messages)
print(response.choices[0].message.content)
```

### Error Handling

```python
import dandolo
from dandolo import AuthenticationError, RateLimitError, ModelNotFoundError

client = dandolo.Dandolo(api_key="ak_your_agent_key")

try:
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": "Hello!"}]
    )
    print(response.choices[0].message.content)
    
except AuthenticationError:
    print("Invalid API key")
except RateLimitError as e:
    print(f"Rate limit exceeded. Retry after: {e.retry_after}")
except ModelNotFoundError:
    print("Model not available")
except dandolo.DandoloError as e:
    print(f"API error: {e.message}")
```

### List Available Models

```python
models = client.models.list()
print(f"Available models: {len(models)}")

for model in models[:5]:  # Show first 5 models
    print(f"- {model.id} ({model.type})")
```

### API Key Validation

```python
validation = client.validate_key()
print(f"Key valid: {validation['is_valid']}")
print(f"Key type: {validation['key_type']}")
print(f"Usage: {validation['daily_usage']}/{validation['daily_limit']}")
print(f"Remaining: {validation['remaining']}")
```

## Framework Integration

### LangChain Integration

```python
from langchain.llms.base import LLM
import dandolo

class DandoloLLM(LLM):
    def __init__(self, api_key: str):
        self.client = dandolo.Dandolo(api_key=api_key)
    
    @property
    def _llm_type(self) -> str:
        return "dandolo"
    
    def _call(self, prompt: str, stop=None) -> str:
        response = self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content

# Usage
llm = DandoloLLM(api_key="ak_your_agent_key")
result = llm("Explain machine learning")
```

### AutoGen Integration

```python
import autogen
import dandolo

# Custom LLM config for Dandolo
def dandolo_completion(messages, **kwargs):
    client = dandolo.Dandolo(api_key="ak_your_agent_key")
    response = client.chat.completions.create(messages=messages)
    return response.choices[0].message.content

config_list = [{
    "model": "dandolo",
    "api_key": "ak_your_agent_key",
    "base_url": "https://dandolo.ai/api/v1"
}]

assistant = autogen.AssistantAgent(
    name="assistant",
    llm_config={"config_list": config_list}
)
```

### CrewAI Integration

```python
from crewai import LLM
import dandolo

class DandoloCrewLLM(LLM):
    def __init__(self, api_key: str):
        self.client = dandolo.Dandolo(api_key=api_key)
    
    def call(self, messages):
        response = self.client.chat.completions.create(messages=messages)
        return response.choices[0].message.content

# Usage in CrewAI
llm = DandoloCrewLLM(api_key="ak_your_agent_key")
```

## Configuration

### Client Options

```python
client = dandolo.Dandolo(
    api_key="ak_your_agent_key",
    base_url="https://dandolo.ai/api",  # Custom base URL
    timeout=60,                         # Request timeout in seconds
    max_retries=3,                      # Maximum retry attempts
    retry_delay=1.0                     # Base delay between retries
)
```

### Context Manager

```python
with dandolo.Dandolo(api_key="ak_your_agent_key") as client:
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": "Hello!"}]
    )
    print(response.choices[0].message.content)
# Automatically closes connection
```

## Error Reference

| Exception | Description | Status Code |
|-----------|-------------|-------------|
| `AuthenticationError` | Invalid API key | 401 |
| `RateLimitError` | Rate limit exceeded | 429 |
| `ModelNotFoundError` | Model not available | 404 |
| `ValidationError` | Invalid request parameters | 400 |
| `ServerError` | Server-side error | 500+ |
| `NetworkError` | Connection issues | - |
| `DandoloError` | Base exception | Various |

## Best Practices

### 1. API Key Management

```python
import os
import dandolo

# Use environment variables
api_key = os.getenv("DANDOLO_API_KEY")
client = dandolo.Dandolo(api_key=api_key)
```

### 2. Error Handling

```python
from dandolo import RateLimitError
import time

def make_request_with_backoff(client, messages, max_retries=3):
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(messages=messages)
        except RateLimitError as e:
            if attempt < max_retries - 1:
                wait_time = int(e.retry_after) if e.retry_after else 60
                time.sleep(wait_time)
            else:
                raise
```

### 3. Context Management

```python
def maintain_conversation(client, messages, max_context=4000):
    """Keep conversation within token limits"""
    while estimate_tokens(messages) > max_context:
        # Remove oldest messages (keep system message)
        if len(messages) > 1 and messages[0]["role"] == "system":
            messages = [messages[0]] + messages[3:]
        else:
            messages = messages[2:]
    
    return client.chat.completions.create(messages=messages)
```

### 4. Batch Processing

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

def process_batch(prompts, api_key, max_workers=5):
    client = dandolo.Dandolo(api_key=api_key)
    
    def process_single(prompt):
        return client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}]
        )
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = list(executor.map(process_single, prompts))
    
    return results
```

## Support

- **Documentation**: [dandolo.ai](https://dandolo.ai)
- **API Reference**: [dandolo.ai](https://dandolo.ai)
- **GitHub Issues**: Report bugs and feature requests in this repository

## License

MIT License - see LICENSE file for details.

## Contributing

We welcome contributions! Please see CONTRIBUTING.md for guidelines.

---

**Dandolo AI** - Decentralized AI for everyone. 🌐🤖