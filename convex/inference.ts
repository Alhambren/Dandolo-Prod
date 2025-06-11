// convex/inference.ts - Complete fixed version
// -------------------------------------------------
// This module handles routing prompts to Venice.ai models. It dynamically
// selects a model based on the intent (chat, code, image, analysis), calculates
// the VCU cost of each request and records usage stats. All external calls are
// wrapped with appropriate error handling.

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/** Venice.ai model definition returned by the models endpoint. */
interface VeniceModel {
  id: string;
  name: string;
  type: "text" | "image";
  owned_by?: string;
  created?: number;
}

/** Wrapper type for the Venice models list response. */
interface VeniceModelsResponse {
  data: VeniceModel[];
}

/** Message format used when calling Venice text models. */
interface VeniceMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Response structure for Venice text completions. */
interface VeniceTextResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Response structure for Venice image generation. */
interface VeniceImageResponse {
  data: Array<{
    url: string;
  }>;
}

/** Provider record stored in Convex. */
// Provider record as returned from the database. veniceApiKey is optional when
// fetched via the public query so we treat it as such here.
interface Provider {
  _id: Id<"providers">;
  veniceApiKey?: string;
  name: string;
  isActive: boolean;
}

// Cache for available models with expiration
let modelCache: {
  models: any[];
  timestamp: number;
} | null = null;

const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Fetch available models from Venice.ai with caching
 */
async function fetchAvailableModels(apiKey: string): Promise<any[]> {
  // Return cached models if they're still fresh
  if (modelCache && Date.now() - modelCache.timestamp < CACHE_DURATION) {
    return modelCache.models;
  }

  try {
    const modelsResponse = await fetch("https://api.venice.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!modelsResponse.ok) {
      console.error("Failed to fetch models:", modelsResponse.status);
      throw new Error(`Venice API error: ${modelsResponse.status}`);
    }

    const modelsData = await modelsResponse.json();
    const models = modelsData.data || [];
    
    // Update cache
    modelCache = {
      models,
      timestamp: Date.now(),
    };

    console.log(
      "Available models from Venice:",
      models.map((m: any) => ({ id: m.id, type: m.type }))
    );

    return models;
  } catch (error) {
    console.error("Failed to fetch models:", error);
    // If we have cached models, use them even if expired
    if (modelCache) {
      console.log("Using expired cache due to fetch error");
      return modelCache.models;
    }
    throw new Error("Cannot proceed without model list");
  }
}

/**
 * Select the most appropriate model based on intent and availability
 */
function selectModel(models: any[], intentType?: string, preferredModel?: string): string[] {
  console.log("selectModel called with intentType:", intentType, "preferredModel:", preferredModel);
  const rankedModels: string[] = [];

  // If a preferred model is specified and available, add it to the top of the list
  if (preferredModel) {
    const exists = models.some((m) => m.id === preferredModel);
    if (exists) {
      console.log("Preferred model found:", preferredModel);
      rankedModels.push(preferredModel);
    } else {
      console.warn(`Preferred model ${preferredModel} not found, selecting dynamically`);
    }
  }

  // Filter models by type and capabilities
  const textModels = models.filter((m) => m.type === "text");
  console.log("textModels:", textModels.map((m: any) => m.id));
  const imageModels = models.filter((m) => m.type === "image");
  const codeModels = textModels.filter(
    (m) =>
      m.id.toLowerCase().includes("code") ||
      m.id.toLowerCase().includes("deepseek") ||
      m.id.toLowerCase().includes("starcoder")
  );
  const analysisModels = textModels.filter(
    (m) =>
      (m.model_spec?.availableContextTokens || 0) > 100000 ||
      m.id.toLowerCase().includes("mixtral") ||
      m.id.toLowerCase().includes("dolphin")
  );
  const visionModels = textModels.filter(
    (m) => m.id.toLowerCase().includes("qwen-2.5-vl")
  );

  // Populate rankedModels based on intent
  if (intentType === "image" && imageModels.length > 0) {
    rankedModels.push(...imageModels.map((m) => m.id));
  } else if (intentType === "code" && codeModels.length > 0) {
    rankedModels.push(...codeModels.map((m) => m.id));
  } else if (intentType === "analysis" && analysisModels.length > 0) {
    rankedModels.push(...analysisModels.map((m) => m.id));
  } else if (intentType === "vision" && visionModels.length > 0) {
    rankedModels.push(...visionModels.map((m) => m.id));
  } else if (intentType === "chat" && textModels.length > 0) {
    const preferredChatModel = textModels.find(m => m.id === "llama-3.2-3b");
    if (preferredChatModel) {
      rankedModels.push(preferredChatModel.id);
    }
    const otherTextModels = textModels.filter(m => m.id !== "venice-uncensored" && m.id !== (preferredChatModel?.id));
    rankedModels.push(...otherTextModels.map((m: any) => m.id));
    const veniceUncensored = textModels.find(m => m.id === "venice-uncensored");
    if (veniceUncensored) {
      rankedModels.push(veniceUncensored.id);
    }
  }

  // Add any remaining models of the appropriate type if not already added
  const currentRankedIds = new Set(rankedModels);
  if (intentType === "image") {
    imageModels.forEach(m => { if (!currentRankedIds.has(m.id)) rankedModels.push(m.id); });
  } else if (intentType === "code") {
    codeModels.forEach(m => { if (!currentRankedIds.has(m.id)) rankedModels.push(m.id); });
  } else if (intentType === "analysis") {
    analysisModels.forEach(m => { if (!currentRankedIds.has(m.id)) rankedModels.push(m.id); });
  } else if (intentType === "vision") {
    visionModels.forEach(m => { if (!currentRankedIds.has(m.id)) rankedModels.push(m.id); });
  } else {
    textModels.forEach(m => { if (!currentRankedIds.has(m.id)) rankedModels.push(m.id); });
  }

  // Ensure all models are added if specific intent models aren't found or as a general fallback
  models.forEach(m => { if (!currentRankedIds.has(m.id)) rankedModels.push(m.id); });

  console.log("Ranked models:", rankedModels);
  return rankedModels;
}

