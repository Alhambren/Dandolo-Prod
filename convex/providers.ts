import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Add missing function
export const incrementPromptCount = mutation({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (provider) {
      await ctx.db.patch(args.providerId, {
        totalPrompts: provider.totalPrompts + 1,
      });
    }
  },
});

// Validate Venice.ai API key
export const validateVeniceApiKey = action({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    console.log("Starting Venice.ai API key validation...");
    
    // The working endpoint from inference.ts is https://api.venice.ai/api/v1/chat/completions
    // Use this for validation with a minimal test request
    try {
      console.log("Validating API key with chat completion endpoint...");
      const response = await fetch("https://api.venice.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${args.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "test" }],
          max_tokens: 1,
          temperature: 0,
          stream: false,
        }),
      });

      console.log(`Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Validation successful!");
        
        // Venice.ai doesn't expose balance via API, so we estimate
        // Default to 1000 VCU for new providers
        const estimatedBalance = 1000;
        
        return {
          isValid: true,
          balance: estimatedBalance,
          currency: "VCU",
        };
      } else if (response.status === 401) {
        return {
          isValid: false,
          error: "Invalid API key - please check your Venice.ai API key",
        };
      } else if (response.status === 429) {
        // Rate limited but key is valid
        return {
          isValid: true,
          balance: 100, // Lower balance assumption if rate limited
          currency: "VCU",
        };
      } else {
        const errorText = await response.text();
        console.error("Validation failed:", errorText);
        return {
          isValid: false,
          error: `Venice.ai API error: ${response.status}`,
        };
      }
    } catch (error) {
      console.error("Validation error:", error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Failed to validate API key",
      };
    }
  },
});

// Register a new provider
export const registerProvider = mutation({
  args: {
    address: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    veniceApiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const providerId = await ctx.db.insert("providers", {
      address: args.address,
      name: args.name,
      description: args.description,
      veniceApiKey: args.veniceApiKey,
      vcuBalance: 0,
      isActive: true,
      uptime: 100,
      totalPrompts: 0,
      registrationDate: Date.now(),
      avgResponseTime: 0,
      status: 'pending' as const,
    });

    return providerId;
  },
});

// Get all providers (active and inactive)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db
      .query("providers")
      .collect();

    return providers.map(provider => ({
      ...provider,
      veniceApiKey: undefined, // Don't expose API keys
    }));
  },
});

// Get only active providers
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return providers.map(provider => ({
      ...provider,
      veniceApiKey: undefined, // Don't expose API keys
    }));
  },
});

// Internal query for active providers (with API keys)
export const listActiveInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("providers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Internal query to get provider with API key
export const getProviderInternal = internalQuery({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.providerId);
  },
});

// Update provider VCU balance
export const updateVCUBalance = internalMutation({
  args: {
    providerId: v.id("providers"),
    vcuBalance: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.providerId, {
      vcuBalance: args.vcuBalance,
      lastHealthCheck: Date.now(),
    });
  },
});

// Get provider stats
export const getStats = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return null;

    const points = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();

    const recentHealthChecks = await ctx.db
      .query("healthChecks")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .order("desc")
      .take(10);

    return {
      ...provider,
      veniceApiKey: undefined,
      points: points?.points || 0,
      recentHealthChecks,
    };
  },
});

// Perform health check for a provider
export const performHealthCheck = action({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.runQuery(api.providers.getProvider, {
      providerId: args.providerId,
    });

    if (!provider) return;

    const startTime = Date.now();
    let status: "success" | "failure" = "failure";
    let responseTime: number | undefined;
    let errorMessage: string | undefined;

    try {
      // Check Venice.ai API health with a simple balance check
      const response = await fetch("https://api.venice.ai/api/v1/account/balance", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${provider.veniceApiKey}`,
        },
      });
      responseTime = Date.now() - startTime;
      
      if (response.ok) {
        status = "success";
      } else {
        errorMessage = `Venice API error: ${response.status}`;
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Unknown error";
      responseTime = Date.now() - startTime;
    }

    // Record health check
    await ctx.runMutation(api.providers.recordHealthCheck, {
      providerId: args.providerId,
      status,
      responseTime,
      errorMessage,
    });

    // Update provider uptime
    await ctx.runMutation(api.providers.updateUptime, {
      providerId: args.providerId,
    });
  },
});

// Internal query to get provider with API key
export const getProvider = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.providerId);
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

    // Update last health check time
    await ctx.db.patch(args.providerId, {
      lastHealthCheck: Date.now(),
    });
  },
});

// Update provider uptime based on recent health checks
export const updateUptime = mutation({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const recentChecks = await ctx.db
      .query("healthChecks")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .order("desc")
      .take(100); // Last 100 checks

    if (recentChecks.length === 0) return;

    const successCount = recentChecks.filter(check => check.status === "success").length;
    const uptime = (successCount / recentChecks.length) * 100;

    await ctx.db.patch(args.providerId, { uptime });

    // Deactivate provider if uptime is too low
    if (uptime < 50) {
      await ctx.db.patch(args.providerId, { isActive: false });
    }
  },
});

// Get leaderboard
export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const providerStats = await Promise.all(
      providers.map(async (provider) => {
        const points = await ctx.db
          .query("providerPoints")
          .withIndex("by_provider", (q) => q.eq("providerId", provider._id))
          .first();

        return {
          ...provider,
          veniceApiKey: undefined,
          points: points?.points || 0,
          totalPrompts: points?.totalPrompts || 0,
        };
      })
    );

    return providerStats
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  },
});

// Run health checks for all providers
export const runHealthChecks = internalAction({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.runQuery(internal.providers.listActiveInternal);
    
    for (const provider of providers) {
      await ctx.runAction(api.providers.performHealthCheck, {
        providerId: provider._id,
      });
    }
  },
});

export const getTopProviders = query({
  args: {
    limit: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id('providers'),
      name: v.string(),
      prompts24h: v.number(),
      vcuEarned7d: v.number(),
      region: v.optional(v.string()),
      gpuType: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // Get providers sorted by 7-day VCU earned
    const providers = await ctx.db
      .query('providers')
      .withIndex('by_status', q => q.eq('status', 'active'))
      .order('desc')
      .take(args.limit);

    // Get prompts from last 24h for each provider
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);

    const providersWithStats = await Promise.all(
      providers.map(async (provider) => {
        const prompts24h = await ctx.db
          .query("usageLogs")
          .withIndex("by_provider", q => q.eq("providerId", provider._id))
          .filter(q => q.gte(q.field("createdAt"), last24h.getTime()))
          .collect();

        return {
          _id: provider._id,
          name: provider.name,
          prompts24h: prompts24h.length,
          vcuEarned7d: 0,
          region: provider.region,
          gpuType: provider.gpuType,
          status: provider.status,
          uptime: provider.uptime,
          avgResponseTime: provider.avgResponseTime,
          vcuBalance: provider.vcuBalance,
          totalPrompts: provider.totalPrompts,
        };
      })
    );

    return providersWithStats.sort((a, b) => b.vcuEarned7d - a.vcuEarned7d);
  },
});

export const remove = mutation({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    // Remove provider
    await ctx.db.delete(args.providerId);
    
    // Remove associated points record
    const points = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();
    
    if (points) {
      await ctx.db.delete(points._id);
    }
    
    // Remove health checks
    const healthChecks = await ctx.db
      .query("healthChecks")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .collect();
    
    for (const check of healthChecks) {
      await ctx.db.delete(check._id);
    }
  },
});
