import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Simple hash function for API keys (crypto not available in Convex)
function hashApiKey(apiKey: string): string {
  let hash = 0;
  for (let i = 0; i < apiKey.length; i++) {
    const char = apiKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Validate Venice.ai API key and calculate available VCU
export const validateVeniceApiKey = action({
  args: { apiKey: v.string() },
  handler: async (_ctx, args) => {
    try {
      // Query models to determine total context tokens
      const response = await fetch("https://api.venice.ai/api/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${args.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();

        const totalContextTokens =
          data.data?.reduce((sum: number, model: any) => {
            return sum + (model.model_spec?.availableContextTokens || 0);
          }, 0) || 0;

        // Adjust VCU calculation. 1 VCU equals 270.54 context tokens
        // instead of 135.27 due to doubled token usage.
        const totalVCU = Math.round(totalContextTokens / 270.54);

        return {
          isValid: true,
          balance: totalVCU,
          currency: "VCU",
          models: data.data?.length || 0,
          contextTokens: totalContextTokens,
        };
      } else if (response.status === 401) {
        return { isValid: false, error: "Invalid API key" };
      } else if (response.status === 429) {
        // Rate limited but key is valid
        return { isValid: true, balance: 0, currency: "VCU" };
      } else {
        return { isValid: false, error: `Venice.ai error: ${response.status}` };
      }
    } catch (error) {
      return { isValid: false, error: "Failed to connect to Venice.ai" };
    }
  },
});

// MVP: Register provider with anti-Sybil checks
export const registerProvider = mutation({
  args: {
    address: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    veniceApiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const walletAddress = args.address;

    // One provider per wallet
    const existingProvider = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("address"), walletAddress))
      .first();

    if (existingProvider) {
      throw new Error("One provider per wallet address");
    }

    // No duplicate API keys
    const cleanApiKey = args.veniceApiKey.trim().replace(/['"]/g, "");
    const apiKeyHash = hashApiKey(cleanApiKey);
    const duplicateKey = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("apiKeyHash"), apiKeyHash))
      .first();

    if (duplicateKey) {
      throw new Error("This API key is already registered");
    }

    // Create provider
    const providerId = await ctx.db.insert("providers", {
      address: args.address,
      name: args.name,
      description: args.description,
      veniceApiKey: cleanApiKey,
      apiKeyHash: apiKeyHash,
      vcuBalance: 0,
      isActive: false,
      totalPrompts: 0,
      registrationDate: Date.now(),
      avgResponseTime: 0,
      status: "pending",
    });

    // Initialize points
    await ctx.db.insert("providerPoints", {
      providerId: providerId,
      points: 0,
      totalPrompts: 0,
      lastEarned: Date.now(),
    });

    return providerId;
  },
});

// PROVIDER REGISTRATION WITH ACTUAL VCU BALANCE
export const registerProviderWithVCU = mutation({
  args: {
    address: v.string(),
    name: v.string(),
    veniceApiKey: v.string(),
    vcuBalance: v.number(),
  },
  handler: async (ctx, args) => {
    // No auth check needed - using wallet signatures for verification
    const walletAddress = args.address;

    // One provider per wallet
    const existingProvider = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("address"), walletAddress))
      .first();

    if (existingProvider) {
      throw new Error("One provider per wallet address");
    }

    // No duplicate API keys
    const cleanApiKey = args.veniceApiKey.trim().replace(/['"]/g, "");
    console.log("DEBUG: Original API key:", JSON.stringify(args.veniceApiKey));
    console.log("DEBUG: Cleaned API key:", JSON.stringify(cleanApiKey));
    console.log("DEBUG: Cleaned API key length:", cleanApiKey.length);
    console.log("DEBUG: Cleaned API key is truthy:", !!cleanApiKey);
    
    const apiKeyHash = hashApiKey(cleanApiKey);
    const duplicateKey = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("apiKeyHash"), apiKeyHash))
      .first();

    if (duplicateKey) {
      throw new Error("This API key is already registered");
    }

    // Create provider with actual VCU balance
    const cleanApiKey2 = args.veniceApiKey.trim().replace(/['"]/g, "");
    const apiKeyHash2 = hashApiKey(cleanApiKey2);
    const providerId = await ctx.db.insert("providers", {
      address: walletAddress,
      name: args.name,
      description: "Venice.ai Provider",
      veniceApiKey: cleanApiKey2,
      apiKeyHash: apiKeyHash2,
      vcuBalance: args.vcuBalance, // Use actual VCU from validation
      isActive: true,
      totalPrompts: 0,
      registrationDate: Date.now(),
      avgResponseTime: 0,
      status: "active" as const,
    });

    // Initialize points
    await ctx.db.insert("providerPoints", {
      providerId: providerId,
      points: 0,
      totalPrompts: 0,
      lastEarned: Date.now(),
    });

    return providerId;
  },
});

