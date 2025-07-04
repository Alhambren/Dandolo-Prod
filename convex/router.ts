import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { action } from "./_generated/server";

// Secure CORS policy - only allow trusted domains
function getSecureCorsHeaders(request?: Request): Record<string, string> {
  const trustedDomains = [
    "https://dandolo.ai",
    "https://www.dandolo.ai", 
    "http://localhost:5173",
    "http://localhost:3000"
  ];
  
  const origin = request?.headers.get("origin");
  const allowedOrigin = trustedDomains.includes(origin || "") ? origin : 
    (process.env.NODE_ENV === "production" ? "https://dandolo.ai" : "http://localhost:5173");
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin || "https://dandolo.ai",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

// SECURITY: Apply privacy-respecting rate limiting to all endpoints
async function applyRateLimit(ctx: any, identifier: string, userType: "user" | "developer" | "agent", endpoint?: string) {
  const rateLimit = await ctx.runMutation(api.rateLimit.checkEnhancedRateLimit, {
    identifier,
    userType,
    endpoint
  });
  
  if (!rateLimit.allowed) {
    // Map rate limit data to standard HTTP headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-RateLimit-Limit": rateLimit.rateLimitHeaders.limit,
      "X-RateLimit-Remaining": rateLimit.rateLimitHeaders.remaining,
      "X-RateLimit-Reset": rateLimit.rateLimitHeaders.reset,
    };
    
    if (rateLimit.rateLimitHeaders.retryAfter) {
      headers["Retry-After"] = rateLimit.rateLimitHeaders.retryAfter;
    }
    
    return new Response(JSON.stringify({ 
      error: "Rate limit exceeded",
      remaining: rateLimit.remaining,
      resetTime: rateLimit.resetTime,
      type: "rate_limit_exceeded"
    }), {
      status: 429,
      headers,
    });
  }
  
  return null; // Rate limit passed
}

const http = httpRouter();

