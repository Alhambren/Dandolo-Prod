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

// Debug query to see current providers
export const debugProviders = query({
  handler: async (ctx) => {
    const providers = await ctx.db.query("providers").collect();
    return providers.map(p => ({
      id: p._id,
      name: p.name,
      address: p.address,
      isActive: p.isActive,
      vcuBalance: p.vcuBalance,
      totalPrompts: p.totalPrompts,
      hasValidKey: p.veniceApiKey && p.veniceApiKey.length > 30 && !p.veniceApiKey.startsWith('test_'),
      keyPrefix: p.veniceApiKey ? p.veniceApiKey.substring(0, 10) + '...' : 'none'
    }));
  },
});

// Clean up test providers with invalid API keys
export const cleanupTestProviders = mutation({
  handler: async (ctx) => {
    const providers = await ctx.db.query("providers").collect();
    let removedCount = 0;
    
    for (const provider of providers) {
      // Remove providers with test keys or keys that are too short
      if (!provider.veniceApiKey || 
          provider.veniceApiKey.startsWith('test_') ||
          provider.veniceApiKey.length < 30 ||
          provider.name.toLowerCase().includes('test')) {
        
        // Remove provider points first
        const points = await ctx.db
          .query("providerPoints")
          .withIndex("by_provider", q => q.eq("providerId", provider._id))
          .first();
        if (points) {
          await ctx.db.delete(points._id);
        }
        
        // Remove provider
        await ctx.db.delete(provider._id);
        removedCount++;
      }
    }
    
    return { removedCount };
  },
});

// Check current VCU balance from Venice.ai API
export const checkVCUBalance = action({
  handler: async (ctx) => {
    const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
    if (providers.length === 0) {
      return { error: "No providers available" };
    }
    
    const results = [];
    
    for (const provider of providers) {
      try {
        const response = await fetch("https://api.venice.ai/api/v1/models", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${provider.veniceApiKey}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          const totalContextTokens = data.data?.reduce((sum: number, model: any) => {
            return sum + (model.model_spec?.availableContextTokens || 0);
          }, 0) || 0;

          // 1 VCU equals 270.54 context tokens (as per validation function)
          const currentVCU = Math.round(totalContextTokens / 270.54);
          const storedVCU = provider.vcuBalance;
          
          results.push({
            providerName: provider.name,
            address: provider.address,
            storedVCU: storedVCU,
            currentVCU: currentVCU,
            difference: currentVCU - storedVCU,
            isAccurate: Math.abs(currentVCU - storedVCU) < 10, // Allow 10 VCU tolerance
            totalModels: data.data?.length || 0,
            totalContextTokens: totalContextTokens
          });
        } else {
          const errorText = await response.text();
          results.push({
            providerName: provider.name,
            address: provider.address,
            error: `API Error: ${response.status} - ${errorText}`,
            storedVCU: provider.vcuBalance
          });
        }
      } catch (error: any) {
        results.push({
          providerName: provider.name,
          address: provider.address,
          error: error.message,
          storedVCU: provider.vcuBalance
        });
      }
    }
    
    return results;
  },
});

// Update VCU balance for all providers
export const updateAllVCUBalances = action({
  handler: async (ctx) => {
    const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
    let updatedCount = 0;
    const results = [];
    
    for (const provider of providers) {
      try {
        const validation = await ctx.runAction(api.providers.validateVeniceApiKey, {
          apiKey: provider.veniceApiKey
        });
        
        if (validation.isValid && validation.balance !== undefined) {
          await ctx.runMutation(internal.providers.updateVCUBalance, {
            providerId: provider._id,
            vcuBalance: validation.balance
          });
          
          results.push({
            providerName: provider.name,
            oldBalance: provider.vcuBalance,
            newBalance: validation.balance,
            updated: true
          });
          updatedCount++;
        } else {
          results.push({
            providerName: provider.name,
            error: validation.error || "Validation failed",
            updated: false
          });
        }
      } catch (error: any) {
        results.push({
          providerName: provider.name,
          error: error.message,
          updated: false
        });
      }
    }
    
    return { updatedCount, results };
  },
});

// Test the exact same API call that chat uses
export const testChatApiCall = action({
  handler: async (ctx) => {
    const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
    if (providers.length === 0) {
      return { error: "No providers available" };
    }
    
    const apiKey: string = providers[0].veniceApiKey;
    
    try {
      // Test the exact same call that chat makes
      const response = await fetch("https://api.venice.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b",
          messages: [
            {
              role: "user",
              content: "Hello, this is a test message"
            }
          ],
          temperature: 0.7,
          max_tokens: 100,
          stream: false,
        }),
      });

      const responseText = await response.text();
      
      return {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
        apiKeyPrefix: apiKey.substring(0, 10) + "...",
        provider: {
          name: providers[0].name,
          address: providers[0].address,
          vcuBalance: providers[0].vcuBalance
        }
      };
      
    } catch (error: any) {
      return {
        error: error.message,
        apiKeyPrefix: apiKey.substring(0, 10) + "...",
        provider: {
          name: providers[0].name,
          address: providers[0].address,
          vcuBalance: providers[0].vcuBalance
        }
      };
    }
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


// Production-safe provider listing (no sensitive data)
export const listProviders = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db.query("providers").collect();
    return providers.map(p => ({
      id: p._id,
      name: p.name,
      isActive: p.isActive,
      hasValidApiKey: !!p.veniceApiKey && p.veniceApiKey.length > 30,
      registrationDate: p.registrationDate,
      totalPrompts: p.totalPrompts || 0,
    }));
  },
});

 