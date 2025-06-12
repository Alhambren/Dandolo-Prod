import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Award points to user for making a prompt
export const awardUserPoints = internalMutation({
  args: {
    address: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const points = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (points) {
      // Check if we need to reset daily counters
      const lastEarnedDate = new Date(points.lastEarned);
      lastEarnedDate.setHours(0, 0, 0, 0);
      const isNewDay = lastEarnedDate.getTime() < todayTimestamp;

      await ctx.db.patch(points._id, {
        points: points.points + args.amount,
        promptsToday: isNewDay ? 1 : points.promptsToday + 1,
        pointsToday: isNewDay ? args.amount : points.pointsToday + args.amount,
        lastEarned: Date.now(),
      });
    } else {
      await ctx.db.insert("userPoints", {
        address: args.address,
        points: args.amount,
        promptsToday: 1,
        pointsToday: args.amount,
        lastEarned: Date.now(),
      });
    }
  },
});

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

// Daily VCU rewards for providers
export const distributeDailyVCURewards = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting daily VCU rewards distribution...");
    const activeProviders = await ctx.runQuery(internal.providers.listActiveInternal);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    let totalAwarded = 0;
    
    for (const provider of activeProviders) {
      const dailyReward = provider.vcuBalance || 0; // 1 point per VCU per day
      
      if (dailyReward > 0) {
        // Get current points record
        const pointsRecord = await ctx.runQuery(internal.points.getProviderPointsInternal, {
          providerId: provider._id,
        });
        
        // Check if already awarded today
        if (pointsRecord && pointsRecord.lastDailyReward && pointsRecord.lastDailyReward >= todayTimestamp) {
          console.log(`Already awarded daily points to provider ${provider.name} today`);
          continue;
        }
        
        const currentPoints = pointsRecord?.points ?? 0;
        const newTotalPoints = currentPoints + dailyReward;
        
        // Update provider points - ACCUMULATE don't replace
        await ctx.runMutation(internal.points.updateProviderPointsInternal, {
          providerId: provider._id,
          points: newTotalPoints,
          totalPrompts: pointsRecord?.totalPrompts ?? 0,
          lastEarned: Date.now(),
          lastDailyReward: todayTimestamp,
        });
        
        console.log(`Awarded ${dailyReward} VCU points to ${provider.name}. Total now: ${newTotalPoints}`);
        totalAwarded += dailyReward;
      }
    }
    
    console.log(`Daily VCU rewards complete. Total points awarded: ${totalAwarded}`);
  },
});

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

// Get user stats
export const getUserStats = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const points = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (!points) {
      return {
        points: 0,
        promptsToday: 0,
        promptsRemaining: 50,
        canMakePrompt: true,
      };
    }

    // Check if it's a new day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastEarnedDate = new Date(points.lastEarned);
    lastEarnedDate.setHours(0, 0, 0, 0);
    
    const isNewDay = lastEarnedDate.getTime() < today.getTime();
    const promptsToday = isNewDay ? 0 : points.promptsToday;

    return {
      points: points.points,
      promptsToday,
      promptsRemaining: Math.max(0, 50 - promptsToday),
      canMakePrompt: promptsToday < 50,
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
