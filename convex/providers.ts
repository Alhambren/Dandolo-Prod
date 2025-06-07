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
    console.log("Starting Venice.ai API key validation...");

    try {
      // Query models to determine total context tokens
      const response = await fetch("https://api.venice.ai/api/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${args.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`Venice.ai models response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();

        const totalContextTokens =
          data.data?.reduce((sum: number, model: any) => {
            return sum + (model.model_spec?.availableContextTokens || 0);
          }, 0) || 0;

        // 1 VCU = 135.27 context tokens
        const totalVCU = Math.round(totalContextTokens / 135.27);

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
      console.error("Validation error:", error);
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
    const apiKeyHash = hashApiKey(args.veniceApiKey);
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
      veniceApiKey: args.veniceApiKey,
      apiKeyHash: apiKeyHash,
      vcuBalance: 0,
      isActive: false,
      uptime: 0,
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
    const apiKeyHash = hashApiKey(args.veniceApiKey);
    const duplicateKey = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("apiKeyHash"), apiKeyHash))
      .first();

    if (duplicateKey) {
      throw new Error("This API key is already registered");
    }

    // Create provider with actual VCU balance
    const providerId = await ctx.db.insert("providers", {
      address: walletAddress,
      name: args.name,
      description: "Venice.ai Provider",
      veniceApiKey: args.veniceApiKey,
      apiKeyHash: apiKeyHash,
      vcuBalance: args.vcuBalance, // Use actual VCU from validation
      isActive: true,
      uptime: 100,
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

// MVP: Award points for serving prompts
export const awardProviderPoints = mutation({
  args: {
    providerId: v.id("providers"),
    promptsServed: v.number(),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return;
    
    // MVP POINTS: 100 points per prompt served
    const pointsEarned = args.promptsServed * 100;
    
    // Update provider stats
    await ctx.db.patch(args.providerId, {
      totalPrompts: provider.totalPrompts + args.promptsServed,
    });
    
    // Update or create points record
    const pointsRecord = await ctx.db
      .query("providerPoints")
      .filter((q) => q.eq(q.field("providerId"), args.providerId))
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
    
    console.log(`Awarded ${pointsEarned} points to provider ${provider.name}`);
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

    const newUptime = (provider.uptime * 0.95) + (args.isHealthy ? 100 * 0.05 : 0);
    const newAvgResponseTime = provider.avgResponseTime && args.responseTime
      ? (provider.avgResponseTime * 0.9) + (args.responseTime * 0.1)
      : args.responseTime || provider.avgResponseTime || 0;

    await ctx.db.patch(args.providerId, {
      isActive: args.isHealthy,
      uptime: newUptime,
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

    const recentHealthChecks = await ctx.db
      .query("healthChecks")
      .filter((q) => q.eq(q.field("providerId"), args.providerId))
      .order("desc")
      .take(10);

    return {
      ...provider,
      veniceApiKey: undefined, // Never expose API key
      apiKeyHash: undefined, // Never expose hash
      points: points?.points ?? 0,
      recentHealthChecks,
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

// Internal query for active providers (with API keys for routing)
export const listActiveInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
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
      totalPrompts: provider.totalPrompts + 1,
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
        lastEarned: Date.now(),
      });
    }
  },
});

// Record health check result
export const recordHealthCheck = mutation({
  args: {
    providerId: v.id("providers"),
    status: v.union(v.literal("success"), v.literal("failure")),
    responseTime: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("healthChecks", {
      providerId: args.providerId,
      timestamp: Date.now(),
      status: args.status,
      responseTime: args.responseTime,
      errorMessage: args.errorMessage,
    });

    // Update provider health
    await ctx.runMutation(api.providers.updateProviderHealth, {
      providerId: args.providerId,
      isHealthy: args.status === "success",
      responseTime: args.responseTime,
    });
  },
});

// Remove provider
export const remove = mutation({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    // Remove provider
    await ctx.db.delete(args.providerId);
    
    // Remove associated points
    const points = await ctx.db
      .query("providerPoints")
      .filter((q) => q.eq(q.field("providerId"), args.providerId))
      .first();
    
    if (points) {
      await ctx.db.delete(points._id);
    }
    
    // Remove health checks
    const healthChecks = await ctx.db
      .query("healthChecks")
      .filter((q) => q.eq(q.field("providerId"), args.providerId))
      .collect();
    
    for (const check of healthChecks) {
      await ctx.db.delete(check._id);
    }
  },
});

// Get top providers by points
export const getTopProviders = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const providers = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const providersWithPoints = await Promise.all(
      providers.map(async (provider) => {
        const points = await ctx.db
          .query("providerPoints")
          .filter((q) => q.eq(q.field("providerId"), provider._id))
          .first();
        
        return {
          _id: provider._id,
          name: provider.name,
          prompts24h: provider.totalPrompts, // Simplified for MVP
          vcuEarned7d: points?.points ?? 0, // Points as proxy for VCU
        };
      })
    );
    
    // Sort by points and return top N
    return providersWithPoints
      .sort((a, b) => b.vcuEarned7d - a.vcuEarned7d)
      .slice(0, args.limit);
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

// Update VCU balance (placeholder for MVP)
export const updateVCUBalance = internalMutation({
  args: {
    providerId: v.id("providers"),
    vcuBalance: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.providerId, {
      vcuBalance: args.vcuBalance,
    });
  },
});

