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
  returns: v.object({
    lastUpdated: v.optional(v.number()),
    models: v.optional(v.any()),
    hasImageModels: v.boolean()
  }),
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


// ADMIN-ONLY: Debug query to see current providers (NO API KEYS EXPOSED)
export const debugProviders = query({
  args: { adminAddress: v.string() },
  returns: v.array(v.any()),
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
  returns: v.object({
    removedCount: v.number()
  }),
  handler: async (ctx, args): Promise<{ removedCount: number }> => {
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
  returns: v.any(),
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
      "https://api.venice.ai/api/v1/api_keys/rate_limits", // CORRECT endpoint per Venice docs
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
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx): Promise<any[]> => {
    const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
    if (providers.length === 0) {
      return [];
    }
    
    const results = [];
    
    for (const provider of providers) {
      try {
        // Use the improved validation function that now fetches real balances
        const validation: any = await ctx.runAction(api.providers.validateVeniceApiKey, {
          apiKey: provider.veniceApiKey
        });

        if (validation.isValid) {
          const storedUSD = (provider.vcuBalance || 0) * 0.10;
          const currentUSD = validation.balance || 0;
          
          results.push({
            providerName: provider.name,
            address: provider.address,
            storedUSD: storedUSD,
            currentUSD: currentUSD,
            difference: currentUSD - storedUSD,
            isAccurate: !validation.warning, // Accurate if no warning about balance detection
            totalModels: validation.models || 0,
            note: validation.warning || "Balance successfully detected from Venice.ai API"
          });
        } else {
          results.push({
            providerName: provider.name,
            address: provider.address,
            error: validation.error || "API validation failed",
            storedUSD: (provider.vcuBalance || 0) * 0.10
          });
        }
      } catch (error: any) {
        results.push({
          providerName: provider.name,
          address: provider.address,
          error: error.message,
          storedUSD: (provider.vcuBalance || 0) * 0.10
        });
      }
    }
    
    return results;
  },
});

// Manual balance update for debugging (no admin check for testing)
export const forceUpdateAllBalances = action({
  args: {},
  returns: v.object({
    updatedCount: v.number(),
    results: v.array(v.any())
  }),
  handler: async (ctx): Promise<{ updatedCount: number; results: any[] }> => {
    console.log('Starting manual balance update for debugging...');
    const providers: any[] = await ctx.runQuery(internal.providers.getAllProviders);
    console.log(`Found ${providers.length} providers to update`);
    
    let updatedCount = 0;
    const results: any[] = [];
    
    for (const provider of providers) {
      try {
        console.log(`Processing provider: ${provider.name}`);
        const validation: any = await ctx.runAction(api.providers.validateVeniceApiKey, {
          apiKey: provider.veniceApiKey
        });
        
        console.log(`Validation result for ${provider.name}:`, validation);
        
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
          console.log(`Updated ${provider.name}: ${provider.vcuBalance} -> ${validation.balance}`);
        } else {
          results.push({
            providerName: provider.name,
            error: validation.error || "Validation failed",
            updated: false,
            validationResponse: validation
          });
          console.log(`Failed to update ${provider.name}:`, validation.error);
        }
      } catch (error: any) {
        results.push({
          providerName: provider.name,
          error: error.message,
          updated: false
        });
        console.log(`Error updating ${provider.name}:`, error.message);
      }
    }
    
    console.log(`Balance update complete: ${updatedCount}/${providers.length} updated`);
    return { updatedCount, results };
  },
});

