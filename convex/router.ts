import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

// API endpoint for prompt submission
http.route({
  path: "/api/v1/prompt",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { message, model } = body;
      
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const apiKey = authHeader.substring(7);
      const keyValidation = await ctx.runQuery(api.developers.validateApiKey, { address: apiKey });
      
      if (!keyValidation || !keyValidation.address) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      await ctx.runMutation(api.developers.updateApiKeyUsage, { apiKey });
      
      const result = await ctx.runAction(api.inference.route, {
        prompt: message,
        model,
        address: keyValidation.address,
      });
      
      // Log usage metrics
      await ctx.runMutation(api.analytics.logUsage, {
        address: keyValidation.address,
        model: result.model,
        tokens: result.tokens,
        latencyMs: result.responseTime,
      });
      
      return new Response(JSON.stringify({
        id: `prompt_${Date.now()}`,
        text: result.response,
        provider: result.provider,
        tokens: result.tokens,
        cost: result.cost,
        response_time: result.responseTime,
        model: result.model,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// API endpoint for chat completions (multi-turn)
http.route({
  path: "/api/v1/chat/completions",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { messages, model, temperature, max_tokens, stream } = body;

      // Validate messages array
      if (!Array.isArray(messages) || messages.length === 0) {
        return new Response(JSON.stringify({ error: "Messages array is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const apiKey = authHeader.substring(7);

      // Check if it's an agent key (ak_) or developer key (dk_)
      const isAgentKey = apiKey.startsWith("ak_");
      const keyType = isAgentKey ? "agent" : "developer";

      // Validate API key
      const keyRecord = await ctx.runQuery(api.developers.validateApiKey, { apiKey });
      if (!keyRecord) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check rate limits (higher for agents)
      const dailyLimit = isAgentKey ? 5000 : 500;
      const rateLimit = await ctx.runMutation(api.rateLimit.checkRateLimit, {
        address: keyRecord.address,
        limit: dailyLimit,
      });

      if (!rateLimit.allowed) {
        return new Response(JSON.stringify({
          error: "Rate limit exceeded",
          limit: dailyLimit,
          reset: rateLimit.resetTime,
        }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Route to inference with full message history
      const result = await ctx.runAction(api.inference.routeCompletion, {
        messages,
        model: model || "gpt-3.5-turbo",
        temperature,
        max_tokens,
        address: keyRecord.address,
        keyType,
      });

      // Update API key usage
      await ctx.runMutation(api.developers.updateApiKeyUsage, { apiKey });

      // Log usage metrics
      await ctx.runMutation(api.analytics.logUsage, {
        address: keyRecord.address,
        model: result.model,
        tokens: result.usage.total_tokens,
        latencyMs: result.responseTime,
      });

      // Return OpenAI-compatible response
      return new Response(JSON.stringify({
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: result.model,
        usage: result.usage,
        choices: [{
          message: {
            role: "assistant",
            content: result.content,
          },
          finish_reason: "stop",
          index: 0,
        }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Chat completions error:", error);
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// API endpoint for balance check
http.route({
  path: "/api/v1/balance",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const apiKey = authHeader.substring(7);
      const keyValidation = await ctx.runQuery(api.developers.validateApiKey, { address: apiKey });
      
      if (!keyValidation || !keyValidation.address) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const stats = await ctx.runQuery(api.points.getUserStats, {
        address: keyValidation.address,
      });
      
      return new Response(JSON.stringify({
        balance: stats.points,
        prompts_today: stats.promptsToday,
        prompts_remaining: stats.pointsRemaining,
        points_today: stats.pointsToday,
        points_this_week: stats.pointsThisWeek,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/stats",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const address = url.searchParams.get("address");

    if (!address) {
      return new Response(
        JSON.stringify({ error: "Address is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const stats = await ctx.runQuery(api.points.getUserStats, {
      address,
    });

    const promptsRemaining = Math.max(0, stats.points - stats.promptsToday);

    return new Response(
      JSON.stringify({
        balance: stats.points,
        prompts_today: stats.promptsToday,
        prompts_remaining: promptsRemaining,
        points_today: stats.pointsToday,
        points_this_week: stats.pointsThisWeek,
        points_history: stats.pointsHistory,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

interface Provider {
  _id: Id<"providers">;
  totalPrompts: number;
  uptime: number;
  name: string;
  veniceApiKey?: string;
  isActive: boolean;
  vcuBalance: number;
  avgResponseTime: number;
  status: "pending" | "active" | "inactive";
  region?: string;
  gpuType?: string;
  description?: string;
  lastHealthCheck?: number;
  registrationDate: number;
}

interface VeniceResponse {
  response: string;
  provider: string;
  tokens: number;
  cost: number;
  responseTime: number;
  pointsAwarded: number;
  model: string;
}

// Route requests to appropriate provider
export const route = action({
  args: {
    address: v.string(),
    model: v.optional(v.string()),
    prompt: v.string(),
  },
  handler: async (ctx, args): Promise<VeniceResponse> => {
    // Check rate limit
    const rateLimit = await ctx.runMutation(api.rateLimit.checkRateLimit, {
      address: args.address,
    });

    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Resets at ${new Date(rateLimit.resetTime).toISOString()}`);
    }

    // Get active providers
    const providers = await ctx.runQuery(api.providers.listActive) as Provider[];

    if (!providers || providers.length === 0) {
      throw new Error("No active providers available");
    }

    // Select provider with lowest load
    const selectedProvider = providers.reduce((best: Provider, current: Provider) => {
      const bestLoad = best.totalPrompts / (best.uptime || 1);
      const currentLoad = current.totalPrompts / (current.uptime || 1);
      return currentLoad < bestLoad ? current : best;
    });

    // Call Venice AI
    const response = await ctx.runAction(api.inference.route, {
      prompt: args.prompt,
      model: args.model,
      address: args.address,
    }) as VeniceResponse;

    // Log usage
    await ctx.runMutation(api.inference.logUsage, {
      address: args.address,
      providerId: selectedProvider._id,
      model: args.model || "default",
      tokens: response.tokens,
      createdAt: Date.now(),
      latencyMs: response.responseTime,
    });

    return response;
  },
});

export default http;
