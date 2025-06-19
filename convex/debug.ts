import { query, action, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

// Debug query to see what models are available
export const debugModels = query({
  handler: async (ctx) => {
    const cache = await ctx.db.query("modelCache").first();
    return {
      lastUpdated: cache?.lastUpdated,
      models: cache?.models,
      hasImageModels: !!(cache?.models && Array.isArray(cache.models.image) && cache.models.image.length > 0),
    };
  },
});

// Action to manually refresh models
export const manualRefreshModels = action({
  handler: async (ctx) => {
    await ctx.runAction(internal.models.refreshModelCacheInternal);
    return "Model cache refreshed!";
  },
});

// Test Venice API endpoints
export const testVeniceEndpoints = action({
  handler: async (ctx): Promise<any[]> => {
    const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
    if (providers.length === 0) {
      return [{ error: "No providers available" }];
    }
    
    const apiKey: string = providers[0].veniceApiKey;
    const results: any[] = [];
    
    // Test different endpoints
    const endpoints = [
      "https://api.venice.ai/api/v1/models",
      "https://api.venice.ai/api/v1/models?type=text",
      "https://api.venice.ai/api/v1/models?type=image",
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response: Response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        results.push({
          endpoint,
          status: response.status,
          ok: response.ok,
          data: response.ok ? await response.json() : await response.text(),
        });
      } catch (error: any) {
        results.push({
          endpoint,
          error: error.message,
        });
      }
    }
    
    return results;
  },
});

// Test chat completions endpoint with a known model
export const testChatCompletion = action({
  handler: async (ctx): Promise<any> => {
    const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
    if (providers.length === 0) {
      return { error: "No providers available" };
    }
    
    const apiKey: string = providers[0].veniceApiKey;
    
    try {
      const response: Response = await fetch("https://api.venice.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.2-3b",
          messages: [
            { role: "user", content: "Hello! Please respond with 'API test successful'." }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });
      
      return {
        status: response.status,
        ok: response.ok,
        data: response.ok ? await response.json() : await response.text(),
      };
    } catch (error: any) {
      return { error: error.message };
    }
  },
});

// Test what inference function gets for models
export const testInferenceModels = action({
  handler: async (ctx): Promise<any> => {
    try {
      // This simulates what callVeniceAI does
      const availableModels: any[] = await ctx.runQuery(api.models.getAvailableModels, {});
      
      return {
        total: availableModels.length,
        imageModels: availableModels.filter((m: any) => m.type === "image").length,
        imageModelIds: availableModels.filter((m: any) => m.type === "image").map((m: any) => m.id),
        allTypes: [...new Set(availableModels.map((m: any) => m.type))],
        sampleModels: availableModels.slice(0, 5).map((m: any) => ({ id: m.id, type: m.type }))
      };
    } catch (error: any) {
      return { error: error.message };
    }
  },
});

// Direct image generation test
export const testDirectImageGeneration = action({
  handler: async (ctx): Promise<any> => {
    try {
      const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
      if (providers.length === 0) {
        return { error: "No providers available" };
      }
      
      const apiKey: string = providers[0].veniceApiKey;
      
      const response: Response = await fetch("https://api.venice.ai/api/v1/image/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "venice-sd35",
          prompt: "A simple red apple on a white background",
          width: 512,
          height: 512,
        }),
      });
      
      return {
        status: response.status,
        ok: response.ok,
        data: response.ok ? await response.json() : await response.text(),
      };
    } catch (error: any) {
      return { error: error.message };
    }
  },
});

// Development helper to create a test provider
export const createTestProvider = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if test provider already exists
    const existingTestProvider = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("name"), "Test Provider"))
      .first();

    if (existingTestProvider) {
      console.log("Test provider already exists:", existingTestProvider._id);
      return existingTestProvider._id;
    }

    // Create test provider
    const providerId = await ctx.db.insert("providers", {
      address: "0x0000000000000000000000000000000000000000",
      name: "Test Provider",
      description: "Development test provider",
      veniceApiKey: "test_api_key_123",
      apiKeyHash: "test_hash",
      vcuBalance: 1000,
      isActive: true,
      totalPrompts: 0,
      registrationDate: Date.now(),
      avgResponseTime: 1000,
      status: "active" as const,
    });

    // Initialize points
    await ctx.db.insert("providerPoints", {
      providerId: providerId,
      points: 0,
      totalPrompts: 0,
      lastEarned: Date.now(),
    });

    console.log("Created test provider:", providerId);
    return providerId;
  },
});

// Development helper to list all providers
export const listAllProviders = mutation({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db.query("providers").collect();
    console.log("All providers:", providers.map(p => ({
      id: p._id,
      name: p.name,
      isActive: p.isActive,
      hasApiKey: !!p.veniceApiKey
    })));
    return providers.length;
  },
});

// Development helper to list all providers with API key info
export const listAllProvidersWithKeys = mutation({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db.query("providers").collect();
    console.log("All providers with API key info:");
    providers.forEach(p => {
      console.log({
        id: p._id,
        name: p.name,
        isActive: p.isActive,
        hasApiKey: !!p.veniceApiKey,
        apiKeyLength: p.veniceApiKey?.length || 0,
        apiKeyPreview: p.veniceApiKey ? `${p.veniceApiKey.substring(0, 10)}...` : 'none'
      });
    });
    return providers.length;
  },
});

// PUBLIC: List all providers and their API key status
export const listAllProvidersPublic = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db.query("providers").collect();
    return providers.map(p => ({
      id: p._id,
      name: p.name,
      isActive: p.isActive,
      veniceApiKey: p.veniceApiKey,
      apiKeyLength: p.veniceApiKey?.length || 0,
      apiKeyPreview: p.veniceApiKey ? `${p.veniceApiKey.substring(0, 10)}...` : 'none'
    }));
  },
}); 