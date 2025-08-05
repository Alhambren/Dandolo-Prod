# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dandolo.ai is a decentralized AI inference platform that connects AI providers with users through a marketplace interface. The application serves as a middleware layer for Venice.ai providers, offering:

- Anonymous chat interface for public users
- Developer API (chat completions format) for integration
- Provider marketplace for compute registration
- Points-based reward system (1 point per 100 tokens)
- Web3 wallet integration for provider verification

## Technology Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Convex (serverless backend-as-a-service)
- **Web3**: Wagmi + Viem + Reown AppKit for Ethereum integration
- **AI Integration**: Venice.ai API for model inference
- **Testing**: Cypress for E2E tests

## Development Commands

```bash
# Start development servers (both frontend and backend)
npm run dev

# Build and deploy to production
npm run build

# Run linting and type checking
npm run lint

# Run E2E tests
npm run test

# Open Cypress test runner
npm run test:open
```

## Architecture Overview

### Backend Structure (`/convex`)
- **`schema.ts`** - Database schema with tables: providers, userPoints, providerPoints, inferences, modelCache, apiKeys
- **`router.ts`** - HTTP API endpoints (`/chat`, `/v1/chat/completions`)
- **`inference.ts`** - AI model routing and selection logic based on intent (chat, code, image, analysis)
- **`providers.ts`** - Venice.ai provider management and health validation
- **`auth.config.ts`** - Anonymous authentication configuration

### Frontend Structure (`/src`)
- **`main.tsx`** - Application entry with Web3 providers
- **`App.tsx`** - Main app with navigation
- **Components**: HomePage, ChatPage, ProvidersPage, DashboardPage, DevelopersPage
- **Web3**: WalletConnectButton for Ethereum wallet connectivity

### Key Features
- **Model Routing**: Intelligent routing to different Venice.ai models based on user intent
- **Rate Limiting**: Different limits for anonymous (50/day), developer keys (500/day), agent keys (5000/day)
- **Points System**: Providers earn 1 point per 100 tokens processed
- **Multi-modal Support**: Text chat, code generation, image generation (planned), analysis

## Important Development Guidelines

### Convex Function Patterns
Always use the new Convex function syntax:
```typescript
export const myFunction = query({
  args: { param: v.string() },
  returns: v.object({ result: v.string() }),
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

### Web3 Integration
- NEVER switch from @reown/appkit - it's the established wallet library
- Base Network is the primary blockchain target
- Always verify wallet connectivity before provider operations

### File Organization Rules
- NEVER CREATE DUPLICATE FILES - always check existing files first
- ALWAYS prefer editing existing files over creating new ones
- Verify changes don't break working wallet/provider features

### Venice.ai Integration
- Provider validation scripts: `debug-providers.js`, `validate-venice-key.js`
- Model cache refresh: `print-venice-models.js`
- All Venice.ai calls go through the inference routing system
- **Character Connections**: Supported via `venice_parameters.character_slug` in API requests
- Character connections work with all provider keys and pass through existing routing

### Testing Strategy
- E2E tests in `/cypress/e2e/` cover API endpoints and main user flows
- Test both anonymous and authenticated API access
- Validate provider registration and points tracking

### Deployment Process
- Production builds deploy Convex backend first, then Vite frontend
- Vercel handles frontend hosting with environment-based configuration
- Always commit and deploy after each working feature

## API Structure

### Public Endpoints
- `POST /chat` - Anonymous chat (50 requests/day)
- `POST /v1/chat/completions` - Chat completions developer API

### Rate Limits
- Anonymous: 50 requests/day
- Developer keys (dk_): 500 requests/day  
- Agent keys (ak_): 5,000 requests/day

### Points System
Providers earn 1 point per 100 tokens processed. The system tracks:
- User points for usage
- Provider points for serving requests
- Inference logs for analytics

## Memory Management

Dandolo does not store conversation history. All conversation context must be included in each API request, ensuring complete privacy and giving users full control over context windows.