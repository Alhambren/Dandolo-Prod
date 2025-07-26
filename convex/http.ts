// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

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
      timestamp: Date.now(),
      message: "HTTP routing is working!"
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }),
});

// Simple test endpoint
http.route({
  path: "/test",
  method: "GET", 
  handler: httpAction(async () => {
    return new Response("HTTP routing works!", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }),
});

// CORS preflight handler for chat completions
http.route({
  path: "/v1/chat/completions",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: getSecureCorsHeaders(request),
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
        return new Response(JSON.stringify({ 
          error: {
            message: "Missing or invalid Authorization header",
            type: "authentication_error",
            code: "missing_auth_header"
          }
        }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      const apiKey = authHeader.substring(7); // Remove "Bearer "
      
      // Validate API key
      const validation = await ctx.runQuery(api.apiKeys.validateKey, { key: apiKey });
      if (!validation) {
        return new Response(JSON.stringify({ 
          error: {
            message: "Invalid API key",
            type: "authentication_error", 
            code: "invalid_api_key"
          }
        }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      // Get request body
      const body = await request.json();
      
      // Validate required fields
      if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
        return new Response(JSON.stringify({
          error: {
            message: "Messages array is required and cannot be empty",
            type: "validation_error",
            code: "invalid_messages"
          }
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      // Determine intent from model or content
      let intent = "chat";
      if (body.model && body.model.includes("code")) {
        intent = "code";
      } else if (body.model && body.model.includes("image")) {
        intent = "image";
      }

      // Map auto-select to a valid Venice model
      let modelName = body.model || "llama-3.3-70b";
      if (modelName === "auto-select") {
        modelName = "llama-3.3-70b"; // Default to a reliable model
      }
      
      // Use existing Convex inference system with all required parameters
      const result = await ctx.runAction(api.inference.route, {
        messages: body.messages,
        intent: intent,
        sessionId: crypto.randomUUID(),
        isAnonymous: false,
        address: validation.address,
        model: modelName,
        apiKey: apiKey,
        allowAdultContent: false
      });

      // Record API usage
      await ctx.runMutation(api.apiKeys.recordUsage, { keyId: validation._id });

      // Convert Dandolo response to OpenAI format
      const openAIResponse = {
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: result.model,
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: result.response
          },
          finish_reason: "stop"
        }],
        usage: {
          prompt_tokens: Math.max(1, Math.floor(result.totalTokens * 0.7)),
          completion_tokens: Math.max(1, Math.floor(result.totalTokens * 0.3)),
          total_tokens: result.totalTokens
        }
      };

      // Add rate limit headers
      const remainingRequests = validation.dailyLimit - validation.dailyUsage - 1;
      const resetTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now
      
      return new Response(JSON.stringify(openAIResponse), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "X-RateLimit-Limit": validation.dailyLimit.toString(),
          "X-RateLimit-Remaining": Math.max(0, remainingRequests).toString(),
          "X-RateLimit-Reset": resetTime.toString(),
          "X-RateLimit-Type": validation.keyType,
          ...getSecureCorsHeaders(request) 
        },
      });

    } catch (error) {
      console.error("Chat completions error:", error);
      return new Response(JSON.stringify({ 
        error: {
          message: "Internal server error",
          type: "server_error",
          code: "internal_error"
        }
      }), {
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
      const allModels = await ctx.runQuery(api.models.getAvailableModels, {});
      
      // Filter to only chat-appropriate models (exclude embedding, upscale, etc.)
      const chatModels = allModels.filter(model => {
        // Exclude embedding and upscaler models by ID patterns
        if (model.id.includes('embedding') || model.id.includes('upscal')) {
          return false;
        }
        // Include text, code, and multimodal models
        return model.type === "text" || 
               model.type === "code" || 
               model.type === "multimodal";
      });
      
      return new Response(JSON.stringify({ data: chatModels }), {
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

// Venice Characters API
http.route({
  path: "/v1/characters",
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
      const validation = await ctx.runQuery(api.apiKeys.validateKey, { key: apiKey });
      if (!validation) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      // Get active provider and decrypt API key
      const providers = await ctx.runQuery(api.providers.list, {});
      const activeProvider = providers?.find(p => p.isActive);
      
      if (!activeProvider) {
        return new Response(JSON.stringify({ error: "No active Venice provider available" }), {
          status: 503,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      // Get decrypted API key
      const veniceApiKey = await ctx.runAction(internal.providers.getDecryptedApiKey, {
        providerId: activeProvider._id
      });

      if (!veniceApiKey) {
        return new Response(JSON.stringify({ error: "Failed to get provider API key" }), {
          status: 503,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      const veniceResponse = await fetch("https://api.venice.ai/api/v1/characters", {
        headers: {
          "Authorization": `Bearer ${veniceApiKey}`,
          "Content-Type": "application/json"
        }
      });

      const data = await veniceResponse.json();
      await ctx.runMutation(api.apiKeys.recordUsage, { keyId: validation._id });

      return new Response(JSON.stringify(data), {
        status: veniceResponse.status,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });

    } catch (error) {
      console.error("Characters endpoint error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });
    }
  }),
});

// Venice Character Chat
http.route({
  path: "/v1/characters/{characterId}/chat",
  method: "POST",
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
      const validation = await ctx.runQuery(api.apiKeys.validateKey, { key: apiKey });
      if (!validation) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      const url = new URL(request.url);
      const characterId = url.pathname.split('/')[3]; // Extract characterId from path
      const body = await request.json();

      const providers = await ctx.runQuery(api.providers.list, {});
      const activeProvider = providers?.find(p => p.isActive);
      
      if (!activeProvider) {
        return new Response(JSON.stringify({ error: "No active Venice provider available" }), {
          status: 503,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      // Get decrypted API key
      const veniceApiKey = await ctx.runAction(internal.providers.getDecryptedApiKey, {
        providerId: activeProvider._id
      });

      if (!veniceApiKey) {
        return new Response(JSON.stringify({ error: "Failed to get provider API key" }), {
          status: 503,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      const veniceResponse = await fetch(`https://api.venice.ai/api/v1/characters/${characterId}/chat`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${veniceApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await veniceResponse.json();
      await ctx.runMutation(api.apiKeys.recordUsage, { keyId: validation._id });

      return new Response(JSON.stringify(data), {
        status: veniceResponse.status,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });

    } catch (error) {
      console.error("Character chat endpoint error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });
    }
  }),
});

// Venice Image Generation
http.route({
  path: "/v1/images/generations",
  method: "POST",
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
      const validation = await ctx.runQuery(api.apiKeys.validateKey, { key: apiKey });
      if (!validation) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      const body = await request.json();
      const providers = await ctx.runQuery(api.providers.list, {});
      const activeProvider = providers?.find(p => p.isActive);
      
      if (!activeProvider) {
        return new Response(JSON.stringify({ error: "No active Venice provider available" }), {
          status: 503,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      // Get decrypted API key
      const veniceApiKey = await ctx.runAction(internal.providers.getDecryptedApiKey, {
        providerId: activeProvider._id
      });

      if (!veniceApiKey) {
        return new Response(JSON.stringify({ error: "Failed to get provider API key" }), {
          status: 503,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      const veniceResponse = await fetch("https://api.venice.ai/api/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${veniceApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await veniceResponse.json();
      await ctx.runMutation(api.apiKeys.recordUsage, { keyId: validation._id });

      return new Response(JSON.stringify(data), {
        status: veniceResponse.status,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });

    } catch (error) {
      console.error("Image generation endpoint error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });
    }
  }),
});

// Venice Embeddings
http.route({
  path: "/v1/embeddings",
  method: "POST",
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
      const validation = await ctx.runQuery(api.apiKeys.validateKey, { key: apiKey });
      if (!validation) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      const body = await request.json();
      const providers = await ctx.runQuery(api.providers.list, {});
      const activeProvider = providers?.find(p => p.isActive);
      
      if (!activeProvider) {
        return new Response(JSON.stringify({ error: "No active Venice provider available" }), {
          status: 503,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      // Get decrypted API key
      const veniceApiKey = await ctx.runAction(internal.providers.getDecryptedApiKey, {
        providerId: activeProvider._id
      });

      if (!veniceApiKey) {
        return new Response(JSON.stringify({ error: "Failed to get provider API key" }), {
          status: 503,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      const veniceResponse = await fetch("https://api.venice.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${veniceApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await veniceResponse.json();
      await ctx.runMutation(api.apiKeys.recordUsage, { keyId: validation._id });

      return new Response(JSON.stringify(data), {
        status: veniceResponse.status,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });

    } catch (error) {
      console.error("Embeddings endpoint error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });
    }
  }),
});

// Removed duplicate /v1/models GET handler - using improved version below

// Removed duplicate OPTIONS handler - already exists above

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

// CORS preflight for new Venice endpoints
http.route({
  path: "/v1/characters",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: getSecureCorsHeaders(request),
    });
  }),
});

http.route({
  path: "/v1/images/generations",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: getSecureCorsHeaders(request),
    });
  }),
});

http.route({
  path: "/v1/embeddings",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: getSecureCorsHeaders(request),
    });
  }),
});

http.route({
  path: "/v1/models",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: getSecureCorsHeaders(request),
    });
  }),
});

// Models endpoint - OpenAI compatible
http.route({
  path: "/v1/models",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      // Get Authorization header
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ 
          error: {
            message: "Missing or invalid Authorization header",
            type: "authentication_error",
            code: "missing_auth_header"
          }
        }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      const apiKey = authHeader.substring(7);
      
      // Validate API key
      const validation = await ctx.runQuery(api.apiKeys.validateKey, { key: apiKey });
      if (!validation) {
        return new Response(JSON.stringify({ 
          error: {
            message: "Invalid API key",
            type: "authentication_error", 
            code: "invalid_api_key"
          }
        }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
        });
      }

      // Get available models from cache
      const allModels = await ctx.runQuery(api.models.getAvailableModels, {});
      
      // Filter to only chat-appropriate models (exclude embedding, upscale, etc.)
      const chatModels = allModels.filter(model => {
        // Exclude embedding and upscaler models by ID patterns
        if (model.id.includes('embedding') || model.id.includes('upscal')) {
          return false;
        }
        // Include text, code, and multimodal models
        return model.type === "text" || 
               model.type === "code" || 
               model.type === "multimodal";
      });
      
      // Convert to OpenAI format
      const openAIModels = chatModels.map(model => ({
        id: model.id,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "dandolo",
        permission: [],
        root: model.id,
        parent: null
      }));

      return new Response(JSON.stringify({
        object: "list",
        data: openAIModels
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...getSecureCorsHeaders(request) 
        },
      });

    } catch (error) {
      console.error("Models endpoint error:", error);
      return new Response(JSON.stringify({ 
        error: {
          message: "Internal server error",
          type: "server_error",
          code: "internal_error"
        }
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getSecureCorsHeaders(request) },
      });
    }
  }),
});

// CRITICAL: Export the router as default
export default http;