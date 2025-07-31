# Dandolo SDK Examples

This directory contains comprehensive examples demonstrating the superior capabilities of the Dandolo TypeScript SDK. Each example showcases features that surpass traditional AI SDKs like OpenAI, Venice.ai, and OpenRoute.ai.

## 🚀 Quick Start Examples

### [Basic Usage](./01-basic-usage.ts)
- Zero-configuration setup
- Simple chat completions
- Error handling with actionable suggestions

### [Advanced Streaming](./02-advanced-streaming.ts)
- Superior streaming with real-time metadata
- Multiple streaming protocols (SSE, WebSocket, Polling)
- Stream management and error recovery

### [Agent Instructions](./03-agent-instructions.ts)
- Intelligent agent instruction processing
- Context-aware execution
- Multi-step workflows

## 🔄 Framework Integration Examples

### [OpenAI Migration](./04-openai-migration.ts)
- Drop-in replacement for OpenAI SDK
- Migration guide with compatibility checker
- Enhanced features while maintaining API compatibility

### [LangChain Integration](./05-langchain-integration.ts)
- Full LangChain compatibility
- Enhanced conversation chains
- Advanced agent executor with tool calling

### [AutoGen Multi-Agent](./06-autogen-multiagent.ts)
- Microsoft AutoGen compatibility
- Multi-agent conversations
- Group chat orchestration

### [Vercel AI SDK](./07-vercel-ai-integration.ts)
- React hooks compatibility
- Next.js API routes
- Streaming UI components

### [LlamaIndex RAG](./08-llamaindex-rag.ts)
- Document processing and indexing
- Retrieval-augmented generation
- Vector store operations

## 🏗️ Advanced Architecture Examples

### [Workflow Orchestration](./09-workflow-orchestration.ts)
- Complex multi-step workflows
- Conditional execution and error handling
- Parallel processing capabilities

### [Context Management](./10-context-management.ts)
- Intelligent conversation context handling
- Auto-summarization and optimization
- Memory persistence

### [Real-time Collaboration](./11-realtime-collaboration.ts)
- WebSocket-based real-time features
- Multi-user agent interactions
- Event-driven architecture

## 🎯 Production-Ready Examples

### [Enterprise Integration](./12-enterprise-integration.ts)
- Rate limiting and quota management
- Authentication and security
- Monitoring and analytics

### [Microservices Architecture](./13-microservices.ts)
- Service mesh integration
- Load balancing and failover
- Distributed tracing

### [Edge Computing](./14-edge-computing.ts)
- Edge runtime compatibility
- Serverless function optimization
- Global deployment strategies

## 🧪 Specialized Use Cases

### [Code Generation](./15-code-generation.ts)
- Intelligent code completion
- Multi-language support
- Code review and optimization

### [Content Creation](./16-content-creation.ts)
- Creative writing workflows
- Multi-modal content generation
- Brand voice consistency

### [Data Analysis](./17-data-analysis.ts)
- Intelligent data processing
- Chart and visualization generation
- Automated insights

## Running the Examples

Each example is a self-contained TypeScript file that can be run directly:

```bash
# Install dependencies
npm install

# Run any example
npx tsx examples/01-basic-usage.ts

# Or compile and run
npm run build
node dist/examples/01-basic-usage.js
```

## Environment Setup

Create a `.env` file in the examples directory:

```env
DANDOLO_API_KEY=ak_your_agent_key_here
DANDOLO_BASE_URL=https://api.dandolo.ai
```

## Example Structure

Each example follows this structure:

1. **Setup**: Environment and client initialization
2. **Demo**: Core functionality demonstration
3. **Advanced**: Enhanced features showcase
4. **Comparison**: How it surpasses other SDKs
5. **Production**: Real-world usage patterns

## Key Differentiators

### 🚀 Superior Performance
- **Streaming**: Advanced streaming with metadata and recovery
- **Connection Pooling**: Efficient resource management
- **Caching**: Intelligent response caching

### 🧠 Enhanced Intelligence  
- **Agent Instructions**: Context-aware instruction processing
- **Workflow Orchestration**: Complex multi-step automation
- **Context Management**: Intelligent conversation handling

### 🔧 Developer Experience
- **Zero Configuration**: Works out of the box
- **Framework Agnostic**: Seamless integration with any framework
- **Type Safety**: Complete TypeScript support

### 🛡️ Enterprise Ready
- **Security**: Built-in security best practices
- **Monitoring**: Comprehensive observability
- **Scalability**: Production-grade performance

## Support

For questions about these examples:
- Visit: https://dandolo.ai/docs
- Discord: https://discord.gg/dandolo
- Email: support@dandolo.ai