import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Venice.ai API integration - direct routing
async function callVeniceAI(prompt: string, apiKey: string, model?: string, intentType?: string) {
  // First, detect if this is an image generation request
  const isImageRequest = intentType === 'image' || 
                        model?.toLowerCase().includes('dalle') ||
                        model?.toLowerCase().includes('stable') ||
                        model?.toLowerCase().includes('image');
  
  if (isImageRequest) {
    try {
      // Try image generation endpoint
      const response = await fetch("https://api.venice.ai/api/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: prompt,
          model: model || "dalle-3",
          n: 1,
          size: "1024x1024",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data[0]) {
          return {
            text: `![Generated Image](${data.data[0].url})\n\n*Generated image: ${prompt}*`,
            tokens: 100,
            model: model || "dalle-3",
            cost: calculateCost(100, model || "dalle-3"),
          };
        }
      }
    } catch (error) {
      console.log("Image generation failed, falling back to text");
    }
  }
  
  // Use chat completions for everything else (including image fallback)
  try {
    const isCodeRequest = intentType === 'code' || model?.toLowerCase().includes('code');
    const systemPrompt = isCodeRequest 
      ? "You are an expert programmer. Generate clean, well-commented code."
      : isImageRequest 
      ? "The user requested an image. Since image generation is not available, provide a detailed text description of what the image would look like."
      : undefined;

    const messages = systemPrompt 
      ? [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ]
      : [{ role: "user", content: prompt }];

    const response = await fetch("https://api.venice.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 1000,
        temperature: isCodeRequest ? 0.3 : 0.7,
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
      model: data.model || model || "gpt-3.5-turbo",
      cost: calculateCost(data.usage?.total_tokens || 0, data.model || model),
    };
  } catch (error) {
    console.error("Venice API call failed:", error);
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

interface Provider {
  _id: Id<"providers">;
  name: string;
  veniceApiKey: string;
}

interface RouteResponse {
  response: string;
  provider: string;
  tokens: number;
  cost: number;
  responseTime: number;
  model: string;
}

export const route = action({
  args: {
    prompt: v.string(),
    address: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  returns: v.object({
    response: v.string(),
    provider: v.string(),
    tokens: v.number(),
    cost: v.number(),
    responseTime: v.number(),
    model: v.string(),
  }),
  handler: async (ctx, args): Promise<RouteResponse> => {
    // Rate limit check
    const rateLimitCheck = await ctx.runMutation(api.rateLimit.checkRateLimit, {
      address: args.address,
    });

    if (!rateLimitCheck.allowed) {
      throw new Error(`Daily limit reached (${rateLimitCheck.current}/50)`);
    }

    // Get active providers
    const providers = (await ctx.runQuery(internal.providers.listActiveInternal)) as Provider[];

    if (providers.length === 0) {
      throw new Error("No providers available");
    }

    // Select random provider
    const selectedProvider: Provider = providers[Math.floor(Math.random() * providers.length)];

    const startTime = Date.now();

    try {
      // Call Venice.ai
      const veniceResponse = await callVeniceAI(args.prompt, selectedProvider.veniceApiKey, args.model);
      const responseTime = Date.now() - startTime;

      // Log usage (anonymous metrics only)
      await ctx.runMutation(api.inference.logUsage, {
        address: args.address ?? 'anonymous',
        providerId: selectedProvider._id,
        model: args.model || veniceResponse.model,
        tokens: veniceResponse.tokens,
        createdAt: Date.now(),
        latencyMs: responseTime,
      });

      // Award provider points
      await ctx.runMutation(api.providers.incrementPromptCount, {
        providerId: selectedProvider._id,
      });

      return {
        response: veniceResponse.text,
        provider: selectedProvider.name,
        tokens: veniceResponse.tokens,
        cost: veniceResponse.cost,
        responseTime,
        model: args.model || veniceResponse.model,
      };
    } catch (error) {
      throw new Error(`Inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

export const logUsage = mutation({
  args: {
    address: v.optional(v.string()),
    providerId: v.id("providers"),
    model: v.string(),
    tokens: v.number(),
    createdAt: v.number(),
    latencyMs: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("usageLogs", {
      address: args.address ?? 'anonymous',
      providerId: args.providerId,
      model: args.model,
      tokens: args.tokens,
      latencyMs: args.latencyMs,
      createdAt: args.createdAt,
    });
  },
});
