# @dandolo/agent-sdk

> **The most joyful AI agent SDK ever created**  
> Superior to Venice.ai and OpenRoute.ai in developer experience

🚀 **Zero-config setup** • 🎯 **Agent-first design** • ⚡ **Blazing fast streaming** • 🔒 **Secure by default** • 💎 **TypeScript native**

[![npm version](https://badge.fury.io/js/@dandolo%2Fagent-sdk.svg)](https://badge.fury.io/js/@dandolo%2Fagent-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org/)

## ✨ Why Dandolo SDK?

**We built the SDK we wished existed.** After working with Venice.ai, OpenRoute.ai, and other platforms, we knew we could create something better. Here's what makes Dandolo SDK special:

| Feature | Dandolo SDK | Venice.ai | OpenRoute.ai |
|---------|-------------|-----------|--------------|
| **Zero Config** | ✅ Works instantly | ❌ Complex setup | ❌ Manual config |
| **Agent Instructions** | ✅ Native support | ❌ Not supported | ❌ Workarounds |
| **Streaming** | ✅ Real-time + SSE | ✅ Basic | ✅ Basic |
| **Context Management** | ✅ Automatic | ❌ Manual | ❌ Manual |
| **Error Handling** | ✅ Comprehensive | ❌ Basic | ❌ Basic |
| **TypeScript** | ✅ Native | ❌ Community | ❌ Community |
| **Framework Support** | ✅ Built-in | ❌ DIY | ❌ DIY |

## 🚀 Quick Start

### Installation

```bash
npm install @dandolo/agent-sdk
# or
yarn add @dandolo/agent-sdk
# or
pnpm add @dandolo/agent-sdk
```

### Get Your API Key

1. Visit [dandolo.ai/dashboard](https://dandolo.ai/dashboard)
2. Create an agent key (`ak_...`) or developer key (`dk_...`)
3. Start building amazing agents!

### Hello World

```typescript
import Dandolo from '@dandolo/agent-sdk';

const client = new Dandolo({
  apiKey: 'ak_your_agent_key_here', // Get yours at dandolo.ai/dashboard
  agentId: 'my-awesome-agent' // Optional but recommended
});

// Simple chat completion
const response = await client.chat.completions.create({
  messages: [{ role: 'user', content: 'Hello, world!' }]
});

console.log(response.choices[0].message.content);
```

That's it! **No complex configuration, no API wrestling, just results.** 🎉

## 🎯 Agent-First Features

### Agent Instructions

Transform any conversation with intelligent instructions:

```typescript
await client.chat.completions.create({
  messages: [
    { role: 'user', content: 'Write a story about a robot' }
  ],
  instructions: [
    {
      type: 'system_prompt',
      content: 'You are a creative storyteller who writes engaging sci-fi',
      metadata: {
        priority: 'high',
        temperature: 0.8
      }
    },
    {
      type: 'context_injection',
      content: 'The story should be set in 2045 with advanced AI',
      metadata: {
        workflow_id: 'story-generation-v1'
      }
    }
  ]
});
```

### Real-time Streaming

Experience the smoothest streaming in the industry:

```typescript
await client.chat.completions.stream({
  messages: [{ role: 'user', content: 'Explain quantum computing' }],
  model: 'auto-select' // Smart model selection
}, {
  mode: 'agent_enhanced', // Unlocks advanced features
  onChunk: (chunk) => {
    process.stdout.write(chunk.content);
    
    // Access rich metadata (agent keys only)  
    if (chunk.agent_metadata) {
      console.log('Processing:', chunk.agent_metadata);
    }
  },
  onComplete: (response) => {
    console.log('\\n✨ Done!', response.usage);
  },
  onError: (error) => {
    console.error('💥 Error:', error.message);
  }
});
```

### Context Management

Never lose conversation context again:

```typescript
// Create a persistent context
const context = await client.context.create({
  id: 'user-session-123',
  settings: {
    max_messages: 50,
    auto_summarize: true,
    summarize_threshold: 40
  }
});

// Chat with context preservation
await client.chat.completions.create({
  messages: [{ role: 'user', content: 'Remember: my name is Alex' }],
  context_id: context.id
});

// Later... context is automatically maintained
await client.chat.completions.create({
  messages: [{ role: 'user', content: 'What was my name again?' }],
  context_id: context.id
});
// Response: "Your name is Alex!"
```

## ⚡ Advanced Features

### Workflow Management

Build complex multi-step agent workflows:

```typescript
const workflow = await client.workflows.create({
  name: 'Research & Write',
  steps: [
    {
      id: 'research',
      type: 'prompt',
      config: {
        messages: [{ role: 'user', content: 'Research {{topic}}' }],
        model: 'auto-select'
      }
    },
    {
      id: 'write',
      type: 'prompt',  
      dependencies: ['research'],
      config: {
        messages: [
          { role: 'system', content: 'Write based on research: {{research.result}}' },
          { role: 'user', content: 'Write an article about {{topic}}' }
        ]
      }
    }
  ]
});

const execution = await client.workflows.execute(workflow.id, {
  variables: { topic: 'AI agents' }
});
```

### Smart Model Selection

Let Dandolo choose the best model for your task:

```typescript
// Get the best model for code generation
const codeModel = await client.models.getBest('code');

// Get the best model for analysis (large context)
const analysisModel = await client.models.getBest('analysis');

// Or use auto-select for intelligent routing
const response = await client.chat.completions.create({
  messages: [{ role: 'user', content: 'Generate a Python function' }],
  model: 'auto-select' // Automatically routes to best code model
});
```

### Framework Integration

#### LangChain Integration

```typescript
import { DandoloLangChain } from '@dandolo/agent-sdk/langchain';

const llm = new DandoloLangChain({
  apiKey: 'ak_your_key',
  model: 'auto-select'
});

// Use with any LangChain chain
const chain = new LLMChain({ llm, prompt });
const result = await chain.call({ input: 'Hello' });
```

#### AutoGen Integration

```typescript
import { DandoloAutoGen } from '@dandolo/agent-sdk/autogen';

const agent = new DandoloAutoGen({
  name: 'ResearchAgent',
  apiKey: 'ak_your_key',
  systemMessage: 'You are a research assistant'
});
```

## 🔒 Security & Privacy

### Zero-Trust Architecture

- **No secrets in logs**: API keys are automatically redacted
- **Encrypted communication**: All requests use TLS 1.3
- **No data retention**: Conversations aren't stored (unless you want them to be)
- **Rate limit protection**: Automatic backoff and retry

### Agent Authentication

```typescript
const client = new Dandolo({
  apiKey: 'ak_your_agent_key',
  agentId: 'my-agent-v1.0', // Prevents key hijacking
});

// Headers automatically include:
// X-Agent-ID: my-agent-v1.0  
// Authorization: Bearer ak_***
```

## 📊 Monitoring & Debugging

### Built-in Observability

```typescript
const client = new Dandolo({
  apiKey: 'ak_your_key',
  debug: true // Enable detailed logging
});

// Listen to events
client.on('request', (config) => {
  console.log('📤 Request:', config.method, config.url);
});

client.on('response', (response) => {
  console.log('📥 Response:', response.status, response.headers['x-processing-time-ms'] + 'ms');
});

client.on('rate_limit_exceeded', (error) => {
  console.log('⚠️ Rate limit:', error.remaining, 'requests remaining');
});
```

### Usage Tracking

```typescript
// Check your usage anytime
const usage = await client.usage();
console.log(`Used: ${usage.daily_usage}/${usage.daily_limit} requests today`);
console.log(`Resets: ${usage.reset_time}`);

// Get rate limit info from headers
console.log('Remaining:', client.rateLimit?.remaining);
```

## 🎨 Advanced Examples

### Multi-modal Agent

```typescript
const response = await client.chat.completions.create({
  messages: [
    {
      role: 'user',
      content: 'Analyze this image and generate code to recreate it',
      agent_instruction: {
        type: 'multi_modal',
        content: 'Process image input and generate corresponding code',
        metadata: {
          format: 'json',
          tools: ['vision', 'code_generation']
        }
      }
    }
  ],
  model: 'auto-select' // Automatically chooses vision + code model
});
```

### Streaming with Workflow

```typescript
await client.chat.completions.stream({
  messages: [{ role: 'user', content: 'Plan a trip to Japan' }],
  instructions: [
    {
      type: 'workflow_step',
      content: 'Research destinations',
      metadata: {
        workflow_id: 'trip-planner',
        step_id: 'research',
        dependencies: []
      }
    },
    {
      type: 'workflow_step', 
      content: 'Create itinerary based on research',
      metadata: {
        workflow_id: 'trip-planner',
        step_id: 'plan',
        dependencies: ['research']
      }
    }
  ]
}, {
  mode: 'workflow_aware',
  onChunk: (chunk) => {
    if (chunk.workflow_state) {
      console.log('Workflow step:', chunk.workflow_state.current_step);
    }
    process.stdout.write(chunk.content);
  }
});
```

### Error Recovery

```typescript
import { 
  isRateLimitError,
  isAuthError,
  getErrorSuggestions 
} from '@dandolo/agent-sdk/errors';

try {
  const response = await client.chat.completions.create({
    messages: [{ role: 'user', content: 'Hello' }]
  });
} catch (error) {
  if (isRateLimitError(error)) {
    console.log('⏰ Rate limited. Waiting...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    // Auto-retry logic...
  } else if (isAuthError(error)) {
    console.log('🔑 Check your API key');
  } else {
    console.log('💡 Suggestions:', getErrorSuggestions(error));
  }
}
```

## 🔧 Configuration

### Full Configuration Options

```typescript
const client = new Dandolo({
  apiKey: 'ak_your_key',
  baseURL: 'https://api.dandolo.ai', // Custom endpoint
  agentId: 'my-agent-v1.0',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  debug: false,
  headers: {
    'X-Custom-Header': 'value'
  },
  defaultModel: 'auto-select',
  agentEnhanced: true // Auto-detected from key type
});
```

### Environment Variables

```bash
DANDOLO_API_KEY=ak_your_key_here
DANDOLO_AGENT_ID=my-agent
DANDOLO_BASE_URL=https://api.dandolo.ai
DANDOLO_DEBUG=true
```

```typescript
// Automatically loads from environment
const client = new Dandolo({
  apiKey: process.env.DANDOLO_API_KEY! 
});
```

## 📚 API Reference

### Chat Completions

#### `client.chat.completions.create(request)`

Create a chat completion.

**Parameters:**
- `messages` - Array of conversation messages
- `model?` - Model to use (default: 'auto-select')  
- `temperature?` - Randomness (0-2)
- `max_tokens?` - Maximum tokens to generate
- `instructions?` - Agent instructions for enhanced processing
- `context_id?` - Context ID for conversation continuity
- `workflow_id?` - Workflow ID for multi-step processes

**Returns:** `Promise<ChatCompletionResponse>`

#### `client.chat.completions.stream(request, options)`

Create a streaming chat completion.

**Parameters:**
- `request` - Same as `create()` plus `stream: true`
- `options` - Streaming options

**Returns:** `Promise<void>`

### Models

#### `client.models.list()`

List all available models.

**Returns:** `Promise<Model[]>`

#### `client.models.get(modelId)`

Get a specific model.

**Returns:** `Promise<Model>`

#### `client.models.getBest(type)`

Get the best model for a task type.

**Parameters:**
- `type` - Task type: 'chat', 'code', 'image', 'analysis'

**Returns:** `Promise<Model>`

### Streaming

#### `client.streaming.stream(request, options)`

Advanced streaming with multiple protocol support.

#### `client.streaming.createRealtimeConnection()`

Create a WebSocket connection for bidirectional communication.

**Returns:** `Promise<RealtimeConnection>`

### Context Management

#### `client.context.create(options)`

Create a persistent conversation context.

#### `client.context.get(contextId)` 

Get context by ID.

#### `client.context.update(contextId, updates)`

Update context settings.

### Workflows

#### `client.workflows.create(workflow)`

Create a new workflow.

#### `client.workflows.execute(workflowId, variables)`

Execute a workflow with variables.

#### `client.workflows.get(workflowId)`

Get workflow by ID.

## 🤝 Community & Support

### Getting Help

- 📖 **Documentation**: [docs.dandolo.ai](https://docs.dandolo.ai)
- 💬 **Discord**: [Join our community](https://discord.gg/dandolo)
- 🐛 **Issues**: [GitHub Issues](https://github.com/dandolo-ai/typescript-sdk/issues)
- 📧 **Email**: [support@dandolo.ai](mailto:support@dandolo.ai)

### Contributing

We love contributions! See our [Contributing Guide](CONTRIBUTING.md).

### Examples & Templates

Check out our [Examples Repository](https://github.com/dandolo-ai/examples) for:
- 🤖 Agent templates
- 🔗 Framework integrations  
- 📝 Use case examples
- 🚀 Starter projects

## 📈 Roadmap

- [ ] **Python SDK** (Q2 2025)
- [ ] **Go SDK** (Q2 2025) 
- [ ] **Rust SDK** (Q3 2025)
- [ ] **WebSocket Streaming** (Q2 2025)
- [ ] **Voice Integration** (Q3 2025)
- [ ] **Visual Workflow Builder** (Q4 2025)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by the Dandolo.ai team**

[🌐 Website](https://dandolo.ai) • [📖 Docs](https://docs.dandolo.ai) • [💬 Discord](https://discord.gg/dandolo) • [🐦 Twitter](https://twitter.com/dandolo_ai)

</div>