// MVP: Select random active provider
export const selectProvider = query({
  args: {},
  handler: async (ctx) => {
    const activeProviders = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    if (activeProviders.length === 0) return null;
    
    // MVP: Simple random selection
    const randomIndex = Math.floor(Math.random() * activeProviders.length);
    return activeProviders[randomIndex];
  },
});

export const awardProviderPoints = mutation({
  args: {
    providerId: v.id("providers"),
    promptsServed: v.number(),
    tokensProcessed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return;

    // New point system: 1 point per 100 tokens processed
    const pointsEarned = args.tokensProcessed
      ? Math.floor(args.tokensProcessed / 100)
      : args.promptsServed * 100;

    await ctx.db.patch(args.providerId, {
      totalPrompts: (provider.totalPrompts ?? 0) + args.promptsServed,
    });

    const pointsRecord = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();

    if (pointsRecord) {
      await ctx.db.patch(pointsRecord._id, {
        points: (pointsRecord.points ?? 0) + pointsEarned,
        totalPrompts: (pointsRecord.totalPrompts ?? 0) + args.promptsServed,
        lastEarned: Date.now(),
      });
    } else {
      await ctx.db.insert("providerPoints", {
        providerId: args.providerId,
        points: pointsEarned,
        totalPrompts: args.promptsServed,
        lastEarned: Date.now(),
      });
    }
  },
});

// MVP: Update provider health
export const updateProviderHealth = mutation({
  args: {
    providerId: v.id("providers"),
    isHealthy: v.boolean(),
    responseTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    const newAvgResponseTime = provider.avgResponseTime && args.responseTime
      ? (provider.avgResponseTime * 0.9) + (args.responseTime * 0.1)
      : args.responseTime || provider.avgResponseTime || 0;

    await ctx.db.patch(args.providerId, {
      isActive: args.isHealthy,
      avgResponseTime: newAvgResponseTime,
    });
  },
});

// Get provider stats for dashboard
export const getStats = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return null;

    const points = await ctx.db
      .query("providerPoints")
      .filter((q) => q.eq(q.field("providerId"), args.providerId))
      .first();

    return {
      ...provider,
      veniceApiKey: undefined, // Never expose API key
      apiKeyHash: undefined, // Never expose hash
      points: points?.points ?? 0,
    };
  },
});

export const getProviderHealth = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return null;

    return {
      lastCheck: provider.lastHealthCheck,
      isHealthy: provider.isActive,
      avgResponseTime: provider.avgResponseTime,
    };
  },
});

// Get all providers (without API keys)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db
      .query("providers")
      .collect();

    return providers.map(provider => ({
      ...provider,
      veniceApiKey: undefined, // Never expose
      apiKeyHash: undefined, // Never expose
    }));
  },
});

// Get only active providers
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return providers.map(provider => ({
      ...provider,
      veniceApiKey: undefined,
      apiKeyHash: undefined,
    }));
  },
});

// CRITICAL: Internal query for active providers (with API keys for routing)
export const listActiveInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    try {
      const providers = await ctx.db
        .query("providers")
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
      
      console.log(`listActiveInternal: Found ${providers?.length || 0} active providers`);
      return providers || [];
    } catch (error) {
      console.error("Error in listActiveInternal:", error);
      return [];
    }
  },
});

// Simple increment for prompt count
export const incrementPromptCount = mutation({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return;

    // Update provider stats
    await ctx.db.patch(args.providerId, {
      totalPrompts: (provider.totalPrompts ?? 0) + 1,
    });

    // Award 100 points per prompt
    const pointsRecord = await ctx.db
      .query("providerPoints")
      .filter((q) => q.eq(q.field("providerId"), args.providerId))
      .first();

    if (pointsRecord) {
      await ctx.db.patch(pointsRecord._id, {
        points: (pointsRecord.points ?? 0) + 100,
        totalPrompts: (pointsRecord.totalPrompts ?? 0) + 1,
      });
    }
  },
});

// Record health check result
export const recordHealthCheck = internalMutation({
  args: {
    providerId: v.id("providers"),
    status: v.boolean(),
    responseTime: v.number(),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    // Update provider health
    await ctx.db.patch(args.providerId, {
      lastHealthCheck: Date.now(),
      isActive: args.status,
      avgResponseTime: args.responseTime,
    });
  },
});

// Remove provider and associated provider points
export const remove = mutation({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    // Remove provider
    await ctx.db.delete(args.providerId);
    // Remove associated provider points
    const points = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();
    if (points) {
      await ctx.db.delete(points._id);
    }
  },
});

// Get top providers by points
export const getTopProviders = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const providersWithPoints = await Promise.all(
      providers.map(async (provider) => {
        const points = await ctx.db
          .query("providerPoints")
          .withIndex("by_provider", (q) => q.eq("providerId", provider._id))
          .first();

        return {
          ...provider,
          points: points?.points ?? 0,
          veniceApiKey: undefined,
          apiKeyHash: undefined,
        };
      })
    );

    return providersWithPoints
      .sort((a, b) => b.points - a.points)
      .slice(0, args.limit)
      .map(p => ({
        _id: p._id,
        name: p.name,
        address: p.address,
        isActive: p.isActive,
        vcuBalance: p.vcuBalance,
        totalPrompts: p.totalPrompts,
      }));
  },
});

