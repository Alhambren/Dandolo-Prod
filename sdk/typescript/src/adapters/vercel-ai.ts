/**
 * Vercel AI SDK Compatibility Adapter for Dandolo SDK
 * 
 * Provides seamless integration with Vercel AI SDK patterns
 * while leveraging Dandolo's superior streaming and agent capabilities.
 */

import { EventEmitter } from 'eventemitter3';
import {
  ChatMessage,
  StreamingChunk,
  ChatCompletionRequest,
  AgentInstruction
} from '../types';
import { DandoloClient } from '../client';
import { createDandoloError } from '../errors';

// Vercel AI SDK compatible interfaces
export interface VercelMessage {
  id?: string;
  role: 'system' | 'user' | 'assistant' | 'function' | 'data' | 'tool';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  data?: any;
}

export interface VercelChatRequest {
  messages: VercelMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  functions?: VercelFunction[];
  function_call?: 'none' | 'auto' | { name: string };
  tools?: VercelTool[];
  tool_choice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };
}

export interface VercelFunction {
  name: string;
  description?: string;
  parameters: Record<string, any>;
}

export interface VercelTool {
  type: 'function';
  function: VercelFunction;
}

export interface VercelStreamingResponse {
  data: string;
  annotations?: Array<{
    type: string;
    data: any;
  }>;
}

export interface VercelChatCompletion {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: VercelMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Vercel AI SDK compatibility adapter with enhanced streaming
 */
export class DandoloVercelAIAdapter extends EventEmitter {
  constructor(private client: DandoloClient) {
    super();
  }

  /**
   * Create a streaming response compatible with Vercel AI SDK
   */
  async createStreamingResponse(
    request: VercelChatRequest,
    options?: {
      onStart?: () => void;
      onToken?: (token: string) => void;
      onCompletion?: (completion: string) => void;
      onFinalMessage?: (message: VercelMessage) => void;
    }
  ): Promise<ReadableStream<Uint8Array>> {
    const dandoloRequest = this.convertRequestToDandolo(request);
    
    return new ReadableStream({
      async start(controller) {
        try {
          options?.onStart?.();
          
          let fullContent = '';
          
          await this.client.chat.completions.stream(dandoloRequest, {
            onChunk: (chunk: StreamingChunk) => {
              if (chunk.content) {
                fullContent += chunk.content;
                options?.onToken?.(chunk.content);
                
                // Send data in Vercel AI format
                const vercelData: VercelStreamingResponse = {
                  data: chunk.content
                };
                
                if (chunk.agent_metadata) {
                  vercelData.annotations = [{
                    type: 'agent_metadata',
                    data: chunk.agent_metadata
                  }];
                }
                
                const encodedData = new TextEncoder().encode(
                  `data: ${JSON.stringify(vercelData)}\n\n`
                );
                controller.enqueue(encodedData);
              }
              
              if (chunk.done) {
                options?.onCompletion?.(fullContent);
                
                const finalMessage: VercelMessage = {
                  id: `msg_${Date.now()}`,
                  role: 'assistant',
                  content: fullContent
                };
                
                options?.onFinalMessage?.(finalMessage);
                
                // Send final data
                controller.enqueue(
                  new TextEncoder().encode(`data: [DONE]\n\n`)
                );
                controller.close();
              }
            },
            onError: (error) => {
              controller.error(error);
            }
          });
          
        } catch (error) {
          controller.error(error);
        }
      }
    });
  }

  /**
   * Create a non-streaming response compatible with Vercel AI SDK
   */
  async createCompletion(request: VercelChatRequest): Promise<VercelChatCompletion> {
    const dandoloRequest = this.convertRequestToDandolo(request);
    
    const response = await this.client.chat.completions.create(dandoloRequest);
    
    return this.convertResponseToVercel(response, request);
  }

  /**
   * Create a chat hook compatible with Vercel AI SDK patterns
   */
  createChatHook(initialMessages?: VercelMessage[]) {
    let messages = initialMessages || [];
    let isLoading = false;
    let error: Error | null = null;
    
    const sendMessage = async (
      content: string,
      options?: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
        onResponse?: (response: string) => void;
      }
    ): Promise<void> => {
      isLoading = true;
      error = null;
      
      try {
        // Add user message
        const userMessage: VercelMessage = {
          id: `user_${Date.now()}`,
          role: 'user',
          content
        };
        messages.push(userMessage);
        
        // Create request
        const request: VercelChatRequest = {
          messages,
          model: options?.model,
          temperature: options?.temperature,
          max_tokens: options?.max_tokens,
          stream: true
        };
        
        let assistantContent = '';
        
        await this.createStreamingResponse(request, {
          onToken: (token) => {
            assistantContent += token;
          },
          onFinalMessage: (message) => {
            messages.push(message);
            options?.onResponse?.(assistantContent);
          }
        });
        
      } catch (err) {
        error = err as Error;
      } finally {
        isLoading = false;
      }
    };
    
