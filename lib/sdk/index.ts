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

export class DandoloSDK {
  private apiKey: string;
  private baseUrl: string;
  private wallet?: string;

  constructor(config: DandoloConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://accomplished-malamute-324.convex.cloud';
    this.wallet = config.wallet;
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

  async prompt(request: PromptRequest): Promise<PromptResponse> {
    const response = await this.makeRequest('/api/v1/prompt', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return response.json();
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

  async getBalance(): Promise<BalanceResponse> {
    const response = await this.makeRequest('/api/v1/balance', {
      method: 'GET',
    });

    return response.json();
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
