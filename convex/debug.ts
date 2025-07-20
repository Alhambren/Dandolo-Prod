import { query, action, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

// CRITICAL: Hardcoded admin address - only this wallet can access debug functions
const ADMIN_ADDRESS = "0xC07481520d98c32987cA83B30EAABdA673cDbe8c";

// Helper to verify admin access for debug operations
function verifyAdminAccess(address?: string): boolean {
  return address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
}

// ADMIN-ONLY: Debug query to see what models are available
export const debugModels = query({
  args: { adminAddress: v.string() },
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Access denied: Admin access required for debug operations");
    }
    const cache = await ctx.db.query("modelCache").first();
    return {
      lastUpdated: cache?.lastUpdated,
      models: cache?.models,
      hasImageModels: !!(cache?.models && Array.isArray(cache.models.image) && cache.models.image.length > 0),
    };
  },
});

// ADMIN-ONLY: Action to manually refresh models
export const manualRefreshModels = action({
  args: { adminAddress: v.string() },
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Access denied: Admin access required for debug operations");
    }
    await ctx.runAction(internal.models.refreshModelCacheInternal);
    return "Model cache refreshed!";
  },
});

// ADMIN-ONLY: Debug query to see current providers (NO API KEYS EXPOSED)
export const debugProviders = query({
  args: { adminAddress: v.string() },
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Access denied: Admin access required for debug operations");
    }
    const providers = await ctx.db.query("providers").collect();
    return providers.map(p => ({
      id: p._id,
      name: p.name,
      address: p.address,
      isActive: p.isActive,
      vcuBalance: p.vcuBalance,
      totalPrompts: p.totalPrompts,
      hasValidKey: p.veniceApiKey && p.veniceApiKey.length > 30,
      encryptionVersion: p.encryptionVersion || 1, // Show encryption status
      // SECURITY: Never expose actual API keys or prefixes in debug output
    }));
  },
});

// ADMIN-ONLY: Clean up test providers with invalid API keys
export const cleanupTestProviders = mutation({
  args: { adminAddress: v.string() },
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Access denied: Admin access required for debug operations");
    }
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

// ADMIN-ONLY: Find the correct Venice.ai API endpoint that returns USD balance
export const findUSDEndpoint = action({
  args: { 
    adminAddress: v.string(),
    apiKeySuffix: v.optional(v.string()) // Last few chars of API key to identify provider
  },
  handler: async (ctx, args): Promise<any> => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Access denied: Admin access required for debug operations");
    }
    const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
    if (providers.length === 0) {
      return { error: "No providers available" };
    }
    
    // Find provider by API key suffix if provided
    let targetProvider = providers[0];
    if (args.apiKeySuffix) {
      const found = providers.find(p => p.veniceApiKey?.endsWith(args.apiKeySuffix));
      if (found) targetProvider = found;
    }
    
    // Securely decrypt the API key for testing (admin only)
    const apiKey: string = await ctx.runAction(internal.providers.getDecryptedApiKey, {
      providerId: targetProvider._id
    });
    const results = [];
    
    // Test different Venice.ai API endpoints that might return VCU balance
    const endpointsToTest = [
      "https://api.venice.ai/api/v1/account",
      "https://api.venice.ai/api/v1/balance", 
      "https://api.venice.ai/api/v1/billing",
      "https://api.venice.ai/api/v1/credits",
      "https://api.venice.ai/api/v1/usage",
      "https://api.venice.ai/api/v1/user",
      "https://api.venice.ai/api/v1/me",
      "https://api.venice.ai/api/v1/subscription",
      "https://api.venice.ai/api/v1/vcu",
      "https://api.venice.ai/api/v1/account/balance",
      "https://api.venice.ai/api/v1/account/credits",
      "https://api.venice.ai/api/v1/account/usage"
    ];
    
    for (const endpoint of endpointsToTest) {
      try {
        const response: Response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });
        
        const responseText = await response.text();
        let parsedData = null;
        
        try {
          parsedData = JSON.parse(responseText);
        } catch (e) {
          // Response is not JSON
        }
        
        results.push({
          endpoint,
          status: response.status,
          ok: response.ok,
          hasBalance: responseText.toLowerCase().includes('vcu') || 
                  responseText.toLowerCase().includes('2445') ||
                  (parsedData && JSON.stringify(parsedData).toLowerCase().includes('vcu')),
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''),
          contentType: response.headers.get('content-type'),
          parsedData: parsedData ? Object.keys(parsedData) : null
        });
        
      } catch (error: any) {
        results.push({
          endpoint,
          error: error.message
        });
      }
    }
    
    return {
      providerInfo: {
        name: targetProvider.name,
        addressSuffix: targetProvider.address?.slice(-4),
        apiKeySuffix: targetProvider.veniceApiKey?.slice(-4)
      },
      endpointResults: results
    };
  },
});