    const reload = async () => {
      if (messages.length === 0) return;
      
      // Remove last assistant message and regenerate
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        messages.pop();
      }
      
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMessage) {
        await sendMessage(lastUserMessage.content);
      }
    };
    
    const stop = () => {
      // Implementation would depend on abort controller
      isLoading = false;
    };
    
    const setMessages = (newMessages: VercelMessage[]) => {
      messages = [...newMessages];
    };
    
    return {
      messages,
      sendMessage,
      reload,
      stop,
      setMessages,
      isLoading: () => isLoading,
      error: () => error
    };
  }

  /**
   * Create a completion hook for one-off generations
   */
  createCompletionHook() {
    let isLoading = false;
    let error: Error | null = null;
    let completion = '';
    
    const complete = async (
      prompt: string,
      options?: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
      }
    ): Promise<string> => {
      isLoading = true;
      error = null;
      completion = '';
      
      try {
        const request: VercelChatRequest = {
          messages: [{ role: 'user', content: prompt }],
          model: options?.model,
          temperature: options?.temperature,
          max_tokens: options?.max_tokens
        };
        
        const response = await this.createCompletion(request);
        completion = response.choices[0]?.message.content || '';
        
        return completion;
        
      } catch (err) {
        error = err as Error;
        throw err;
      } finally {
        isLoading = false;
      }
    };
    
    const stop = () => {
      isLoading = false;
    };
    
    return {
      complete,
      completion: () => completion,
      isLoading: () => isLoading,
      error: () => error,
      stop
    };
  }

  /**
   * Create React hooks for use with Next.js/React applications
   */
  createReactHooks() {
    return {
      useChat: (config?: {
        initialMessages?: VercelMessage[];
        onResponse?: (response: string) => void;
        onError?: (error: Error) => void;
      }) => {
        const chatHook = this.createChatHook(config?.initialMessages);
        
        return {
          messages: chatHook.messages,
          input: '',
          handleInputChange: (e: { target: { value: string } }) => {
            // This would be handled by React state in actual implementation
          },
          handleSubmit: async (e?: { preventDefault?: () => void }) => {
            e?.preventDefault?.();
            // Get input value from React state and send
            await chatHook.sendMessage('', {
              onResponse: config?.onResponse
            });
          },
          isLoading: chatHook.isLoading(),
          error: chatHook.error(),
          reload: chatHook.reload,
          stop: chatHook.stop,
          setMessages: chatHook.setMessages
        };
      },

      useCompletion: (config?: {
        onResponse?: (response: string) => void;
        onError?: (error: Error) => void;
      }) => {
        const completionHook = this.createCompletionHook();
        
        return {
          completion: completionHook.completion(),
          complete: completionHook.complete,
          isLoading: completionHook.isLoading(),
          error: completionHook.error(),
          stop: completionHook.stop
        };
      }
    };
  }

  /**
   * Create OpenAI-compatible streaming function for Vercel AI
   */
  createOpenAIStream(request: VercelChatRequest): ReadableStream<Uint8Array> {
    return this.createStreamingResponse(request);
  }

  /**
   * Create a tool-calling compatible interface
   */
  async createToolResponse(
    request: VercelChatRequest & {
      tool_calls?: Array<{
        id: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    }
  ): Promise<VercelChatCompletion> {
    // Convert tool calls to agent instructions
    const instructions: AgentInstruction[] = [];
    
    if (request.tools) {
      instructions.push({
        type: 'tool_use',
        content: 'Use the provided tools when appropriate to help answer the user\'s question.',
        metadata: {
          tools: request.tools.map(t => t.function.name)
        }
      });
    }

    const dandoloRequest = {
      ...this.convertRequestToDandolo(request),
      instructions
    };

    const response = await this.client.chat.completions.create(dandoloRequest);
    return this.convertResponseToVercel(response, request);
  }

  private convertRequestToDandolo(request: VercelChatRequest): ChatCompletionRequest {
    const messages: ChatMessage[] = request.messages
      .filter(msg => ['system', 'user', 'assistant'].includes(msg.role))
      .map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      }));

    return {
      messages,
      model: request.model || this.client.configuration.defaultModel,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      stream: request.stream
    };
  }

  private convertResponseToVercel(
    response: any,
    originalRequest: VercelChatRequest
  ): VercelChatCompletion {
    return {
      id: response.id,
      object: 'chat.completion',
      created: response.created,
      model: response.model,
      choices: response.choices.map((choice: any) => ({
        index: choice.index,
        message: {
          role: 'assistant',
          content: choice.message.content
        } as VercelMessage,
        finish_reason: choice.finish_reason
      })),
      usage: response.usage
    };
  }
}

/**
 * Create Vercel AI compatible response helpers
 */
export class VercelAIResponseHelpers {
  /**
   * Create a streaming text response
   */
  static streamingTextResponse(
    stream: ReadableStream<Uint8Array>,
    init?: ResponseInit
  ): Response {
    return new Response(stream, {
      ...init,
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        ...init?.headers
      }
    });
  }

  /**
   * Create a JSON response
   */
  static jsonResponse(data: any, init?: ResponseInit): Response {
    return new Response(JSON.stringify(data), {
      ...init,
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers
      }
    });
  }

  /**
   * Create an error response
   */
  static errorResponse(error: string, status = 400): Response {
    return new Response(JSON.stringify({ error }), {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * Factory function to create Vercel AI compatible client
 */
export function createVercelAIClient(dandoloClient: DandoloClient): DandoloVercelAIAdapter {
  return new DandoloVercelAIAdapter(dandoloClient);
}

/**
 * Next.js API route helper
 */
export function createNextJSHandler(dandoloClient: DandoloClient) {
  const adapter = new DandoloVercelAIAdapter(dandoloClient);
  
  return async function handler(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
      return VercelAIResponseHelpers.errorResponse('Method not allowed', 405);
    }

    try {
      const body = await req.json() as VercelChatRequest;
      
      if (body.stream) {
        const stream = await adapter.createStreamingResponse(body);
        return VercelAIResponseHelpers.streamingTextResponse(stream);
      } else {
        const completion = await adapter.createCompletion(body);
        return VercelAIResponseHelpers.jsonResponse(completion);
      }
    } catch (error) {
      console.error('API route error:', error);
      return VercelAIResponseHelpers.errorResponse('Internal server error', 500);
    }
  };
}

export default DandoloVercelAIAdapter;