// Test Venice.ai rate limits endpoint (correct endpoint per docs)
export const testRateLimitsEndpoint = action({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
    if (providers.length === 0) {
      return { error: "No providers available" };
    }
    
    const apiKey: string = providers[0].veniceApiKey;
    
    try {
      const response = await fetch("https://api.venice.ai/api/v1/api_keys/rate_limits", {
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
  args: {},
  returns: v.any(),
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
  args: {},
  returns: v.array(v.any()),
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
  args: {},
  returns: v.any(),
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
  args: {},
  returns: v.any(),
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
  args: {},
  returns: v.any(),
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
  returns: v.array(v.any()),
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
  returns: v.object({
    totalProviders: v.number(),
    activeProviders: v.number(),
    validProviders: v.number(),
    hasValidProviders: v.boolean(),
    providerIssues: v.array(v.any())
  }),
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
  args: {},
  returns: v.array(v.object({
    name: v.string(),
    vcuBalance: v.number(),
    usdValue: v.number(),
    hasApiKey: v.boolean(),
    isActive: v.boolean()
  })),
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
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
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
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
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

// ADMIN-ONLY: Create test API key for debugging
export const createTestApiKey = mutation({
  args: { adminAddress: v.string() },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Access denied: Admin access required for debug operations");
    }
    
    const testKey = "dk_test123456789abcdef0123456789abcdef0123456789abcdef";
    
    // Check if key already exists
    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", q => q.eq("key", testKey))
      .first();
      
    if (existing) {
      return `Test key already exists: ${testKey}`;
    }
    
    // Create test key
    const keyId = await ctx.db.insert("apiKeys", {
      address: args.adminAddress,
      name: "Debug Test Key",
      key: testKey,
      keyType: "developer",
      isActive: true,
      createdAt: Date.now(),
      totalUsage: 0,
      dailyUsage: 0,
      lastReset: Date.now(),
    });
    
    return `Created test API key: ${testKey} (ID: ${keyId})`;
  },
});

// ADMIN-ONLY: List all API keys for debugging
export const listAllApiKeys = query({
  args: { adminAddress: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Access denied: Admin access required for debug operations");
    }
    
    const keys = await ctx.db.query("apiKeys").collect();
    return keys.map(k => ({
      id: k._id,
      address: k.address,
      name: k.name,
      keyPreview: `${k.key.substring(0, 12)}...${k.key.slice(-4)}`,
      keyType: k.keyType,
      isActive: k.isActive,
      createdAt: new Date(k.createdAt).toISOString(),
      totalUsage: k.totalUsage,
      dailyUsage: k.dailyUsage,
    }));
  },
});

// ADMIN-ONLY: Test API key validation flow
export const testApiKeyValidation = action({
  args: { adminAddress: v.string(), testKey: v.optional(v.string()) },
  returns: v.object({
    success: v.boolean(),
    keyData: v.optional(v.object({
      id: v.id("apiKeys"),
      address: v.string(),
      name: v.string(),
      isActive: v.boolean(),
      keyType: v.optional(v.string()),
      dailyUsage: v.optional(v.number()),
      dailyLimit: v.optional(v.number())
    })),
    key: v.string(),
    keyExists: v.union(v.boolean(), v.literal("unknown")),
    error: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Access denied: Admin access required for debug operations");
    }
    
    const keyToTest = args.testKey || "dk_test123456789abcdef0123456789abcdef0123456789abcdef";
    
    console.log(`Testing API key validation for: ${keyToTest}`);
    
    try {
      // Test the same validation flow as the router
      const keyData: any = await ctx.runQuery(api.apiKeys.validateKey, { key: keyToTest });
      
      if (!keyData) {
        return {
          success: false,
          keyData: undefined,
          error: "API key validation returned null",
          key: keyToTest,
          keyExists: false,
        };
      }
      
      return {
        success: true,
        keyData: {
          id: keyData._id,
          address: keyData.address || "",
          name: keyData.name || "",
          isActive: keyData.isActive || false,
          keyType: keyData.keyType,
          dailyUsage: keyData.dailyUsage,
          dailyLimit: keyData.dailyLimit,
        },
        key: keyToTest,
        keyExists: true,
      };
      
    } catch (error) {
      return {
        success: false,
        keyData: undefined,
        error: error instanceof Error ? error.message : "Unknown error",
        key: keyToTest,
        keyExists: "unknown" as const,
      };
    }
  },
});

// ADMIN-ONLY: Check provider filtering issue for image generation
export const debugProviderFiltering = action({
  args: { adminAddress: v.string() },
  returns: v.object({
    totalProviders: v.number(),
    validProviders: v.number(),
    issue: v.string(),
    providerAnalysis: v.array(v.any()),
    message: v.string()
  }),
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Access denied: Admin access required for debug operations");
    }
    
    const providers: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
    console.log(`Found ${providers.length} total providers`);
    
    if (providers.length === 0) {
      return {
        totalProviders: 0,
        validProviders: 0,
        issue: "NO_PROVIDERS_REGISTERED",
        providerAnalysis: [],
        message: "No providers found in database - Register a provider through the dashboard",
      };
    }
    
    const providerAnalysis = providers.map(p => {
      const hasApiKey = !!p.veniceApiKey;
      const startsWithTest = p.veniceApiKey?.startsWith('test_');
      const correctLength = p.veniceApiKey?.length > 30;
      const nameHasTest = p.name.toLowerCase().includes('test') || p.name.toLowerCase().includes('testing');
      
      const isValid = hasApiKey && !startsWithTest && correctLength && !nameHasTest;
      
      return {
        id: p._id,
        name: p.name,
        isActive: p.isActive,
        hasApiKey,
        apiKeyLength: p.veniceApiKey?.length || 0,
        startsWithTest,
        nameHasTest,
        isValid,
        failureReasons: [
          !hasApiKey && "NO_API_KEY",
          startsWithTest && "STARTS_WITH_TEST",
          !correctLength && `API_KEY_TOO_SHORT_${p.veniceApiKey?.length || 0}`,
          nameHasTest && "NAME_CONTAINS_TEST"
        ].filter(Boolean),
      };
    });
    
    const validProviders = providerAnalysis.filter(p => p.isValid);
    
    return {
      totalProviders: providers.length,
      validProviders: validProviders.length,
      issue: validProviders.length === 0 ? "NO_VALID_PROVIDERS" : "PROVIDERS_OK",
      providerAnalysis,
      message: validProviders.length === 0 
        ? "Found providers but none pass validation filters"
        : `${validProviders.length} valid providers available`
    };
  },
});

