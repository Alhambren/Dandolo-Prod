import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Award points to user for making a prompt (according to specification)
export const awardUserPoints = internalMutation({
  args: {
    address: v.string(),
    userType: v.optional(v.union(v.literal("user"), v.literal("developer"), v.literal("agent"))),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Calculate points per prompt based on user type
    const userType = args.userType || getUserTypeFromApiKey(args.apiKey);
    const pointsPerPrompt = getPointsPerPrompt(userType);
    
    const utcMidnight = getUTCMidnight();
    
    const points = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (points) {
      // Check if we need to reset daily counters (UTC midnight)
      const isNewDay = !points.lastReset || points.lastReset < utcMidnight;

      await ctx.db.patch(points._id, {
        points: points.points + pointsPerPrompt,
        promptsToday: isNewDay ? 1 : points.promptsToday + 1,
        pointsToday: isNewDay ? pointsPerPrompt : points.pointsToday + pointsPerPrompt,
        lastEarned: Date.now(),
        lastReset: isNewDay ? utcMidnight : points.lastReset,
        dailyLimit: getDailyLimit(userType),
      });
    } else {
      await ctx.db.insert("userPoints", {
        address: args.address,
        points: pointsPerPrompt,
        promptsToday: 1,
        pointsToday: pointsPerPrompt,
        lastEarned: Date.now(),
        lastReset: utcMidnight,
        dailyLimit: getDailyLimit(userType),
      });
    }
    
    return pointsPerPrompt;
  },
});

// Helper functions for points calculation
function getUserTypeFromApiKey(apiKey?: string): "user" | "developer" | "agent" {
  if (!apiKey) return "user";
  if (apiKey.startsWith("dk_")) return "developer";
  if (apiKey.startsWith("ak_")) return "agent";
  return "user";
}

function getPointsPerPrompt(userType: string): number {
  const rates = {
    user: 1,      // 1 point per prompt
    developer: 2, // 2 points per prompt
    agent: 2      // 2 points per prompt
  };
  return rates[userType as keyof typeof rates] || 1;
}

function getDailyLimit(userType: string): number {
  const limits = {
    user: 100,      // 100 prompts/day
    developer: 1000, // 1000 prompts/day
    agent: 1000     // 1000 prompts/day
  };
  return limits[userType as keyof typeof limits] || 100;
}

function getUTCMidnight(): number {
  const now = new Date();
  const utcMidnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));
  return utcMidnight.getTime();
}

// Award points to provider
export const awardProviderPoints = internalMutation({
  args: { 
    providerId: v.id("providers"),
    tokens: v.number(),
  },
  handler: async (ctx, args) => {
    // Award 1 point per 100 tokens
    const pointsToAward = Math.floor(args.tokens / 100);
    
    const pointsRecord = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();

    if (pointsRecord) {
      await ctx.db.patch(pointsRecord._id, {
        points: pointsRecord.points + pointsToAward,
        totalPrompts: pointsRecord.totalPrompts + 1,
        lastEarned: Date.now(),
      });
    } else {
      await ctx.db.insert("providerPoints", {
        providerId: args.providerId,
        points: pointsToAward,
        totalPrompts: 1,
        lastEarned: Date.now(),
      });
    }
  },
});

// Internal query to get provider points (for use in actions)
export const getProviderPointsInternal = internalQuery({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const pointsRecord = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();
    return pointsRecord ?? null;
  },
});

// Internal mutation to update provider points (for use in actions)
export const updateProviderPointsInternal = internalMutation({
  args: {
    providerId: v.id("providers"),
    points: v.number(),
    totalPrompts: v.number(),
    lastEarned: v.number(),
    lastDailyReward: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const pointsRecord = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();

    const updateData = {
      points: args.points,
      totalPrompts: args.totalPrompts,
      lastEarned: args.lastEarned,
      ...(args.lastDailyReward !== undefined && { lastDailyReward: args.lastDailyReward }),
    };

    if (pointsRecord) {
      await ctx.db.patch(pointsRecord._id, updateData);
    } else {
      await ctx.db.insert("providerPoints", {
        providerId: args.providerId,
        ...updateData,
      });
    }
  },
});

// Daily VCU rewards for providers (runs at UTC midnight as per specification)
export const distributeDailyVCURewards = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("[VCU_REWARDS] Starting daily VCU rewards distribution at UTC midnight...");
    
    // Get all active providers for daily rewards
    const activeProviders = await ctx.runQuery(internal.providers.listActiveInternal);
    console.log(`[VCU_REWARDS] Found ${activeProviders.length} active providers`);
    
    const utcMidnight = getUTCMidnightForCron();
    let totalAwarded = 0;
    let providersAwarded = 0;
    
    for (const provider of activeProviders) {
      try {
        // Daily reward = VCU balance (1:1 ratio as per specification)
        const dailyReward = provider.vcuBalance || 0;
        
        if (dailyReward <= 0) {
          console.log(`[VCU_REWARDS] Skipping provider ${provider.name} - no VCU balance`);
          continue;
        }
        
        // Get current points record
        const pointsRecord = await ctx.runQuery(internal.points.getProviderPointsInternal, {
          providerId: provider._id,
        });
        
        // Check if already awarded today (UTC midnight check)
        if (pointsRecord?.lastDailyReward && pointsRecord.lastDailyReward >= utcMidnight) {
          console.log(`[VCU_REWARDS] Already awarded daily points to provider ${provider.name} today`);
          continue;
        }
        
        const currentPoints = pointsRecord?.points ?? 0;
        const newTotalPoints = currentPoints + dailyReward;
        
        // Award daily VCU points
        await ctx.runMutation(internal.points.updateProviderPointsInternal, {
          providerId: provider._id,
          points: newTotalPoints,
          totalPrompts: pointsRecord?.totalPrompts ?? 0,
          lastEarned: Date.now(),
          lastDailyReward: utcMidnight,
        });
        
        console.log(`[VCU_REWARDS] ✓ Awarded ${dailyReward} VCU points to ${provider.name}. Total: ${newTotalPoints}`);
        totalAwarded += dailyReward;
        providersAwarded++;
        
      } catch (error) {
        console.error(`[VCU_REWARDS] Error awarding points to provider ${provider._id}:`, error);
      }
    }
    
    console.log(`[VCU_REWARDS] Completed: ${providersAwarded} providers awarded ${totalAwarded} total points`);
    return { providersAwarded, totalAwarded };
  },
});

