# Framework Integration Examples

> **Production-ready examples for integrating Dandolo.ai with popular frameworks**

## Table of Contents

- [React & Next.js](#react--nextjs)
- [Node.js & Express](#nodejs--express)
- [Python Flask & FastAPI](#python-flask--fastapi)
- [AI Agent Frameworks](#ai-agent-frameworks)
- [Vue.js & Nuxt](#vuejs--nuxt)
- [Svelte & SvelteKit](#svelte--sveltekit)
- [Mobile Applications](#mobile-applications)

---

## React & Next.js

### Next.js App Router (Recommended)

#### 1. Server Actions for Chat

```typescript
// app/actions/chat.ts
'use server'

import Dandolo from '@dandolo/agent-sdk'

const client = new Dandolo({
  apiKey: process.env.DANDOLO_API_KEY!
})

export async function chatWithAI(messages: Array<{ role: string; content: string }>) {
  try {
    const response = await client.chat.completions.create({
      messages,
      model: 'auto-select',
      stream: false
    })
    
    return {
      success: true,
      message: response.choices[0].message.content,
      usage: response.usage,
      cost: response.metadata?.cost_usd
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

#### 2. Streaming Chat Component

```tsx
// app/components/ChatInterface.tsx
'use client'

import { useState } from 'react'
import { chatWithAI } from '@/actions/chat'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const result = await chatWithAI([...messages, userMessage])
      
      if (result.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: result.message,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        // Handle error
        console.error('Chat error:', result.error)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 p-3 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-500 text-white ml-auto max-w-xs'
                : 'bg-gray-100 mr-auto max-w-md'
            }`}
          >
            <p>{message.content}</p>
            <small className="opacity-70">
              {message.timestamp.toLocaleTimeString()}
            </small>
          </div>
        ))}
        {isLoading && (
          <div className="bg-gray-100 mr-auto max-w-md p-3 rounded-lg">
            <div className="animate-pulse">Thinking...</div>
          </div>
        )}
      </div>
      
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
```

#### 3. API Route for Streaming

```tsx
// app/api/chat/stream/route.ts
import { NextRequest } from 'next/server'
import Dandolo from '@dandolo/agent-sdk'

const client = new Dandolo({
  apiKey: process.env.DANDOLO_API_KEY!
})

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await client.chat.completions.stream({
            messages,
            model: 'auto-select'
          }, {
            onChunk: (chunk) => {
              const data = `data: ${JSON.stringify(chunk)}\n\n`
              controller.enqueue(new TextEncoder().encode(data))
            },
            onComplete: () => {
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
              controller.close()
            },
            onError: (error) => {
              controller.error(error)
            }
          })
        } catch (error) {
          controller.error(error)
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    return Response.json({ error: 'Failed to start stream' }, { status: 500 })
  }
}
```

#### 4. Environment Configuration

```bash
# .env.local
DANDOLO_API_KEY=ak_your_agent_key_here
```

### React Hook for Chat

```tsx
// hooks/useChat.ts
import { useState, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface UseChatReturn {
  messages: Message[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  clearChat: () => void
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading])

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat
  }
}
```

---

## Node.js & Express

### Basic Express Integration

```typescript
// server.ts
import express from 'express'
import cors from 'cors'
import Dandolo from '@dandolo/agent-sdk'

const app = express()
const client = new Dandolo({
  apiKey: process.env.DANDOLO_API_KEY!
})

app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model = 'auto-select' } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required'
      })
    }

    const response = await client.chat.completions.create({
      messages,
      model
    })

    res.json({
      message: response.choices[0].message.content,
      model: response.model,
      usage: response.usage,
      cost: response.metadata?.cost_usd
    })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({
      error: 'Failed to process chat request'
    })
  }
})

// Streaming chat endpoint
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { messages, model = 'auto-select' } = req.body

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    })

    await client.chat.completions.stream({
      messages,
      model
    }, {
      onChunk: (chunk) => {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      },
      onComplete: () => {
        res.write('data: [DONE]\n\n')
        res.end()
      },
      onError: (error) => {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
        res.end()
      }
    })
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
    res.end()
  }
})

// Get available models
app.get('/api/models', async (req, res) => {
  try {
    const models = await client.models.list()
    res.json(models)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch models' })
  }
})

// Usage stats
app.get('/api/usage', async (req, res) => {
  try {
    const usage = await client.usage()
    res.json(usage)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch usage' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

### Express Middleware for Rate Limiting

```typescript
// middleware/rateLimiter.ts
import { Request, Response, NextFunction } from 'express'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown'
    const now = Date.now()
    
    if (!store[key] || now > store[key].resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      }
    } else {
      store[key].count++
    }

    const { count, resetTime } = store[key]
    
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - count).toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
    })

    if (count > maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((resetTime - now) / 1000)
      })
    }

    next()
  }
}

