/**
 * OpenAI API Compatibility Adapter for Dandolo SDK
 * 
 * Provides drop-in replacement for OpenAI SDK with enhanced
 * capabilities through Dandolo's superior agent system.
 */

import { EventEmitter } from 'eventemitter3';
import {
  ChatMessage,
  ChatCompletionRequest as DandoloChatRequest,
  ChatCompletionResponse as DandoloChatResponse,
  StreamingOptions,
  AgentInstruction
} from '../types';
import { DandoloClient } from '../client';
import { createDandoloError } from '../errors';

// OpenAI-compatible interfaces
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  functions?: OpenAIFunction[];
  function_call?: 'none' | 'auto' | { name: string };
}

export interface OpenAIChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
      function_call?: {
        name: string;
        arguments: string;
      };
    };
    finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIFunction {
  name: string;
  description?: string;
  parameters: Record<string, any>;
}

export interface OpenAIStreamingChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
      function_call?: {
        name?: string;
        arguments?: string;
      };
    };
    finish_reason?: 'stop' | 'length' | 'function_call' | 'content_filter';
  }>;
}

/**
 * OpenAI-compatible adapter that provides enhanced functionality
 * through Dandolo's superior agent system
 */
export class DandoloOpenAIAdapter {
  private client: DandoloClient;

  constructor(client: DandoloClient) {
    this.client = client;
  }

  /**
   * OpenAI-compatible chat completions endpoint
   */
  get chat() {
    return {
      completions: {
        create: this.createChatCompletion.bind(this)
      }
    };
  }

  /**
   * OpenAI-compatible models endpoint
   */
  get models() {
    return {
      list: this.listModels.bind(this),
      retrieve: this.retrieveModel.bind(this)
    };
  }

  /**
   * Create chat completion with OpenAI compatibility
   */
  async createChatCompletion(
    request: OpenAIChatCompletionRequest,
    options?: {
      signal?: AbortSignal;
    }
  ): Promise<OpenAIChatCompletionResponse> {
    try {
      // Convert OpenAI request to Dandolo format
      const dandoloRequest = this.convertRequestToDandolo(request);

      // Handle streaming
      if (request.stream) {
        throw new Error('Use createChatCompletionStream for streaming requests');
      }

      // Make request to Dandolo API
      const response = await this.client.chat.completions.create(dandoloRequest);

      // Convert response to OpenAI format
      return this.convertResponseToOpenAI(response, request);

    } catch (error) {
      throw this.convertErrorToOpenAI(error);
    }
  }

  /**
   * Create streaming chat completion
   */
  async createChatCompletionStream(
    request: OpenAIChatCompletionRequest,
    callbacks?: {
      onChunk?: (chunk: OpenAIStreamingChunk) => void;
      onComplete?: (response: OpenAIChatCompletionResponse) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    try {
      const dandoloRequest = {
        ...this.convertRequestToDandolo(request),
        stream: true
      };

      let fullContent = '';
      let chunkId = `chatcmpl-${Date.now()}`;

      const streamingOptions: StreamingOptions = {
        onChunk: (chunk) => {
          if (chunk.content) {
            fullContent += chunk.content;

            const openaiChunk: OpenAIStreamingChunk = {
              id: chunkId,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: request.model,
              choices: [{
                index: 0,
                delta: {
                  role: 'assistant',
                  content: chunk.content
                },
                finish_reason: chunk.done ? 'stop' : undefined
              }]
            };

            callbacks?.onChunk?.(openaiChunk);
          }
        },
        onComplete: (response) => {
          const openaiResponse = this.convertResponseToOpenAI(response, request);
          callbacks?.onComplete?.(openaiResponse);
        },
        onError: (error) => {
          callbacks?.onError?.(this.convertErrorToOpenAI(error));
        }
      };

      await this.client.chat.completions.stream(dandoloRequest, streamingOptions);

    } catch (error) {
      callbacks?.onError?.(this.convertErrorToOpenAI(error));
      throw this.convertErrorToOpenAI(error);
    }
  }

  /**
   * List available models (OpenAI compatible)
   */
  async listModels(): Promise<{
    object: 'list';
    data: Array<{
      id: string;
      object: 'model';
      created: number;
      owned_by: string;
      permission: any[];
      root: string;
      parent: null;
    }>;
  }> {
    const models = await this.client.models.list();
    
    return {
      object: 'list',
      data: models.map(model => ({
        id: model.id,
        object: 'model' as const,
        created: Math.floor(Date.now() / 1000),
        owned_by: 'dandolo',
        permission: [],
        root: model.id,
        parent: null
      }))
    };
  }

  /**
   * Retrieve specific model (OpenAI compatible)
   */
  async retrieveModel(modelId: string): Promise<{
    id: string;
    object: 'model';
    created: number;
    owned_by: string;
    permission: any[];
    root: string;
    parent: null;
  }> {
    const model = await this.client.models.get(modelId);
    
    return {
      id: model.id,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'dandolo',
      permission: [],
      root: model.id,
      parent: null
    };
  }

  /**
   * Create a drop-in replacement for the OpenAI client
   */
  createOpenAIClient(): OpenAICompatibleClient {
    return new OpenAICompatibleClient(this);
  }

  private convertRequestToDandolo(request: OpenAIChatCompletionRequest): DandoloChatRequest {
    // Convert messages
    const messages: ChatMessage[] = request.messages.map(msg => ({
      role: msg.role === 'function' ? 'assistant' : msg.role as any,
      content: msg.content || ''
    }));

    // Create agent instructions for enhanced features
    const instructions: AgentInstruction[] = [];

    // Add function calling instructions if present
    if (request.functions && request.functions.length > 0) {
      instructions.push({
        type: 'tool_use',
        content: 'Use the provided functions when appropriate to help answer the user\'s question.',
        metadata: {
          tools: request.functions.map(f => f.name)
        }
      });
    }

    // Add user-specific instructions
    if (request.user) {
      instructions.push({
        type: 'context_injection',
        content: `User ID: ${request.user}`,
        metadata: {
          user_id: request.user
        }
      });
    }

    return {
      model: request.model,
      messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      instructions: instructions.length > 0 ? instructions : undefined,
      agent_options: {
        stream_mode: request.stream ? 'agent_enhanced' : 'standard',
        context_preservation: true,
        instruction_parsing: true
      }
    };
  }

  private convertResponseToOpenAI(
    response: DandoloChatResponse,
    originalRequest: OpenAIChatCompletionRequest
  ): OpenAIChatCompletionResponse {
    return {
      id: response.id,
      object: 'chat.completion',
      created: response.created,
      model: response.model,
      choices: response.choices.map(choice => ({
        index: choice.index,
        message: {
          role: 'assistant',
          content: choice.message.content
        },
        finish_reason: choice.finish_reason
      })),
      usage: response.usage
    };
  }

  private convertErrorToOpenAI(error: any): Error {
    const dandoloError = createDandoloError(error);
    
    // Create OpenAI-style error
    const openaiError = new Error(dandoloError.message);
    (openaiError as any).type = dandoloError.type;
    (openaiError as any).code = dandoloError.code;
    (openaiError as any).status = dandoloError.status;
    
    return openaiError;
  }
}

/**
 * OpenAI-compatible client class that can be used as a drop-in replacement
 */
export class OpenAICompatibleClient {
  public readonly chat: {
    completions: {
      create: (request: OpenAIChatCompletionRequest) => Promise<OpenAIChatCompletionResponse>;
    };
  };

