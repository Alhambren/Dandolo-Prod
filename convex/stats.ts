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
  totalTokens: number;
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
  }),
  handler: async (ctx) => {
    const providers = await ctx.db.query("providers").collect();
    const activeProviders = providers.filter(p => p.isActive);
    const inferences = await ctx.db.query("inferences").collect();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    const todayInferences = inferences.filter(i => i.timestamp >= todayTimestamp);
    const avgResponseTime = activeProviders.length > 0
      ? activeProviders.reduce((sum, p) => sum + (p.avgResponseTime || 0), 0) / activeProviders.length
      : 0;
    const uniqueUsers = new Set(inferences.map(i => i.address)).size;
    return {
      totalProviders: providers.length,
      activeProviders: activeProviders.length,
      totalVCU: providers.reduce((sum, p) => sum + p.vcuBalance, 0),
      totalPrompts: inferences.length,
      promptsToday: todayInferences.length,
      avgResponseTime: Math.round(avgResponseTime),
      networkUptime: activeProviders.length > 0 ? 99.9 : 0,
      activeUsers: uniqueUsers,
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
    const inferences = await ctx.db.query("inferences").collect();
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const last24h = inferences.filter(i => i.timestamp >= oneDayAgo);
    const last7days = inferences.filter(i => i.timestamp >= oneWeekAgo);
    const modelUsage = inferences.reduce((acc, inf) => {
      acc[inf.model] = (acc[inf.model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const activeProviderIds = new Set(inferences.map(i => i.providerId));
    return {
      totalPrompts: inferences.length,
      promptsLast24h: last24h.length,
      promptsLast7days: last7days.length,
      totalTokens: inferences.reduce((sum, i) => sum + i.totalTokens, 0),
      avgResponseTime: 0,
      modelUsage,
      activeProviders: activeProviderIds.size,
    };
  },
});
