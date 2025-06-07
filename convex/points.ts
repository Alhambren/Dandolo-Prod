import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Award 0.1 points for serving a prompt
export const awardPromptPoints = mutation({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const pointsRecord = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();

    if (pointsRecord) {
      await ctx.db.patch(pointsRecord._id, {
        points: pointsRecord.points + 0.1, // 0.1 points per prompt
        totalPrompts: pointsRecord.totalPrompts + 1,
        lastEarned: Date.now(),
      });
    } else {
      await ctx.db.insert("providerPoints", {
        providerId: args.providerId,
        points: 0.1,
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

// Daily VCU rewards: 1 point per VCU per day
export const distributeDailyVCURewards = internalAction({
  args: {},
  handler: async (ctx) => {
    const activeProviders = await ctx.runQuery(internal.providers.listActiveInternal);
    for (const provider of activeProviders) {
      // Get current points record via internal query
      const pointsRecord = await ctx.runQuery(internal.points.getProviderPointsInternal, {
        providerId: provider._id,
      });
      if (!pointsRecord) {
        console.log(`No points record found for provider ${provider._id}`);
        continue;
      }
      // Award daily VCU reward (no lastDailyReward check)
      const dailyVCUReward = provider.vcuBalance ?? 0; // 1 point per VCU per day
      await ctx.runMutation(internal.points.updateProviderPointsInternal, {
        providerId: provider._id,
        points: (pointsRecord?.points ?? 0) + dailyVCUReward,
        totalPrompts: pointsRecord?.totalPrompts ?? 0,
        lastEarned: Date.now(),
      });
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

export const migratePoints = internalMutation({
  args: {},
  handler: async (ctx) => {
    const points = await ctx.db.query("points").collect();
    for (const point of points) {
      await ctx.db.patch(point._id, {
        userId: point.address, // Convert address to userId
        points: 0, // Initialize new required fields
        promptsToday: 0,
        pointsToday: 0,
      });
    }
  },
});
