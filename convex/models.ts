import { v } from "convex/values";
import { query, mutation, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";


// Cache TTL in milliseconds (30 minutes)
const CACHE_TTL = 30 * 60 * 1000;

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

    // If cache is missing or expired, return fallback models
    // This ensures the system doesn't fail even with cache issues
    if (!cached || Date.now() - cached.lastUpdated >= CACHE_TTL) {
      
      // Return basic fallback models to keep the system functional
      return [
        { id: "llama-3.3-70b", name: "llama-3.3-70b", type: "text" },
        { id: "qwen-2.5-coder-32b", name: "qwen-2.5-coder-32b", type: "code" },
      ];
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
          continue;
        }
      }
    } catch (error) {
    }
    return null;
  },
});

// Fetch models from Venice.ai and categorize by capability
export const fetchAndCategorizeModels = action({
  args: {},
  handler: async (ctx) => {

    try {
      const providers = await ctx.runQuery(internal.providers.listActiveInternal);

      if (providers.length === 0) {
        return {
          text: [],
          code: [],
          image: [],
          multimodal: [],
          audio: [],
        };
      }

      const apiKey = providers[0].veniceApiKey;

      const categorized = {
        text: [] as any[],
        code: [] as any[],
        image: [] as any[],
        multimodal: [] as any[],
        audio: [] as any[],
      };

      // Fetch models by type to get all categories
      const modelTypes = ['text', 'image', 'embedding', 'tts', 'upscale'];
      
      for (const modelType of modelTypes) {
        try {
          const response = await fetch(`https://api.venice.ai/api/v1/models?type=${modelType}`, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            const models = data.data || [];

            models.forEach((model: any) => {
              if (model.type === "image") {
                categorized.image.push(model);
              } else if (model.type === "tts") {
                categorized.audio.push(model);
              } else if (model.capabilities?.supportsVision || model.capabilities?.vision) {
                categorized.multimodal.push(model);
              } else if (model.capabilities?.optimizedForCode) {
                categorized.code.push(model);
              } else if (model.type === "text") {
                categorized.text.push(model);
              } else {
                // Default fallback for embedding, upscale, etc.
                categorized.text.push(model);
              }
            });
          }
        } catch (error) {
        }
      }

      // Log categorization results

      return categorized;
    } catch (error) {
      throw error;
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
        return;
      }
      for (const provider of providers) {
        try {
          
          const categorized = {
            text: [] as any[],
            code: [] as any[],
            image: [] as any[],
            multimodal: [] as any[],
            audio: [] as any[],
          };

          // Fetch models by type to get proper categorization
          // Using documented Venice.ai API types: "embedding", "image", "text", "tts", "upscale", "all"
          const modelTypes = ['text', 'image', 'embedding', 'tts', 'upscale'];
          
          for (const modelType of modelTypes) {
            try {
              const response = await fetch(`https://api.venice.ai/api/v1/models?type=${modelType}`, {
                headers: {
                  Authorization: `Bearer ${provider.veniceApiKey}`,
                  "Content-Type": "application/json",
                },
              });
              if (response.ok) {
                const data = await response.json();
                const models = data.data || [];
                if (models.length > 0) {
                }
                // Log each model's type for debugging
                models.forEach((model: any) => {
                });
                models.forEach((model: any) => {
                  const modelInfo = {
                    id: model.id,
                    name: model.id,
                    contextLength: model.context_length || 0,
                  };
                  // Categorize based on the API response type and capabilities
                  if (model.type === "image") {
                    categorized.image.push(modelInfo);
                  } else if (model.type === "tts") {
                    categorized.audio.push(modelInfo);
                  } else if (model.capabilities?.supportsVision || model.capabilities?.vision) {
                    categorized.multimodal.push(modelInfo);
                  } else if (model.capabilities?.optimizedForCode) {
                    categorized.code.push(modelInfo);
                  } else if (model.type === "text") {
                    categorized.text.push(modelInfo);
                  } else {
                    // Default fallback for embedding, upscale, etc.
                    categorized.text.push(modelInfo);
                  }
                });
              } else {
                const errorText = await response.text();
              }
            } catch (error) {
            }
          }
          
          await ctx.runMutation(internal.models.updateModelCacheInternal, {
            models: categorized,
            timestamp: Date.now(),
          });
          return;
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
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

// Test function to verify Venice API
export const testVeniceAPI = internalAction({
  args: {},
  returns: v.object({
    success: v.boolean(),
    imageModels: v.optional(v.number()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx: any) => {
    try {
      const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
      if (providers.length === 0) {
        return { success: false, error: "No providers available" };
      }
      
      const provider: any = providers[0];
      
      // Test the image models endpoint
      const response: Response = await fetch("https://api.venice.ai/api/v1/models?type=image", {
        headers: {
          Authorization: `Bearer ${provider.veniceApiKey}`,
          "Content-Type": "application/json",
        },
      });
      
      
      if (response.ok) {
        const data: any = await response.json();
        return { success: true, imageModels: data.data?.length || 0 };
      } else {
        const errorText: string = await response.text();
        return { success: false, error: errorText };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});