// Usage
app.use('/api', createRateLimiter(100, 60 * 1000)) // 100 requests per minute
```

---

## Python Flask & FastAPI

### FastAPI Integration

```python
# main.py
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import asyncio
from dandolo import Dandolo

app = FastAPI(title="Dandolo AI API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Dandolo client
client = Dandolo(api_key="ak_your_api_key")

# Pydantic models
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "auto-select"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000
    stream: Optional[bool] = False

class ChatResponse(BaseModel):
    message: str
    model: str
    usage: dict
    cost: Optional[float] = None

@app.get("/")
async def root():
    return {"message": "Dandolo AI API", "status": "running"}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        response = await client.chat.completions.create(
            messages=messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        return ChatResponse(
            message=response.choices[0].message.content,
            model=response.model,
            usage=response.usage,
            cost=getattr(response.metadata, 'cost_usd', None)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    try:
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        async def generate():
            try:
                async for chunk in client.chat.completions.stream(
                    messages=messages,
                    model=request.model,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens
                ):
                    yield f"data: {json.dumps(chunk.dict())}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def get_models():
    try:
        models = await client.models.list()
        return models
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/usage")
async def get_usage():
    try:
        usage = await client.usage()  
        return usage
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Background task example
@app.post("/analyze-async")
async def analyze_async(background_tasks: BackgroundTasks, request: ChatRequest):
    task_id = f"task_{asyncio.get_event_loop().time()}"
    
    async def analyze_task():
        try:
            messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
            response = await client.chat.completions.create(
                messages=messages,
                model=request.model or "auto-select"
            )
            # Store result somewhere (Redis, database, etc.)
            print(f"Task {task_id} completed: {response.choices[0].message.content[:100]}...")
        except Exception as e:
            print(f"Task {task_id} failed: {e}")
    
    background_tasks.add_task(analyze_task)
    return {"task_id": task_id, "status": "processing"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Flask Integration

```python
# app.py
from flask import Flask, request, jsonify, Response, stream_template
from flask_cors import CORS
import json
import asyncio
from dandolo import Dandolo

app = Flask(__name__)
CORS(app)

# Initialize Dandolo client
client = Dandolo(api_key="ak_your_api_key")

@app.route('/health')
def health():
    return jsonify({"status": "ok", "service": "dandolo-flask-api"})

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        messages = data.get('messages', [])
        model = data.get('model', 'auto-select')
        
        if not messages:
            return jsonify({"error": "Messages are required"}), 400
        
        response = client.chat.completions.create(
            messages=messages,
            model=model
        )
        
        return jsonify({
            "message": response.choices[0].message.content,
            "model": response.model,
            "usage": response.usage,
            "cost": getattr(response.metadata, 'cost_usd', None)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/chat/stream', methods=['POST'])
def chat_stream():
    try:
        data = request.get_json()
        messages = data.get('messages', [])
        model = data.get('model', 'auto-select')
        
        def generate():
            try:
                for chunk in client.chat.completions.stream(
                    messages=messages,
                    model=model
                ):
                    yield f"data: {json.dumps(chunk.dict())}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/models')
def get_models():
    try:
        models = client.models.list()
        return jsonify(models)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/usage')
def get_usage():
    try:
        usage = client.usage()
        return jsonify(usage)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

---

## AI Agent Frameworks

### LangChain Integration

```python
# langchain_integration.py
from langchain.llms.base import LLM
from langchain.schema import HumanMessage, SystemMessage
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory
from dandolo import Dandolo
from typing import Optional, List, Any

class DandoloLLM(LLM):
    """Custom LangChain LLM wrapper for Dandolo."""
    
    api_key: str
    model: str = "auto-select"
    temperature: float = 0.7
    max_tokens: int = 1000
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.client = Dandolo(api_key=self.api_key)
    
    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> str:
        """Call the Dandolo API."""
        try:
            response = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=self.model,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                stop=stop
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"Dandolo API call failed: {str(e)}")
    
    @property
    def _llm_type(self) -> str:
        return "dandolo"

# Usage example
def create_conversation_chain():
    llm = DandoloLLM(
        api_key="ak_your_api_key",
        model="auto-select",
        temperature=0.7
    )
    
    memory = ConversationBufferMemory()
    conversation = ConversationChain(
        llm=llm,
        memory=memory,
        verbose=True
    )
    
    return conversation

# Example usage
if __name__ == "__main__":
    chain = create_conversation_chain()
    
    # Have a conversation
    response1 = chain.predict(input="Hello, my name is Alice")
    print(f"AI: {response1}")
    
    response2 = chain.predict(input="What's my name?")
    print(f"AI: {response2}")
```

### AutoGen Integration

```python
# autogen_integration.py
import autogen
from dandolo import Dandolo

class DandoloAutoGenAgent:
    """AutoGen agent powered by Dandolo."""
    
    def __init__(self, api_key: str, model: str = "auto-select"):
        self.client = Dandolo(api_key=api_key)
        self.model = model
    
    def generate_response(self, messages):
        """Generate response using Dandolo."""
        try:
            response = self.client.chat.completions.create(
                messages=messages,
                model=self.model
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error: {str(e)}"

# Custom AutoGen configuration
def create_dandolo_config(api_key: str, model: str = "auto-select"):
    """Create AutoGen config for Dandolo."""
    
    dandolo_agent = DandoloAutoGenAgent(api_key, model)
    
    def custom_llm_call(messages, **kwargs):
        return dandolo_agent.generate_response(messages)
    
    return [{
        "model": model,
        "custom_llm_provider": custom_llm_call,
        "api_key": api_key
    }]

# Usage example
def create_research_team():
    config = create_dandolo_config("ak_your_api_key")
    
    # Create research assistant
    researcher = autogen.AssistantAgent(
        name="researcher",
        system_message="You are a research assistant specialized in data analysis.",
        llm_config={"config_list": config}
    )
    
    # Create user proxy
    user_proxy = autogen.UserProxyAgent(
        name="user_proxy",
        human_input_mode="NEVER",
        max_consecutive_auto_reply=10,
        code_execution_config={"work_dir": "research_output"}
    )
    
    return researcher, user_proxy

# Example multi-agent conversation
if __name__ == "__main__":
    researcher, user_proxy = create_research_team()
    
    user_proxy.initiate_chat(
        researcher,
        message="Analyze the latest trends in AI development and provide a summary."
    )
```

---

## Vue.js & Nuxt

### Nuxt 3 Integration

```vue
<!-- pages/chat.vue -->
<template>
  <div class="container mx-auto p-4">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold mb-6">AI Chat</h1>
      
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6 h-96 overflow-y-auto">
        <div v-for="(message, index) in messages" :key="index" class="mb-4">
          <div
            :class="[
              'p-3 rounded-lg max-w-md',
              message.role === 'user'
                ? 'bg-blue-500 text-white ml-auto'
                : 'bg-gray-100 mr-auto'
            ]"
          >
            <p>{{ message.content }}</p>
            <small class="opacity-70">{{ formatTime(message.timestamp) }}</small>
          </div>
        </div>
        
        <div v-if="isLoading" class="bg-gray-100 mr-auto max-w-md p-3 rounded-lg">
          <div class="animate-pulse">Thinking...</div>
        </div>
      </div>
      
      <form @submit.prevent="sendMessage" class="flex gap-2">
        <input
          v-model="input"
          type="text"
          placeholder="Type your message..."
          class="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          :disabled="isLoading"
        />
        <button
          type="submit"
          :disabled="isLoading || !input.trim()"
          class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>
      
      <div v-if="usage" class="mt-4 text-sm text-gray-600">
        Usage: {{ usage.requests }}/{{ usage.limit }} requests today
      </div>
    </div>
  </div>
</template>

<script setup>
interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const messages = ref<Message[]>([])
const input = ref('')
const isLoading = ref(false)
const usage = ref(null)

const sendMessage = async () => {
  if (!input.value.trim() || isLoading.value) return

  const userMessage: Message = {
    role: 'user',
    content: input.value,
    timestamp: new Date()
  }

  messages.value.push(userMessage)
  const messageContent = input.value
  input.value = ''
  isLoading.value = true

  try {
    const { data } = await $fetch('/api/chat', {
      method: 'POST',
      body: {
        messages: messages.value
      }
    })

    const assistantMessage: Message = {
      role: 'assistant',
      content: data.message,
      timestamp: new Date()
    }

    messages.value.push(assistantMessage)
    usage.value = data.usage
  } catch (error) {
    console.error('Chat error:', error)
    // Add error message to chat
    messages.value.push({
      role: 'assistant',
      content: 'Sorry, I encountered an error. Please try again.',
      timestamp: new Date()
    })
  } finally {
    isLoading.value = false
  }
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString()
}

// Load usage on mount
onMounted(async () => {
  try {
    const { data } = await $fetch('/api/usage')
    usage.value = data
  } catch (error) {
    console.error('Failed to load usage:', error)
  }
})
</script>
```

```typescript
// server/api/chat.post.ts
import Dandolo from '@dandolo/agent-sdk'

const client = new Dandolo({
  apiKey: process.env.DANDOLO_API_KEY!
})

export default defineEventHandler(async (event) => {
  try {
    const { messages } = await readBody(event)

    if (!messages || !Array.isArray(messages)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Messages array is required'
      })
    }

    const response = await client.chat.completions.create({
      messages,
      model: 'auto-select'
    })

    return {
      success: true,
      data: {
        message: response.choices[0].message.content,
        model: response.model,
        usage: {
          requests: response.usage.total_tokens,
          limit: 5000 // This would come from your usage API
        }
      }
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process chat request'
    })
  }
})
```

---

## Mobile Applications

### React Native Integration

```typescript
// ChatService.ts
import Dandolo from '@dandolo/agent-sdk'

