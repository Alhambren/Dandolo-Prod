import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * PRIVACY NOTICE: 
 * All stats are anonymous and aggregate only.
 * NO individual user data is exposed.
 */

// Get real-time network statistics
export const getNetworkStats = query({
  args: {},
  returns: v.object({
    totalProviders: v.number(),
    activeProviders: v.number(),
    totalVCU: v.number(),
    totalPrompts: v.number(),
    promptsToday: v.number(),
    avgResponseTime: v.number(),
    networkUptime: v.number(),
    activeUsers: v.number(),
  }),
  handler: async (ctx) => {
    // Get all providers
    const providers = await ctx.db.query('providers').collect();
    const activeProviders = providers.filter(p => p.status === 'active');

    // Get today's prompts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const prompts = await ctx.db
      .query('prompts')
      .filter(q => q.gte(q.field('_creationTime'), today.getTime()))
      .collect();

    // Get active users in last 24h
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);
    const activeUsers = await ctx.db
      .query('users')
      .filter(q => q.gte(q.field('lastActive'), last24h.getTime()))
      .collect();

    return {
      totalProviders: providers.length,
      activeProviders: activeProviders.length,
      totalVCU: activeProviders.reduce((sum, p) => sum + p.vcuBalance, 0),
      totalPrompts: prompts.length,
      promptsToday: prompts.length,
      avgResponseTime: activeProviders.reduce((sum, p) => sum + p.avgResponseTime, 0) / activeProviders.length || 0,
      networkUptime: activeProviders.reduce((sum, p) => sum + p.uptime, 0) / activeProviders.length || 0,
      activeUsers: activeUsers.length,
    };
  },
});

// Get provider leaderboard with real data
export const getProviderLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db.query("providers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    
    // Sort by VCU balance (descending)
    const sortedProviders = providers
      .sort((a, b) => (b.vcuBalance || 0) - (a.vcuBalance || 0))
      .slice(0, 10); // Top 10
    
    return sortedProviders.map((provider, index) => ({
      ...provider,
      rank: index + 1,
      // Don't expose API key
      veniceApiKey: undefined,
    }));
  },
});

// Get real-time usage metrics
export const getUsageMetrics = query({
  args: {},
  handler: async (ctx) => {
    const usageLogs = await ctx.db.query("usageLogs").collect();
    
    // Last 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const last24h = usageLogs.filter(log => log.timestamp >= oneDayAgo);
    
    // Last 7 days
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const last7days = usageLogs.filter(log => log.timestamp >= oneWeekAgo);
    
    // Model usage breakdown
    const modelUsage = usageLogs.reduce((acc, log) => {
      acc[log.model] = (acc[log.model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalPrompts: usageLogs.length,
      promptsLast24h: last24h.length,
      promptsLast7days: last7days.length,
      totalTokens: usageLogs.reduce((sum, log) => sum + log.tokens, 0),
      avgResponseTime: usageLogs.length > 0 
        ? Math.round(usageLogs.reduce((sum, log) => sum + log.responseTime, 0) / usageLogs.length)
        : 0,
      modelUsage,
      activeProviders: new Set(usageLogs.map(log => log.providerId)).size,
    };
  },
});
