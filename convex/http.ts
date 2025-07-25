// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

// Create the HTTP router
const http = httpRouter();

// CORS headers
const getSecureCorsHeaders = (request: Request) => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
});

// Health check endpoint
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ 
      status: "ok", 
      service: "dandolo-inference-router",
      timestamp: Date.now()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getSecureCorsHeaders({} as Request) }
    });
  }),
});

// Developer API endpoint - Chat completions
http.route({
  path: "/v1/chat/completions",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Get Authorization header
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      const apiKey = authHeader.substring(7); // Remove "Bearer "
      
      // Validate API key
      const validation = await ctx.runQuery(api.apiKeys.validateKey, { key: apiKey });
      if (!validation) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      // Get request body
      const body = await request.json();
      
      // Use existing Convex inference system  
      const result = await ctx.runAction(api.inference.route, {
        messages: body.messages || [],
        intent: "chat",
        sessionId: crypto.randomUUID(),
        isAnonymous: false,
        model: body.model || "llama-3.3-70b"
      });

      // Record API usage
      await ctx.runMutation(api.apiKeys.recordUsage, { keyId: validation._id });

      // Return native Dandolo response format
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });

    } catch (error) {
      console.error("Chat completions error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });
    }
  }),
});

// API Balance endpoint
http.route({
  path: "/api/v1/balance",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      const apiKey = authHeader.substring(7);
      
      // Validate API key
      const validation = await ctx.runQuery(api.apiKeys.validateKey, { key: apiKey });
      if (!validation) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      // Return usage information
      const usage = await ctx.runQuery(api.apiKeys.checkDailyUsageLimit, { key: apiKey });
      
      return new Response(JSON.stringify({
        balance: {
          used: usage.used,
          limit: usage.limit,
          remaining: usage.remaining,
          keyType: usage.keyType
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });

    } catch (error) {
      console.error("Balance endpoint error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });
    }
  }),
});

// Venice models endpoint
http.route({
  path: "/api/v1/models",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      const apiKey = authHeader.substring(7);
      
      // Validate API key
      const validation = await ctx.runQuery(api.apiKeys.validateKey, { key: apiKey });
      if (!validation) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      // Get available models from Convex cache
      const models = await ctx.runQuery(api.models.getAvailableModels, {});
      
      return new Response(JSON.stringify({ data: models }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });

    } catch (error) {
      console.error("Models endpoint error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });
    }
  }),
});

// Anonymous chat endpoint
http.route({
  path: "/chat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      // Use existing anonymous chat system
      const result = await ctx.runAction(api.inference.route, {
        messages: body.messages || [],
        intent: "chat",
        sessionId: crypto.randomUUID(),
        isAnonymous: true,
        model: body.model || "llama-3.3-70b"
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });

    } catch (error) {
      console.error("Chat endpoint error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });
    }
  }),
});

// CORS preflight for all routes
http.route({
  path: "/v1/chat/completions",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: getSecureCorsHeaders(request),
    });
  }),
});

http.route({
  path: "/api/v1/models",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: getSecureCorsHeaders(request),
    });
  }),
});

http.route({
  path: "/api/v1/balance",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: getSecureCorsHeaders(request),
    });
  }),
});

// CRITICAL: Export the router as default
export default http;