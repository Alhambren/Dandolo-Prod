import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Get user's total points
export const getUserPoints = query({
  args: { userId: v.id("users") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.points || 0;
  },
});

// Get user's stats including points history
export const getUserStats = query({
  args: { 
    userId: v.optional(v.id("users")),
    sessionId: v.optional(v.string()) 
  },
  returns: v.object({
    points: v.number(),
    totalSpent: v.number(),
    lastActivity: v.optional(v.number()),
    promptsToday: v.number(),
    promptsRemaining: v.number(),
    pointsToday: v.number(),
    pointsThisWeek: v.number(),
    pointsHistory: v.array(v.object({
      date: v.string(),
      points: v.number(),
      source: v.string(),
    })),
  }),
  handler: async (ctx, args) => {
    let userPoints;
    
    if (args.userId) {
      userPoints = await ctx.db
        .query("userPoints")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .first();
    } else if (args.sessionId) {
      userPoints = await ctx.db
        .query("userPoints")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId!))
        .first();
    }

    // Get today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    let todayUsage = 0;
    if (args.userId) {
      const logs = await ctx.db
        .query("usageLogs")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .filter((q) => q.and(
          q.gte(q.field("createdAt"), todayStart),
          q.lt(q.field("createdAt"), todayEnd)
        ))
        .collect();
      todayUsage = logs.length;
    } else if (args.sessionId) {
      const logs = await ctx.db
        .query("usageLogs")
        .filter((q) => q.and(
          q.eq(q.field("sessionId"), args.sessionId!),
          q.gte(q.field("createdAt"), todayStart),
          q.lt(q.field("createdAt"), todayEnd)
        ))
        .collect();
      todayUsage = logs.length;
    }

    // Get points history
    const pointsHistory: Array<{date: string, points: number, source: string}> = [];

    const points = userPoints?.points || 0;
    const totalSpent = userPoints?.totalSpent || 0;
    
    return {
      points,
      totalSpent,
      lastActivity: userPoints?.lastActivity,
      promptsToday: todayUsage,
      promptsRemaining: Math.max(0, 50 - todayUsage),
      pointsToday: todayUsage, // Points earned today
      pointsThisWeek: points, // For now, same as total
      pointsHistory,
    };
  },
});

// Add points to a user
export const addUserPoints = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;
    
    const newPoints = (user.points || 0) + args.amount;
    await ctx.db.patch(args.userId, { points: newPoints });
    
    await ctx.db.insert("pointTransactions", {
      userId: args.userId,
      amount: args.amount,
      source: args.source,
      timestamp: Date.now(),
    });
  },
});

// Get provider points
export const getProviderPoints = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const providerPoints = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();

    return providerPoints?.points || 0;
  },
});

// Daily VCU check and point allocation
export const dailyVCUCheck = internalAction({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.runQuery(internal.providers.listActiveInternal);
    for (const provider of providers) {
      try {
        const response = await fetch("https://api.venice.ai/api/v1/account/balance", {
          headers: { "Authorization": `Bearer ${provider.veniceApiKey}` }
        });
        if (response.ok) {
          const data = await response.json();
          const vcuBalance = data.balance || 0;
          await ctx.runMutation(internal.points.awardProviderPointsInternal, {
            providerId: provider._id,
            vcuBalance: vcuBalance,
          });
          await ctx.runMutation(internal.providers.updateVCUBalance, {
            providerId: provider._id,
            vcuBalance: vcuBalance,
          });
        }
      } catch (error) {
        console.error(`Failed VCU check for ${provider._id}:`, error);
      }
    }
  },
});

// Award points to a provider based on VCU balance
export const awardProviderPointsInternal = internalMutation({
  args: {
    providerId: v.id("providers"),
    vcuBalance: v.number(),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider || !provider.userId) return;
    
    // Award points equal to VCU balance
    const pointsToAward = Math.floor(args.vcuBalance);
    
    await ctx.db.insert("pointTransactions", {
      userId: provider.userId,
      amount: pointsToAward,
      source: "daily_vcu",
      timestamp: Date.now(),
    });
    
    // Update user's total points
    const user = await ctx.db.get(provider.userId);
    if (user) {
      await ctx.db.patch(provider.userId, {
        points: (user.points || 0) + pointsToAward,
      });
    }
  },
});

// Calculate daily provider points based on VCU contribution
export const calculateDailyProviderPoints = internalMutation({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    for (const provider of providers) {
      const points = await ctx.db
        .query("providerPoints")
        .withIndex("by_provider", (q) => q.eq("providerId", provider._id))
        .first();

      if (points) {
        const dailyPoints = provider.vcuBalance;
        await ctx.db.patch(points._id, {
          points: points.points + dailyPoints,
          lastEarned: Date.now(),
        });
      }
    }
  },
});

// Get leaderboard (top point earners)
export const getPointsLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const providerPoints = await ctx.db.query("providerPoints").collect();
    
    const leaderboard = await Promise.all(
      providerPoints.map(async (pp) => {
        const provider = await ctx.db.get(pp.providerId);
        return {
          name: provider?.name || "Unknown Provider",
          points: pp.points,
          totalPrompts: pp.totalPrompts,
          lastEarned: pp.lastEarned,
        };
      })
    );

    return leaderboard
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  },
});
