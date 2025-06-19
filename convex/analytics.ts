import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { query, mutation, internalMutation } from "./_generated/server";

/**
 * PRIVACY NOTICE: 
 * All analytics are anonymous and aggregate only.
 * NO individual prompt content is ever stored or analyzed.
 */

// Get system-wide anonymous statistics
export const getSystemStats = query({
  handler: async (ctx) => {
    const providers = await ctx.db.query("providers").collect();
    const users = await ctx.db.query("userPoints").collect();
    const inferences = await ctx.db.query("inferences").collect();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    const todayInferences = inferences.filter(i => i.timestamp >= todayTimestamp);
    
    return {
      totalProviders: providers.length,
      activeProviders: providers.filter(p => p.isActive).length,
      totalUsers: users.length,
      activeUsers: users.filter(u => u.lastEarned >= todayTimestamp).length,
      totalPrompts: inferences.length,
      promptsToday: todayInferences.length,
      totalTokens: inferences.reduce((sum, i) => sum + i.totalTokens, 0),
      modelsUsed: [...new Set(inferences.map(i => i.model))].length,
    };
  },
});

// Get provider-specific analytics (no content exposure)
export const getProviderAnalytics = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return null;

    // Get all usage logs and filter in JavaScript
    const allUsageLogs = await ctx.db
      .query("usageLogs")
      .collect();
    
    // Filter for this provider's logs (only include logs explicitly tied to this provider)
    const usageLogs = allUsageLogs.filter(log => 
      log.providerId && log.providerId === args.providerId
    );

    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const recentUsage = usageLogs.filter(log => (log.createdAt ?? 0) >= last24h);

    return {
      ...provider,
      veniceApiKey: undefined,
      totalPrompts: usageLogs.length,
      promptsLast24h: recentUsage.length,
      avgResponseTime: 0,
      totalTokens: usageLogs.reduce((sum, log) => {
        const tokens = log.totalTokens ?? (log as any).tokens ?? 0;
        return sum + tokens;
      }, 0),
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
    providerId: v.optional(v.id("providers")),
    model: v.string(),
    intent: v.string(),
    totalTokens: v.number(),
    vcuCost: v.number(),
  },
  handler: async (ctx, args) => {
    // Only insert if we have a valid providerId
    if (!args.providerId) {
      console.warn("logUsage called without providerId, skipping log");
      return;
    }
    
    await ctx.db.insert("usageLogs", {
      address: args.address || 'anonymous',
      providerId: args.providerId, // This is guaranteed to exist now
      model: args.model,
      intent: args.intent,
      totalTokens: args.totalTokens,
      vcuCost: args.vcuCost,
      createdAt: Date.now(),
    });
  },
});

export const getModelUsageStats = query({
  handler: async (ctx) => {
    const inferences = await ctx.db.query("inferences").collect();
    
    const modelUsage = inferences.reduce((acc, inf) => {
      acc[inf.model] = (acc[inf.model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      modelUsage,
      totalInferences: inferences.length,
      topModels: Object.entries(modelUsage)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([model, count]) => ({ model, count })),
    };
  },
});
