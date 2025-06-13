import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { action } from "./_generated/server";

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

      // Route through the inference system
      const result = await ctx.runAction(api.inference.route, {
        messages: [{ role: "user" as const, content: message }],
        intent: "chat" as const,
        sessionId,
        isAnonymous: true,
      });

      // Record anonymous usage
      await ctx.runMutation(api.usageLogs.create, {
        address: sessionId,
        providerId: result.providerId,
        model: result.model,
        tokens: result.tokens,
        latencyMs: result.responseTime,
        createdAt: Date.now(),
      });

      return new Response(
        JSON.stringify({
          response: result.response,
          provider: result.provider,
          tokens: result.tokens,
          cost: result.cost,
          response_time: result.responseTime,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Chat endpoint error:", error);
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
      });

      await ctx.runMutation(api.apiKeys.recordUsage, {
        keyId: keyData._id,
      });

      await ctx.runMutation(api.usageLogs.create, {
        address: keyData.address || `api-${keyData._id}`,
        providerId: result.providerId,
        model: result.model,
        tokens: result.tokens,
        latencyMs: result.responseTime,
        createdAt: Date.now(),
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
            prompt_tokens: Math.floor(result.tokens * 0.3),
            completion_tokens: Math.floor(result.tokens * 0.7),
            total_tokens: result.tokens,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("API endpoint error:", error);
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
    // Check rate limit
    const rateLimit = await ctx.runMutation(api.rateLimit.checkRateLimit, {
      sessionId: args.sessionId,
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

export default http;
