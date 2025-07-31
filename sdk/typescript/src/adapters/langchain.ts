/**
 * LangChain Adapter for Dandolo SDK
 * 
 * Provides full compatibility with LangChain while leveraging
 * Dandolo's superior agent capabilities and performance.
 */

import { EventEmitter } from 'eventemitter3';
import {
  ChatMessage,
  EnhancedChatMessage,
  ChatCompletionRequest,
  StreamingOptions,
  AgentInstruction,
  ConversationContext
} from '../types';
import { DandoloClient } from '../client';
import { createDandoloError } from '../errors';

// LangChain-compatible interfaces
export interface LangChainMessage {
  role: 'system' | 'human' | 'ai' | 'function';
  content: string;
  additional_kwargs?: Record<string, any>;
  example?: boolean;
}

export interface LangChainChatResult {
  generations: Array<{
    text: string;
    message: LangChainMessage;
    generation_info?: Record<string, any>;
  }>;
  llm_output?: Record<string, any>;
}

export interface LangChainCallbacks {
  onLLMStart?: (serialized: any, prompts: string[], ...args: any[]) => void;
  onLLMNewToken?: (token: string, ...args: any[]) => void;
  onLLMEnd?: (response: LangChainChatResult, ...args: any[]) => void;
  onLLMError?: (error: Error, ...args: any[]) => void;
}

/**
 * LangChain-compatible adapter that provides superior functionality
 * through Dandolo's enhanced agent system
 */
export class DandoloLangChainAdapter extends EventEmitter {
  private client: DandoloClient;
  private callbacks?: LangChainCallbacks;
  private contextManager: Map<string, ConversationContext> = new Map();

  constructor(client: DandoloClient, callbacks?: LangChainCallbacks) {
    super();
    this.client = client;
    this.callbacks = callbacks;
  }

  /**
   * LangChain-compatible chat method with enhanced capabilities
   */
  async call(
    messages: LangChainMessage[],
    options?: {
      temperature?: number;
      max_tokens?: number;
      model?: string;
      stop?: string[];
      streaming?: boolean;
      context_id?: string;
      agent_instructions?: AgentInstruction[];
    }
  ): Promise<LangChainChatResult> {
    try {
      // Convert LangChain messages to Dandolo format
      const dandoloMessages = this.convertFromLangChain(messages);

      // Prepare request
      const request: ChatCompletionRequest = {
        messages: dandoloMessages,
        model: options?.model || this.client.configuration.defaultModel,
        temperature: options?.temperature,
        max_tokens: options?.max_tokens,
        instructions: options?.agent_instructions,
        context_id: options?.context_id
      };

      // Trigger LangChain callbacks
      this.callbacks?.onLLMStart?.(
        { _type: 'dandolo_chat_model' },
        messages.map(m => m.content)
      );

      // Make request
      const response = await this.client.chat.completions.create(request);

      // Convert response to LangChain format
      const result: LangChainChatResult = {
        generations: [{
          text: response.choices[0]?.message.content || '',
          message: {
            role: 'ai',
            content: response.choices[0]?.message.content || ''
          },
          generation_info: {
            finish_reason: response.choices[0]?.finish_reason,
            model: response.model,
            usage: response.usage,
            dandolo_agent: response.dandolo_agent
          }
        }],
        llm_output: {
          token_usage: response.usage,
          model_name: response.model,
          dandolo_enhanced: this.client.isAgentEnhanced
        }
      };

      // Trigger success callback
      this.callbacks?.onLLMEnd?.(result);

      return result;

    } catch (error) {
      const dandoloError = createDandoloError(error);
      this.callbacks?.onLLMError?.(new Error(dandoloError.message));
      throw error;
    }
  }

