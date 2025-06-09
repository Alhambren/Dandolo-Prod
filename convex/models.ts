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

// Model capability types
export interface ModelCapability {
  id: string;
  name: string;
  type: 'text' | 'code' | 'image' | 'multimodal';
  contextLength?: number;
  pricing?: number;
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

// Fetch models from Venice.ai and categorize by capability
export const fetchAndCategorizeModels = action({
  args: {},
  returns: v.object({
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
  }),
  handler: async (ctx) => {
    console.log("Fetching models from Venice.ai...");
    const providers = await ctx.runQuery(internal.providers.listActiveInternal);
    console.log(`Found ${providers.length} providers for model fetch`);

    if (providers.length === 0) {
      console.log("No providers available, returning default models");
      return {
        text: [
          { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
          { id: "gpt-4", name: "GPT-4" },
        ],
        code: [
          { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo (Code)" },
        ],
        image: [
          { id: "dalle-3", name: "DALL-E 3" },
        ],
        multimodal: [],
      };
    }

    // Use the first active provider's API key
    const apiKey = providers[0].veniceApiKey;

    try {
      const response = await fetch("https://api.venice.ai/api/v1/models", {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.error(`Venice API returned ${response.status}: ${await response.text()}`);
        throw new Error(`Failed to fetch models: ${response.status}`);
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
        let modelInfo: ModelCapability = {
          id: model.id,
          name: model.id,
          contextLength: model.context_length,
          type: 'text',
        };

        // Dynamic categorization based on model ID patterns
        if (modelId.includes('image') || 
            modelId.includes('dalle') || 
            modelId.includes('stable-diffusion') ||
            modelId.includes('midjourney')) {
          modelInfo = { ...modelInfo, type: 'image' };
          categorized.image.push(modelInfo);
        } else if (modelId.includes('code') || 
                   modelId.includes('codellama') || 
                   modelId.includes('deepseek') ||
                   modelId.includes('starcoder')) {
          modelInfo = { ...modelInfo, type: 'code' };
          categorized.code.push(modelInfo);
        } else if (modelId.includes('vision') || 
                   modelId.includes('multimodal') ||
                   modelId.includes('gpt-4v')) {
          modelInfo = { ...modelInfo, type: 'multimodal' };
          categorized.multimodal.push(modelInfo);
        } else {
          // Default to text models
          categorized.text.push(modelInfo);
        }
      });

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

      // Return fallback models
      return {
        text: [
          { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
          { id: "gpt-4", name: "GPT-4" },
        ],
        code: [
          { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo (Code)" },
        ],
        image: [
          { id: "dalle-3", name: "DALL-E 3" },
        ],
        multimodal: [],
      };
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
    
    if (!cached || Date.now() - cached.lastUpdated > 3600000) { // 1 hour cache
      return null; // Trigger refresh
    }

    const models = cached.models.filter(m => m.available);
    
    // Dynamic model selection based on intent
    switch (args.intentType) {
      case 'code':
        const codeModels = models.filter(m => 
          m.id.toLowerCase().includes('code') ||
          m.id.toLowerCase().includes('deepseek') ||
          m.id.toLowerCase().includes('starcoder')
        );
        return codeModels[0]?.id || models[0]?.id || "gpt-3.5-turbo";
        
      case 'image':
        const imageModels = models.filter(m => 
          m.id.toLowerCase().includes('dalle') ||
          m.id.toLowerCase().includes('stable') ||
          m.id.toLowerCase().includes('image')
        );
        return imageModels[0]?.id || "dalle-3";
        
      case 'analysis':
        const analysisModels = models.filter(m => 
          m.id.toLowerCase().includes('gpt-4') ||
          m.id.toLowerCase().includes('claude')
        );
        return analysisModels[0]?.id || "gpt-4";
        
      default:
        // For general chat, prefer fast models
        const chatModels = models.filter(m => 
          m.id.toLowerCase().includes('turbo') ||
          m.id.toLowerCase().includes('haiku')
        );
        return chatModels[0]?.id || models[0]?.id || "gpt-3.5-turbo";
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

// Update model cache
export const updateModelCache = mutation({
  args: {
    models: v.array(v.object({
      id: v.string(),
      name: v.string(),
      available: v.boolean(),
      lastUpdated: v.number(),
    })),
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