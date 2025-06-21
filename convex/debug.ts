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

// Create multiple test providers with realistic data
export const createTestProviders = mutation({
  args: {},
  handler: async (ctx) => {
    const testProviders = [
      { name: "Test 1", totalPrompts: 1245, vcuBalance: 8500, responseTime: 850 },
      { name: "Test 2", totalPrompts: 892, vcuBalance: 6200, responseTime: 920 },
      { name: "Test 3", totalPrompts: 2134, vcuBalance: 12000, responseTime: 780 },
      { name: "Test 4", totalPrompts: 567, vcuBalance: 3500, responseTime: 1100 },
      { name: "Test 5", totalPrompts: 1789, vcuBalance: 9800, responseTime: 650 },
    ];

    const createdProviders = [];

    for (let i = 0; i < testProviders.length; i++) {
      const testData = testProviders[i];
      const address = `0x${(i + 1).toString().repeat(40)}`;
      
      // Check if provider already exists
      const existingProvider = await ctx.db
        .query("providers")
        .filter((q) => q.eq(q.field("name"), testData.name))
        .first();

      if (existingProvider) {
        // Update existing provider with realistic data
        await ctx.db.patch(existingProvider._id, {
          totalPrompts: testData.totalPrompts,
          vcuBalance: testData.vcuBalance,
          avgResponseTime: testData.responseTime,
          isActive: true,
        });

        // Update or create provider points
        const providerPoints = await ctx.db
          .query("providerPoints")
          .withIndex("by_provider", (q) => q.eq("providerId", existingProvider._id))
          .first();

        const points = Math.floor(testData.totalPrompts * 100); // 100 points per prompt

        if (providerPoints) {
          await ctx.db.patch(providerPoints._id, {
            points: points,
            totalPrompts: testData.totalPrompts,
            lastEarned: Date.now(),
          });
        } else {
          await ctx.db.insert("providerPoints", {
            providerId: existingProvider._id,
            points: points,
            totalPrompts: testData.totalPrompts,
            lastEarned: Date.now(),
          });
        }

        createdProviders.push({ id: existingProvider._id, name: testData.name, updated: true });
        console.log(`Updated existing provider: ${testData.name} with ${testData.totalPrompts} prompts`);
        continue;
      }

      // Create new provider
      const providerId = await ctx.db.insert("providers", {
        address: address,
        name: testData.name,
        description: `Test provider with ${testData.totalPrompts} served requests`,
        veniceApiKey: `test_key_${testData.name.toLowerCase().replace(' ', '_')}_${Date.now()}`,
        apiKeyHash: `hash_${i}_${Date.now()}`,
        vcuBalance: testData.vcuBalance,
        isActive: true,
        totalPrompts: testData.totalPrompts,
        registrationDate: Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
        avgResponseTime: testData.responseTime,
        status: "active" as const,
      });

      // Create provider points
      const points = Math.floor(testData.totalPrompts * 100); // 100 points per prompt
      await ctx.db.insert("providerPoints", {
        providerId: providerId,
        points: points,
        totalPrompts: testData.totalPrompts,
        lastEarned: Date.now(),
      });

      createdProviders.push({ id: providerId, name: testData.name, created: true });
      console.log(`Created new provider: ${testData.name} with ${testData.totalPrompts} prompts`);
    }

    return {
      message: `Processed ${testProviders.length} test providers`,
      providers: createdProviders,
    };
  },
});

// Fix provider data by syncing totalPrompts between providers and providerPoints tables
export const fixProviderPromptCounts = mutation({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db.query("providers").collect();
    const fixes = [];

    for (const provider of providers) {
      const providerPoints = await ctx.db
        .query("providerPoints")
        .withIndex("by_provider", (q) => q.eq("providerId", provider._id))
        .first();

      if (providerPoints) {
        // Sync the counts - use the higher value
        const actualPrompts = Math.max(provider.totalPrompts || 0, providerPoints.totalPrompts || 0);
        const actualPoints = Math.max(providerPoints.points || 0, actualPrompts * 100);

        // Update provider record
        if (provider.totalPrompts !== actualPrompts) {
          await ctx.db.patch(provider._id, {
            totalPrompts: actualPrompts,
          });
          fixes.push(`Updated ${provider.name} totalPrompts: ${provider.totalPrompts} -> ${actualPrompts}`);
        }

        // Update provider points
        if (providerPoints.totalPrompts !== actualPrompts || providerPoints.points !== actualPoints) {
          await ctx.db.patch(providerPoints._id, {
            totalPrompts: actualPrompts,
            points: actualPoints,
            lastEarned: Date.now(),
          });
          fixes.push(`Updated ${provider.name} points: ${providerPoints.points} -> ${actualPoints}`);
        }
      } else {
        // Create missing provider points record
        const points = (provider.totalPrompts || 0) * 100;
        await ctx.db.insert("providerPoints", {
          providerId: provider._id,
          points: points,
          totalPrompts: provider.totalPrompts || 0,
          lastEarned: Date.now(),
        });
        fixes.push(`Created missing provider points for ${provider.name}`);
      }
    }

    return {
      message: `Fixed ${fixes.length} provider data issues`,
      fixes: fixes,
    };
  },
}); 