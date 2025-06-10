// convex/inference.ts - Complete fixed version
// -------------------------------------------------
// This module handles routing prompts to Venice.ai models. It dynamically
// selects a model based on the intent (chat, code, image, analysis), calculates
// the VCU cost of each request and records usage stats. All external calls are
// wrapped with appropriate error handling.

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
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
interface Provider {
  _id: Id<"providers">;
  veniceApiKey: string;
  name: string;
  isActive: boolean;
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
  messages: VeniceMessage[],
  intent: "chat" | "code" | "image" | "analysis"
): Promise<{ response: string; model: string; tokens: number }> {
  try {
    // Fetch available models for selection
    const modelsResponse = await fetch("https://api.venice.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!modelsResponse.ok) {
      throw new Error(`Failed to fetch models: ${modelsResponse.statusText}`);
    }

    const modelsData = (await modelsResponse.json()) as VeniceModelsResponse;
    const model = await selectModelForIntent(modelsData.data, intent);

    if (intent === "image") {
      const imageResponse = await fetch(
        "https://api.venice.ai/api/v1/images/generations",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            prompt: messages[messages.length - 1].content,
            n: 1,
            size: "1024x1024",
          }),
        }
      );

      if (!imageResponse.ok) {
        const error = await imageResponse.text();
        throw new Error(`Venice API error: ${imageResponse.status} - ${error}`);
      }

      const imageData = (await imageResponse.json()) as VeniceImageResponse;
      return {
        response: imageData.data[0]?.url || "Failed to generate image",
        model,
        tokens: 1,
      };
    }

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
          temperature: intent === "code" ? 0.3 : 0.7,
          max_tokens: 2000,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Venice API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as VeniceTextResponse;
    return {
      response: data.choices[0]?.message?.content || "No response generated",
      model: data.model || model,
      tokens: data.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error("Venice API call failed:", error);
    throw error;
  }
}

/** Return type for the route action. */
type RouteReturnType = {
  response: string;
  model: string;
  tokens: number;
  providerId: Id<"providers">;
};

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
  }),
  handler: async (ctx, args): Promise<RouteReturnType> => {
    try {
      const providers: Provider[] = await ctx.runQuery(api.providers.listActive);

      if (providers.length === 0) {
        throw new Error("No active providers available");
      }

      const randomProvider: Provider =
        providers[Math.floor(Math.random() * providers.length)];

      if (!randomProvider.veniceApiKey) {
        throw new Error("Selected provider has no API key");
      }

      const { response, model: usedModel, tokens } = await callVeniceAI(
        randomProvider.veniceApiKey,
        args.messages,
        args.intent
      );

      const vcuCost = calculateVCUCost(tokens, usedModel);

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

      if (tokens > 0) {
        const points = Math.floor(tokens / 100);
        if (points > 0) {
          await ctx.runMutation(api.points.awardPoints, {
            providerId: randomProvider._id,
            points,
            reason: `Processed ${tokens} tokens`,
          });
        }
      }

      return {
        response,
        model: usedModel,
        tokens,
        providerId: randomProvider._id,
      };
    } catch (error) {
      console.error("Inference routing error:", error);
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

