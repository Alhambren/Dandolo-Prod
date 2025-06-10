// convex/inference.ts - Dynamic model selection and inference handling
// -------------------------------------------------------------------
// This module defines actions and mutations for routing prompts through
// Venice.ai models. It dynamically selects an appropriate model based on
// the requested intent (chat, code, image, analysis) and tracks usage
// statistics. VCUs (Venice Compute Units) are calculated per request to
// monitor provider balances.

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

/** Venice.ai model information returned from the models endpoint. */
interface VeniceModel {
  id: string;
  name: string;
  type: "text" | "image";
  owned_by?: string;
  created?: number;
}

/** Response wrapper for the models list endpoint. */
interface VeniceModelsResponse {
  data: VeniceModel[];
}

/** Message format for chat completions. */
interface VeniceMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Response structure for chat completions. */
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

/** Response structure for image generation. */
interface VeniceImageResponse {
  data: Array<{
    url: string;
  }>;
}

/**
 * Select an appropriate model for a given intent. Models are filtered by type
 * and then matched against a preference list. If no preferred model is found
 * the first available model of the required type is returned.
 */
async function selectModelForIntent(
  models: VeniceModel[],
  intent: "chat" | "code" | "image" | "analysis"
): Promise<string> {
  // Filter first by model type
  const targetType = intent === "image" ? "image" : "text";
  const filtered = models.filter((m) => m.type === targetType);

  if (filtered.length === 0) {
    throw new Error(`No ${targetType} models available`);
  }

  if (intent === "image") {
    // Any image model works, return the first
    return filtered[0].id;
  }

  const preferences: Record<string, string[]> = {
    chat: ["llama-3.3-70b", "llama-3.2-3b", "llama"],
    code: ["qwen-2.5-coder", "qwen", "llama-3.3-70b"],
    analysis: ["llama-3.3-70b", "nous-hermes", "llama"],
  };

  const intended = preferences[intent] || [];

  for (const pref of intended) {
    const match = filtered.find(
      (m) =>
        m.id.toLowerCase().includes(pref.toLowerCase()) ||
        m.name.toLowerCase().includes(pref.toLowerCase())
    );
    if (match) return match.id;
  }

  // Fallback: just use the first available
  return filtered[0].id;
}

/**
 * Estimate the Venice Compute Unit (VCU) cost for a request given the token
 * usage and model used. Rates are approximate and may change.
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

  let rate = 0.1; // default
  for (const [key, value] of Object.entries(rates)) {
    if (model.toLowerCase().includes(key)) {
      rate = value;
      break;
    }
  }

  // Image models count images instead of tokens
  if (model.includes("flux") || model.includes("image")) {
    return tokens * rate;
  }

  return (tokens / 1_000_000) * rate;
}

/**
 * Call Venice.ai with the provided messages and intent. Returns the response
 * text (or image URL), the model used and total tokens consumed.
 */
async function callVeniceAI(
  apiKey: string,
  messages: VeniceMessage[],
  intent: "chat" | "code" | "image" | "analysis"
): Promise<{ response: string; model: string; tokens: number }> {
  // Retrieve available models for dynamic selection
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

  // Image generation path
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

  // Text generation path
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
}

/**
 * Primary action used by the router to dispatch prompts. Selects a provider,
 * calls Venice.ai, records usage and returns the response back to the caller.
 */
export const route = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
    intent: v.union(v.literal("chat"), v.literal("code"), v.literal("image"), v.literal("analysis")),
    sessionId: v.string(),
    isAnonymous: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Retrieve active providers
    const providers = await ctx.runQuery(api.providers.listActive);
    if (providers.length === 0) {
      throw new Error("No active providers available");
    }

    // Simple round-robin selection
    const randomProvider = providers[Math.floor(Math.random() * providers.length)];
    if (!randomProvider.veniceApiKey) {
      throw new Error("Selected provider has no API key");
    }

    // Call Venice.ai
    const { response, model: usedModel, tokens } = await callVeniceAI(
      randomProvider.veniceApiKey,
      args.messages,
      args.intent
    );

    const vcuCost = calculateVCUCost(tokens, usedModel);

    // Record the inference for analytics
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

    // Award provider points based on usage
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
  },
});

/**
 * Mutation to persist inference records for later statistics.
 */
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
  handler: async (ctx, args) => {
    await ctx.db.insert("inferences", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

/**
 * Query to gather statistics about all recorded inferences.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const inferences = await ctx.db.query("inferences").collect();

    const totalInferences = inferences.length;
    const totalTokens = inferences.reduce((sum, inf) => sum + inf.totalTokens, 0);
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
 * Backwards compatible mutation for logging basic usage metrics. Router.ts
 * expects this export. Records are stored in the `usageLogs` table.
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
