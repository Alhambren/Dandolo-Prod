import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// API endpoint for prompt submission
http.route({
  path: "/api/v1/prompt",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { message, model } = body;
      
      // Get API key from Authorization header
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const apiKey = authHeader.substring(7);
      
      // Validate API key
      const keyValidation = await ctx.runQuery(api.developers.validateApiKey, { apiKey });
      if (!keyValidation) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // Update API key usage
      await ctx.runMutation(api.developers.updateApiKeyUsage, { apiKey });
      
      // Route the inference
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
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error" 
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
      // Get API key from Authorization header
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const apiKey = authHeader.substring(7);
      
      // Validate API key
      const keyValidation = await ctx.runQuery(api.developers.validateApiKey, { apiKey });
      if (!keyValidation) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // Get user stats
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
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
