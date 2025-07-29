# Project Context

## Project Overview
**Name**: Dandolo.ai  
**Type**: Decentralized AI Inference Platform  
**Purpose**: Middleware layer connecting AI providers with users through marketplace interface

## Core Business Model
- Anonymous chat interface for public users
- Developer API (chat completions format) for integration
- Provider marketplace for compute registration
- Points-based reward system (1 point per 100 tokens)
- Web3 wallet integration for provider verification

## Key Features
- **Model Routing**: Intelligent routing to different Venice.ai models based on user intent
- **Rate Limiting**: Tiered limits (anonymous: 50/day, developer: 500/day, agent: 5000/day)
- **Points System**: Providers earn points for serving requests
- **Multi-modal Support**: Text chat, code generation, image generation (planned), analysis
- **Privacy-First**: No conversation history storage - stateless chat system

## Target Users
1. **Anonymous Users**: Quick AI access without registration
2. **Developers**: API integration for applications
3. **AI Providers**: Monetize compute resources through Venice.ai
4. **Enterprises**: Scalable AI inference solutions

## Technical Architecture
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Convex (serverless backend-as-a-service)
- **Web3**: Wagmi + Viem + Reown AppKit for Ethereum integration
- **AI Integration**: Venice.ai API for model inference
- **Testing**: Cypress for E2E tests
- **Deployment**: Vercel (frontend) + Convex (backend)

## Database Schema (Convex)
- **providers**: Venice.ai provider information and health status
- **userPoints**: User usage tracking and points
- **providerPoints**: Provider earnings and performance
- **inferences**: Request logs and analytics
- **modelCache**: Cached model information from Venice.ai
- **apiKeys**: Developer API key management

## Development Workflow
1. Local development with `npm run dev`
2. E2E testing with Cypress
3. Code quality checks with linting
4. Deployment through Vercel (auto-deploy on main branch)
5. Backend deployment through Convex CLI

## Current State
- ✅ Core chat functionality working
- ✅ Venice.ai provider integration
- ✅ Web3 wallet connectivity
- ✅ API endpoints for chat completions
- ✅ Rate limiting and authentication
- ✅ Points tracking system
- 🚧 Admin dashboard enhancements
- 🚧 Provider health monitoring
- 🚧 Enhanced security measures

## Constraints
- Must maintain compatibility with Venice.ai API
- Web3 integration required for provider verification
- No user data storage (privacy requirement)
- Performance targets: <200ms API response time
- Security: Anonymous access with rate limiting

## Success Metrics
- API response time < 200ms (95th percentile)
- 99.9% uptime
- Provider satisfaction with earnings
- User adoption rate
- Token processing volume