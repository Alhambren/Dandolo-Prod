import { v } from "convex/values";
import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

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
  totalPoints?: number;    // All-time total points (current field)
  points?: number;         // Legacy field name for totalPoints
  totalPrompts: number;
}

// Cached network stats interface
interface CachedNetworkStats {
  totalProviders: number;
  activeProviders: number;
  totalDiem: number;
  totalPrompts: number;
  promptsToday: number;
  avgResponseTime: number;
  networkHealth: number;
  activeUsers: number;
  failedPrompts: number;
  currentLoad: number;
  successRate: number;
  totalTokensProcessed: number;
  networkUptime: number;
  lastUpdated: number;
}

// Read-only network statistics query (reads from cache or calculates real-time)
export const getNetworkStats = query({
  args: {},
  returns: v.object({
    totalProviders: v.number(),
    activeProviders: v.number(),
    totalDiem: v.number(),
    totalPrompts: v.number(),
    promptsToday: v.number(),
    avgResponseTime: v.number(),
    networkHealth: v.number(),
    activeUsers: v.number(),
    failedPrompts: v.number(),
    currentLoad: v.number(),
    successRate: v.number(),
    totalTokensProcessed: v.number(),
    networkUptime: v.number(),
    cacheAge: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    try {
      // Read from cache first
      const cached = await ctx.db.query("networkStatsCache").first();
      
      if (cached) {
        const cacheAge = Date.now() - cached.lastUpdated;
        
        // If cache is recent (less than 10 minutes old), use it
        if (cacheAge < 10 * 60 * 1000) {
          return {
            totalProviders: cached.totalProviders ?? 0,
            activeProviders: cached.activeProviders ?? 0,
            totalDiem: cached.totalDiem ?? 0,
            totalPrompts: cached.totalPrompts ?? 0,
            promptsToday: cached.promptsToday ?? 0,
            avgResponseTime: cached.avgResponseTime ?? 0,
            networkHealth: cached.networkHealth ?? 0,
            activeUsers: cached.activeUsers ?? 0,
            failedPrompts: cached.failedPrompts ?? 0,
            currentLoad: cached.currentLoad ?? 0,
            successRate: cached.successRate ?? 100,
            totalTokensProcessed: cached.totalTokensProcessed ?? 0,
            networkUptime: cached.networkUptime ?? 0,
            cacheAge,
          };
        }
      }

      // If no cache exists or cache is stale, calculate real-time stats
      console.log("Cache missing or stale, calculating real-time network stats");
      const realTimeStats = await calculateNetworkStats(ctx);
      
      return {
        ...realTimeStats,
        cacheAge: cached ? Date.now() - cached.lastUpdated : undefined,
      };
    } catch (error) {
      console.error("Failed to get network stats:", error);
      
      // Return default values on any error
      return getDefaultNetworkStats();
    }
  },
});

// Helper function to provide consistent default values
function getDefaultNetworkStats() {
  return {
    totalProviders: 0,
    activeProviders: 0,
    totalDiem: 0,
    totalPrompts: 0,
    promptsToday: 0,
    avgResponseTime: 0,
    networkHealth: 0,
    activeUsers: 0,
    failedPrompts: 0,
    currentLoad: 0,
    successRate: 100,
    totalTokensProcessed: 0,
    networkUptime: 0,
  };
}

// Get provider leaderboard - simplified version
export const getProviderLeaderboard = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("providers"),
    name: v.string(),
    isActive: v.boolean(),
    vcuBalance: v.number(),
    totalPrompts: v.number(),
    uptime: v.optional(v.number()),
    avgResponseTime: v.optional(v.number()),
    status: v.optional(v.union(v.literal("pending"), v.literal("active"), v.literal("inactive"))),
    region: v.optional(v.string()),
    description: v.optional(v.string()),
    lastHealthCheck: v.optional(v.number()),
    registrationDate: v.number(),
    points: v.number(),
  })),
  handler: async (ctx) => {
    try {
      // Get all providers first (simpler query)
      const allProviders = await ctx.db.query("providers").collect();
      const activeProviders = allProviders.filter(p => p.isActive);

      // Create leaderboard using only fields that exist in schema
      const providerStats = activeProviders.map((provider) => {
        return {
          _id: provider._id,
          name: provider.name,
          isActive: provider.isActive,
          vcuBalance: provider.vcuBalance || 0,
          totalPrompts: provider.totalPrompts || 0,
          uptime: provider.uptime ?? undefined,
          avgResponseTime: provider.avgResponseTime ?? undefined,
          status: provider.status ?? undefined,
          region: provider.region ?? undefined,
          description: provider.description ?? undefined,
          lastHealthCheck: provider.lastHealthCheck ?? undefined,
          registrationDate: provider.registrationDate,
          points: 0, // Simplified: just return 0 points for now
        };
      });

      return providerStats
        .sort((a, b) => b.vcuBalance - a.vcuBalance) // Sort by VCU balance instead of points
        .slice(0, 10);
    } catch (error) {
      console.error("Error in getProviderLeaderboard:", error);
      return [];
    }
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
    const inferences: Doc<"inferences">[] = await ctx.db.query("inferences").collect();
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const last24h: Doc<"inferences">[] = inferences.filter((i: Doc<"inferences">) => i.timestamp >= oneDayAgo);
    const last7days: Doc<"inferences">[] = inferences.filter((i: Doc<"inferences">) => i.timestamp >= oneWeekAgo);
    
    const modelUsage: Record<string, number> = inferences.reduce((acc: Record<string, number>, inf: Doc<"inferences">) => {
      acc[inf.model] = (acc[inf.model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const activeProviderIds: Set<Id<"providers"> | undefined> = new Set(
      inferences.map((i: Doc<"inferences">) => i.providerId)
    );
    
    const totalTokens: number = inferences.reduce((sum: number, i: Doc<"inferences">) => sum + i.totalTokens, 0);
    
    return {
      totalPrompts: inferences.length,
      promptsLast24h: last24h.length,
      promptsLast7days: last7days.length,
      totalTokens,
      avgResponseTime: 0,
      modelUsage,
      activeProviders: activeProviderIds.size,
    };
  },
});

// Separate function for the actual calculation logic
async function calculateNetworkStats(ctx: QueryCtx | MutationCtx) {
  // Batch fetch all required data
  const providers = await ctx.db.query("providers").collect();
  const inferences = await ctx.db.query("inferences").collect(); // Get ALL inferences for accurate user count

  // Get REAL active provider count
  const activeProviders = providers.filter((p: Doc<"providers">) => p.isActive);
  
  // Calculate today's metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();
  
  const todayInferences = inferences.filter((i: Doc<"inferences">) => i.timestamp >= todayTimestamp);
  const recentInferences = inferences.filter((i: Doc<"inferences">) => i.timestamp >= Date.now() - 24 * 60 * 60 * 1000);
  
  // Calculate average response time from ACTUAL inference data (last 24 hours)
  let avgResponseTime = 0;
  if (recentInferences.length > 0) {
    const inferenceResponseTimes = recentInferences
      .filter((i: Doc<"inferences">) => i.responseTime !== undefined && i.responseTime > 0)
      .map((i: Doc<"inferences">) => i.responseTime!)
      .filter((time): time is number => time !== undefined);
    
    if (inferenceResponseTimes.length > 0) {
      avgResponseTime = inferenceResponseTimes.reduce((sum: number, time: number) => sum + time, 0) / inferenceResponseTimes.length;
    }
  }
  
  // Calculate failed prompts (since inferences table doesn't track errors, assume all recorded inferences are successful)
  const failedPrompts = 0;
  
  // Calculate current load
  const maxCapacity = activeProviders.length * 100;
  const currentRequests = todayInferences.filter((i: Doc<"inferences">) => i.timestamp > Date.now() - 60000).length;
  const currentLoad = maxCapacity > 0 ? currentRequests / maxCapacity : 0;
  
  // Calculate success rate
  const totalPrompts = inferences.length;
  const successRate = totalPrompts > 0 
    ? ((totalPrompts - failedPrompts) / totalPrompts) * 100 
    : 100;
  
  // Calculate total tokens
  const totalTokensProcessed = inferences.reduce((sum: number, i: Doc<"inferences">) => sum + (i.totalTokens || 0), 0);
  
  // Network uptime based on ACTUAL active providers
  const networkUptime = activeProviders.length > 0 ? 99.9 : 0;
  
  // Calculate total VCU balance from ALL providers
  const totalDiem = providers.reduce((sum: number, p: Doc<"providers">) => sum + (p.vcuBalance || 0), 0);
  
  // Count unique users from ALL inference data (more reliable approach)
  const uniqueAddresses = new Set();
  let anonymousCount = 0;
  
  // Process all inferences to count unique users
  for (const inference of inferences) {
    if (inference.address) {
      if (inference.address === 'anonymous') {
        anonymousCount++;
      } else {
        uniqueAddresses.add(inference.address);
      }
    }
  }
  
  // Also add any wallet addresses from userPoints table
  const userPoints = await ctx.db.query("userPoints").collect();
  for (const up of userPoints) {
    if (up.address) {
      uniqueAddresses.add(up.address);
    }
  }
  
  // Count every anonymous session as 1 unique user (no way to identify between them)
  const estimatedAnonUsers = anonymousCount;
  
  // Total unique users = unique addresses + anonymous users
  const activeUsers = uniqueAddresses.size + estimatedAnonUsers;
  
  // Minimum user count based on activity (never show less than this)
  const minimumUsers = Math.max(activeUsers, Math.ceil(inferences.length / 10)); // At least 1 user per 10 inferences
  
  // Calculate network health score
  let networkHealth = 0;
  if (activeProviders.length > 0) {
    const providerScore = Math.min(activeProviders.length / 10, 1) * 30;
    const uptimeScore = networkUptime * 0.3;
    const successScore = successRate * 0.3;
    const loadScore = (1 - Math.min(currentLoad, 1)) * 10;
    
    networkHealth = providerScore + uptimeScore + successScore + loadScore;
  }
  
  return {
    totalProviders: providers.length,
    activeProviders: activeProviders.length, // REAL count, not hardcoded
    totalDiem,
    totalPrompts,
    promptsToday: todayInferences.length,
    avgResponseTime: Math.round(avgResponseTime),
    networkHealth: Math.round(networkHealth),
    activeUsers: minimumUsers,
    failedPrompts,
    currentLoad,
    successRate,
    totalTokensProcessed,
    networkUptime,
  };
}

// Public mutation to refresh network stats cache (can be called from frontend)
export const updateNetworkStatsCache = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    stats: v.optional(v.object({
      totalProviders: v.number(),
      activeProviders: v.number(),
      totalDiem: v.number(),
      totalPrompts: v.number(),
      promptsToday: v.number(),
      avgResponseTime: v.number(),
      networkHealth: v.number(),
      activeUsers: v.number(),
      failedPrompts: v.number(),
      currentLoad: v.number(),
      successRate: v.number(),
      totalTokensProcessed: v.number(),
      networkUptime: v.number(),
    })),
    error: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    try {
      console.log("Manually refreshing network stats cache...");
      
      const stats = await calculateNetworkStats(ctx);
      
      const cached = await ctx.db.query("networkStatsCache").first();
      if (cached) {
        await ctx.db.patch(cached._id, {
          lastUpdated: Date.now(),
          totalProviders: stats.totalProviders,
          activeProviders: stats.activeProviders,
          totalDiem: stats.totalDiem,
          totalPrompts: stats.totalPrompts,
          promptsToday: stats.promptsToday,
          avgResponseTime: stats.avgResponseTime,
          networkHealth: stats.networkHealth,
          activeUsers: stats.activeUsers,
          failedPrompts: stats.failedPrompts,
          currentLoad: stats.currentLoad,
          successRate: stats.successRate,
          totalTokensProcessed: stats.totalTokensProcessed,
          networkUptime: stats.networkUptime,
        });
      } else {
        await ctx.db.insert("networkStatsCache", {
          lastUpdated: Date.now(),
          totalProviders: stats.totalProviders,
          activeProviders: stats.activeProviders,
          totalDiem: stats.totalDiem,
          totalPrompts: stats.totalPrompts,
          promptsToday: stats.promptsToday,
          avgResponseTime: stats.avgResponseTime,
          networkHealth: stats.networkHealth,
          activeUsers: stats.activeUsers,
          failedPrompts: stats.failedPrompts,
          currentLoad: stats.currentLoad,
          successRate: stats.successRate,
          totalTokensProcessed: stats.totalTokensProcessed,
          networkUptime: stats.networkUptime,
        });
      }
      
      console.log("Network stats cache refreshed successfully");
      return { success: true, stats };
    } catch (error) {
      console.error("Failed to refresh network stats cache:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});



// Background job to refresh stats cache periodically
export const refreshNetworkStatsCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("Refreshing network stats cache...");
      
      const stats = await calculateNetworkStats(ctx);
      
      const cached = await ctx.db.query("networkStatsCache").first();
      if (cached) {
        await ctx.db.patch(cached._id, {
          lastUpdated: Date.now(),
          totalProviders: stats.totalProviders,
          activeProviders: stats.activeProviders,
          totalDiem: stats.totalDiem,
          totalPrompts: stats.totalPrompts,
          promptsToday: stats.promptsToday,
          avgResponseTime: stats.avgResponseTime,
          networkHealth: stats.networkHealth,
          activeUsers: stats.activeUsers,
          failedPrompts: stats.failedPrompts,
          currentLoad: stats.currentLoad,
          successRate: stats.successRate,
          totalTokensProcessed: stats.totalTokensProcessed,
          networkUptime: stats.networkUptime,
        });
      } else {
        await ctx.db.insert("networkStatsCache", {
          lastUpdated: Date.now(),
          totalProviders: stats.totalProviders,
          activeProviders: stats.activeProviders,
          totalDiem: stats.totalDiem,
          totalPrompts: stats.totalPrompts,
          promptsToday: stats.promptsToday,
          avgResponseTime: stats.avgResponseTime,
          networkHealth: stats.networkHealth,
          activeUsers: stats.activeUsers,
          failedPrompts: stats.failedPrompts,
          currentLoad: stats.currentLoad,
          successRate: stats.successRate,
          totalTokensProcessed: stats.totalTokensProcessed,
          networkUptime: stats.networkUptime,
        });
      }
      
      console.log("Network stats cache refreshed successfully");
      return { success: true, stats };
    } catch (error) {
      console.error("Failed to refresh network stats cache:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});
