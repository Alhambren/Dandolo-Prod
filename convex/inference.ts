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

// Preferred image model order
const PREFERRED_IMAGE_MODELS = [
  "venice-sd35",
  "stable-diffusion-3.5",
  "hidream",
  "flux-dev"
];

/**
 * Fetch available models from persistent DB cache
 */
async function fetchAvailableModelsFromCache(ctx: any): Promise<any[]> {
  return await ctx.runQuery(api.models.getAvailableModels, {});
}

/**
 * Select the best image model from available models
 */
function selectBestImageModel(models: any[]): string | undefined {
  const imageModels = models.filter((m) => m.type === "image");
  console.log("selectBestImageModel - Total models:", models.length);
  console.log("selectBestImageModel - Image models found:", imageModels.length);
  console.log("selectBestImageModel - Image model IDs:", imageModels.map(m => m.id));
  
  for (const preferred of PREFERRED_IMAGE_MODELS) {
    const found = imageModels.find((m) => m.id === preferred);
    if (found) {
      console.log("selectBestImageModel - Selected preferred model:", found.id);
      return found.id;
    }
  }
  // Fallback: return first available image model
  const fallback = imageModels[0]?.id;
  console.log("selectBestImageModel - Using fallback model:", fallback);
  return fallback;
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
  ctx: any,
  apiKey: string,
  messages: VeniceMessage[],
  intentType?: string,
  prompt?: string,
  model?: string,
) {
  const startTime = Date.now();
  const promptText = prompt || (messages && messages.length > 0 ? messages[0].content : "");
  console.log("CallVeniceAI:", {
    prompt: promptText.substring(0, 50),
    model,
    intentType,
  });

  // TEMPORARY: Direct image generation bypass
  if (intentType === "image") {
    console.log("BYPASS: Direct image generation for intentType=image");
    try {
      const imageResponse = await fetch("https://api.venice.ai/api/v1/image/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: "venice-sd35",
          prompt: promptText,
          width: 512,
          height: 512,
        }),
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const imageUrl = imageData.images?.[0];
        if (imageUrl) {
          return {
            response: `![Generated Image](data:image/webp;base64,${imageUrl})`,
            model: "venice-sd35",
            tokens: 100,
            responseTime: Date.now() - startTime,
          };
        }
      } else {
        const errorText = await imageResponse.text();
        console.error("BYPASS: Image generation failed:", errorText);
        throw new Error(`Image generation failed: ${errorText}`);
      }
    } catch (error) {
      console.error("BYPASS: Image generation error:", error);
      throw error;
    }
  }

  // Fetch available models from persistent cache
  const availableModels = await fetchAvailableModelsFromCache(ctx);
  console.log("Available models (from cache):", availableModels.map(m => ({ id: m.id, type: m.type, name: m.name })));
  console.log("Intent type:", intentType);
  console.log("Available models count:", availableModels.length);

  // Select appropriate model
  let selectedModel: string | undefined = model;
  if (!selectedModel) {
    if (intentType === "image") {
      console.log("Using image model selection");
      selectedModel = selectBestImageModel(availableModels);
      console.log("Selected image model:", selectedModel);
    } else {
      console.log("Using text model selection for intent:", intentType);
      // Use existing selectModel logic for text/code/etc
      const ranked = selectModel(availableModels, intentType);
      console.log("Ranked models:", ranked);
      selectedModel = ranked[0];
      console.log("Selected text model:", selectedModel);
      
      // Fallback to first available text model if no ranked models found
      if (!selectedModel && availableModels.length > 0) {
        const textModels = availableModels.filter(m => m.type === "text");
        console.log("Using fallback text models:", textModels.map(m => m.id));
        selectedModel = textModels[0]?.id;
        console.log("Fallback selected model:", selectedModel);
      }
    }
  }
  if (!selectedModel) {
    throw new Error("No suitable model found for the requested intent.");
  }
  console.log("Selected model:", selectedModel, "for intent:", intentType);
  console.log("Final request body model:", model || selectedModel);

  const isImageModel = availableModels.find((m) => m.id === selectedModel)?.type === "image";
  console.log("Is selected model an image model?", isImageModel);

  // Image generation
  if (isImageModel || intentType === "image") {
    console.log("=== IMAGE GENERATION BLOCK ===");
    console.log("isImageModel:", isImageModel);
    console.log("intentType:", intentType);
    console.log("selectedModel:", selectedModel);
    
    // Force use venice-sd35 for now to bypass model selection issues
    let imageModel = "venice-sd35";
    console.log("Using hardcoded model for debugging:", imageModel);
    // imageModel is guaranteed to be a string here
    console.log("Image model selected:", imageModel);
    console.log("Available image models:", availableModels.filter(m => m.type === "image").map(m => m.id));

    const imageResponse = await fetch(
      "https://api.venice.ai/api/v1/image/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model || imageModel,
          prompt: promptText,
          width: 1024,
          height: 1024,
          steps: 20,
          cfg_scale: 7.5,
          return_binary: false,
        }),
      }
    );

    if (imageResponse.ok) {
      const imageData = (await imageResponse.json()) as VeniceImageResponse;
      if (imageData.data && imageData.data.length > 0) {
        const imageUrl = imageData.data[0].url;
        const vcuCost = calculateVCUCost(100, imageModel);
        return {
          response: `![Generated Image](${imageUrl})\n\n*\"${promptText}\"*`,
          model: imageModel,
          tokens: 100,
          cost: vcuCost,
          responseTime: Date.now() - startTime,
        };
      }
    } else {
      const errorText = await imageResponse.text();
      console.error("Image generation failed:", errorText);
      throw new Error("Image generation failed: " + errorText);
    }
    throw new Error("No image model available for image generation.");
  }

  // Text/completions branch
  try {
    const response = await fetch(
      "https://api.venice.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || selectedModel,
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
      model: data.model || model || selectedModel,
      tokens: data.usage?.total_tokens || 0,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[callVeniceAI] Error:", error);
    throw error;
  }
}

