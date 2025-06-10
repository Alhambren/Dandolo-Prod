import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";


// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

interface Model {
  id: string;
  name: string;
  available?: boolean;
  lastUpdated?: number;
}

interface Provider {
  _id: Id<"providers">;
  name: string;
  veniceApiKey: string;
}

// Model capability types
export interface ModelCapability {
  id: string;
  name: string;
  type?: 'text' | 'code' | 'image' | 'multimodal';
  contextLength?: number;
  pricing?: number;
}

// Query to get cached models (read-only)
export const getAvailableModels = query({
  args: {},
  handler: async (ctx) => {
    const cached = await ctx.db.query("modelCache").first();

    if (cached && Date.now() - cached.lastUpdated < CACHE_TTL) {
      return cached.models;
    }

    // Return empty array if no cache - will be populated by action
    return [];
  },
});

// Fetch and categorize models from Venice.ai

// Action to refresh model cache (can call mutations)
export const refreshModelCache = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    try {
      const providers = await ctx.runQuery(internal.providers.listActiveInternal);

      if (providers.length === 0) {
        console.log("No providers available for model refresh");
        return null;
      }

      for (const provider of providers) {
        try {
          const response = await fetch("https://api.venice.ai/api/v1/models", {
            headers: { Authorization: `Bearer ${provider.veniceApiKey}` },
          });

          if (response.ok) {
            const data = await response.json();
            const models = data.data.map((model: any) => ({
              id: model.id,
              name: model.id,
              available: true,
              lastUpdated: Date.now(),
            }));

            await ctx.runMutation(api.models.updateModelCache, {
              models,
              timestamp: Date.now(),
            });
            return null;
          }
        } catch (error) {
          console.error(
            "Error fetching models from provider:",
            provider.name,
            error,
          );
          continue;
        }
      }
    } catch (error) {
      console.error("Model cache refresh error:", error);
    }
    return null;
  },
});

// Fetch models from Venice.ai and categorize by capability
export const fetchAndCategorizeModels = action({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching models from Venice.ai...");

    try {
      const providers = await ctx.runQuery(internal.providers.listActiveInternal);
      console.log(`Found ${providers.length} providers for model fetch`);

      if (providers.length === 0) {
        console.log("No providers available");
        return { text: [], code: [], image: [], multimodal: [] };
      }

      // Use the first active provider's API key
      const apiKey = providers[0].veniceApiKey;

      try {
        const response = await fetch("https://api.venice.ai/api/v1/models", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });

        if (!response.ok) {
          console.error(`Venice API returned ${response.status}`);
          return { text: [], code: [], image: [], multimodal: [] };
        }

        const data = await response.json();
        const models = data.data || [];

        // Categorize models based on their IDs and capabilities
        const categorized = {
          text: [] as ModelCapability[],
          code: [] as ModelCapability[],
          image: [] as ModelCapability[],
          multimodal: [] as ModelCapability[],
        };

        models.forEach((model: any) => {
          const modelId = model.id.toLowerCase();
          const modelInfo: ModelCapability = {
            id: model.id,
            name: model.id,
            contextLength: model.context_length,
          };

          // Dynamic categorization based on model ID patterns
          if (
            modelId.includes("image") ||
            modelId.includes("dalle") ||
            modelId.includes("stable-diffusion") ||
            modelId.includes("midjourney") ||
            modelId.includes("fluently")
          ) {
            categorized.image.push(modelInfo);
          } else if (
            modelId.includes("code") ||
            modelId.includes("codellama") ||
            modelId.includes("deepseek") ||
            modelId.includes("starcoder")
          ) {
            categorized.code.push(modelInfo);
          } else if (
            modelId.includes("vision") ||
            modelId.includes("multimodal") ||
            modelId.includes("gpt-4v")
          ) {
            categorized.multimodal.push(modelInfo);
          } else {
            // Default to text models
            categorized.text.push(modelInfo);
          }
        });

        // No models found for some categories is acceptable

        // Store in database for quick access
        await ctx.runMutation(api.models.updateModelCache, {
          models: models.map((m: any) => ({
            id: m.id,
            name: m.id,
            available: true,
            lastUpdated: Date.now(),
          })),
          timestamp: Date.now(),
        });

        return categorized;
      } catch (error) {
        console.error("Model fetch error:", error);
        return { text: [], code: [], image: [], multimodal: [] };
      }
    } catch (error) {
      console.error("Provider fetch error:", error);
      return { text: [], code: [], image: [], multimodal: [] };
    }
  },
});

// Get best model for intent type
export const getBestModelForIntent = query({
  args: {
    intentType: v.string(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const cached = await ctx.db.query("modelCache").first();

    // Use defaults if no cache
    const models = cached?.models || [];

    // Dynamic model selection based on intent
    switch (args.intentType) {
      case "code":
        const codeModels = models.filter(
          (m) =>
            m.id.toLowerCase().includes("code") ||
            m.id.toLowerCase().includes("deepseek") ||
            m.id.toLowerCase().includes("starcoder"),
        );
        return codeModels[0]?.id || "deepseek-coder-v2-lite";

      case "image":
        const imageModels = models.filter(
          (m) =>
            m.id.toLowerCase().includes("dalle") ||
            m.id.toLowerCase().includes("stable") ||
            m.id.toLowerCase().includes("image") ||
            m.id.toLowerCase().includes("fluently"),
        );
        return imageModels[0]?.id || "fluently-xl";

      case "vision":
        const visionModels = models.filter(
          (m) =>
            m.id.toLowerCase().includes("llava") ||
            m.id.toLowerCase().includes("vision") ||
            m.id.toLowerCase().includes("gpt-4v"),
        );
        return visionModels[0]?.id || "llava-v1.6-mistral-7b";

      case "audio":
        const audioModels = models.filter(
          (m) =>
            m.id.toLowerCase().includes("whisper") ||
            m.id.toLowerCase().includes("audio") ||
            m.id.toLowerCase().includes("speech"),
        );
        return audioModels[0]?.id || "whisper-large-v3";

      case "analysis":
        const analysisModels = models.filter(
          (m) =>
            m.id.toLowerCase().includes("mixtral") ||
            m.id.toLowerCase().includes("dolphin") ||
            m.id.toLowerCase().includes("claude"),
        );
        return analysisModels[0]?.id || "dolphin-mixtral-8x7b";

      default:
        // For general chat, prefer fast models
        const chatModels = models.filter(
          (m) =>
            m.id.toLowerCase().includes("llama") ||
            m.id.toLowerCase().includes("mixtral") ||
            m.id.toLowerCase().includes("haiku"),
        );
        return chatModels[0]?.id || models[0]?.id || "llama-3.2-3b-instruct";
    }
  },
});

// Track model health
export const trackModelHealth = mutation({
  args: {
    modelId: v.string(),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
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
        isHealthy: args.success || modelHealth.failureCount < 3,
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
    return null;
  },
});

// Update model cache
export const updateModelCache = mutation({
  args: {
    models: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        available: v.boolean(),
        lastUpdated: v.number(),
      }),
    ),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("modelCache").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        models: args.models,
        lastUpdated: args.timestamp,
      });
    } else {
      await ctx.db.insert("modelCache", {
        models: args.models,
        lastUpdated: args.timestamp,
      });
    }
  },
});