/**
 * Select a model based on the user's intent. If no preferred model is found,
 * fall back to the first available model of the required type.
 */
async function selectModelForIntent(
  models: VeniceModel[],
  intent: "chat" | "code" | "image" | "analysis"
): Promise<string> {
  const targetType = intent === "image" ? "image" : "text";
  const filteredModels = models.filter((m) => m.type === targetType);

  if (filteredModels.length === 0) {
    throw new Error(`No ${targetType} models available`);
  }

  if (intent === "image") {
    // For image generation just return the first available model
    return filteredModels[0].id;
  }

  const preferences = {
    chat: ["llama-3.3-70b", "llama-3.2-3b", "llama"],
    code: ["qwen-2.5-coder", "qwen", "llama-3.3-70b"],
    analysis: ["llama-3.3-70b", "nous-hermes", "llama"],
  } as const;

  const intendedModels = preferences[intent];

  for (const preferred of intendedModels) {
    const model = filteredModels.find(
      (m) =>
        m.id.toLowerCase().includes(preferred.toLowerCase()) ||
        m.name.toLowerCase().includes(preferred.toLowerCase())
    );
    if (model) return model.id;
  }

  return filteredModels[0].id;
}

/**
 * Calculate the approximate VCU cost for a request based on tokens used and
 * the model name. Image models count images instead of tokens.
 */
function calculateVCUCost(tokens: number, model: string): number {
  const rates: Record<string, number> = {
    "llama-3.2-3b": 0.06,
    "llama-3.3-70b": 0.88,
    "qwen-2.5-coder-32b": 0.5,
    "nous-hermes-3-8b": 0.15,
    "flux-1.1-pro": 0.04,
    "flux-realism": 0.03,
  };

  let rate = 0.1;
  for (const [key, value] of Object.entries(rates)) {
    if (model.toLowerCase().includes(key)) {
      rate = value;
      break;
    }
  }

  if (model.includes("flux") || model.includes("image")) {
    return tokens * rate;
  }

  return (tokens / 1_000_000) * rate;
}

/**
 * Call Venice.ai with the supplied messages. Returns the response text (or
 * image URL), the model used and the total tokens consumed.
 */