  /**
   * LangChain-compatible streaming with enhanced real-time capabilities
   */
  async stream(
    messages: LangChainMessage[],
    options?: {
      temperature?: number;
      max_tokens?: number;
      model?: string;
      context_id?: string;
      agent_instructions?: AgentInstruction[];
      onToken?: (token: string) => void;
      onComplete?: (result: LangChainChatResult) => void;
    }
  ): Promise<void> {
    try {
      const dandoloMessages = this.convertFromLangChain(messages);

      const request: ChatCompletionRequest = {
        messages: dandoloMessages,
        model: options?.model || this.client.configuration.defaultModel,
        temperature: options?.temperature,
        max_tokens: options?.max_tokens,
        instructions: options?.agent_instructions,
        context_id: options?.context_id,
        stream: true
      };

      // Trigger start callback
      this.callbacks?.onLLMStart?.(
        { _type: 'dandolo_chat_model' },
        messages.map(m => m.content)
      );

      let fullResponse = '';

      const streamingOptions: StreamingOptions = {
        onChunk: (chunk) => {
          if (chunk.content) {
            fullResponse += chunk.content;
            this.callbacks?.onLLMNewToken?.(chunk.content);
            options?.onToken?.(chunk.content);
          }
        },
        onComplete: (response) => {
          const result: LangChainChatResult = {
            generations: [{
              text: fullResponse,
              message: {
                role: 'ai',
                content: fullResponse
              },
              generation_info: {
                finish_reason: response.choices[0]?.finish_reason,
                model: response.model,
                usage: response.usage,
                dandolo_agent: response.dandolo_agent
              }
            }],
            llm_output: {
              token_usage: response.usage,
              model_name: response.model,
              streaming: true
            }
          };

          this.callbacks?.onLLMEnd?.(result);
          options?.onComplete?.(result);
        },
        onError: (error) => {
          this.callbacks?.onLLMError?.(new Error(error.message));
        }
      };

      await this.client.chat.completions.stream(request, streamingOptions);

    } catch (error) {
      const dandoloError = createDandoloError(error);
      this.callbacks?.onLLMError?.(new Error(dandoloError.message));
      throw error;
    }
  }

  /**
   * Create a conversation chain with context management
   */
  createChain(options?: {
    context_id?: string;
    agent_instructions?: AgentInstruction[];
    memory_enabled?: boolean;
  }): LangChainConversationChain {
    const contextId = options?.context_id || `langchain_${Date.now()}`;
    
    if (!this.contextManager.has(contextId)) {
      const context = this.client.context.createContext({
        max_messages: 50,
        auto_summarize: true
      });
      this.contextManager.set(contextId, context);
    }

    return new LangChainConversationChain(this, contextId, options);
  }

  /**
   * Create an agent executor with enhanced capabilities
   */
  createAgentExecutor(tools: LangChainTool[], options?: {
    agent_instructions?: AgentInstruction[];
    max_iterations?: number;
    early_stopping_method?: 'force' | 'generate';
  }): LangChainAgentExecutor {
    return new LangChainAgentExecutor(this, tools, options);
  }

  /**
   * Convert Dandolo messages to LangChain format
   */
  convertToLangChain(messages: ChatMessage[]): LangChainMessage[] {
    return messages.map(message => ({
      role: this.mapRoleToLangChain(message.role),
      content: message.content,
      additional_kwargs: {
        agent_instruction: message.agent_instruction,
        context_id: message.context_id,
        thread_id: message.thread_id
      }
    }));
  }

  /**
   * Convert LangChain messages to Dandolo format
   */
  convertFromLangChain(messages: LangChainMessage[]): ChatMessage[] {
    return messages.map(message => ({
      role: this.mapRoleFromLangChain(message.role),
      content: message.content,
      agent_instruction: message.additional_kwargs?.agent_instruction,
      context_id: message.additional_kwargs?.context_id,
      thread_id: message.additional_kwargs?.thread_id
    }));
  }

  private mapRoleToLangChain(role: string): 'system' | 'human' | 'ai' | 'function' {
    switch (role) {
      case 'system': return 'system';
      case 'user': return 'human';
      case 'assistant': return 'ai';
      default: return 'human';
    }
  }

  private mapRoleFromLangChain(role: string): 'system' | 'user' | 'assistant' {
    switch (role) {
      case 'system': return 'system';
      case 'human': return 'user';
      case 'ai': return 'assistant';
      case 'function': return 'assistant';
      default: return 'user';
    }
  }
}

/**
 * LangChain-compatible conversation chain with enhanced context management
 */
export class LangChainConversationChain {
  private history: LangChainMessage[] = [];

  constructor(
    private adapter: DandoloLangChainAdapter,
    private contextId: string,
    private options?: {
      agent_instructions?: AgentInstruction[];
      memory_enabled?: boolean;
    }
  ) {}

  async predict(input: string, options?: {
    temperature?: number;
    max_tokens?: number;
  }): Promise<string> {
    const message: LangChainMessage = {
      role: 'human',
      content: input
    };

    this.history.push(message);

    const result = await this.adapter.call([...this.history], {
      ...options,
      context_id: this.contextId,
      agent_instructions: this.options?.agent_instructions
    });

    const response = result.generations[0]?.text || '';
    
    this.history.push({
      role: 'ai',
      content: response
    });

    return response;
  }