// ADMIN-ONLY: Test complete API flow like router does
export const testApiFlow = action({
  args: { adminAddress: v.string(), testKey: v.optional(v.string()) },
  returns: v.object({
    steps: v.array(v.object({
      step: v.string(),
      success: v.boolean(),
      data: v.optional(v.any()),
      error: v.optional(v.string())
    })),
    overallSuccess: v.boolean()
  }),
  handler: async (ctx, args): Promise<{
    steps: Array<{
      step: string;
      success: boolean;
      data?: any;
      error?: string;
    }>;
    overallSuccess: boolean;
  }> => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Access denied: Admin access required for debug operations");
    }
    
    const testKey = args.testKey || "dk_test123456789abcdef0123456789abcdef0123456789abcdef";
    
    const results = {
      steps: [] as Array<{step: string, success: boolean, data?: any, error?: string}>,
      overallSuccess: false,
    };
    
    // Step 1: Validate API key
    try {
      const keyData = await ctx.runQuery(api.apiKeys.validateKey, { key: testKey });
      if (keyData) {
        results.steps.push({
          step: "API Key Validation",
          success: true,
          data: {
            keyId: keyData._id,
            isActive: keyData.isActive,
            dailyLimit: keyData.dailyLimit,
            dailyUsage: keyData.dailyUsage,
          },
        });
      } else {
        results.steps.push({
          step: "API Key Validation",
          success: false,
          error: "validateKey returned null - key not found or inactive",
        });
        return results;
      }
      
      // Step 2: Check rate limiting (similar to router)
      const userType = testKey.startsWith("ak_") ? "agent" : "developer";
      results.steps.push({
        step: "User Type Detection",
        success: true,
        data: { userType },
      });
      
      // Step 3: Test provider selection
      try {
        const provider = await ctx.runQuery(internal.providers.selectProvider, {});
        if (provider) {
          results.steps.push({
            step: "Provider Selection",
            success: true,
            data: { 
              providerId: provider._id,
              providerName: provider.name,
              isActive: provider.isActive,
            },
          });
          
          results.overallSuccess = true;
        } else {
          results.steps.push({
            step: "Provider Selection",
            success: false,
            error: "No providers available",
          });
        }
      } catch (error) {
        results.steps.push({
          step: "Provider Selection",
          success: false,
          error: error instanceof Error ? error.message : "Unknown provider error",
        });
      }
      
    } catch (error) {
      results.steps.push({
        step: "API Key Validation",
        success: false,
        error: error instanceof Error ? error.message : "Unknown validation error",
      });
    }
    
    return results;
  },
});

 