class ChatService {
  private client: Dandolo

  constructor(apiKey: string) {
    this.client = new Dandolo({ apiKey })
  }

  async sendMessage(messages: Array<{ role: string; content: string }>) {
    try {
      const response = await this.client.chat.completions.create({
        messages,
        model: 'auto-select'
      })

      return {
        success: true,
        message: response.choices[0].message.content,
        usage: response.usage,
        cost: response.metadata?.cost_usd
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async streamMessage(
    messages: Array<{ role: string; content: string }>,
    onChunk: (content: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) {
    try {
      await this.client.chat.completions.stream({
        messages,
        model: 'auto-select'
      }, {
        onChunk: (chunk) => {
          if (chunk.choices[0]?.delta?.content) {
            onChunk(chunk.choices[0].delta.content)
          }
        },
        onComplete,
        onError: (error) => onError(error.message)
      })
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error')
    }
  }
}

export default ChatService
```

```tsx
// ChatScreen.tsx
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import ChatService from './ChatService'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatService] = useState(() => new ChatService('ak_your_api_key'))

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const result = await chatService.sendMessage([
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: userMessage.role, content: userMessage.content }
      ])

      if (result.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.message,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        // Handle error
        console.error('Chat error:', result.error)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.role === 'user' ? styles.userMessage : styles.assistantMessage
    ]}>
      <Text style={[
        styles.messageText,
        item.role === 'user' ? styles.userMessageText : styles.assistantMessageText
      ]}>
        {item.content}
      </Text>
      <Text style={styles.timestamp}>
        {item.timestamp.toLocaleTimeString()}
      </Text>
    </View>
  )

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
      />
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>AI is thinking...</Text>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Type your message..."
          multiline
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  messagesList: {
    flex: 1
  },
  messagesContent: {
    padding: 16
  },
  messageContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    maxWidth: '80%'
  },
  userMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end'
  },
  assistantMessage: {
    backgroundColor: '#E5E5E7',
    alignSelf: 'flex-start'
  },
  messageText: {
    fontSize: 16
  },
  userMessageText: {
    color: 'white'
  },
  assistantMessageText: {
    color: 'black'
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center'
  },
  loadingText: {
    fontStyle: 'italic',
    color: '#666'
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    alignItems: 'flex-end'
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    maxHeight: 100
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc'
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold'
  }
})