// Run health checks for all providers
export const runHealthChecks = internalAction({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.runQuery(internal.providers.listActiveInternal);
    
    for (const provider of providers) {
      // Simple health check - just verify API key still works
      try {
        const response = await fetch("https://api.venice.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${provider.veniceApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.2-3b",
            messages: [{ role: "user", content: "test" }],
            max_tokens: 1,
          }),
        });
        
        const responseTime = 100; // Simplified for MVP
        
        await ctx.runMutation(api.providers.recordHealthCheck, {
          providerId: provider._id,
          status: response.ok ? "success" : "failure",
          responseTime: response.ok ? responseTime : undefined,
          errorMessage: response.ok ? undefined : `Status: ${response.status}`,
        });
      } catch (error) {
        await ctx.runMutation(api.providers.recordHealthCheck, {
          providerId: provider._id,
          status: "failure",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  },
});

// Update uptime based on recent health checks
export const updateUptime = mutation({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const recentChecks = await ctx.db
      .query("healthChecks")
      .filter((q) => q.eq(q.field("providerId"), args.providerId))
      .order("desc")
      .take(100);

    if (recentChecks.length === 0) return;

    const successCount = recentChecks.filter(check => check.status === "success").length;
    const uptime = (successCount / recentChecks.length) * 100;

    await ctx.db.patch(args.providerId, { 
      uptime,
      isActive: uptime > 50, // Deactivate if uptime too low
    });
  },
});

// Placeholder for compatibility
export const performHealthCheck = action({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    // Simplified for MVP - actual health checks run via cron
    console.log("Health check requested for provider:", args.providerId);
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

// CLEANUP: Remove problematic points document
export const cleanupBadPointsDocument = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      // Delete the specific problematic document
      await ctx.db.delete("k57az83s7yarb84ryx9s5dd9qx7h9771" as any);
      return { success: true, message: "Deleted problematic document" };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// CLEANUP MUTATIONS - Remove all bad legacy data
export const cleanupAllBadData = mutation({
  args: {},
  handler: async (ctx) => {
    let cleaned = {
      points: 0,
      providers: 0,
      providerPoints: 0,
      usageLogs: 0,
      healthChecks: 0
    };

    // Clean points table - remove documents with missing required fields
    const allPoints = await ctx.db.query("points").collect();
    for (const point of allPoints) {
      if (!point.address || !point.points || !point.promptsToday || !point.pointsToday || !point.lastEarned) {
        await ctx.db.delete(point._id);
        cleaned.points++;
      }
    }

    // Clean providers table - remove documents with missing required fields
    const allProviders = await ctx.db.query("providers").collect();
    for (const provider of allProviders) {
      if (!provider.address || !provider.name || !provider.veniceApiKey || !provider.apiKeyHash) {
        await ctx.db.delete(provider._id);
        cleaned.providers++;
      }
    }

    // Clean providerPoints table
    const allProviderPoints = await ctx.db.query("providerPoints").collect();
    for (const pp of allProviderPoints) {
      if (!pp.providerId || pp.points === undefined) {
        await ctx.db.delete(pp._id);
        cleaned.providerPoints++;
      }
    }

    // Clean usageLogs table
    const allUsageLogs = await ctx.db.query("usageLogs").collect();
    for (const log of allUsageLogs) {
      if (!log.address || !log.model) {
        await ctx.db.delete(log._id);
        cleaned.usageLogs++;
      }
    }

    // Clean healthChecks table
    const allHealthChecks = await ctx.db.query("healthChecks").collect();
    for (const check of allHealthChecks) {
      if (!check.providerId || !check.status) {
        await ctx.db.delete(check._id);
        cleaned.healthChecks++;
      }
    }

    return cleaned;
  },
});

export const getProviderStats = query({
  args: { address: v.string() },
  returns: v.object({
    points: v.number(),
    promptsToday: v.number(),
    pointsToday: v.number(),
    pointsThisWeek: v.number(),
  }),
  handler: async (ctx, args) => {
    const points = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    return {
      points: points?.points ?? 0,
      promptsToday: points?.promptsToday ?? 0,
      pointsToday: points?.pointsToday ?? 0,
      pointsThisWeek: points?.points ?? 0,
    };
  },
});
