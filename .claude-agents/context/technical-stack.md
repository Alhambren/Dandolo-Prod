# Technical Stack Details

## Frontend Stack

### React 19 Ecosystem
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS for utility-first styling
- **State Management**: React hooks + Context API
- **Routing**: React Router for client-side navigation

### Web3 Integration
- **Wallet Connection**: @reown/appkit (formerly WalletConnect)
- **Ethereum Interaction**: Wagmi + Viem
- **Network**: Base Network (primary blockchain target)
- **Standards**: EIP-1193 for wallet interaction

**CRITICAL**: Never switch from @reown/appkit - it's the established wallet library

### Development Tools
- **Package Manager**: npm
- **Type Checking**: TypeScript with strict mode
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier (implied)

## Backend Stack

### Convex Backend-as-a-Service
- **Database**: Document-based with TypeScript schemas
- **Functions**: TypeScript server functions (queries, mutations, actions)
- **Real-time**: Built-in reactivity and subscriptions
- **Authentication**: Anonymous auth configuration
- **File Storage**: Convex file storage API

**Key Convex Concepts**:
- **Queries**: Read-only functions that are reactive
- **Mutations**: Write functions that modify data
- **Actions**: Server functions that can call external APIs
- **Schema**: TypeScript-first database schema definition

### External Integrations
- **Venice.ai API**: Primary AI inference provider
- **Model Routing**: Intelligent selection based on request intent
- **Provider Health**: Monitoring and validation system

## Database Architecture (Convex)

### Schema Design
```typescript
// Core tables
schema.ts:
- providers: Venice.ai provider management
- userPoints: Usage tracking and points
- providerPoints: Provider earnings
- inferences: Request logging
- modelCache: Cached model information
- apiKeys: Developer API key management
```

### Data Flow
1. User request → Authentication check
2. Rate limiting validation
3. Model selection based on intent
4. Venice.ai API call
5. Response processing
6. Points allocation
7. Analytics logging

## API Architecture

### Public Endpoints
- `POST /chat` - Anonymous chat (50 requests/day)
- `POST /v1/chat/completions` - Developer API (OpenAI-compatible)

### Rate Limiting Tiers
- **Anonymous**: 50 requests/day
- **Developer keys (dk_)**: 500 requests/day
- **Agent keys (ak_)**: 5,000 requests/day

### Authentication
- Anonymous users: IP-based rate limiting
- Developers: API key authentication
- Providers: Web3 wallet verification

## Development Environment

### Required Tools
- Node.js 18+ (for React 19 compatibility)
- npm (package management)
- Convex CLI (backend deployment)
- Git (version control)

### Development Commands
```bash
npm run dev      # Start both frontend and backend
npm run build    # Production build
npm run lint     # Code quality checks
npm test         # E2E tests with Cypress
npm run test:open # Cypress test runner
```

### File Structure
```
/src/
  main.tsx          # App entry with Web3 providers
  App.tsx           # Main app with navigation
  components/       # React components
    HomePage.tsx
    ChatPage.tsx
    ProvidersPage.tsx
    DashboardPage.tsx
    DevelopersPage.tsx
    WalletConnectButton.tsx

/convex/
  schema.ts         # Database schema
  router.ts         # HTTP API endpoints
  inference.ts      # AI model routing logic
  providers.ts      # Venice.ai provider management
  auth.config.ts    # Authentication configuration

/cypress/
  e2e/             # End-to-end tests
```

## Deployment Architecture

### Frontend Deployment (Vercel)
- Auto-deploy from main branch
- Environment-based configuration
- CDN distribution
- Custom domain support

### Backend Deployment (Convex)
- Serverless function deployment
- Automatic scaling
- Built-in database hosting
- Real-time synchronization

### CI/CD Pipeline
1. Push to main branch
2. Automated testing (Cypress)
3. Code quality checks (ESLint)
4. Build verification
5. Convex backend deployment
6. Vercel frontend deployment

## Performance Considerations

### Frontend Optimization
- Code splitting with React.lazy()
- Component memoization where appropriate
- Optimized bundle size
- Efficient re-rendering patterns

### Backend Optimization
- Convex automatic query optimization
- Efficient database indexes
- Caching strategies for Venice.ai responses
- Connection pooling handled by Convex

### Monitoring
- API response time tracking
- Error rate monitoring
- Provider health checks
- Usage analytics

## Security Architecture

### Authentication & Authorization
- Anonymous access with rate limiting
- API key-based authentication for developers
- Web3 wallet verification for providers
- No user data storage (privacy-first)

### Input Validation
- Request payload validation
- Rate limiting enforcement
- API key format verification
- Sanitization of user inputs

### Data Protection
- No conversation history storage
- Encrypted API key storage
- Secure environment variable handling
- HTTPS/TLS for all communications