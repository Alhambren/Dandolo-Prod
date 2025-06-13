# Dandolo.ai

Experimental sovereign inference platform built on [Convex](https://convex.dev) and
[Venice.ai](https://venice.ai). This fork introduces a streamlined UI with room
for upcoming audio and vision features.
  
## Project structure
  
The frontend code lives in `src` and uses [Vite](https://vitejs.dev/). The
backend logic resides in the `convex` directory.

Run `npm run dev` to start both servers during development.

### Interface Highlights

- **Chat** – multi-model text chat with basic folder organization.
- **Audio Studio** – placeholder for speech-to-text and text-to-speech.
- **Vision Lab** – placeholder for image generation and analysis.
- **Tools Marketplace** – upcoming registry for AI tools.

## App authentication

Chef apps use [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign in. You may wish to change this before deploying your app.

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve your app further

### Deploying to Vercel

1. Install the [Vercel CLI](https://vercel.com/docs/cli) with `npm i -g vercel`.
2. From the project root run `vercel` and follow the prompts to connect your repository.
3. In the Vercel dashboard, add `CONVEX_DEPLOY_KEY` and any other environment variables.
4. Trigger a production build with `vercel --prod`.

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.

## API Documentation Update

### Chat Completions (Multi-turn Conversations)

```bash
POST https://dandolo.ai/api/v1/chat/completions
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What's the capital of France?"},
    {"role": "assistant", "content": "The capital of France is Paris."},
    {"role": "user", "content": "What's the population?"}
  ],
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**Response:**
```json
{
  "id": "chatcmpl-123456",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-3.5-turbo",
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 28,
    "total_tokens": 73
  },
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "The population of Paris is approximately 2.2 million..."
    },
    "finish_reason": "stop",
    "index": 0
  }]
}
```

### SDK Usage for Agents

```javascript
import DandoloSDK from '@dandolo/sdk';

const dandolo = new DandoloSDK({
  apiKey: 'ak_your_agent_key', // Agent keys start with ak_
});

// Initialize conversation
let messages = [
  { role: 'system', content: 'You are a helpful assistant.' }
];

// First message
const response1 = await dandolo.chatCompletion({
  messages: [...messages, { role: 'user', content: 'Hello!' }],
});

// Update conversation history
messages.push(
  { role: 'user', content: 'Hello!' },
  response1.choices[0].message
);

// Continue conversation
const response2 = await dandolo.chatCompletion({
  messages: [...messages, { role: 'user', content: 'What can you help me with?' }],
});
```

### Rate Limits

- **Developer Keys (dk_)**: 500 requests/day
- **Agent Keys (ak_)**: 5,000 requests/day
- **Anonymous Web**: 50 requests/day

### Points System Update

Providers now earn **1 point per 100 tokens processed** instead of flat rate per prompt. This ensures fair compensation for longer conversations.

### Memory Management

Dandolo does not store conversation history. Agents must include the full message history with each request. This ensures:
- Complete privacy (no conversation storage)
- Agent control over context window
- Ability to compress/summarize as needed

**Best Practices:**
```javascript
// Manage context window
if (messages.length > 20) {
  // Summarize older messages
  const summary = await summarizeConversation(messages.slice(0, -10));
  messages = [
    { role: 'system', content: 'Previous conversation summary: ' + summary },
    ...messages.slice(-10)
  ];
}
```