// Helper function for cron job UTC midnight calculation
function getUTCMidnightForCron(): number {
  const now = new Date();
  const utcMidnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));
  return utcMidnight.getTime();
}

// Get provider points and stats (public query)
export const getProviderPoints = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const pointsRecord = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();
    return {
      points: pointsRecord?.points ?? 0,
      totalPrompts: pointsRecord?.totalPrompts ?? 0,
      lastEarned: pointsRecord?.lastEarned ?? 0,
    };
  },
});

// Debug query to get all provider points
export const getAllProviderPoints = query({
  args: {},
  handler: async (ctx) => {
    const allProviderPoints = await ctx.db.query("providerPoints").collect();
    const providersWithPoints = [];
    
    for (const pp of allProviderPoints) {
      const provider = await ctx.db.get(pp.providerId);
      providersWithPoints.push({
        providerId: pp.providerId,
        providerName: provider?.name || "Unknown",
        points: pp.points,
        totalPrompts: pp.totalPrompts,
        lastEarned: pp.lastEarned,
      });
    }
    
    return providersWithPoints;
  },
});

// Get points leaderboard with current user's ranking
export const getPointsLeaderboardWithUserRank = query({
  args: { 
    limit: v.optional(v.number()),
    currentAddress: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    
    // Get all users with points
    const allUserPoints = await ctx.db.query("userPoints").collect();
    
    // Create leaderboard entries
    const leaderboard = allUserPoints
      .map(up => ({
        address: up.address,
        points: up.points,
        promptsToday: up.promptsToday,
        isCurrentUser: up.address === args.currentAddress,
        rank: 0, // Will be set after sorting
      }))
      .sort((a, b) => b.points - a.points);
    
    // Add rankings
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    // Get top N
    const topLeaders = leaderboard.slice(0, limit);
    
    // Find current user's entry if not in top N
    let currentUserEntry = null;
    if (args.currentAddress) {
      const userInTop = topLeaders.some(l => l.address === args.currentAddress);
      if (!userInTop) {
        currentUserEntry = leaderboard.find(l => l.address === args.currentAddress);
      }
    }
    
    return {
      topLeaders,
      currentUserEntry,
      totalParticipants: leaderboard.length,
    };
  },
});

// Get provider leaderboard with rank
export const getProviderLeaderboardWithRank = query({
  args: { 
    limit: v.optional(v.number()),
    currentAddress: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    
    // Get all provider points
    const allProviderPoints = await ctx.db.query("providerPoints").collect();
    
    // Get provider details and create leaderboard
    const leaderboard = await Promise.all(
      allProviderPoints.map(async (pp) => {
        const provider = await ctx.db.get(pp.providerId);
        return {
          providerId: pp.providerId,
          name: provider?.name ?? "Unknown Provider",
          address: provider?.address ?? "",
          points: pp.points,
          totalPrompts: pp.totalPrompts,
          vcuBalance: provider?.vcuBalance ?? 0,
          lastEarned: pp.lastEarned,
          isCurrentUser: provider?.address === args.currentAddress,
          rank: 0,
        };
      })
    );
    
    // Sort by points and add rankings
    leaderboard.sort((a, b) => b.points - a.points);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    // Get top N
    const topProviders = leaderboard.slice(0, limit);
    
    // Find current user's provider entry if not in top N
    let currentProviderEntry = null;
    if (args.currentAddress) {
      const userInTop = topProviders.some(p => p.address === args.currentAddress);
      if (!userInTop) {
        currentProviderEntry = leaderboard.find(p => p.address === args.currentAddress);
      }
    }
    
    return {
      topProviders,
      currentProviderEntry,
      totalProviders: leaderboard.length,
    };
  },
});

// Get user stats - Updated to use new points system
export const getUserStats = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const points = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    // Default user limit (non-API key users get 100)
    const defaultLimit = 100;

    if (!points) {
      return {
        points: 0,
        promptsToday: 0,
        promptsRemaining: defaultLimit,
        canMakePrompt: true,
      };
    }

    // Check if it's a new day using UTC midnight (as per specification)
    const utcMidnight = getUTCMidnight();
    const isNewDay = !points.lastReset || points.lastReset < utcMidnight;
    
    // Use current daily limit or default
    const dailyLimit = points.dailyLimit || defaultLimit;
    const promptsToday = isNewDay ? 0 : points.promptsToday;
    const promptsRemaining = Math.max(0, dailyLimit - promptsToday);

    return {
      points: points.points,
      promptsToday,
      promptsRemaining,
      canMakePrompt: promptsRemaining > 0,
    };
  },
});

// Get user's total points
export const getUserPoints = query({
  args: { address: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const points = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    return points?.points ?? 0;
  },
});