export default ChatScreen
```

---

## Best Practices

### Error Handling

```typescript
// utils/errorHandler.ts
import { DandoloError, RateLimitError, AuthenticationError } from '@dandolo/agent-sdk'

export function handleDandoloError(error: unknown): string {
  if (error instanceof RateLimitError) {
    return `Rate limit exceeded. Try again in ${error.retryAfter} seconds.`
  }
  
  if (error instanceof AuthenticationError) {
    return 'Invalid API key. Please check your credentials.'
  }
  
  if (error instanceof DandoloError) {
    return `API Error: ${error.message}`
  }
  
  return 'An unexpected error occurred. Please try again.'
}
```

### Configuration Management

```typescript
// config/dandolo.ts
interface DandoloConfig {
  apiKey: string
  baseURL?: string
  timeout?: number
  maxRetries?: number
}

export function createDandoloConfig(): DandoloConfig {
  const apiKey = process.env.DANDOLO_API_KEY

  if (!apiKey) {
    throw new Error('DANDOLO_API_KEY environment variable is required')
  }

  return {
    apiKey,
    baseURL: process.env.DANDOLO_BASE_URL || 'https://dandolo.ai',
    timeout: parseInt(process.env.DANDOLO_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.DANDOLO_MAX_RETRIES || '3')
  }
}
```

### Monitoring and Logging

```typescript
// utils/monitoring.ts
import Dandolo from '@dandolo/agent-sdk'

export function createMonitoredClient(config: any) {
  const client = new Dandolo(config)

  // Add request logging
  client.on('request', (request) => {
    console.log(`[Dandolo] Request: ${request.method} ${request.url}`)
  })

  // Add response logging
  client.on('response', (response) => {
    console.log(`[Dandolo] Response: ${response.status} (${response.headers['x-processing-time-ms']}ms)`)
  })

  // Add error logging
  client.on('error', (error) => {
    console.error(`[Dandolo] Error: ${error.message}`)
  })

  return client
}
```

---

*Ready to integrate Dandolo.ai into your application? Check out our [Getting Started Guide](GETTING_STARTED.md) for more examples and tutorials.*