/** Return type for the route action. */
// Response returned to router.ts after routing a request
export type RouteReturnType = {
  response: string;
  model: string;
  totalTokens: number;
  providerId: Id<"providers">;
  provider: string;
  cost: number;
  responseTime: number;
  pointsAwarded: number;
  address?: string;
  intent: string;
  vcuCost: number;
};

export type RouteSimpleReturnType = {
  response: string;
  model: string;
  totalTokens: number;
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
    totalTokens: v.number(),
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
        totalTokens: result.totalTokens,
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
    address: v.optional(v.string()),
  },
  returns: v.object({
    response: v.string(),
    model: v.string(),
    totalTokens: v.number(),
    providerId: v.id("providers"),
    provider: v.string(),
    cost: v.number(),
    responseTime: v.number(),
    pointsAwarded: v.number(),
    address: v.optional(v.string()),
    intent: v.string(),
    vcuCost: v.number(),
  }),
  handler: async (ctx, args): Promise<RouteReturnType> => {
    console.log("[route] Starting inference routing...");
    try {
      console.log("[route] Fetching active providers...");
      const providers: Provider[] = await ctx.runQuery(internal.providers.listActiveInternal);
      console.log(`[route] Found ${providers.length} providers`);
      
      // Debug: Log each provider's details
      providers.forEach((provider, index) => {
        console.log(`[route] Provider ${index}:`, {
          id: provider._id,
          name: provider.name,
          isActive: provider.isActive,
          hasApiKey: !!provider.veniceApiKey,
          apiKeyLength: provider.veniceApiKey?.length || 0,
          apiKeyPreview: provider.veniceApiKey ? `${provider.veniceApiKey.substring(0, 10)}...` : 'none'
        });
      });

      if (providers.length === 0) {
        // Return a helpful error message instead of throwing
        return {
          response: "Sorry, no AI providers are currently available. Please try again later or contact support.",
          model: "error",
          totalTokens: 0,
          providerId: "error" as any,
          provider: "System",
          cost: 0,
          responseTime: 0,
          pointsAwarded: 0,
          address: args.address,
          intent: args.intent,
          vcuCost: 0,
        };
      }

      const validProviders = providers.filter((p) => p.veniceApiKey);
      console.log(`[route] Found ${validProviders.length} providers with API keys`);
      
      // Debug: Log which providers passed the filter
      validProviders.forEach((provider, index) => {
        console.log(`[route] Valid provider ${index}:`, {
          id: provider._id,
          name: provider.name,
          apiKeyLength: provider.veniceApiKey?.length || 0,
          apiKeyPreview: provider.veniceApiKey ? `${provider.veniceApiKey.substring(0, 10)}...` : 'none'
        });
      });

      if (validProviders.length === 0) {
        return {
          response: "Sorry, no AI providers with valid API keys are currently available. Please try again later.",
          model: "error",
          totalTokens: 0,
          providerId: "error" as any,
          provider: "System",
          cost: 0,
          responseTime: 0,
          pointsAwarded: 0,
          address: args.address,
          intent: args.intent,
          vcuCost: 0,
        };
      }

      const randomProvider: Provider =
        validProviders[Math.floor(Math.random() * validProviders.length)];
      console.log(`[route] Selected provider: ${randomProvider.name}`);

      console.log("[route] Calling Venice.ai...");
      const { response, model: usedModel, tokens, responseTime } =
        await callVeniceAI(
          ctx,
          randomProvider.veniceApiKey as string,
          args.messages,
          args.intent,
          args.messages[0]?.content,
          args.messages[0]?.role === "system" ? args.messages[0]?.content : undefined
        );
      console.log(
        `[route] Venice.ai responded successfully with model: ${usedModel}, tokens: ${tokens}`,
      );

      const vcuCost = calculateVCUCost(tokens, usedModel);

      console.log("[route] Recording inference...");
      await ctx.runMutation(api.inference.recordInference, {
        address: 'anonymous',
        providerId: randomProvider._id,
        model: usedModel,
        intent: args.intent,
        totalTokens: tokens,
        vcuCost,
        timestamp: Date.now(),
      });

      let pointsAwarded = 0;
      if (tokens > 0) {
        const points = Math.floor(tokens / 100);
        if (points > 0) {
          console.log(`[route] Awarding ${points} points to provider...`);
          await ctx.runMutation(internal.points.awardProviderPoints, {
            providerId: randomProvider._id,
            tokens: tokens,
          });
          pointsAwarded = points;
        }
      }

      console.log("[route] Success! Returning response...");
      return {
        response,
        model: usedModel,
        totalTokens: tokens,
        providerId: randomProvider._id,
        provider: randomProvider.name,
        cost: vcuCost,
        responseTime,
        pointsAwarded,
        address: args.address,
        intent: args.intent,
        vcuCost,
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
    address: v.string(),
    providerId: v.id("providers"),
    model: v.string(),
    intent: v.string(),
    totalTokens: v.number(),
    vcuCost: v.number(),
    timestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("inferences", {
      address: args.address,
      providerId: args.providerId,
      model: args.model,
      intent: args.intent,
      totalTokens: args.totalTokens,
      vcuCost: args.vcuCost,
      timestamp: args.timestamp,
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

