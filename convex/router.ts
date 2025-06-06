import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

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
      const keyValidation = await ctx.runQuery(api.developers.validateApiKey, { apiKey });
      
      if (!keyValidation || !keyValidation.userId) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      await ctx.runMutation(api.developers.updateApiKeyUsage, { apiKey });
      
      const result = await ctx.runAction(api.inference.route, {
        prompt: message,
        model,
        userId: keyValidation.userId,
        sessionId: keyValidation.sessionId,
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
      const keyValidation = await ctx.runQuery(api.developers.validateApiKey, { apiKey });
      
      if (!keyValidation || !keyValidation.userId) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const stats = await ctx.runQuery(api.points.getUserStats, {
        userId: keyValidation.userId,
        sessionId: keyValidation.sessionId,
      });
      
      return new Response(JSON.stringify({
        balance: stats.points,
        total_spent: stats.totalSpent,
        last_activity: stats.lastActivity ? new Date(stats.lastActivity).toISOString() : null,
        prompts_today: stats.promptsToday,
        prompts_remaining: stats.promptsRemaining,
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
    const userId = url.searchParams.get("userId");
    const sessionId = url.searchParams.get("sessionId");

    if (!userId && !sessionId) {
      return new Response(
        JSON.stringify({ error: "Either userId or sessionId is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const stats = await ctx.runQuery(api.points.getUserStats, {
      userId: userId as any, // Type assertion since we know it's a valid ID
      sessionId: sessionId || undefined,
    });

    return new Response(
      JSON.stringify({
        balance: stats.points,
        total_spent: stats.totalSpent,
        last_activity: stats.lastActivity ? new Date(stats.lastActivity).toISOString() : null,
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

export default http;
