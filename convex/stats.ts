import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * PRIVACY NOTICE: 
 * All stats are anonymous and aggregate only.
 * NO individual user data is exposed.
 */

interface Provider {
  _id: Id<"providers">;
  isActive: boolean;
  vcuBalance: number;
  totalPrompts: number;
  uptime: number;
  name: string;
  veniceApiKey?: string;
  avgResponseTime: number;
  status: "pending" | "active" | "inactive";
  region?: string;
  gpuType?: string;
  description?: string;
  lastHealthCheck?: number;
  registrationDate: number;
}

interface UsageLog {
  _id: Id<"usageLogs">;
  _creationTime: number;
  address: string;
  providerId?: Id<"providers">;
  model: string;
  tokens: number;
  latencyMs: number;
  createdAt: number;
}

interface ProviderPoints {
  _id: Id<"providerPoints">;
  providerId: Id<"providers">;
  points: number;
  totalPrompts: number;
}

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
    avgUptime: v.number(),
  }),
  handler: async (ctx) => {
    const providers = await ctx.db
      .query("providers")
      .collect();

    const activeProviders = providers.filter(p => p.isActive);
    const totalVCU = providers.reduce((sum, p) => sum + (p.vcuBalance ?? 0), 0);
    const totalPrompts = providers.reduce((sum, p) => sum + (p.totalPrompts ?? 0), 0);
    const avgUptime = activeProviders.length > 0
      ? activeProviders.reduce((sum, p) => sum + (p.uptime ?? 0), 0) / activeProviders.length
      : 0;

    const recentLogs = await ctx.db
      .query("usageLogs")
      .order("desc")
      .take(100);

    const avgResponseTime = recentLogs.length > 0
      ? recentLogs.reduce((sum, log) => sum + log.latencyMs, 0) / recentLogs.length
      : 0;

    const activeUsers = new Set([
      ...recentLogs.map(log => log.address)
    ]).size;

    return {
      totalProviders: providers.length,
      activeProviders: activeProviders.length,
      totalVCU,
      totalPrompts,
      avgUptime,
      promptsToday: recentLogs.filter(log => 
        log.createdAt > Date.now() - 24 * 60 * 60 * 1000
      ).length,
      avgResponseTime,
      networkUptime: avgUptime,
      activeUsers,
    };
  },
});

// Get provider leaderboard
export const getProviderLeaderboard = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("providers"),
    name: v.string(),
    isActive: v.boolean(),
    vcuBalance: v.number(),
    totalPrompts: v.number(),
    uptime: v.number(),
    avgResponseTime: v.number(),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("inactive")),
    region: v.optional(v.string()),
    gpuType: v.optional(v.string()),
    description: v.optional(v.string()),
    lastHealthCheck: v.optional(v.number()),
    registrationDate: v.number(),
    points: v.number(),
  })),
  handler: async (ctx) => {
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect() as Provider[];

    const providerStats = await Promise.all(
      providers.map(async (provider) => {
        const points = await ctx.db
          .query("providerPoints")
          .withIndex("by_provider", (q) => q.eq("providerId", provider._id))
          .first() as ProviderPoints | null;

        return {
          ...provider,
          veniceApiKey: undefined,
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

// Get real-time usage metrics
export const getUsageMetrics = query({
  args: {},
  returns: v.object({
    totalPrompts: v.number(),
    promptsLast24h: v.number(),
    promptsLast7days: v.number(),
    totalTokens: v.number(),
    avgResponseTime: v.number(),
    modelUsage: v.record(v.string(), v.number()),
    activeProviders: v.number(),
  }),
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
      totalTokens: usageLogs.reduce((sum, log) => sum + log.tokens, 0),
      avgResponseTime: avgLatency,
      modelUsage,
      activeProviders: new Set(usageLogs.map(log => log.providerId).filter(Boolean)).size,
    };
  },
});
