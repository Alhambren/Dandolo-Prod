import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Get user points (for dashboard)
export const getUserPoints = query({
  args: { 
    userId: v.optional(v.id("users")),
    sessionId: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    let userPoints;
    
    if (args.userId) {
      userPoints = await ctx.db
        .query("userPoints")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();
    } else if (args.sessionId) {
      userPoints = await ctx.db
        .query("userPoints")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .first();
    }

    return userPoints?.points || 0;
  },
});

// Get detailed user stats (for dashboard)
export const getUserStats = query({
  args: { 
    userId: v.optional(v.id("users")),
    sessionId: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    let userPoints;
    
    if (args.userId) {
      userPoints = await ctx.db
        .query("userPoints")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();
    } else if (args.sessionId) {
      userPoints = await ctx.db
        .query("userPoints")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .first();
    }

    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    let todayUsage = 0;
    if (args.userId) {
      const logs = await ctx.db
        .query("usageLogs")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.and(
          q.gte(q.field("timestamp"), todayStart),
          q.lt(q.field("timestamp"), todayEnd)
        ))
        .collect();
      todayUsage = logs.length;
    } else if (args.sessionId) {
      const logs = await ctx.db
        .query("usageLogs")
        .filter((q) => q.and(
          q.eq(q.field("sessionId"), args.sessionId),
          q.gte(q.field("timestamp"), todayStart),
          q.lt(q.field("timestamp"), todayEnd)
        ))
        .collect();
      todayUsage = logs.length;
    }

    return {
      points: userPoints?.points || 0,
      totalSpent: userPoints?.totalSpent || 0,
      lastActivity: userPoints?.lastActivity,
      promptsToday: todayUsage,
      promptsRemaining: Math.max(0, 50 - todayUsage), // MVP: 50 prompts/day limit
    };
  },
});

// Add points to user (called after successful prompt)
export const addUserPoints = mutation({
  args: {
    userId: v.optional(v.id("users")),
    sessionId: v.optional(v.string()),
    amount: v.number(),
    spent: v.number(),
  },
  handler: async (ctx, args) => {
    // Check daily limit first (50 prompts/day during MVP)
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    let todayUsage = 0;
    if (args.userId) {
      const logs = await ctx.db
        .query("usageLogs")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.and(
          q.gte(q.field("timestamp"), todayStart),
          q.lt(q.field("timestamp"), todayEnd)
        ))
        .collect();
      todayUsage = logs.length;
    } else if (args.sessionId) {
      const logs = await ctx.db
        .query("usageLogs")
        .filter((q) => q.and(
          q.eq(q.field("sessionId"), args.sessionId),
          q.gte(q.field("timestamp"), todayStart),
          q.lt(q.field("timestamp"), todayEnd)
        ))
        .collect();
      todayUsage = logs.length;
    }

    // Award points for tracking (even during free MVP)
    const pointsToAdd = args.amount;

    let userPoints;
    if (args.userId) {
      userPoints = await ctx.db
        .query("userPoints")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();
    } else if (args.sessionId) {
      userPoints = await ctx.db
        .query("userPoints")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .first();
    }

    if (userPoints) {
      await ctx.db.patch(userPoints._id, {
        points: userPoints.points + pointsToAdd,
        totalSpent: userPoints.totalSpent + args.spent,
        lastActivity: Date.now(),
      });
    } else {
      await ctx.db.insert("userPoints", {
        userId: args.userId,
        sessionId: args.sessionId,
        points: pointsToAdd,
        totalSpent: args.spent,
        lastActivity: Date.now(),
      });
    }

    return pointsToAdd;
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

// Award points to provider (called after VCU check)
export const awardProviderPoints = mutation({
  args: {
    providerId: v.id("providers"),
    vcuBalance: v.number(),
  },
  handler: async (ctx, args) => {
    const providerPoints = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();

    if (providerPoints) {
      await ctx.db.patch(providerPoints._id, {
        points: providerPoints.points + args.vcuBalance,
        lastEarned: Date.now(),
      });
    } else {
      await ctx.db.insert("providerPoints", {
        providerId: args.providerId,
        points: args.vcuBalance,
        totalPrompts: 0,
        lastEarned: Date.now(),
      });
    }

    return args.vcuBalance;
  },
});

// Daily VCU check for all providers (scheduled function)
export const dailyVCUCheck = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all active providers
    const providers = await ctx.runQuery(internal.providers.listActiveInternal);
    
    for (const provider of providers) {
      // Schedule VCU check at random time within next 24 hours
      const randomDelay = Math.floor(Math.random() * 24 * 60 * 60 * 1000); // 0-24 hours in ms
      
      await ctx.scheduler.runAfter(
        randomDelay,
        internal.points.checkProviderVCU,
        { providerId: provider._id }
      );
    }
  },
});

// Check individual provider VCU balance
export const checkProviderVCU = internalAction({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.runQuery(internal.providers.getProviderInternal, {
      providerId: args.providerId,
    });

    if (!provider || !provider.isActive) return;

    try {
      // Check actual Venice.ai VCU balance
      const balanceResponse = await fetch("https://api.venice.ai/api/v1/account/balance", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${provider.veniceApiKey}`,
        },
      });

      if (!balanceResponse.ok) {
        throw new Error(`Venice API error: ${balanceResponse.status}`);
      }

      const balanceData = await balanceResponse.json();
      const vcuBalance = balanceData.balance || 0;
      
      // Award points equal to VCU balance
      await ctx.runMutation(internal.points.awardProviderPointsInternal, {
        providerId: args.providerId,
        vcuBalance: vcuBalance,
      });

      // Update provider VCU balance
      await ctx.runMutation(internal.providers.updateVCUBalance, {
        providerId: args.providerId,
        vcuBalance: vcuBalance,
      });

    } catch (error) {
      console.error(`Failed to check VCU for provider ${args.providerId}:`, error);
    }
  },
});

// Internal mutation for awarding provider points
export const awardProviderPointsInternal = internalMutation({
  args: {
    providerId: v.id("providers"),
    vcuBalance: v.number(),
  },
  handler: async (ctx, args) => {
    const providerPoints = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();

    if (providerPoints) {
      await ctx.db.patch(providerPoints._id, {
        points: providerPoints.points + args.vcuBalance,
        lastEarned: Date.now(),
      });
    } else {
      await ctx.db.insert("providerPoints", {
        providerId: args.providerId,
        points: args.vcuBalance,
        totalPrompts: 0,
        lastEarned: Date.now(),
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
