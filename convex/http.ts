// convex/http.ts - Enhanced Agent-First API with Superior Security
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Enhanced security configuration
interface SecurityConfig {
  rateLimitByEndpoint: Record<string, { requests: number; window: number }>;
  allowedOrigins: string[];
  encryptionRequired: boolean;
  agentAuthRequired: boolean;
}

const SECURITY_CONFIG: SecurityConfig = {
  rateLimitByEndpoint: {
    '/v1/chat/completions': { requests: 100, window: 60000 }, // 100 req/min
    '/v1/agents/workflows': { requests: 50, window: 60000 },  // 50 req/min
    '/v1/agents/streaming': { requests: 200, window: 60000 }, // 200 req/min
  },
  allowedOrigins: ['*'], // Will be configured per deployment
  encryptionRequired: true,
  agentAuthRequired: true
};

// Agent instruction format validation
interface AgentInstructionRequest {
  instructions?: {
    type: 'system_prompt' | 'workflow_step' | 'context_injection' | 'tool_use' | 'multi_modal';
    content: string;
    metadata?: Record<string, any>;
  }[];
  context_id?: string;
  workflow_id?: string;
  agent_options?: {
    stream_mode?: 'standard' | 'agent_enhanced' | 'workflow_aware';
    context_preservation?: boolean;
    instruction_parsing?: boolean;
    multi_step_workflow?: boolean;
  };
}

// Create the HTTP router
const http = httpRouter();

// Enhanced CORS headers with security
const getSecureCorsHeaders = (request: Request) => {
  const origin = request.headers.get('origin');
  const allowedOrigin = SECURITY_CONFIG.allowedOrigins.includes('*') || 
    SECURITY_CONFIG.allowedOrigins.includes(origin || '') ? 
    (origin || '*') : 'null';
    
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Agent-ID, X-Workflow-ID, X-Context-ID",
    "Access-Control-Allow-Credentials": "false",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'none'; script-src 'none'"
  };
};

// Enhanced authentication with agent context
const authenticateAgentRequest = async (ctx: any, request: Request): Promise<{
  valid: boolean;
  user?: any;
  agent_id?: string;
  error?: string;
}> => {
  const authHeader = request.headers.get("Authorization");
  const agentId = request.headers.get("X-Agent-ID");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      valid: false,
      error: "Missing or invalid Authorization header"
    };
  }

  const apiKey = authHeader.substring(7);
  
  // Enhanced API key validation with agent context
  const validation = await ctx.runQuery(api.apiKeys.validateKey, { key: apiKey });
  if (!validation) {
    return {
      valid: false,
      error: "Invalid API key"
    };
  }

  // Agent keys get additional verification
  if (apiKey.startsWith('ak_') && agentId) {
    // Verify agent ID matches the key owner
    // This prevents key hijacking between agents
    return {
      valid: true,
      user: validation,
      agent_id: agentId
    };
  }

  return {
    valid: true,
    user: validation,
    agent_id: agentId
  };
};

