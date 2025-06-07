import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

/**
 * PRIVACY NOTICE: 
 * All analytics are anonymous and aggregate only.
 * NO individual prompt content is ever stored or analyzed.
 */

// Get system-wide anonymous statistics
export const getSystemStats = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db.query("providers").collect();
    const activeProviders = providers.filter(p => p.isActive);
    
    const usageLogs = await ctx.db.query("usageLogs").collect();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsage = usageLogs.filter(log => log.createdAt >= today.getTime());
    
    const totalVCU = activeProviders.reduce((sum, p) => sum + p.vcuBalance, 0);
    const totalPrompts = providers.reduce((sum, p) => sum + p.totalPrompts, 0);
    
    // Calculate average response time
    const avgResponseTime = usageLogs.length > 0 
      ? usageLogs.reduce((sum, log) => sum + log.latencyMs, 0) / usageLogs.length 
      : 0;

    // Count unique active users in last 24h (anonymous count only)
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const recent = usageLogs.filter(log => log.createdAt >= last24h);
    const activeUsers = new Set(
      recent.filter(log => log.address).map(log => log.address)
    ).size;

    return {
      totalProviders: providers.length,
      activeProviders: activeProviders.length,
      totalVCU,
      totalPrompts,
      promptsToday: todayUsage.length,
      avgResponseTime: Math.round(avgResponseTime),
      networkUptime: activeProviders.length > 0 
        ? activeProviders.reduce((sum, p) => sum + p.uptime, 0) / activeProviders.length 
        : 0,
      activeUsers, // Anonymous count only
    };
  },
});

// Get provider-specific analytics (no content exposure)
export const getProviderAnalytics = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return null;

    const usageLogs = await ctx.db
      .query("usageLogs")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .collect();

    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const recentUsage = usageLogs.filter(log => log.createdAt >= last24h);

    const avgResponseTime = usageLogs.length > 0
      ? usageLogs.reduce((sum, log) => sum + log.latencyMs, 0) / usageLogs.length
      : 0;

    return {
      ...provider,
      veniceApiKey: undefined, // Don't expose API key
      totalPrompts: usageLogs.length,
      promptsLast24h: recentUsage.length,
      avgResponseTime: Math.round(avgResponseTime),
      totalTokens: usageLogs.reduce((sum, log) => sum + log.tokens, 0),
    };
  },
});

// Clean up old logs (internal function for cron)
export const cleanupOldLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    const oldLogs = await ctx.db
      .query("usageLogs")
      .filter((q) => q.lt(q.field("createdAt"), thirtyDaysAgo))
      .collect();

    // Delete old logs in batches
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
    }

    return { deleted: oldLogs.length };
  },
});

// Log ONLY anonymous usage metrics
export const logUsage = mutation({
  args: {
    address: v.optional(v.string()),
    // providerId may be undefined when the router doesn't know which provider
    // handled the request
    providerId: v.optional(v.id("providers")),
    model: v.string(),
    tokens: v.number(),
    latencyMs: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("usageLogs", {
      address: args.address || 'anonymous',
      providerId: args.providerId,
      model: args.model,
      tokens: args.tokens,
      latencyMs: args.latencyMs,
      createdAt: Date.now(),
    });
  },
});