  public readonly models: {
    list: () => Promise<any>;
    retrieve: (modelId: string) => Promise<any>;
  };

  constructor(private adapter: DandoloOpenAIAdapter) {
    this.chat = {
      completions: {
        create: this.adapter.createChatCompletion.bind(this.adapter)
      }
    };

    this.models = {
      list: this.adapter.listModels.bind(this.adapter),
      retrieve: this.adapter.retrieveModel.bind(this.adapter)
    };
  }
}

/**
 * Factory function to create OpenAI-compatible client
 */
export function createOpenAIClient(dandoloClient: DandoloClient): OpenAICompatibleClient {
  const adapter = new DandoloOpenAIAdapter(dandoloClient);
  return adapter.createOpenAIClient();
}

/**
 * Migration helper for existing OpenAI codebases
 */
export class OpenAIMigrationHelper {
  static createCompatibilityGuide(): string {
    return `
# Migrating from OpenAI to Dandolo

## 1. Install Dandolo SDK
\`\`\`bash
npm install @dandolo/agent-sdk
\`\`\`

## 2. Replace OpenAI client initialization
\`\`\`javascript
// Before (OpenAI)
import { OpenAI } from 'openai';
const openai = new OpenAI({ apiKey: 'sk-...' });

// After (Dandolo with OpenAI compatibility)
import Dandolo, { createOpenAIClient } from '@dandolo/agent-sdk';
const dandolo = new Dandolo({ apiKey: 'ak_...' });
const openai = createOpenAIClient(dandolo);
\`\`\`

## 3. Your existing code works unchanged!
\`\`\`javascript
// This code works with both OpenAI and Dandolo
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});
\`\`\`

## Enhanced Features Available
- Superior streaming performance
- Advanced agent instructions
- Context management
- Workflow orchestration
- Real-time capabilities
`;
  }

  static validateMigration(code: string): {
    compatible: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for OpenAI-specific features that might need attention
    if (code.includes('openai.embeddings')) {
      issues.push('Embeddings API not yet available in Dandolo');
      suggestions.push('Consider using alternative embedding solutions temporarily');
    }

    if (code.includes('openai.files')) {
      issues.push('Files API not available in Dandolo');
      suggestions.push('Use direct file handling or cloud storage solutions');
    }

    if (code.includes('openai.fine_tuning')) {
      issues.push('Fine-tuning API not available in Dandolo');
      suggestions.push('Use agent instructions for customization instead');
    }

    // Check for features that can be enhanced
    if (code.includes('stream: true')) {
      suggestions.push('Consider using Dandolo\'s enhanced streaming features');
    }

    if (code.includes('functions:')) {
      suggestions.push('Upgrade to Dandolo agent instructions for more powerful tool use');
    }

    return {
      compatible: issues.length === 0,
      issues,
      suggestions
    };
  }
}

export default DandoloOpenAIAdapter;