  async predictStream(input: string, options?: {
    temperature?: number;
    max_tokens?: number;
    onToken?: (token: string) => void;
  }): Promise<string> {
    const message: LangChainMessage = {
      role: 'human',
      content: input
    };

    this.history.push(message);

    let fullResponse = '';

    await this.adapter.stream([...this.history], {
      ...options,
      context_id: this.contextId,
      agent_instructions: this.options?.agent_instructions,
      onToken: (token) => {
        fullResponse += token;
        options?.onToken?.(token);
      }
    });

    this.history.push({
      role: 'ai',
      content: fullResponse
    });

    return fullResponse;
  }

  getHistory(): LangChainMessage[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}

/**
 * LangChain-compatible tool interface
 */
export interface LangChainTool {
  name: string;
  description: string;
  schema?: Record<string, any>;
  call: (input: string) => Promise<string> | string;
}

/**
 * LangChain-compatible agent executor with enhanced capabilities
 */
export class LangChainAgentExecutor {
  private tools: Map<string, LangChainTool> = new Map();

  constructor(
    private adapter: DandoloLangChainAdapter,
    tools: LangChainTool[],
    private options?: {
      agent_instructions?: AgentInstruction[];
      max_iterations?: number;
      early_stopping_method?: 'force' | 'generate';
    }
  ) {
    tools.forEach(tool => {
      this.tools.set(tool.name, tool);
    });
  }

  async run(input: string): Promise<string> {
    const maxIterations = this.options?.max_iterations || 10;
    let iteration = 0;
    let currentInput = input;

    const messages: LangChainMessage[] = [
      {
        role: 'system',
        content: this.createSystemPrompt()
      },
      {
        role: 'human',
        content: currentInput
      }
    ];

    while (iteration < maxIterations) {
      const result = await this.adapter.call(messages, {
        agent_instructions: this.options?.agent_instructions,
        temperature: 0.1 // Lower temperature for more consistent tool use
      });

      const response = result.generations[0]?.text || '';
      
      // Check if the agent wants to use a tool
      const toolCall = this.parseToolCall(response);
      
      if (toolCall) {
        const tool = this.tools.get(toolCall.tool);
        if (tool) {
          try {
            const toolResult = await tool.call(toolCall.input);
            messages.push({
              role: 'ai',
              content: response
            });
            messages.push({
              role: 'function',
              content: `Tool "${toolCall.tool}" returned: ${toolResult}`
            });
          } catch (error) {
            messages.push({
              role: 'function',
              content: `Tool "${toolCall.tool}" failed: ${error}`
            });
          }
        } else {
          messages.push({
            role: 'function',
            content: `Tool "${toolCall.tool}" not found`
          });
        }
      } else {
        // No tool call, return the response
        return response;
      }

      iteration++;
    }

    // Max iterations reached
    if (this.options?.early_stopping_method === 'force') {
      return "Maximum iterations reached. Unable to complete the task.";
    } else {
      // Generate final response
      const finalResult = await this.adapter.call([
        ...messages,
        {
          role: 'human',
          content: "Please provide a final answer based on the information gathered."
        }
      ]);
      return finalResult.generations[0]?.text || "Unable to generate final response.";
    }
  }

  private createSystemPrompt(): string {
    const toolDescriptions = Array.from(this.tools.values())
      .map(tool => `- ${tool.name}: ${tool.description}`)
      .join('\n');

    return `You are a helpful assistant with access to the following tools:

${toolDescriptions}

To use a tool, format your response as:
Action: [tool_name]
Action Input: [input_for_tool]

When you have enough information to answer the user's question, provide a final answer without using any tools.`;
  }

  private parseToolCall(response: string): { tool: string; input: string } | null {
    const actionMatch = response.match(/Action:\s*(.+)/i);
    const inputMatch = response.match(/Action Input:\s*(.+)/i);

    if (actionMatch && inputMatch) {
      return {
        tool: actionMatch[1].trim(),
        input: inputMatch[1].trim()
      };
    }

    return null;
  }
}

/**
 * Create LangChain-compatible embeddings (if needed)
 */
export class DandoloLangChainEmbeddings {
  constructor(private client: DandoloClient) {}

  async embedDocuments(documents: string[]): Promise<number[][]> {
    // Note: This would require embedding endpoint in Dandolo API
    throw new Error('Embeddings not yet implemented in Dandolo API');
  }

  async embedQuery(query: string): Promise<number[]> {
    // Note: This would require embedding endpoint in Dandolo API
    throw new Error('Embeddings not yet implemented in Dandolo API');
  }
}

export default DandoloLangChainAdapter;