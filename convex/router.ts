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
    const apiKey = request.headers.get("Authorization")?.split(" ")[1];
    if (!apiKey) {
      return new Response("Missing API key", { status: 401 });
    }

    const keyValidation = await ctx.runQuery(api.providers.validateKey, { apiKey });
    if (!keyValidation) {
      return new Response("Invalid API key", { status: 401 });
    }

    const body = await request.json();
    const { prompt, model } = body;

    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(api.inference.route, {
      prompt,
      model,
      address: keyValidation.address,
    });

    await ctx.runMutation(api.analytics.logUsage, {
      address: keyValidation.address,
      providerId: keyValidation.providerId,
      model: result.model,
      tokens: result.tokens,
      latencyMs: result.responseTime,
    });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// API endpoint for balance check
http.route({
  path: "/api/v1/balance",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("Authorization")?.split(" ")[1];
    if (!apiKey) {
      return new Response("Missing API key", { status: 401 });
    }

    const keyValidation = await ctx.runQuery(api.providers.validateKey, { apiKey });
    if (!keyValidation) {
      return new Response("Invalid API key", { status: 401 });
    }

    const metrics = await ctx.runQuery(api.stats.getUsageMetrics, {
      address: keyValidation.address,
    });

    return new Response(JSON.stringify(metrics), {
      headers: { "Content-Type": "application/json" },
    });
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

    return new Response(
      JSON.stringify({
        balance: stats.points,
        prompts_today: stats.promptsToday,
        prompts_remaining: stats.promptsRemaining,
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
export const route = httpAction({
  handler: async (ctx, request) => {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // API key validation
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Missing or invalid API key", { status: 401 });
    }

    const apiKey = authHeader.slice(7);
    const keyValidation = await ctx.runQuery(api.providers.validateKey, { apiKey });
    if (!keyValidation.valid) {
      return new Response("Invalid API key", { status: 401 });
    }

    // Route handling
    if (path === "/api/v1/prompt" && method === "POST") {
      const body = await request.json();
      const { prompt, model } = body;

      if (!prompt) {
        return new Response("Missing prompt", { status: 400 });
      }

      const result = await ctx.runAction(api.inference.route, {
        prompt,
        model,
        address: keyValidation.address,
      });

      // Log usage
      await ctx.runMutation(api.analytics.logUsage, {
        address: keyValidation.address,
        providerId: keyValidation.providerId,
        model: result.model,
        tokens: result.tokens,
        latencyMs: result.responseTime,
      });

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/api/v1/balance" && method === "GET") {
      const stats = await ctx.runQuery(api.stats.getUsageMetrics, {
        address: keyValidation.address,
      });

      return new Response(JSON.stringify(stats), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

export default http;
