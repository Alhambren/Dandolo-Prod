import { v } from "convex/values";
import { query, mutation, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
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
      const models = cached.models;
      if (Array.isArray(models)) {
        // Old format: return array of models
        return models.map((m: any) => ({
          id: m.id,
          name: m.name,
          type: "text", // Default type for old format
        }));
      } else {
        // New format: flatten all categories into a single array
        return [
          ...models.text.map((m: any) => ({ ...m, type: "text" })),
          ...models.code.map((m: any) => ({ ...m, type: "code" })),
          ...models.image.map((m: any) => ({ ...m, type: "image" })),
          ...models.multimodal.map((m: any) => ({ ...m, type: "multimodal" })),
          ...models.audio.map((m: any) => ({ ...m, type: "audio" })),
        ];
      }
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
        return {
          text: [],
          code: [],
          image: [],
          multimodal: [],
          audio: [],
        };
      }

      const apiKey = providers[0].veniceApiKey;

      try {
        const response = await fetch("https://api.venice.ai/api/v1/models", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });

        if (!response.ok) {
          console.error(`Venice API returned ${response.status}`);
          return {
            text: [],
            code: [],
            image: [],
            multimodal: [],
            audio: [],
          };
        }

        const data = await response.json();
        const models = data.data || [];

        const categorized = {
          text: [] as any[],
          code: [] as any[],
          image: [] as any[],
          multimodal: [] as any[],
          audio: [] as any[],
        };

        models.forEach((model: any) => {
          const modelInfo = {
            id: model.id,
            name: model.id,
            contextLength: model.context_length || 0,
          };

          const modelId = model.id.toLowerCase();

          // Updated image model detection based on Venice's actual models
          if (model.type === "image" || 
              modelId.includes("hidream") ||
              modelId.includes("venice-sd35") ||
              modelId.includes("flux-standard") ||
              modelId.includes("flux-custom") ||
              modelId.includes("lustify") ||
              modelId.includes("sd35") ||
              modelId.includes("flux") ||
              modelId.includes("stable-diffusion")) {
            categorized.image.push(modelInfo);
          } else if (model.type === "audio" || modelId.includes("whisper") || modelId.includes("speech")) {
            categorized.audio.push(modelInfo);
          } else if (modelId.includes("vision") || model.capabilities?.vision || modelId.includes("llava")) {
            categorized.multimodal.push(modelInfo);
          } else if (modelId.includes("code") || modelId.includes("deepseek") || modelId.includes("qwen-2.5-coder") || modelId.includes("starcoder")) {
            categorized.code.push(modelInfo);
          } else {
            categorized.text.push(modelInfo);
          }
        });

        return categorized;
      } catch (error) {
        console.error("Model fetch error:", error);
        return {
          text: [],
          code: [],
          image: [],
          multimodal: [],
          audio: [],
        };
      }
    } catch (error) {
      console.error("Provider fetch error:", error);
      return {
        text: [],
        code: [],
        image: [],
        multimodal: [],
        audio: [],
      };
    }
  },
});

// Replace getBestModelForIntent with a static mapping
export const getBestModelForIntent = query({
  args: {
    intentType: v.string(),
  },
  handler: async (ctx, args) => {
    const modelDefaults: Record<string, string> = {
      chat: "llama-3.3-70b",
      code: "qwen-2.5-coder-32b",
      image: "flux-1.1-pro",
      vision: "llama-3.2-vision-11b",
      audio: "whisper-large-v3",
      analysis: "llama-3.3-70b",
    };
    return modelDefaults[args.intentType] || modelDefaults.chat;
  },
});

// Update updateModelCache to only accept the new object format
export const updateModelCache = mutation({
  args: {
    models: v.object({
      text: v.array(v.object({
        id: v.string(),
        name: v.string(),
        contextLength: v.optional(v.number()),
      })),
      code: v.array(v.object({
        id: v.string(),
        name: v.string(),
        contextLength: v.optional(v.number()),
      })),
      image: v.array(v.object({
        id: v.string(),
        name: v.string(),
      })),
      multimodal: v.array(v.object({
        id: v.string(),
        name: v.string(),
        contextLength: v.optional(v.number()),
      })),
      audio: v.array(v.object({
        id: v.string(),
        name: v.string(),
      })),
    }),
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

// Remove any old-format model cache entries
export const cleanupOldModelCache = mutation({
  args: {},
  handler: async (ctx) => {
    const cache = await ctx.db.query("modelCache").first();

    if (cache && Array.isArray((cache as any).models)) {
      await ctx.db.delete(cache._id);
      console.log("Deleted old format model cache");
      return { deleted: true };
    }

    return { deleted: false };
  },
});

// Add audio and multimodal support to model cache
export const refreshModelCacheInternal = internalAction({
  args: {},
  handler: async (ctx: any) => {
    try {
      // Clean up any legacy model cache format
      await ctx.runMutation(api.models.cleanupOldModelCache);
      const providers = await ctx.runQuery(internal.providers.listActiveInternal);
      if (providers.length === 0) {
        console.log("No providers available for model refresh");
        return;
      }
      for (const provider of providers) {
        try {
          const response = await fetch("https://api.venice.ai/api/v1/models", {
            headers: {
              Authorization: `Bearer ${provider.veniceApiKey}`,
              "Content-Type": "application/json",
            },
          });
          if (response.ok) {
            const data = await response.json();
            const models = data.data || [];
            const categorized = {
              text: [] as any[],
              code: [] as any[],
              image: [] as any[],
              multimodal: [] as any[],
              audio: [] as any[],
            };
            models.forEach((model: any) => {
              const modelInfo = {
                id: model.id,
                name: model.id,
                contextLength: model.context_length || 0,
              };

              const modelId = model.id.toLowerCase();

              // Updated image model detection based on Venice's actual models
              if (model.type === "image" || 
                  modelId.includes("hidream") ||
                  modelId.includes("venice-sd35") ||
                  modelId.includes("flux-standard") ||
                  modelId.includes("flux-custom") ||
                  modelId.includes("lustify") ||
                  modelId.includes("sd35") ||
                  modelId.includes("flux")) {
                categorized.image.push(modelInfo);
              } else if (model.type === "audio" || modelId.includes("whisper")) {
                categorized.audio.push(modelInfo);
              } else if (modelId.includes("vision") || model.capabilities?.vision) {
                categorized.multimodal.push(modelInfo);
              } else if (modelId.includes("code") || modelId.includes("deepseek") || modelId.includes("qwen-2.5-coder")) {
                categorized.code.push(modelInfo);
              } else {
                categorized.text.push(modelInfo);
              }
            });
            await ctx.runMutation(internal.models.updateModelCacheInternal, {
              models: categorized,
              timestamp: Date.now(),
            });
            console.log("Model cache updated successfully with categorized models");
            return;
          }
        } catch (error) {
          console.error("Error fetching from provider:", provider.name, error);
          continue;
        }
      }
    } catch (error) {
      console.error("Model cache refresh error:", error);
    }
  },
});

export const updateModelCacheInternal = internalMutation({
  args: {
    models: v.object({
      text: v.array(v.any()),
      code: v.array(v.any()),
      image: v.array(v.any()),
      multimodal: v.array(v.any()),
      audio: v.array(v.any()),
    }),
    timestamp: v.number(),
  },
  handler: async (ctx: any, args: any) => {
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

// Internal query to get model cache
export const getModelCacheInternal = internalQuery({
  handler: async (ctx) => {
    const cached = await ctx.db.query("modelCache").first();
    return cached;
  },
});
