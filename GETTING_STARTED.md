# Getting Started with Dandolo.ai

> **From zero to AI-powered in under 2 minutes**

Welcome to the **superior AI inference platform**! This guide will get you up and running with Dandolo.ai faster than you can say "Venice who?"

## 🚀 Why You'll Love Dandolo

Before we dive in, here's what makes Dandolo.ai the obvious choice:

- ✅ **Zero-config setup** - Works instantly, no complex provider management
- ✅ **Intelligent routing** - Best model automatically selected for each task
- ✅ **Standard chat completions API** - Drop-in replacement for existing code
- ✅ **50+ models available** - Access Venice.ai's entire network
- ✅ **Transparent pricing** - No hidden fees or markups
- ✅ **Enterprise security** - Zero data retention, full privacy

## 📋 Quick Setup Checklist

- [ ] Get your API key (30 seconds)
- [ ] Install SDK or use REST API (30 seconds) 
- [ ] Make your first request (60 seconds)
- [ ] Celebrate! 🎉

---

## Step 1: Get Your API Key (30 seconds)

### Option A: Get an Agent Key (Recommended)

1. Visit [dandolo.ai/dashboard](https://dandolo.ai/dashboard)
2. Connect your Ethereum wallet (Base network)
3. Click "Generate Agent Key"
4. Copy your new `ak_` prefixed key

**Agent Keys give you:**
- 5,000 requests/day
- Advanced agent features
- Priority support
- Real-time usage analytics

### Option B: Start Anonymous (No signup)

Skip the key entirely! You get 50 free requests/day with no signup required.

```python
# No API key needed for anonymous usage
response = requests.post(
    "https://dandolo.ai/chat",
    json={"messages": [{"role": "user", "content": "Hello!"}]}
)
```

### Option C: Get a Developer Key

1. Visit [dandolo.ai/dashboard](https://dandolo.ai/dashboard)
2. Click "Generate Developer Key" 
3. Copy your new `dk_` prefixed key

**Developer Keys give you:**
- 1,000 requests/day
- Full API access
- Development-friendly features

---

## Step 2: Choose Your Setup Method

### 🎯 Method 1: Native SDKs (Recommended)

#### TypeScript/JavaScript

```bash
npm install @dandolo/agent-sdk
# or
yarn add @dandolo/agent-sdk
# or  
pnpm add @dandolo/agent-sdk
```

#### Python

```bash
pip install dandolo-sdk
# or
pip install dandolo-ai
```

### 🔄 Method 2: OpenAI Drop-in Replacement

Already using OpenAI? **Just change 2 lines:**

```python
# Before (OpenAI)
import openai
openai.api_key = "sk-your-openai-key"

# After (Dandolo - same code, better results!)
import openai
openai.api_base = "https://dandolo.ai/v1"
openai.api_key = "ak_your_dandolo_key"
```

### 🌐 Method 3: Direct REST API

No SDK needed! Works with any HTTP client:

```bash
curl -X POST https://dandolo.ai/v1/chat/completions \
  -H "Authorization: Bearer ak_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello, world!"}]
  }'
```

---

## Step 3: Make Your First Request

### Python Example

```python
from dandolo import Dandolo

# Initialize client
client = Dandolo(api_key="ak_your_key")  # or skip for anonymous

# Make your first request
response = client.chat.completions.create(
    messages=[
        {"role": "user", "content": "Write a haiku about AI"}
    ]
)

print(response.choices[0].message.content)
print(f"Model used: {response.metadata.actual_model}")
print(f"Cost: ${response.metadata.cost_usd:.4f}")
```

### TypeScript Example

```typescript
import Dandolo from '@dandolo/agent-sdk'

// Initialize client
const client = new Dandolo({ apiKey: 'ak_your_key' })

// Make your first request
const response = await client.chat.completions.create({
  messages: [
    { role: 'user', content: 'Explain quantum computing in simple terms' }
  ]
})

console.log(response.choices[0].message.content)
console.log(`Model: ${response.metadata.actual_model}`)
console.log(`Cost: $${response.metadata.cost_usd}`)
```

### cURL Example

```bash
curl -X POST https://dandolo.ai/v1/chat/completions \
  -H "Authorization: Bearer ak_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What makes Dandolo better than Venice.ai?"}
    ],
    "model": "auto-select"
  }'
```

### Character Connection Example

Connect to specialized Venice.ai characters for domain-specific expertise:

```python
# Connect to a specialized character
response = client.chat.completions.create(
    messages=[
        {"role": "user", "content": "Hello! Can you give me advice about horses?"}
    ],
    venice_parameters={
        "character_slug": "my-horse-advisor"
    }
)
print(response.choices[0].message.content)
```

```bash
# Character connection via cURL
curl -X POST https://dandolo.ai/v1/chat/completions \
  -H "Authorization: Bearer ak_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello! Can you give me advice about horses?"}],
    "venice_parameters": {
      "character_slug": "my-horse-advisor"
    }
  }'
```

---

## 🎯 Common Use Cases

### 1. Simple Chat Application

```python
def chat_with_ai(user_message: str):
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": user_message}],
        model="auto-select"  # Intelligent model selection
    )
    return response.choices[0].message.content

# Usage
answer = chat_with_ai("What's the weather like on Mars?")
print(answer)
```

### 2. Code Generation

```python
def generate_code(description: str):
    response = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are an expert programmer."},
            {"role": "user", "content": f"Write Python code to: {description}"}
        ],
        model="auto-select"  # Automatically selects best coding model
    )
    return response.choices[0].message.content

# Usage
code = generate_code("create a binary search function")
print(code)
```

### 3. Data Analysis

```python
def analyze_data(data_description: str):
    response = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a data analyst expert."},
            {"role": "user", "content": f"Analyze this data: {data_description}"}
        ],
        model="auto-select"  # Automatically selects best analysis model
    )
    return response.choices[0].message.content

# Usage
analysis = analyze_data("Sales data showing 20% increase in Q4")
print(analysis)
```

### 4. Streaming Responses

```python
def stream_response(prompt: str):
    for chunk in client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        stream=True
    ):
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)
    print()  # New line at end

# Usage
stream_response("Tell me a story about a robot")
```

---

## 🔧 Configuration Options

### Environment Variables

```bash
# .env file
DANDOLO_API_KEY=ak_your_key_here
DANDOLO_BASE_URL=https://dandolo.ai  # Optional
DANDOLO_TIMEOUT=30000  # Optional, in milliseconds
DANDOLO_DEBUG=true  # Optional, enables detailed logging
```

### Full Configuration

```python
from dandolo import Dandolo

client = Dandolo(
    api_key="ak_your_key",
    base_url="https://dandolo.ai",  # Optional
    timeout=30,  # seconds
    max_retries=3,
    debug=True  # Enable detailed logging
)
```

```typescript
import Dandolo from '@dandolo/agent-sdk'

const client = new Dandolo({
  apiKey: 'ak_your_key',
  baseURL: 'https://dandolo.ai',  // Optional
  timeout: 30000,  // milliseconds
  maxRetries: 3,
  debug: true  // Enable detailed logging
})
```

---

## 📊 Monitoring Your Usage

### Check Usage Anytime

```python
# Get current usage
usage = client.usage()
print(f"Requests today: {usage.daily_usage.requests}/{usage.daily_usage.limit}")
print(f"Remaining: {usage.daily_usage.limit - usage.daily_usage.requests}")
print(f"Resets in: {usage.reset_in_seconds} seconds")
```

### Real-time Cost Tracking

```python
response = client.chat.completions.create(
    messages=[{"role": "user", "content": "Hello"}]
)

# Every response includes cost information
print(f"This request cost: ${response.metadata.cost_usd:.4f}")
print(f"Tokens used: {response.usage.total_tokens}")
print(f"Model used: {response.metadata.actual_model}")
```

---

## 🚨 Error Handling

### Basic Error Handling

```python
from dandolo.exceptions import DandoloError, RateLimitError, AuthenticationError

try:
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": "Hello"}]
    )
    print(response.choices[0].message.content)
except RateLimitError as e:
    print(f"Rate limited! Retry after: {e.retry_after} seconds")
except AuthenticationError:
    print("Invalid API key - check your credentials")
except DandoloError as e:
    print(f"API error: {e.message}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

### Retry Logic

```python
import time
from dandolo.exceptions import RateLimitError

def chat_with_retry(messages, max_retries=3):
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(messages=messages)
        except RateLimitError as e:
            if attempt < max_retries - 1:
                print(f"Rate limited, waiting {e.retry_after} seconds...")
                time.sleep(e.retry_after)
                continue
            raise
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff
                print(f"Request failed, retrying in {wait_time} seconds...")
                time.sleep(wait_time)
                continue
            raise
```

---

## 🎯 Framework Integration

### React/Next.js

```typescript
// hooks/useChat.ts
import { useState } from 'react'
import Dandolo from '@dandolo/agent-sdk'

const client = new Dandolo({ apiKey: process.env.NEXT_PUBLIC_DANDOLO_API_KEY! })

export function useChat() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async (content: string) => {
    setIsLoading(true)
    try {
      const response = await client.chat.completions.create({
        messages: [...messages, { role: 'user', content }]
      })
      
      setMessages(prev => [
        ...prev,
        { role: 'user', content },
        { role: 'assistant', content: response.choices[0].message.content }
      ])
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return { messages, isLoading, sendMessage }
}
```

### Express.js

```javascript
// server.js
const express = require('express')
const { Dandolo } = require('dandolo-sdk')

const app = express()
const client = new Dandolo({ apiKey: process.env.DANDOLO_API_KEY })

app.use(express.json())

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body
    const response = await client.chat.completions.create({ messages })
    
    res.json({
      message: response.choices[0].message.content,
      usage: response.usage,
      cost: response.metadata.cost_usd
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(3000, () => console.log('Server running on port 3000'))
```

---

## 🎮 Interactive Examples

### Simple Chat Bot

```python
#!/usr/bin/env python3
"""
Simple interactive chat bot using Dandolo.ai
Run: python chatbot.py
"""

from dandolo import Dandolo
import sys

def main():
    # Initialize client
    api_key = input("Enter your Dandolo API key (or press Enter for anonymous): ").strip()
    client = Dandolo(api_key=api_key if api_key else None)
    
    print("🤖 Dandolo Chat Bot")
    print("Type 'quit' to exit, 'usage' to check usage, 'clear' to clear history")
    print("-" * 50)
    
    messages = []
    
    while True:
        try:
            # Get user input
            user_input = input("You: ").strip()
            
            if user_input.lower() == 'quit':
                break
            elif user_input.lower() == 'usage':
                try:
                    usage = client.usage()
                    print(f"📊 Usage: {usage.daily_usage.requests}/{usage.daily_usage.limit} requests today")
                    continue
                except:
                    print("❌ Unable to fetch usage (anonymous mode?)")
                    continue
            elif user_input.lower() == 'clear':
                messages = []
                print("🧹 Chat history cleared")
                continue
            elif not user_input:
                continue
            
            # Add user message
            messages.append({"role": "user", "content": user_input})
            
            # Get AI response
            print("🤖 AI: ", end="", flush=True)
            
            response = client.chat.completions.create(
                messages=messages,
                model="auto-select"
            )
            
            ai_response = response.choices[0].message.content
            print(ai_response)
            
            # Add AI response to history
            messages.append({"role": "assistant", "content": ai_response})
            
            # Show metadata
            if hasattr(response, 'metadata'):
                print(f"💰 Cost: ${response.metadata.cost_usd:.4f} | Model: {response.metadata.actual_model}")
            
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
```

### Streaming Chat Bot

```python
#!/usr/bin/env python3
"""
Streaming chat bot with real-time responses
"""

from dandolo import Dandolo
import sys

def main():
    api_key = input("Enter your Dandolo API key: ").strip()
    client = Dandolo(api_key=api_key)
    
    print("🚀 Dandolo Streaming Chat Bot")
    print("Watch responses appear in real-time!")
    print("-" * 40)
    
    messages = []
    
    while True:
        try:
            user_input = input("\nYou: ").strip()
            
            if user_input.lower() == 'quit':
                break
            elif not user_input:
                continue
            
            messages.append({"role": "user", "content": user_input})
            
            print("🤖 AI: ", end="", flush=True)
            
            full_response = ""
            for chunk in client.chat.completions.create(
                messages=messages,
                stream=True
            ):
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    print(content, end="", flush=True)
                    full_response += content
            
            print()  # New line
            messages.append({"role": "assistant", "content": full_response})
            
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main()
```

---

## 🔍 Testing Your Setup

### Test Script

```python
#!/usr/bin/env python3
"""
Test your Dandolo.ai setup
"""

from dandolo import Dandolo
import time

def test_setup():
    print("🧪 Testing Dandolo.ai Setup")
    print("=" * 30)
    
    # Test 1: Basic functionality
    try:
        api_key = input("Enter your API key (or press Enter for anonymous): ").strip()
        client = Dandolo(api_key=api_key if api_key else None)
        
        print("\n✅ Client initialized successfully")
    except Exception as e:
        print(f"❌ Client initialization failed: {e}")
        return False
    
    # Test 2: Simple chat
    try:
        print("\n🧪 Testing basic chat...")
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": "Say 'Hello from Dandolo!'"}]
        )
        print(f"✅ Chat works: {response.choices[0].message.content}")
    except Exception as e:
        print(f"❌ Chat failed: {e}")
        return False
    
    # Test 3: Model selection
    try:
        print("\n🧪 Testing auto-select...")
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": "What model are you?"}],
            model="auto-select"
        )
        print(f"✅ Auto-select works: Model = {response.metadata.actual_model}")
    except Exception as e:
        print(f"❌ Auto-select failed: {e}")
    
    # Test 4: Streaming
    try:
        print("\n🧪 Testing streaming...")
        content = ""
        for chunk in client.chat.completions.create(
            messages=[{"role": "user", "content": "Count to 3"}],
            stream=True
        ):
            if chunk.choices[0].delta.content:
                content += chunk.choices[0].delta.content
        print(f"✅ Streaming works: {content[:50]}...")
    except Exception as e:
        print(f"❌ Streaming failed: {e}")
    
    # Test 5: Usage tracking (if authenticated)
    if api_key:
        try:
            print("\n🧪 Testing usage tracking...")
            usage = client.usage()
            print(f"✅ Usage tracking works: {usage.daily_usage.requests}/{usage.daily_usage.limit}")
        except Exception as e:
            print(f"❌ Usage tracking failed: {e}")
    
    print("\n🎉 Setup test complete!")
    return True

if __name__ == "__main__":
    test_setup()
```

---

## 🎯 Next Steps

### 1. Explore Advanced Features

- **Agent Instructions**: Enhanced prompting for complex tasks
- **Context Management**: Automatic conversation memory
- **Workflow Support**: Multi-step agent processes
- **Real-time Streaming**: WebSocket connections

### 2. Check Out Examples

- [Framework Integration Examples](INTEGRATION_EXAMPLES.md)
- [Migration Guides](MIGRATION_GUIDES.md) 
- [Agent Workflow Examples](AGENT_WORKFLOWS.md)

### 3. Join the Community

- **Discord**: [discord.gg/dandolo](https://discord.gg/dandolo)
- **GitHub**: [github.com/dandolo-ai](https://github.com/dandolo-ai)
- **Documentation**: [docs.dandolo.ai](https://docs.dandolo.ai)
- **Status Page**: [status.dandolo.ai](https://status.dandolo.ai)

### 4. Get Support

- **Email**: [support@dandolo.ai](mailto:support@dandolo.ai)
- **Live Chat**: Available on [dandolo.ai](https://dandolo.ai)
- **Community Forum**: [community.dandolo.ai](https://community.dandolo.ai)

---

## 🤔 FAQ

### Q: How is Dandolo different from Venice.ai?
**A:** Dandolo adds intelligent routing, automatic error handling, enterprise security, and developer-friendly features on top of Venice.ai's network. Think of it as Venice.ai but actually usable in production.

### Q: Can I use Dandolo as a drop-in OpenAI replacement?
**A:** Yes! Just change your `api_base` URL and you'll instantly gain access to 50+ models instead of just OpenAI's.

### Q: What about pricing?
**A:** We use transparent, competitive pricing with no hidden markups. You pay the actual provider cost plus a small, clearly disclosed fee.

### Q: Is my data safe?
**A:** Absolutely. We use zero-knowledge architecture - no conversation storage, no user tracking, no data retention.

### Q: How reliable is the service?
**A:** 99.9% uptime with multi-provider redundancy and automatic failover. Much more reliable than using Venice.ai directly.

---

## 🎉 Welcome to the Future

**Congratulations!** You're now using the superior AI inference platform. You've joined thousands of developers who've discovered that there's a better way to build with AI.

**What's next?**
- Build something amazing with your new superpowers
- Share your experience with the community
- Help us make AI inference even better

**Need inspiration?** Check out what others are building:
- [Community Showcase](https://dandolo.ai/showcase)
- [Success Stories](https://dandolo.ai/stories)  
- [Example Applications](https://github.com/dandolo-ai/examples)

---

*Ready to build the future? Start coding with Dandolo.ai today! 🚀*