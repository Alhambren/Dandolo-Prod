// Dandolo API Client with fallback support
export interface DandoloAPIConfig {
  primary: string;
  fallback: string;
  timeout: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
  venice_parameters?: {
    character_slug?: string;
    system_prompt?: string;
    custom_parameters?: any;
  };
  allowAdultContent?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// API configuration with new primary endpoint and legacy fallback
const API_CONFIG: DandoloAPIConfig = {
  primary: 'https://api.dandolo.ai/v1',
  fallback: 'https://dandolo-prod.vercel.app/api/v1', // Legacy endpoint
  timeout: 30000
};

export class DandoloAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public type?: string
  ) {
    super(message);
    this.name = 'DandoloAPIError';
  }
}

export class DandoloAPIClient {
  private config: DandoloAPIConfig;

  constructor(config?: Partial<DandoloAPIConfig>) {
    this.config = { ...API_CONFIG, ...config };
  }

  /**
   * Call the Dandolo API with automatic fallback
   */
  async chatCompletions(
    payload: ChatCompletionRequest,
    apiKey: string
  ): Promise<ChatCompletionResponse> {
    const endpoints = [this.config.primary, this.config.fallback];
    const errors: Error[] = [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await this.makeRequest(
          `${endpoint}/chat/completions`,
          payload,
          apiKey
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // Add response tracking headers if available
          const responseTime = response.headers.get('X-Response-Time');
          const endpointUsed = response.headers.get('X-Dandolo-Endpoint');
          
          console.log(`[DandoloAPI] Success via ${endpointUsed || endpoint}`, {
            responseTime: responseTime ? `${responseTime}ms` : 'unknown',
            model: payload.model,
            character: payload.venice_parameters?.character_slug
          });
          
          return data;
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new DandoloAPIError(
            errorData.error?.message || `HTTP ${response.status}`,
            response.status,
            errorData.error?.code,
            errorData.error?.type
          );
        }
      } catch (error) {
        console.error(`[DandoloAPI] Failed to reach ${endpoint}:`, error);
        errors.push(error as Error);
        
        // If this is the last endpoint, don't continue
        if (endpoint === endpoints[endpoints.length - 1]) {
          break;
        }
        
        // Wait a bit before trying fallback
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // All endpoints failed
    throw new DandoloAPIError(
      `All API endpoints failed. Errors: ${errors.map(e => e.message).join(', ')}`,
      503,
      'all_endpoints_failed',
      'network_error'
    );
  }

  /**
   * Make a request with timeout and proper headers
   */
  private async makeRequest(
    url: string,
    payload: ChatCompletionRequest,
    apiKey: string
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'Dandolo-Frontend/1.0.0'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get available models from the API
   */
  async getModels(apiKey: string): Promise<any[]> {
    const endpoints = [this.config.primary, this.config.fallback];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${endpoint}/models`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });
        
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error(`Failed to get models from ${endpoint}:`, error);
      }
    }
    
    throw new DandoloAPIError('Failed to get models from all endpoints');
  }

  /**
   * Check API key balance and usage
   */
  async getBalance(apiKey: string): Promise<any> {
    const endpoints = [this.config.primary, this.config.fallback];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${endpoint}/balance`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });
        
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error(`Failed to get balance from ${endpoint}:`, error);
      }
    }
    
    throw new DandoloAPIError('Failed to get balance from all endpoints');
  }

  /**
   * Test API connection and key validity
   */
  async testConnection(apiKey: string): Promise<{
    success: boolean;
    endpoint: string;
    responseTime: number;
    error?: string;
  }> {
    const testPayload: ChatCompletionRequest = {
      messages: [{ role: 'user', content: 'Hello! This is a connection test.' }],
      model: 'auto-select',
      max_tokens: 10
    };

    const startTime = Date.now();
    
    try {
      await this.chatCompletions(testPayload, apiKey);
      return {
        success: true,
        endpoint: this.config.primary, // Will be updated by the actual call
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        endpoint: 'none',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Default client instance
export const dandoloAPI = new DandoloAPIClient();

// Convenience function for quick API calls
export async function callDandoloAPI(
  payload: ChatCompletionRequest,
  apiKey: string
): Promise<ChatCompletionResponse> {
  return dandoloAPI.chatCompletions(payload, apiKey);
}

// Migration helper for legacy code
export function createLegacyAPICall(apiKey: string) {
  return {
    async post(endpoint: string, data: any): Promise<any> {
      if (endpoint.includes('chat/completions')) {
        return callDandoloAPI(data, apiKey);
      }
      throw new Error(`Unsupported endpoint: ${endpoint}`);
    }
  };
}

// Export types for use in other components
export type { ChatMessage, ChatCompletionRequest, ChatCompletionResponse };