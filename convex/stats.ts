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
  handler: async (ctx) => {
    // Get active providers
    const providers = await ctx.db.query("providers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    
    // Get all usage logs for calculations
    const usageLogs = await ctx.db.query("usageLogs").collect();
    
    // Calculate active users in last 24h (anonymous count)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentLogs = usageLogs.filter(log => log.timestamp >= oneDayAgo);
    const uniqueUsers = new Set([
      ...recentLogs.filter(log => log.userId).map(log => log.userId),
      ...recentLogs.filter(log => log.sessionId).map(log => log.sessionId)
    ]).size;
    
    // Get prompts routed today
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const promptsToday = usageLogs.filter(log => log.timestamp >= todayStart).length;
    
    // Calculate total VCU available
    const totalVCU = providers.reduce((sum, p) => sum + (p.vcuBalance || 0), 0);
    
    // Calculate average response time
    const avgResponseTime = usageLogs.length > 0 
      ? Math.round(usageLogs.reduce((sum, log) => sum + log.responseTime, 0) / usageLogs.length)
      : 0;
    
    return {
      totalProviders: providers.length,
      activeUsers: uniqueUsers,
      promptsToday,
      totalVCU,
      avgResponseTime,
      totalPrompts: usageLogs.length,
      networkUptime: providers.length > 0 
        ? providers.reduce((sum, p) => sum + p.uptime, 0) / providers.length 
        : 0,
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