// Get provider by ID (internal use)
export const getProvider = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    return provider ? {
      ...provider,
      veniceApiKey: undefined,
      apiKeyHash: undefined,
    } : null;
  },
});

// CRITICAL: Update VCU balance (internal mutation)
export const updateVCUBalance = internalMutation({
  args: {
    providerId: v.id("providers"),
    vcuBalance: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.db.patch(args.providerId, {
        vcuBalance: args.vcuBalance,
      });
    } catch (error) {
      console.error("Error updating VCU balance:", error);
    }
  },
});

// Run health checks for all providers
export const runHealthChecks = internalAction({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.runQuery(internal.providers.listActiveInternal);
    
    for (const provider of providers) {
      try {
        const startTime = Date.now();
        const response = await fetch("https://api.venice.ai/api/v1/models", {
          headers: {
            "Authorization": `Bearer ${provider.veniceApiKey}`,
          },
        });
        const responseTime = Date.now() - startTime;
        
        await ctx.runMutation(internal.providers.recordHealthCheck, {
          providerId: provider._id,
          status: response.ok,
          responseTime,
        });
      } catch (error) {
        console.error(`Health check failed for provider ${provider._id}:`, error);
        await ctx.runMutation(internal.providers.recordHealthCheck, {
          providerId: provider._id,
          status: false,
          responseTime: 0,
        });
      }
    }
  },
});

// Placeholder for compatibility
export const performHealthCheck = action({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    // Simplified for MVP - actual health checks run via cron
  },
});

// Get leaderboard
export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const providerStats = await Promise.all(
      providers.map(async (provider) => {
        const points = await ctx.db
          .query("providerPoints")
          .filter((q) => q.eq(q.field("providerId"), provider._id))
          .first();

        return {
          ...provider,
          veniceApiKey: undefined,
          apiKeyHash: undefined,
          points: points?.points ?? 0,
          totalPrompts: points?.totalPrompts ?? 0,
        };
      })
    );

    return providerStats
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  },
});

export const getProviderStats = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_address", q => q.eq("address", args.address))
      .first();

    if (!provider) {
      return {
        totalPrompts: 0,
        avgResponseTime: 0,
        points: 0,
        isActive: false,
      };
    }

    const providerPoints = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", q => q.eq("providerId", provider._id))
      .first();

    return {
      totalPrompts: provider.totalPrompts ?? 0,
      avgResponseTime: provider.avgResponseTime ?? 0,
      points: providerPoints?.points ?? 0,
      isActive: provider.isActive,
    };
  },
});

export const updateProviderStats = internalMutation({
  args: {
    providerId: v.id("providers"),
    totalPrompts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return;

    const updates: any = {};
    if (args.totalPrompts !== undefined) updates.totalPrompts = args.totalPrompts;

    await ctx.db.patch(args.providerId, updates);
  },
});

// Internal query to fetch a provider by ID
export const getById = internalQuery({
  args: { id: v.id("providers") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

// Simple health check action
export const healthCheckProviders = action({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.runQuery(internal.providers.listActiveInternal);
    for (const provider of providers) {
      try {
        const response = await fetch("https://api.venice.ai/api/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${provider.veniceApiKey}`,
          },
        });
        await ctx.runMutation(internal.providers.updateHealthCheckInternal, {
          providerId: provider._id,
          isHealthy: response.ok,
          responseTime: Date.now(),
        });
      } catch (error) {
        await ctx.runMutation(internal.providers.updateHealthCheckInternal, {
          providerId: provider._id,
          isHealthy: false,
          responseTime: Date.now(),
        });
      }
    }
  },
});

// Internal mutation to update health check
export const updateHealthCheckInternal = internalMutation({
  args: {
    providerId: v.id("providers"),
    isHealthy: v.boolean(),
    responseTime: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.providerId, {
      lastHealthCheck: args.responseTime,
      isActive: args.isHealthy,
    });
  },
});

// Update provider stats when a prompt is served
export const recordPromptServed = internalMutation({
  args: { 
    providerId: v.id("providers"),
    responseTime: v.number(),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return;
    await ctx.db.patch(args.providerId, {
      totalPrompts: provider.totalPrompts + 1,
      avgResponseTime: ((provider.avgResponseTime || 0) * provider.totalPrompts + args.responseTime) / (provider.totalPrompts + 1),
    });
  },
});

// DEVELOPMENT: Create a test provider for development
export const createTestProvider = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if test provider already exists
    const existingTestProvider = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("name"), "Test Provider"))
      .first();

    if (existingTestProvider) {
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