async function callVeniceAI(
  apiKey: string,
  model?: string,
  intentType?: string,
) {
  console.log("CallVeniceAI:", {
    prompt: prompt.substring(0, 50),
    model,
    intentType,
  });

  // Fetch available models with caching
  const availableModels = await fetchAvailableModels(apiKey);

  // Select appropriate model
  const finalModels = selectModel(availableModels, intentType, model);
  console.log("Selected models:", finalModels, "for intent:", intentType);

  const isImageModel = availableModels.find((m) => m.id === finalModels[0])?.type === "image";

  // Image generation
  if (isImageModel || intentType === "image") {
    try {
      const imageModel = isImageModel
        ? finalModels[0]
        : availableModels.find((m) => m.type === "image")?.id;

      if (!imageModel) {
        console.log(
          "No image model available, falling back to text description"
        );
      } else {
        const imageResponse = await fetch(
          "https://api.venice.ai/api/v1/image/generate",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey.trim()}`,
            },
            body: JSON.stringify({
              model: imageModel,
              prompt,
              width: 1024,
              height: 1024,
              steps: 20,
              cfg_scale: 7.5,
              return_binary: false,
            }),
          }
        );

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          if (imageData.images && imageData.images.length > 0) {
            const imageUrl = imageData.images[0];
            const vcuCost = calculateVCUCost(100, imageModel);
            return {
              text: `![Generated Image](${imageUrl})\n\n*"${prompt}"*`,
              tokens: 100,
              model: imageModel,
              cost: vcuCost,
              vcuUsed: vcuCost,
            };
          }
        } else {
          const errorText = await imageResponse.text();
          console.error("Image generation failed:", errorText);
        }
      }

      const imageData = (await imageResponse.json()) as VeniceImageResponse;
      console.log("[callVeniceAI] Success! Generated image");
      return {
        response: imageData.data[0]?.url || "Failed to generate image",
        model,
        tokens: 1,
        responseTime: Date.now() - startTime,
      };
    }

    console.log("[callVeniceAI] Calling chat completions endpoint...");
    const response = await fetch(
      "https://api.venice.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: intentType === "code" ? 0.3 : 0.7,
          max_tokens: 2000,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Venice API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as VeniceTextResponse;
    console.log(
      `[callVeniceAI] Success! Got response with ${data.usage?.total_tokens || 0} tokens`,
    );
    return {
      response: data.choices[0]?.message?.content || "No response generated",
      model: data.model || model,
      tokens: data.usage?.total_tokens || 0,
      responseTime: Date.now() - startTime,
    };
  }

  // If all models fail
  throw new Error("All available models failed to generate a response.");
}

/** Return type for the route action. */
// Response returned to router.ts after routing a request
export type RouteReturnType = {
  response: string;
  model: string;
  tokens: number;
  providerId: Id<"providers">;
  provider: string;
  cost: number;
  responseTime: number;
  pointsAwarded: number;
};

export type RouteSimpleReturnType = {
  response: string;
  model: string;
  tokens: number;
  provider: string;
  responseTime: number;
};

/**
 * Simplified routing wrapper matching the frontend parameters.
 * Converts a single prompt into message format and maps intent types.
 */
export const routeSimple = action({
  args: {
    prompt: v.string(),
    address: v.string(),
    intentType: v.optional(
      v.union(
        v.literal("chat"),
        v.literal("code"),
        v.literal("image"),
        v.literal("analysis")
      )
    ),
  },
  returns: v.object({
    response: v.string(),
    model: v.string(),
    tokens: v.number(),
    provider: v.string(),
    responseTime: v.number(),
  }),
  handler: async (ctx, args): Promise<RouteSimpleReturnType> => {
    try {
      const messages = [
        {
          role: "user" as const,
          content: args.prompt,
        },
      ];

      const intent = args.intentType || "chat";

      const sessionId = `session-${args.address}-${Date.now()}`;

      const result: RouteReturnType = await ctx.runAction(api.inference.route, {
        messages,
        intent,
        sessionId,
        isAnonymous: args.address === "anonymous",
      });

      return {
        response: result.response,
        model: result.model,
        tokens: result.tokens,
        provider: result.provider,
        responseTime: result.responseTime,
      };
    } catch (error) {
      console.error("RouteSimple error:", error);
      throw error;
    }
  },
});

/**
 * Main inference routing action. Selects a provider, forwards the request to
 * Venice.ai and records usage. Returns the generated text or image URL.
 */
export const route = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
    intent: v.union(
      v.literal("chat"),
      v.literal("code"),
      v.literal("image"),
      v.literal("analysis")
    ),
    sessionId: v.string(),
    isAnonymous: v.boolean(),
  },
  returns: v.object({
    response: v.string(),
    model: v.string(),
    tokens: v.number(),
    providerId: v.id("providers"),
    provider: v.string(),
    cost: v.number(),
    responseTime: v.number(),
    pointsAwarded: v.number(),
  }),
  handler: async (ctx, args): Promise<RouteReturnType> => {
    console.log("[route] Starting inference routing...");
    try {
      console.log("[route] Fetching active providers...");
      const providers: Provider[] = await ctx.runQuery(api.providers.listActive);
      console.log(`[route] Found ${providers.length} providers`);

      if (providers.length === 0) {
        throw new Error("No active providers available");
      }

      const validProviders = providers.filter((p) => p.veniceApiKey);
      console.log(`[route] Found ${validProviders.length} providers with API keys`);

      if (validProviders.length === 0) {
        throw new Error("No providers with valid API keys available");
      }

      const randomProvider: Provider =
        validProviders[Math.floor(Math.random() * validProviders.length)];
      console.log(`[route] Selected provider: ${randomProvider.name}`);

      console.log("[route] Calling Venice.ai...");
      const { response, model: usedModel, tokens, responseTime } =
        await callVeniceAI(
          randomProvider.veniceApiKey as string,
          args.messages,
          args.intent,
        );
      console.log(
        `[route] Venice.ai responded successfully with model: ${usedModel}, tokens: ${tokens}`,
      );

      const vcuCost = calculateVCUCost(tokens, usedModel);

      console.log("[route] Recording inference...");
      await ctx.runMutation(api.inference.recordInference, {
        providerId: randomProvider._id,
        model: usedModel,
        intent: args.intent,
        promptTokens: Math.floor(tokens * 0.3),
        completionTokens: Math.floor(tokens * 0.7),
        totalTokens: tokens,
        vcuCost,
        sessionId: args.sessionId,
        isAnonymous: args.isAnonymous,
      });

      let pointsAwarded = 0;
      if (tokens > 0) {
        const points = Math.floor(tokens / 100);
        if (points > 0) {
          console.log(`[route] Awarding ${points} points to provider...`);
          await ctx.runMutation(api.points.awardPromptPoints, {
            providerId: randomProvider._id,
          });
          pointsAwarded = points;
        }
      }

      console.log("[route] Success! Returning response...");
      return {
        response,
        model: usedModel,
        tokens,
        providerId: randomProvider._id,
        provider: randomProvider.name,
        cost: vcuCost,
        responseTime,
        pointsAwarded,
      };
    } catch (error) {
      console.error("[route] Error in inference routing:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
});

/** Mutation to record each inference for statistics. */
export const recordInference = mutation({
  args: {
    providerId: v.id("providers"),
    model: v.string(),
    intent: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    vcuCost: v.number(),
    sessionId: v.string(),
    isAnonymous: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("inferences", {
      ...args,
      timestamp: Date.now(),
    });
    return null;
  },
});

/** Query to gather aggregated statistics on recorded inferences. */
export const getStats = query({
  args: {},
  returns: v.object({
    totalInferences: v.number(),
    totalTokens: v.number(),
    totalVCU: v.number(),
    byIntent: v.record(v.string(), v.number()),
    byModel: v.record(v.string(), v.number()),
  }),
  handler: async (ctx) => {
    const inferences = await ctx.db.query("inferences").collect();

    const totalInferences = inferences.length;
    const totalTokens = inferences.reduce(
      (sum, inf) => sum + inf.totalTokens,
      0
    );
    const totalVCU = inferences.reduce((sum, inf) => sum + inf.vcuCost, 0);

    const byIntent = inferences.reduce((acc, inf) => {
      acc[inf.intent] = (acc[inf.intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byModel = inferences.reduce((acc, inf) => {
      acc[inf.model] = (acc[inf.model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalInferences,
      totalTokens,
      totalVCU,
      byIntent,
      byModel,
    };
  },
});

/**
 * Legacy mutation kept for backwards compatibility. Records basic usage metrics
 * in the `usageLogs` table. Router.ts relies on this export.
 */
export const logUsage = mutation({
  args: {
    address: v.optional(v.string()),
    providerId: v.optional(v.id("providers")),
    model: v.string(),
    tokens: v.number(),
    createdAt: v.number(),
    latencyMs: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.insert("usageLogs", {
      address: args.address ?? "anonymous",
      providerId: args.providerId,
      model: args.model,
      tokens: args.tokens,
      latencyMs: args.latencyMs,
      createdAt: args.createdAt,
    });
  },
});

