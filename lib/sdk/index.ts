export interface DandoloConfig {
  apiKey: string;
  baseUrl?: string;
  wallet?: string;
}

export interface PromptRequest {
  message: string;
  model?: string;
  max_tokens?: number;
  stream?: boolean;
}

export interface PromptResponse {
  id: string;
  text: string;
  provider: string;
  tokens: number;
  cost: number;
  response_time: number;
  model: string;
}

export interface BalanceResponse {
  balance: number;
  total_spent: number;
  last_activity: string | null;
  prompts_today: number;
  prompts_remaining: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }>;
}

export class DandoloSDK {
  private apiKey: string;
  private baseUrl: string;
  private isAgentKey: boolean;
  private wallet?: string;

  constructor(config: DandoloConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://accomplished-malamute-324.convex.cloud';
    this.wallet = config.wallet;
    this.isAgentKey = config.apiKey.startsWith("ak_");
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response;
  }


  // New method for chat completions
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await this.makeRequest('/api/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.json();
  }

  // Convenience method for maintaining conversation
  async continueConversation(messages: ChatMessage[], newMessage: string, model?: string): Promise<ChatCompletionResponse> {
    const updatedMessages = [
      ...messages,
      { role: 'user' as const, content: newMessage }
    ];
    return this.chatCompletion({
      messages: updatedMessages,
      model: model || 'gpt-3.5-turbo',
    });
  }
  async prompt(request: PromptRequest): Promise<PromptResponse> {
    const chatResponse = await this.chatCompletion({
      messages: [{ role: "user", content: request.message }],
      model: request.model,
      max_tokens: request.max_tokens,
    });

    return {
      id: chatResponse.id,
      text: chatResponse.choices[0].message.content,
      provider: "Dandolo Network",
      tokens: chatResponse.usage.total_tokens,
      cost: 0,
      response_time: 0,
      model: chatResponse.model,
    };
  }

  async promptStream(request: PromptRequest): Promise<AsyncIterable<{ text: string }>> {
    // Note: Streaming not implemented in this MVP version
    // This would require server-sent events or WebSocket implementation
    const result = await this.prompt({ ...request, stream: false });
    
    // Simulate streaming by yielding the full response
    return {
      async *[Symbol.asyncIterator]() {
        yield { text: result.text };
      }
    };
  }

  async batchPrompt(requests: PromptRequest[]): Promise<PromptResponse[]> {
    // Execute requests in parallel
    const promises = requests.map(request => this.prompt(request));
    return Promise.all(promises);
  }

  // Generate embeddings for a piece of text
  async embed(text: string): Promise<number[]> {
    const response = await this.makeRequest('/api/v1/embed', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    return data.embedding as number[];
  }

  async getBalance(): Promise<BalanceResponse> {
    const response = await this.makeRequest('/api/v1/balance', {
      method: 'GET',
    });

    return response.json();
  }
  async getRateLimitStatus(): Promise<{
    limit: number;
    remaining: number;
    reset: Date;
  }> {
    const balance = await this.getBalance();
    return {
      limit: this.isAgentKey ? 5000 : 500,
      remaining: balance.prompts_remaining,
      reset: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }


  // Utility method to check if API key is valid
  async validateApiKey(): Promise<boolean> {
    try {
      await this.getBalance();
      return true;
    } catch {
      return false;
    }
  }
}

// Export for CommonJS compatibility
export default DandoloSDK;
