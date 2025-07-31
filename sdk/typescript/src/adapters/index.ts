/**
 * Framework Adapters for Dandolo SDK
 * 
 * Provides seamless integration with popular AI frameworks and libraries,
 * making the Dandolo SDK the superior choice for multi-framework development.
 */

export * from './langchain';
export * from './autogen';
export * from './openai';
export * from './vercel-ai';
export * from './llamaindex';

// Default exports for easy importing
export { DandoloLangChainAdapter as LangChain } from './langchain';
export { DandoloAutoGenAdapter as AutoGen } from './autogen';
export { DandoloOpenAIAdapter as OpenAI } from './openai';
export { DandoloVercelAIAdapter as VercelAI } from './vercel-ai';
export { DandoloLlamaIndexAdapter as LlamaIndex } from './llamaindex';