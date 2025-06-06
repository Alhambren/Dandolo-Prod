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
    // Get real provider data
    const providers = await ctx.db.query("providers").collect();
    const activeProviders = providers.filter(p => p.isActive === true);
    
    // Get real usage data
    const usageLogs = await ctx.db.query("usageLogs").collect();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsage = usageLogs.filter(log => log.createdAt >= today.getTime());
    
    // Calculate real metrics
    const totalVCU = activeProviders.reduce((sum, p) => sum + (p.vcuBalance || 0), 0);
    const totalPrompts = usageLogs.length;
    const avgResponseTime = usageLogs.length > 0 
      ? Math.round(usageLogs.reduce((sum, log) => sum + (log.latencyMs || 0), 0) / usageLogs.length)
      : 0;
    
    // Get unique users from last 24h
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const recentLogs = usageLogs.filter(log => log.createdAt >= last24h);
    const activeUsers = new Set([
      ...recentLogs.filter(log => log.userId).map(log => log.userId),
      ...recentLogs.filter(log => log.sessionId).map(log => log.sessionId)
    ]).size;

    const networkUptime = activeProviders.length > 0 
      ? Math.round(activeProviders.reduce((sum, p) => sum + (p.uptime || 0), 0) / activeProviders.length)
      : 0;

    return {
      totalProviders: providers.length,
      activeProviders: activeProviders.length,
      totalVCU,
      totalPrompts,
      promptsToday: todayUsage.length,
      avgResponseTime,
      networkUptime,
      activeUsers,
    };
  },
});

// Get provider leaderboard with real data
export const getProviderLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    // Only return providers that have real Venice.ai API keys
    const providers = await ctx.db.query("providers")
      .filter((q) => q.and(
        q.eq(q.field("isActive"), true),
        q.neq(q.field("veniceApiKey"), "venice_key_1"), // Exclude sample data
        q.neq(q.field("veniceApiKey"), "venice_key_2"),
        q.neq(q.field("veniceApiKey"), "venice_key_3")
      ))
      .collect();
    
    return providers
      .sort((a, b) => (b.vcuBalance || 0) - (a.vcuBalance || 0))
      .slice(0, 10)
      .map((provider, index) => ({
        ...provider,
        rank: index + 1,
        veniceApiKey: undefined, // Don't expose API keys
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
    const last24h = usageLogs.filter(log => Number(log.createdAt) >= oneDayAgo);
    
    // Last 7 days
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const last7days = usageLogs.filter(log => Number(log.createdAt) >= oneWeekAgo);
    
    // Model usage breakdown
    const modelUsage = usageLogs.reduce((acc, log) => {
      acc[log.model] = (acc[log.model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const recentLogs = await ctx.db
      .query("usageLogs")
      .filter((q) => q.gte(q.field("createdAt"), oneDayAgo))
      .collect();
    
    const avgLatency = recentLogs.length > 0
      ? recentLogs.reduce((sum, log) => sum + log.latencyMs, 0) / recentLogs.length
      : 0;
    
    return {
      totalPrompts: usageLogs.length,
      promptsLast24h: last24h.length,
      promptsLast7days: last7days.length,
      totalTokens: usageLogs.reduce((sum, log) => sum + log.promptTokens + log.completionTokens, 0),
      avgResponseTime: avgLatency,
      modelUsage,
      activeProviders: new Set(usageLogs.map(log => log.providerId)).size,
    };
  },
});
