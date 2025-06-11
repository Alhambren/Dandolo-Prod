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
  },
  handler: async (ctx, args) => {
    const pointsRecord = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();

    if (pointsRecord) {
      await ctx.db.patch(pointsRecord._id, {
        points: args.points,
        totalPrompts: args.totalPrompts,
        lastEarned: args.lastEarned,
      });
    } else {
      await ctx.db.insert("providerPoints", {
        providerId: args.providerId,
        points: args.points,
        totalPrompts: args.totalPrompts,
        lastEarned: args.lastEarned,
      });
    }
  },
});

// Daily VCU rewards for providers
export const distributeDailyVCURewards = internalAction({
  args: {},
  handler: async (ctx) => {
    const activeProviders = await ctx.runQuery(internal.providers.listActiveInternal);
    
    for (const provider of activeProviders) {
      const dailyReward = provider.vcuBalance || 0; // 1 point per VCU
      
      if (dailyReward > 0) {
        // Use runQuery to get providerPoints
        const pointsRecord = await ctx.runQuery(internal.points.getProviderPointsInternal, {
          providerId: provider._id,
        });

        if (pointsRecord) {
          await ctx.runMutation(internal.points.updateProviderPointsInternal, {
            providerId: provider._id,
            points: pointsRecord.points + dailyReward,
            totalPrompts: pointsRecord.totalPrompts,
            lastEarned: Date.now(),
          });
        } else {
          // If no record, use awardProviderPoints to create it
          await ctx.runMutation(internal.points.awardProviderPoints, {
            providerId: provider._id,
            tokens: dailyReward * 100, // awardProviderPoints expects tokens, so convert points to tokens
          });
        }
      }
    }
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

// Get points leaderboard
export const getPointsLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const allProviderPoints = await ctx.db.query("providerPoints").collect();
    
    const leaderboard = await Promise.all(
      allProviderPoints.map(async (pp) => {
        const provider = await ctx.db.get(pp.providerId);
        return {
          providerId: pp.providerId,
          name: provider?.name ?? "Unknown Provider",
          points: pp.points,
          totalPrompts: pp.totalPrompts,
          vcuBalance: provider?.vcuBalance ?? 0,
          lastEarned: pp.lastEarned,
        };
      })
    );

    return leaderboard
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
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
