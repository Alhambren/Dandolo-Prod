import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Fallback model list if API fails
const FALLBACK_MODELS = [
  { id: "gpt-4", name: "GPT-4" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
  { id: "meta-llama/Llama-2-70b-chat-hf", name: "Llama 3" },
  { id: "mistralai/Mixtral-8x7B-Instruct-v0.1", name: "Mixtral" },
  { id: "codellama/CodeLlama-34b-Instruct-hf", name: "CodeLlama" },
  { id: "deepseek-ai/deepseek-coder-33b-instruct", name: "DeepSeek Coder" }
];

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Get available models from Venice.ai API
export const getAvailableModels = query({
  args: {},
  handler: async (ctx) => {
    // Check cache first
    const cached = await ctx.db
      .query("modelCache")
      .first();

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.models;
    }

    // Get active providers
    const providers = await ctx.runQuery(internal.providers.listActiveInternal);
    if (providers.length === 0) {
      return FALLBACK_MODELS;
    }

    // Try each provider until we get a successful response
    for (const provider of providers) {
      try {
        const response = await fetch("https://api.venice.ai/api/v1/models", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${provider.veniceApiKey}`,
          },
        });

        if (!response.ok) {
          continue; // Try next provider
        }

        const data = await response.json();
        const models = data.data.map((model: any) => ({
          id: model.id,
          name: model.name || model.id.split("/").pop() || model.id,
        }));

        // Update cache
        await ctx.runMutation(internal.models.updateModelCache, {
          models,
          timestamp: Date.now(),
        });

        return models;
      } catch (error) {
        console.error("Failed to fetch models from provider:", provider.name, error);
        continue; // Try next provider
      }
    }

    // If all providers fail, return fallback list
    return FALLBACK_MODELS;
  },
});

// Track model health
export const trackModelHealth = mutation({
  args: {
    modelId: v.string(),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const modelHealth = await ctx.db
      .query("modelHealth")
      .withIndex("by_model", (q) => q.eq("modelId", args.modelId))
      .first();

    if (modelHealth) {
      // Update existing health record
      await ctx.db.patch(modelHealth._id, {
        lastUsed: now,
        successCount: modelHealth.successCount + (args.success ? 1 : 0),
        failureCount: modelHealth.failureCount + (args.success ? 0 : 1),
        lastError: args.success ? undefined : args.error,
        isHealthy: args.success || modelHealth.failureCount < 3, // Mark unhealthy after 3 failures
      });
    } else {
      // Create new health record
      await ctx.db.insert("modelHealth", {
        modelId: args.modelId,
        lastUsed: now,
        successCount: args.success ? 1 : 0,
        failureCount: args.success ? 0 : 1,
        lastError: args.success ? undefined : args.error,
        isHealthy: true,
      });
    }
  },
});

// Internal function to update model cache
export const updateModelCache = mutation({
  args: {
    models: v.array(v.object({
      id: v.string(),
      name: v.string(),
    })),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("modelCache")
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        models: args.models,
        timestamp: args.timestamp,
      });
    } else {
      await ctx.db.insert("modelCache", {
        models: args.models,
        timestamp: args.timestamp,
      });
    }
  },
}); 