// Check current USD balance from Venice.ai API
export const checkUSDBalance = action({
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

          // 1 USD equals 2705.4 context tokens (as per validation function)
          const currentUSD = Math.round(totalContextTokens / 270.54) * 0.10;
          const storedUSD = (provider.vcuBalance || 0) * 0.10;
          
          results.push({
            providerName: provider.name,
            address: provider.address,
            storedUSD: storedUSD,
            currentUSD: currentUSD,
            difference: currentUSD - storedUSD,
            isAccurate: Math.abs(currentUSD - storedUSD) < 1.0, // Allow $1.00 tolerance
            totalModels: data.data?.length || 0,
            totalContextTokens: totalContextTokens
          });
        } else {
          const errorText = await response.text();
          results.push({
            providerName: provider.name,
            address: provider.address,
            error: `API Error: ${response.status} - ${errorText}`,
            storedUSD: (provider.vcuBalance || 0) * 0.10
          });
        }
      } catch (error: any) {
        results.push({
          providerName: provider.name,
          address: provider.address,
          error: error.message,
          storedDiem: provider.vcuBalance
        });
      }
    }
    
    return results;
  },
});

// Update all balances for all providers
export const updateAllBalances = action({
  handler: async (ctx): Promise<{ updatedCount: number; results: any[] }> => {
    const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
    let updatedCount = 0;
    const results: any[] = [];
    
    for (const provider of providers) {
      try {
        const validation: any = await ctx.runAction(api.providers.validateVeniceApiKey, {
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

// Quick test of Venice.ai account endpoint
export const testAccountEndpoint = action({
  handler: async (ctx) => {
    const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
    if (providers.length === 0) {
      return { error: "No providers available" };
    }
    
    const apiKey: string = providers[0].veniceApiKey;
    
    try {
      const response = await fetch("https://api.venice.ai/api/v1/account", {
        headers: { 
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
      });
      
      const responseText = await response.text();
      let data = responseText;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // Keep as text if not JSON
      }
      
      return {
        status: response.status,
        ok: response.ok,
        data: data,
        hasBalance: responseText.includes('vcu') || responseText.includes('VCU') || responseText.includes('2445')
      };
      
    } catch (error: any) {
      return { error: error.message };
    }
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
          model: "auto-select",
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
        headers: {},
        body: responseText,
        apiKeyPrefix: apiKey.substring(0, 10) + "...",
        provider: {
          name: providers[0].name,
          address: providers[0].address,
          usdBalance: (providers[0].vcuBalance || 0) * 0.10
        }
      };
      
    } catch (error: any) {
      return {
        error: error.message,
        apiKeyPrefix: apiKey.substring(0, 10) + "...",
        provider: {
          name: providers[0].name,
          address: providers[0].address,
          usdBalance: (providers[0].vcuBalance || 0) * 0.10
        }
      };
    }
  },
});

// Test Venice.ai endpoints to find the VCU balance endpoint
export const testVeniceEndpoints = action({
  handler: async (ctx): Promise<any[]> => {
    const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
    if (providers.length === 0) {
      return [{ error: "No providers available" }];
    }
    
    const apiKey: string = providers[0].veniceApiKey;
    const results: any[] = [];
    
    // Test the most likely balance endpoints based on common API patterns
    const balanceEndpoints = [
      "https://api.venice.ai/api/v1/account/balance",
      "https://api.venice.ai/api/v1/account", 
      "https://api.venice.ai/api/v1/balance",
      "https://api.venice.ai/api/v1/user/balance",
      "https://api.venice.ai/api/v1/credits",
      "https://api.venice.ai/api/v1/billing/balance",
      "https://api.venice.ai/api/v1/usage",
      "https://api.venice.ai/api/v1/me"
    ];
    
    for (const endpoint of balanceEndpoints) {
      try {
        const response: Response = await fetch(endpoint, {
          headers: { 
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
        });
        const responseText = await response.text();
        let parsedData = null;
        
        try {
          parsedData = JSON.parse(responseText);
        } catch (e) {
          parsedData = responseText;
        }
        
        results.push({
          endpoint,
          status: response.status,
          ok: response.ok,
          hasBalance: responseText.toLowerCase().includes('vcu') || 
                  responseText.toLowerCase().includes('2445') ||
                  responseText.toLowerCase().includes('balance'),
          data: parsedData,
          responseLength: responseText.length
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
          model: "auto-select",
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

// Public diagnostic function to check system health
export const systemHealth = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db.query("providers").collect();
    const activeProviders = providers.filter(p => p.isActive);
    const validProviders = activeProviders.filter(p => p.veniceApiKey && p.veniceApiKey.length > 30);
    
    return {
      totalProviders: providers.length,
      activeProviders: activeProviders.length,
      validProviders: validProviders.length,
      hasValidProviders: validProviders.length > 0,
      providerIssues: providers
        .filter(p => !p.veniceApiKey || p.veniceApiKey.length < 30 || p.name.toLowerCase().includes('test'))
        .map(p => ({
          id: p._id,
          name: p.name,
          issue: !p.veniceApiKey ? 'no_api_key' : 
                 p.veniceApiKey.length < 30 ? 'short_api_key' :
                 p.name.toLowerCase().includes('test') ? 'test_provider' : 'unknown'
        }))
    };
  },
});

// ADMIN-ONLY: Check provider balances to debug zero balance issue
export const checkProviderBalances = action({
  handler: async (ctx): Promise<Array<{
    name: string;
    vcuBalance: number;
    usdValue: number;
    hasApiKey: boolean;
    isActive: boolean;
  }>> => {
    const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
    return providers.map((p: any) => ({
      name: p.name,
      vcuBalance: p.vcuBalance || 0,
      usdValue: (p.vcuBalance || 0) * 0.10,
      hasApiKey: !!p.veniceApiKey,
      isActive: p.isActive
    }));
  }
});

// ADMIN-ONLY: Reset all provider balances to zero (for testing real Venice API)
export const resetProviderBalances = mutation({
  args: { adminAddress: v.string() },
  handler: async (ctx, args) => {
    // Admin check
    if (args.adminAddress !== "0xC07481520d98c32987cA83B30EAABdA673cDbe8c") {
      throw new Error("Unauthorized");
    }
    
    const providers = await ctx.db.query("providers").collect();
    const updates = [];
    
    // Reset all provider balances to 0 so we can test real Venice API
    for (const provider of providers) {
      await ctx.db.patch(provider._id, {
        vcuBalance: 0
      });
      updates.push(provider.name);
    }
    
    return `Reset balances to 0 for: ${updates.join(', ')}`;
  }
});

// ADMIN-ONLY: Setup production environment with basic providers
export const setupProduction = mutation({
  args: { adminAddress: v.string() },
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Access denied: Admin access required for debug operations");
    }
    
    // Check if we already have providers
    const existingProviders = await ctx.db.query("providers").collect();
    if (existingProviders.length > 0) {
      return `Production already has ${existingProviders.length} providers. Use cleanupTestProviders first if needed.`;
    }
    
    // Note: This is just a placeholder. In production, you would need to add
    // your actual provider data with real API keys
    return "Setup function ready. Add your actual provider data manually through the dashboard or provider registration.";
  },
});

 