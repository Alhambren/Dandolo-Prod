import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

interface Points {
  _id: Id<"points">;
  address: string;
  points: number;
  promptsToday: number;
  pointsToday: number;
  lastEarned: number;
}

interface PointsHistory {
  _id: Id<"points_history">;
  address: string;
  amount: number;
  reason: string;
  ts: number;
}

interface ProviderPoints {
  _id: Id<"providerPoints">;
  providerId: Id<"providers">;
  points: number;
  totalPrompts: number;
  lastEarned: number;
}

// Get user's total points
export const getUserPoints = query({
  args: { 
    address: v.string()
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const points = await ctx.db
      .query("points")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    return points?.points || 0;
  },
});

// Get user's stats including points history
export const getUserStats = query({
  args: { 
    address: v.string()
  },
  returns: v.object({
    points: v.number(),
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
    // Get today's start timestamp
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    
    // Get points from points table
    const pointsRecord = await ctx.db
      .query("points")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    
    const points = pointsRecord?.points || 0;
    const promptsToday = pointsRecord?.promptsToday || 0;
    const pointsToday = pointsRecord?.pointsToday || 0;

    // Get today's usage from points_history
    const todayUsageArr = await ctx.db
      .query("points_history")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .filter((q) => q.gte(q.field("ts"), todayStart))
      .collect();

    return {
      points,
      promptsToday,
      promptsRemaining: Math.max(0, 50 - promptsToday),
      pointsToday,
      pointsThisWeek: points,
      pointsHistory: todayUsageArr.map(entry => ({
        date: new Date(entry.ts).toISOString().split('T')[0],
        points: entry.amount,
        source: entry.reason
      })),
    };
  },
});

// Add points to a user
export const addUserPoints = internalMutation({
  args: {
    address: v.string(),
    amount: v.number(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const points = await ctx.db
      .query("points")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    
    if (points) {
      const newPoints = points.points + args.amount;
      const newPromptsToday = points.promptsToday + (args.source === "prompt" ? 1 : 0);
      const newPointsToday = points.pointsToday + args.amount;
      
      await ctx.db.patch(points._id, { 
        points: newPoints,
        promptsToday: newPromptsToday,
        pointsToday: newPointsToday,
        lastEarned: Date.now()
      });
    } else {
      await ctx.db.insert("points", {
        address: args.address,
        points: args.amount,
        promptsToday: args.source === "prompt" ? 1 : 0,
        pointsToday: args.amount,
        lastEarned: Date.now()
      });
    }
    
    await ctx.db.insert("points_history", {
      address: args.address,
      amount: args.amount,
      reason: args.source,
      ts: Date.now()
    });
  },
});

// Get provider points
export const getProviderPoints = query({
  args: { providerId: v.id("providers") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const providerPoints = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first() as ProviderPoints | null;

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
    if (!provider) return;
    
    // Award points equal to VCU balance
    const pointsToAward = Math.floor(args.vcuBalance);
    
    // Update provider points
    const providerPoints = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();
    
    if (providerPoints) {
      await ctx.db.patch(providerPoints._id, {
        points: providerPoints.points + pointsToAward,
        lastEarned: Date.now()
      });
    } else {
      await ctx.db.insert("providerPoints", {
        providerId: args.providerId,
        points: pointsToAward,
        totalPrompts: 0,
        lastEarned: Date.now()
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

export const addPoints = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const pointsRecord = await ctx.db
      .query("points")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (pointsRecord) {
      await ctx.db.patch(pointsRecord._id, {
        points: pointsRecord.points + args.amount,
        pointsToday: pointsRecord.pointsToday + args.amount,
        lastEarned: Date.now(),
      });
    } else {
      await ctx.db.insert("points", {
        address: args.address,
        points: args.amount,
        promptsToday: 0,
        pointsToday: args.amount,
        lastEarned: Date.now(),
      });
    }
  },
});

export const getPoints = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const pointsRecord = await ctx.db
      .query("points")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    return pointsRecord || {
      address: args.address,
      points: 0,
      promptsToday: 0,
      pointsToday: 0,
      lastEarned: Date.now(),
    };
  },
});

export const getPointsHistory = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("points_history")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .order("desc")
      .take(10);

    return history;
  },
});

export const awardProviderPoints = mutation({
  args: {
    providerId: v.id("providers"),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return;

    const providerPoints = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();

    if (providerPoints) {
      await ctx.db.patch(providerPoints._id, {
        points: providerPoints.points + args.points,
        totalPrompts: providerPoints.totalPrompts + 1,
        lastEarned: Date.now(),
      });
    } else {
      await ctx.db.insert("providerPoints", {
        providerId: args.providerId,
        points: args.points,
        totalPrompts: 1,
        lastEarned: Date.now(),
      });
    }
  },
});
