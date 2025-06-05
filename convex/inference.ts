import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Venice.ai API integration - direct routing
async function callVeniceAI(prompt: string, apiKey: string, model?: string) {
  const veniceModel = mapToVeniceModel(model);
  
  try {
    // PRIVACY: Direct routing to Venice.ai, no logging of content
    const response = await fetch("https://api.venice.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: veniceModel,
        messages: [
          {
            role: "user",
            content: prompt // Routed directly, never stored
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      }),
    });

    if (!response.ok) {
      throw new Error(`Venice API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      text: data.choices[0].message.content,
      tokens: data.usage?.total_tokens || 0,
      model: data.model || veniceModel,
      cost: calculateCost(data.usage?.total_tokens || 0, veniceModel),
    };
  } catch (error) {
    // PRIVACY: Only log error type, never prompt content
    console.error("Venice API routing failed:", { model: veniceModel, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// Map user-friendly model names to Venice.ai model IDs
function mapToVeniceModel(model?: string): string {
  const modelMap: Record<string, string> = {
    "gpt-4": "gpt-4",
    "gpt-3.5-turbo": "gpt-3.5-turbo",
    "claude-3-sonnet": "claude-3-sonnet-20240229",
    "claude-3-haiku": "claude-3-haiku-20240307",
    "llama-3": "meta-llama/Llama-2-70b-chat-hf",
    "mixtral": "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "codellama": "codellama/CodeLlama-34b-Instruct-hf",
    "deepseek-coder": "deepseek-ai/deepseek-coder-33b-instruct"
  };
  
  return modelMap[model || "gpt-3.5-turbo"] || "gpt-3.5-turbo";
}

// Calculate cost based on token usage and model
function calculateCost(tokens: number, model: string): number {
  // Venice.ai pricing (approximate, in VCU)
  const pricing: Record<string, number> = {
    "gpt-4": 0.03,
    "gpt-3.5-turbo": 0.002,
    "claude-3-sonnet-20240229": 0.015,
    "claude-3-haiku-20240307": 0.0025,
    "meta-llama/Llama-2-70b-chat-hf": 0.01,
    "mistralai/Mixtral-8x7B-Instruct-v0.1": 0.007,
    "codellama/CodeLlama-34b-Instruct-hf": 0.01,
    "deepseek-ai/deepseek-coder-33b-instruct": 0.008
  };
  
  const rate = pricing[model] || 0.002;
  return Math.ceil(tokens * rate * 1000); // Convert to micro-VCU
}

export const route = action({
  args: {
    prompt: v.string(),
    sessionId: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    model: v.optional(v.string()),
    walletAddress: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    response: string;
    provider: string;
    tokens: number;
    cost: number;
    responseTime: number;
    pointsAwarded: number;
    model: string;
  }> => {
    // Check rate limit first (50 prompts/day during MVP)
    const rateLimitCheck = await ctx.runMutation(api.rateLimit.checkRateLimit, {
      userId: args.userId,
      sessionId: args.sessionId,
    });

    if (!rateLimitCheck.allowed) {
      throw new Error(`Daily limit reached (${rateLimitCheck.current}/50 prompts). Try again tomorrow!`);
    }

    // Get active providers with API keys (internal query)
    const providers = await ctx.runQuery(internal.providers.listActiveInternal);
    
    if (providers.length === 0) {
      throw new Error("No providers available at the moment");
    }

    // Select best provider based on model if specified
    let selectedProvider;
    if (args.model && args.model !== "auto") {
      // Try to find a provider that supports the requested model
      selectedProvider = providers.find(p => p.name.toLowerCase().includes(args.model!.toLowerCase())) 
        || providers[Math.floor(Math.random() * providers.length)];
    } else {
      // Random selection for auto mode
      selectedProvider = providers[Math.floor(Math.random() * providers.length)];
    }

    // Call Venice.ai API through selected provider
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;

    try {
      const veniceResponse = await callVeniceAI(args.prompt, selectedProvider.veniceApiKey, args.model);
      const responseTime = Date.now() - startTime;
      success = true;

      // Award points to user (1 point per prompt, but free during MVP)
      const pointsAwarded: number = await ctx.runMutation(api.wallets.addAddressPoints, {
        address: args.walletAddress || 'anonymous', // Fallback for non-wallet users
        amount: 1,
        reason: 'PROMPT_COMPLETION',
      });

      // Increment provider prompt count
      await ctx.runMutation(api.providers.incrementPromptCount, {
        providerId: selectedProvider._id,
      });

      // Log ONLY anonymous usage metrics - NEVER prompt content
      await ctx.runMutation(api.inference.logUsage, {
        address: args.walletAddress,
        sessionId: args.sessionId,
        // PRIVACY: Only log metadata, NEVER prompt/response content
        model: args.model || veniceResponse.model,
        tokens: veniceResponse.tokens,
        cost: veniceResponse.cost,
        timestamp: Date.now(),
        responseTime,
      });

      // Track successful model usage
      await ctx.runMutation(api.models.trackModelHealth, {
        modelId: args.model || veniceResponse.model,
        success: true,
      });

      return {
        response: veniceResponse.text,
        provider: selectedProvider.name,
        tokens: veniceResponse.tokens,
        cost: veniceResponse.cost,
        responseTime,
        pointsAwarded,
        model: args.model || veniceResponse.model,
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      
      // Track failed model usage
      await ctx.runMutation(api.models.trackModelHealth, {
        modelId: args.model || "unknown",
        success: false,
        error: errorMessage,
      });

      throw error;
    }
  },
});

export const logUsage = mutation({
  args: {
    address: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    model: v.string(),
    tokens: v.number(),
    cost: v.number(),
    timestamp: v.number(),
    responseTime: v.number(),
  },
  handler: async (ctx, args) => {
    // PRIVACY: Only store anonymous metrics, never content
    await ctx.db.insert("usageLogs", {
      address: args.address,
      sessionId: args.sessionId,
      // NO prompt or response content stored
      model: args.model,
      tokens: args.tokens,
      cost: args.cost,
      timestamp: args.timestamp,
      responseTime: args.responseTime,
    });
  },
});
