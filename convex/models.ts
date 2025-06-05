import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

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

interface Model {
  id: string;
  name: string;
}

interface Provider {
  _id: Id<"providers">;
  name: string;
  veniceApiKey: string;
}

// Query to get cached models (read-only)
export const getAvailableModels = query({
  args: {},
  returns: v.array(v.object({
    id: v.string(),
    name: v.string(),
    available: v.boolean(),
    lastUpdated: v.number()
  })),
  handler: async (ctx) => {
    // Get cached models from database
    const cached = await ctx.db.query("modelCache").first();
    
    if (cached && Date.now() - cached.lastUpdated < 5 * 60 * 1000) {
      return cached.models;
    }
    
    // Return fallback models if cache is stale/empty
    return [
      { id: "gpt-4", name: "GPT-4", available: true, lastUpdated: Date.now() },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", available: true, lastUpdated: Date.now() },
      { id: "claude-3-sonnet", name: "Claude 3 Sonnet", available: true, lastUpdated: Date.now() }
    ];
  }
});

// Action to refresh model cache (can call mutations)
export const refreshModelCache = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
    
    for (const provider of providers) {
      try {
        const response: Response = await fetch("https://api.venice.ai/api/v1/models", {
          headers: { "Authorization": `Bearer ${provider.veniceApiKey}` }
        });
        
        if (response.ok) {
          const data: any = await response.json();
          const models = data.data.map((model: any) => ({
            id: model.id,
            name: model.id,
            available: true,
            lastUpdated: Date.now()
          }));
          
          await ctx.runMutation(api.models.updateModelCache, {
            models,
            timestamp: Date.now()
          });
          return null;
        }
      } catch (error) {
        continue;
      }
    }
    return null;
  }
});

// Internal mutation to update cache
export const updateModelCache = mutation({
  args: {
    models: v.array(v.object({
      id: v.string(),
      name: v.string(),
      available: v.boolean(),
      lastUpdated: v.number()
    })),
    timestamp: v.number()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("modelCache").first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        models: args.models,
        lastUpdated: args.timestamp
      });
    } else {
      await ctx.db.insert("modelCache", {
        models: args.models,
        lastUpdated: args.timestamp
      });
    }
    return null;
  }
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
    return null;
  },
}); 