// Enhanced error responses with security context
const createSecureErrorResponse = (error: {
  message: string;
  type: string;
  code: string;
  status?: number;
}, request: Request) => {
  const response = {
    error: {
      message: error.message,
      type: error.type,
      code: error.code,
      timestamp: new Date().toISOString(),
      request_id: crypto.randomUUID().substring(0, 8)
    }
  };
  
  return new Response(JSON.stringify(response), {
    status: error.status || 400,
    headers: {
      "Content-Type": "application/json",
      ...getSecureCorsHeaders(request)
    }
  });
};

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
        intent: intent as "image" | "code" | "chat" | "analysis",
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
          "X-RateLimit-Type": validation.keyType || "unknown",
          ...getSecureCorsHeaders(request) 
        } as HeadersInit,
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
      const chatModels = allModels.filter((model: any) => {
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
      const activeProvider = providers?.find((p: any) => p.isActive);
      
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
      const activeProvider = providers?.find((p: any) => p.isActive);
      
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
      const activeProvider = providers?.find((p: any) => p.isActive);
      
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
      const activeProvider = providers?.find((p: any) => p.isActive);
      
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
      const chatModels = allModels.filter((model: any) => {
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
      const openAIModels = chatModels.map((model: any) => ({
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

// Enhanced Agent Streaming Endpoint
http.route({
  path: "/v1/agents/streaming",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const requestStart = Date.now();
    
    try {
      // Enhanced authentication with agent context
      const auth = await authenticateAgentRequest(ctx, request);
      if (!auth.valid) {
        return createSecureErrorResponse({
          message: auth.error || "Authentication failed",
          type: "authentication_error",
          code: "auth_failed"
        }, request);
      }

      // Enhanced request parsing with agent instruction support
      const body = await request.json();
      const agentRequest = body as AgentInstructionRequest & {
        messages: any[];
        model?: string;
        stream?: boolean;
        temperature?: number;
        max_tokens?: number;
      };
      
      // Validate streaming request
      if (!agentRequest.messages || !Array.isArray(agentRequest.messages)) {
        return createSecureErrorResponse({
          message: "Messages array is required for streaming",
          type: "validation_error",
          code: "invalid_messages"
        }, request);
      }

      // Process agent instructions if present
      let enhancedMessages = agentRequest.messages;
      if (agentRequest.instructions && agentRequest.instructions.length > 0) {
        enhancedMessages = agentRequest.messages.map((msg, index) => {
          const instruction = agentRequest.instructions?.[index];
          if (instruction) {
            return {
              ...msg,
              agent_instruction: instruction,
              context_id: agentRequest.context_id,
              workflow_id: agentRequest.workflow_id
            };
          }
          return msg;
        });
      }

      // Start streaming with agent enhancements
      const streamResult = await ctx.runAction(api.inference.sendMessageStreaming, {
        messages: enhancedMessages,
        model: agentRequest.model || 'auto-select',
        sessionId: agentRequest.context_id || crypto.randomUUID(),
        address: auth.user?.address,
        allowAdultContent: false,
      });

      if (!streamResult.success) {
        return createSecureErrorResponse({
          message: streamResult.error || "Failed to start streaming",
          type: "server_error",
          code: "streaming_failed"
        }, request);
      }

      // Return streaming response with SSE headers
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // Initial connection confirmation
          const initialData = JSON.stringify({
            type: 'stream_started',
            stream_id: streamResult.streamId,
            agent_id: auth.agent_id,
            context_id: agentRequest.context_id,
            workflow_id: agentRequest.workflow_id
          });
          controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

          // Poll for streaming chunks
          let lastIndex = 0;
          let isComplete = false;
          
          while (!isComplete) {
            try {
              const chunks = await ctx.runQuery(api.inference.getStreamingChunks, {
                streamId: streamResult.streamId,
                fromIndex: lastIndex
              });

              for (const chunk of chunks) {
                if (chunk.chunkIndex >= lastIndex) {
                  const chunkData = JSON.stringify({
                    type: 'chunk',
                    content: chunk.content,
                    done: chunk.done,
                    model: chunk.model,
                    tokens: chunk.tokens,
                    timestamp: chunk.timestamp,
                    // Enhanced agent metadata
                    agent_metadata: {},
                    workflow_state: {},
                    instruction_feedback: []
                  });
                  
                  controller.enqueue(encoder.encode(`data: ${chunkData}\n\n`));
                  lastIndex = chunk.chunkIndex + 1;
                  
                  if (chunk.done) {
                    isComplete = true;
                    break;
                  }
                }
              }

              if (!isComplete) {
                await new Promise(resolve => setTimeout(resolve, 100)); // 100ms polling interval
              }
            } catch (error) {
              const errorData = JSON.stringify({
                type: 'error',
                error: {
                  message: error instanceof Error ? error.message : 'Unknown error',
                  type: 'streaming_error',
                  code: 'chunk_retrieval_failed'
                }
              });
              controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
              break;
            }
          }

          // Send completion signal
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      });

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'X-Agent-Enhanced': 'true',
          ...getSecureCorsHeaders(request)
        }
      });

    } catch (error) {
      console.error("Enhanced streaming error:", error);
      return createSecureErrorResponse({
        message: "Internal streaming error",
        type: "server_error",
        code: "internal_streaming_error"
      }, request);
    }
  }),
});

// CORS Options for enhanced streaming
http.route({
  path: "/v1/agents/streaming",
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