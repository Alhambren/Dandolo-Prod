/**
 * DandoloClient - The most joyful AI agent SDK ever created
 * 
 * This client provides a superior developer experience that surpasses
 * Venice.ai and OpenRoute.ai with intuitive APIs, powerful features,
 * and delightful error handling.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { EventEmitter } from 'eventemitter3';
import WebSocket from 'ws';

import {
  DandoloConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  StreamingChunk,
  StreamingOptions,
  DandoloError,
  Model,
  RateLimitInfo,
  ConversationContext,
  Workflow,
  WorkflowExecution,
  AgentEvent,
  AgentInstruction
} from './types';

import { DandoloStreamClient } from './streaming';
import { WorkflowManager } from './workflows';
import { ContextManager } from './context';
import { AgentManager } from './agents';
import { createDandoloError, isRateLimitError, isAuthError } from './errors';

/**
 * The main Dandolo client class
 * 
 * @example
 * ```typescript
 * import Dandolo from '@dandolo/agent-sdk';
 * 
 * const client = new Dandolo({
 *   apiKey: 'ak_your_agent_key_here',
 *   agentId: 'my-awesome-agent'
 * });
 * 
 * // Simple chat completion
 * const response = await client.chat.completions.create({
 *   messages: [{ role: 'user', content: 'Hello, world!' }]
 * });
 * 
 * // Streaming with agent instructions
 * await client.chat.completions.stream({
 *   messages: [{ role: 'user', content: 'Write a story' }],
 *   instructions: [{
 *     type: 'system_prompt',
 *     content: 'You are a creative storyteller'
 *   }]
 * }, {
 *   onChunk: (chunk) => process.stdout.write(chunk.content),
 *   onComplete: (response) => console.log('\\nDone!', response.usage)
 * });
 * ```
 */
export class DandoloClient extends EventEmitter {
  private readonly config: Required<DandoloConfig>;
  private readonly http: AxiosInstance;
  private rateLimitInfo?: RateLimitInfo;
  
  // Subclients for organized API
  public readonly chat: ChatAPI;
  public readonly models: ModelsAPI;
  public readonly streaming: DandoloStreamClient;
  public readonly workflows: WorkflowManager;
  public readonly context: ContextManager;
  public readonly agents: AgentManager;