// Anonymous chat endpoint
http.route({
  path: "/chat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { message, sessionId } = body;

      if (!message || !sessionId) {
        return new Response(
          JSON.stringify({ error: "Message and sessionId required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // SECURITY: Apply privacy-respecting rate limiting
      const rateLimitResult = await applyRateLimit(ctx, sessionId, "user", "/chat");
      if (rateLimitResult) {
        return rateLimitResult;
      }

      // Route through the inference system
      const result = await ctx.runAction(api.inference.route, {
        messages: [{ role: "user" as const, content: message }],
        intent: "chat" as const,
        sessionId,
        isAnonymous: true,
      });

      // Record anonymous usage
      await ctx.runMutation(api.analytics.logUsage, {
        address: sessionId,
        providerId: result.providerId,
        model: result.model,
        intent: result.intent,
        totalTokens: result.totalTokens,
        vcuCost: result.cost,
      });

      return new Response(
        JSON.stringify({
          response: result.response,
          provider: result.provider,
          tokens: result.totalTokens,
          cost: result.cost,
          response_time: result.responseTime,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Internal server error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Developer API endpoint
http.route({
  path: "/v1/chat/completions",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid authorization header" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const apiKey = authHeader.substring(7);

      // Validate API key
      const keyData = await ctx.runQuery(api.apiKeys.validateKey, { key: apiKey });
      if (!keyData) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // SECURITY: Apply privacy-respecting rate limiting based on key type
      const userType = apiKey.startsWith("ak_") ? "agent" : "developer";
      const rateLimitResult = await applyRateLimit(ctx, apiKey, userType, "/v1/chat/completions");
      if (rateLimitResult) {
        return rateLimitResult;
      }

      const body = await request.json();
      const { messages, model, temperature, max_tokens } = body;

      if (!messages || !Array.isArray(messages)) {
        return new Response(
          JSON.stringify({ error: "Messages array required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
      if (!lastUserMessage) {
        return new Response(
          JSON.stringify({ error: "No user message found" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const intent = detectIntent(lastUserMessage.content);

      const result = await ctx.runAction(api.inference.route, {
        messages,
        intent,
        sessionId: `api-${keyData._id}`,
        isAnonymous: false,
        address: keyData.address,
        apiKey: apiKey,
      });

      await ctx.runMutation(api.apiKeys.recordUsage, {
        keyId: keyData._id,
      });

      await ctx.runMutation(api.analytics.logUsage, {
        address: keyData.address || `api-${keyData._id}`,
        providerId: result.providerId,
        model: result.model,
        intent: result.intent,
        totalTokens: result.totalTokens,
        vcuCost: result.cost,
      });

      return new Response(
        JSON.stringify({
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: result.model,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: result.response,
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: Math.floor(result.totalTokens * 0.3),
            completion_tokens: Math.floor(result.totalTokens * 0.7),
            total_tokens: result.totalTokens,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Internal server error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

function detectIntent(content: string): "chat" | "code" | "image" | "analysis" {
  const lowerContent = content.toLowerCase();

  if (
    lowerContent.includes("code") ||
    lowerContent.includes("function") ||
    lowerContent.includes("implement") ||
    lowerContent.includes("debug")
  ) {
    return "code";
  }

  if (
    lowerContent.includes("image") ||
    lowerContent.includes("picture") ||
    lowerContent.includes("draw") ||
    lowerContent.includes("generate")
  ) {
    return "image";
  }

  if (
    lowerContent.includes("analyze") ||
    lowerContent.includes("compare") ||
    lowerContent.includes("evaluate") ||
    lowerContent.includes("research")
  ) {
    return "analysis";
  }

  return "chat";
}

export const routeRequest = action({
  args: {
    prompt: v.string(),
    sessionId: v.string(),
    intentType: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    // Check rate limit for anonymous users
    const rateLimit = await ctx.runMutation(api.rateLimit.checkRateLimit, {
      identifier: args.sessionId,
      userType: "user",
    });
    
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Try again tomorrow.`);
    }
    
    // Route to inference
    const result = await ctx.runAction(api.inference.route, {
      messages: [{ role: "user" as const, content: args.prompt }],
      intent: (args.intentType || "chat") as any,
      sessionId: args.sessionId,
      isAnonymous: !args.sessionId.includes("0x"),
    });
    
    return result;
  },
});

// DEPRECATED: Image generation endpoint - DISABLED for security
// This endpoint was exposing provider API keys without authentication
http.route({
  path: "/image/generate",
  method: "POST", 
  handler: httpAction(async (ctx, request) => {
    return new Response(JSON.stringify({ 
      error: "Image generation endpoint disabled for security reasons. Use the authenticated API instead." 
    }), {
      status: 410, // Gone
      headers: { 
        "Content-Type": "application/json",
        ...getSecureCorsHeaders(request)
      },
    });
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
        return new Response(
          JSON.stringify({ error: "Missing or invalid authorization header" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const apiKey = authHeader.substring(7);

      // Validate API key
      const keyData = await ctx.runQuery(api.apiKeys.validateKey, { key: apiKey });
      if (!keyData) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // SECURITY: Apply privacy-respecting rate limiting
      const userType = apiKey.startsWith("ak_") ? "agent" : "developer";
      const rateLimitResult = await applyRateLimit(ctx, apiKey, userType, "/api/v1/balance");
      if (rateLimitResult) {
        return rateLimitResult;
      }

      // Get usage limits
      const usageLimit = await ctx.runQuery(api.apiKeys.checkDailyUsageLimit, { key: apiKey });
      
      // Get user points
      const userPoints = await ctx.runQuery(api.points.getUserPoints, { 
        address: keyData.address || `api-${keyData._id}` 
      });

      // Calculate reset time (next UTC midnight)
      const now = new Date();
      const nextMidnight = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0, 0
      ));

      return new Response(
        JSON.stringify({
          address: keyData.address || `api-${keyData._id}`,
          prompts_today: usageLimit.used,
          prompts_remaining: usageLimit.remaining,
          daily_limit: usageLimit.limit,
          points_total: userPoints,
          user_type: usageLimit.keyType,
          reset_time: nextMidnight.toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Internal server error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// OPTIONS handler for CORS preflight
http.route({
  path: "/api/*",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: getSecureCorsHeaders(request),
    });
  }),
});

// Transparent Venice.ai proxy - handles ALL Venice endpoints  
http.route({
  path: "/api/*",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      // 1. Extract and validate API key
      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ 
          error: "Missing API key. Use format: Authorization: Bearer YOUR_KEY" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const apiKey = authHeader.substring(7);
      
      // 2. Validate Dandolo key and check rate limits
      const keyRecord = await ctx.runQuery(api.apiKeys.validateKey, { key: apiKey });
      if (!keyRecord) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // SECURITY: Apply privacy-respecting rate limiting
      const userType = apiKey.startsWith("ak_") ? "agent" : "developer";
      const rateLimitResult = await applyRateLimit(ctx, apiKey, userType, "/api/*");
      if (rateLimitResult) {
        return rateLimitResult;
      }
      
      // 3. Get active provider
      const provider = await ctx.runQuery(internal.providers.selectProvider, {});
      if (!provider) {
        return new Response(JSON.stringify({ 
          error: "No providers available. Please try again." 
        }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // 4. Get decrypted API key for Venice.ai
      const veniceApiKey = await ctx.runAction(internal.providers.getDecryptedApiKey, {
        providerId: provider._id
      });
      
      // 5. Build Venice URL
      const url = new URL(request.url);
      const apiPath = url.pathname.replace('/api', '');
      const veniceUrl = `https://api.venice.ai${apiPath}${url.search}`;
      
      // 6. Forward request to Venice
      const veniceResponse = await fetch(veniceUrl, {
        method: "GET",
        headers: {
          'Authorization': `Bearer ${veniceApiKey}`,
          'Host': 'api.venice.ai',
          'User-Agent': 'Dandolo-Proxy/1.0',
        },
      });
      
      // 7. Return Venice response as-is
      const responseBody = await veniceResponse.text();
      const responseContentType = veniceResponse.headers.get('Content-Type') || 'application/json';
      
      return new Response(responseBody, {
        status: veniceResponse.status,
        headers: {
          'Content-Type': responseContentType,
          ...getSecureCorsHeaders(request),
        },
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: "Internal proxy error", 
        details: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/*",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // 1. Extract and validate API key
      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ 
          error: "Missing API key. Use format: Authorization: Bearer YOUR_KEY" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const apiKey = authHeader.substring(7);
      
      // 2. Validate Dandolo key and check rate limits
      const keyRecord = await ctx.runQuery(api.apiKeys.validateKey, { key: apiKey });
      if (!keyRecord) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // SECURITY: Apply privacy-respecting rate limiting
      const userType = apiKey.startsWith("ak_") ? "agent" : "developer";
      const rateLimitResult = await applyRateLimit(ctx, apiKey, userType, "/api/*");
      if (rateLimitResult) {
        return rateLimitResult;
      }
      
      // 3. Get active provider (using internal query to access sensitive data)
      const provider = await ctx.runQuery(internal.providers.selectProvider, {});
      if (!provider) {
        return new Response(JSON.stringify({ 
          error: "No providers available. Please try again." 
        }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // 4. Get decrypted API key for Venice.ai
      const veniceApiKey = await ctx.runAction(internal.providers.getDecryptedApiKey, {
        providerId: provider._id
      });
      
      // 5. Build Venice URL (no /v1 prefix!)
      const url = new URL(request.url);
      const apiPath = url.pathname.replace('/api', '');
      const veniceUrl = `https://api.venice.ai${apiPath}${url.search}`;
      
      // 6. Forward request to Venice
      const body = request.method !== "GET" ? await request.text() : null;
      const contentType = request.headers.get('Content-Type') || 'application/json';
      
      const veniceResponse = await fetch(veniceUrl, {
        method: request.method,
        headers: {
          'Authorization': `Bearer ${veniceApiKey}`,
          'Host': 'api.venice.ai',
          'Content-Type': contentType,
          'User-Agent': 'Dandolo-Proxy/1.0',
        },
        body: body,
      });
      
      // 7. Clone response to track usage
      const responseBody = await veniceResponse.text();
      let usage = 0;
      
      try {
        const data = JSON.parse(responseBody);
        // Track tokens for chat completions
        if (apiPath.includes('chat/completions') && data.usage) {
          usage = data.usage.total_tokens || 0;
        }
        // Track image generations (100 tokens per image)
        else if (apiPath.includes('images/generations') && data.data) {
          usage = data.data.length * 100;
        }
      } catch {
        // Response might not be JSON (e.g., audio files)
      }
      
      // 8. Record usage and award points
      if (usage > 0) {
        await ctx.runMutation(api.apiKeys.recordUsage, { 
          keyId: keyRecord._id
        });
        await ctx.runMutation(api.providers.awardProviderPoints, {
          providerId: provider._id,
          promptsServed: 1,
          tokensProcessed: usage
        });
      }
      
      // 9. Return Venice response as-is
      const responseContentType = veniceResponse.headers.get('Content-Type') || 'application/json';
      return new Response(responseBody, {
        status: veniceResponse.status,
        headers: {
          'Content-Type': responseContentType,
          ...getSecureCorsHeaders(request),
        },
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: "Internal proxy error", 
        details: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