  constructor(config: DandoloConfig) {
    super();
    
    // Validate required config
    if (!config.apiKey) {
      throw new Error('API key is required. Get yours at https://dandolo.ai/dashboard');\n    }\n    \n    // Set defaults with superior experience\n    this.config = {\n      baseURL: 'https://api.dandolo.ai',\n      timeout: 30000, // 30 seconds\n      maxRetries: 3,\n      debug: false,\n      headers: {},\n      defaultModel: 'auto-select',\n      agentEnhanced: config.apiKey.startsWith('ak_'),\n      ...config\n    };\n    \n    // Create HTTP client with enhanced configuration\n    this.http = axios.create({\n      baseURL: this.config.baseURL,\n      timeout: this.config.timeout,\n      headers: {\n        'Authorization': `Bearer ${this.config.apiKey}`,\n        'Content-Type': 'application/json',\n        'User-Agent': `@dandolo/agent-sdk/1.0.0`,\n        ...(this.config.agentId && { 'X-Agent-ID': this.config.agentId }),\n        ...this.config.headers\n      }\n    });\n    \n    // Add request/response interceptors for enhanced experience\n    this.setupInterceptors();\n    \n    // Initialize subclients\n    this.chat = new ChatAPI(this);\n    this.models = new ModelsAPI(this);\n    this.streaming = new DandoloStreamClient(this);\n    this.workflows = new WorkflowManager(this);\n    this.context = new ContextManager(this);\n    \n    // Emit ready event\n    setTimeout(() => this.emit('ready'), 0);\n  }\n  \n  /**\n   * Get the HTTP client for direct access\n   */\n  get httpClient(): AxiosInstance {\n    return this.http;\n  }\n  \n  /**\n   * Get current rate limit information\n   */\n  get rateLimit(): RateLimitInfo | undefined {\n    return this.rateLimitInfo;\n  }\n  \n  /**\n   * Check if the client is configured for agent-enhanced features\n   */\n  get isAgentEnhanced(): boolean {\n    return this.config.agentEnhanced;\n  }\n  \n  /**\n   * Get the current configuration\n   */\n  get configuration(): Readonly<Required<DandoloConfig>> {\n    return { ...this.config };\n  }\n  \n  /**\n   * Update client configuration\n   */\n  configure(updates: Partial<DandoloConfig>): void {\n    Object.assign(this.config, updates);\n    \n    // Update HTTP client headers if needed\n    if (updates.headers) {\n      Object.assign(this.http.defaults.headers, updates.headers);\n    }\n    \n    if (updates.agentId) {\n      this.http.defaults.headers['X-Agent-ID'] = updates.agentId;\n    }\n    \n    this.emit('config_updated', updates);\n  }\n  \n  /**\n   * Test the connection and API key\n   */\n  async test(): Promise<{ success: boolean; message: string; details?: any }> {\n    try {\n      const response = await this.http.get('/health');\n      return {\n        success: true,\n        message: 'Connection successful!',\n        details: response.data\n      };\n    } catch (error: any) {\n      return {\n        success: false,\n        message: error.response?.data?.error?.message || 'Connection failed',\n        details: error.response?.data\n      };\n    }\n  }\n  \n  /**\n   * Get usage and billing information\n   */\n  async usage(): Promise<{\n    daily_usage: number;\n    daily_limit: number;\n    remaining: number;\n    key_type: string;\n    reset_time: Date;\n  }> {\n    const response = await this.http.get('/api/v1/balance');\n    const data = response.data.balance;\n    \n    return {\n      daily_usage: data.used,\n      daily_limit: data.limit,\n      remaining: data.remaining,\n      key_type: data.keyType,\n      reset_time: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now\n    };\n  }\n  \n  /**\n   * Setup request/response interceptors for enhanced experience\n   */\n  private setupInterceptors(): void {\n    // Request interceptor\n    this.http.interceptors.request.use(\n      (config) => {\n        if (this.config.debug) {\n          console.log('[Dandolo SDK] Request:', {\n            method: config.method?.toUpperCase(),\n            url: config.url,\n            headers: { ...config.headers, Authorization: '[REDACTED]' }\n          });\n        }\n        \n        this.emit('request', config);\n        return config;\n      },\n      (error) => {\n        this.emit('request_error', error);\n        return Promise.reject(error);\n      }\n    );\n    \n    // Response interceptor\n    this.http.interceptors.response.use(\n      (response) => {\n        // Extract rate limit information\n        const headers = response.headers;\n        if (headers['x-ratelimit-limit']) {\n          this.rateLimitInfo = {\n            limit: parseInt(headers['x-ratelimit-limit']),\n            remaining: parseInt(headers['x-ratelimit-remaining'] || '0'),\n            reset: parseInt(headers['x-ratelimit-reset'] || '0'),\n            type: headers['x-ratelimit-type'] || 'unknown'\n          };\n        }\n        \n        if (this.config.debug) {\n          console.log('[Dandolo SDK] Response:', {\n            status: response.status,\n            headers: {\n              'x-ratelimit-remaining': headers['x-ratelimit-remaining'],\n              'x-processing-time-ms': headers['x-processing-time-ms']\n            }\n          });\n        }\n        \n        this.emit('response', response);\n        return response;\n      },\n      async (error) => {\n        const dandoloError = createDandoloError(error);\n        \n        // Enhanced error handling\n        if (isRateLimitError(dandoloError)) {\n          this.emit('rate_limit_exceeded', dandoloError);\n          \n          // Auto-retry with exponential backoff if configured\n          if (this.config.maxRetries > 0) {\n            return this.retryWithBackoff(error.config, 1);\n          }\n        }\n        \n        if (isAuthError(dandoloError)) {\n          this.emit('auth_error', dandoloError);\n        }\n        \n        this.emit('error', dandoloError);\n        \n        if (this.config.debug) {\n          console.error('[Dandolo SDK] Error:', dandoloError);\n        }\n        \n        return Promise.reject(dandoloError);\n      }\n    );\n  }\n  \n  /**\n   * Retry request with exponential backoff\n   */\n  private async retryWithBackoff(config: any, attempt: number): Promise<AxiosResponse> {\n    if (attempt > this.config.maxRetries) {\n      throw createDandoloError({ response: { status: 429, data: { error: { message: 'Max retries exceeded' } } } });\n    }\n    \n    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff\n    await new Promise(resolve => setTimeout(resolve, delay));\n    \n    try {\n      return await this.http.request(config);\n    } catch (error) {\n      return this.retryWithBackoff(config, attempt + 1);\n    }\n  }\n}\n\n/**\n * Chat API implementation\n */\nclass ChatAPI {\n  public readonly completions: ChatCompletionsAPI;\n  \n  constructor(private client: DandoloClient) {\n    this.completions = new ChatCompletionsAPI(client);\n  }\n}\n\n/**\n * Chat Completions API implementation\n */\nclass ChatCompletionsAPI {\n  constructor(private client: DandoloClient) {}\n  \n  /**\n   * Create a chat completion\n   */\n  async create(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {\n    // Enhanced request preparation\n    const enhancedRequest = this.prepareRequest(request);\n    \n    const response = await this.client.httpClient.post('/v1/chat/completions', enhancedRequest);\n    return response.data;\n  }\n  \n  /**\n   * Create a streaming chat completion\n   */\n  async stream(\n    request: ChatCompletionRequest,\n    options?: StreamingOptions\n  ): Promise<void> {\n    const enhancedRequest = {\n      ...this.prepareRequest(request),\n      stream: true\n    };\n    \n    return this.client.streaming.stream(enhancedRequest, options);\n  }\n  \n  /**\n   * Prepare request with agent enhancements\n   */\n  private prepareRequest(request: ChatCompletionRequest): any {\n    const prepared = {\n      model: request.model || this.client.configuration.defaultModel,\n      messages: request.messages,\n      temperature: request.temperature,\n      max_tokens: request.max_tokens,\n      ...request\n    };\n    \n    // Add agent enhancements if available\n    if (this.client.isAgentEnhanced) {\n      prepared.agent_options = {\n        stream_mode: 'agent_enhanced',\n        context_preservation: true,\n        instruction_parsing: true,\n        ...request.agent_options\n      };\n    }\n    \n    return prepared;\n  }\n}\n\n/**\n * Models API implementation\n */\nclass ModelsAPI {\n  constructor(private client: DandoloClient) {}\n  \n  /**\n   * List available models\n   */\n  async list(): Promise<Model[]> {\n    const response = await this.client.httpClient.get('/v1/models');\n    return response.data.data.map((model: any) => ({\n      id: model.id,\n      name: model.id,\n      type: this.inferModelType(model.id),\n      context_length: model.context_length,\n      capabilities: model.capabilities || []\n    }));\n  }\n  \n  /**\n   * Get a specific model\n   */\n  async get(modelId: string): Promise<Model> {\n    const models = await this.list();\n    const model = models.find(m => m.id === modelId);\n    \n    if (!model) {\n      throw createDandoloError({\n        response: {\n          status: 404,\n          data: {\n            error: {\n              message: `Model '${modelId}' not found`,\n              type: 'not_found_error',\n              code: 'model_not_found'\n            }\n          }\n        }\n      });\n    }\n    \n    return model;\n  }\n  \n  /**\n   * Get the best model for a specific task\n   */\n  async getBest(type: 'chat' | 'code' | 'image' | 'analysis'): Promise<Model> {\n    const models = await this.list();\n    \n    // Smart model selection based on type\n    const typeMap = {\n      chat: (m: Model) => m.type === 'text' && !m.id.includes('code'),\n      code: (m: Model) => m.id.includes('code') || m.capabilities?.includes('code'),\n      image: (m: Model) => m.type === 'image',\n      analysis: (m: Model) => (m.context_length || 0) > 100000\n    };\n    \n    const filtered = models.filter(typeMap[type]);\n    \n    if (filtered.length === 0) {\n      throw createDandoloError({\n        response: {\n          status: 404,\n          data: {\n            error: {\n              message: `No models available for type '${type}'`,\n              type: 'not_found_error',\n              code: 'no_models_for_type'\n            }\n          }\n        }\n      });\n    }\n    \n    // Return the first suitable model\n    return filtered[0];\n  }\n  \n  /**\n   * Infer model type from model ID\n   */\n  private inferModelType(modelId: string): 'text' | 'code' | 'image' | 'multimodal' | 'audio' {\n    if (modelId.includes('image') || modelId.includes('dall') || modelId.includes('flux')) {\n      return 'image';\n    }\n    if (modelId.includes('code') || modelId.includes('codex')) {\n      return 'code';\n    }\n    if (modelId.includes('vision') || modelId.includes('multimodal')) {\n      return 'multimodal';\n    }\n    if (modelId.includes('tts') || modelId.includes('audio')) {\n      return 'audio';\n    }\n    return 'text';\n  }\n}\n\n// Export the client as default\nexport default DandoloClient;"}