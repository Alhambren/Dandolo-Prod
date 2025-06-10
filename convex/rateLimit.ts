import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const checkRateLimit = mutation({
  args: {
    address: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    if (!args.address) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: todayTimestamp + 24 * 60 * 60 * 1000,
        current: 0,
      };
    }

    const usageToday = await ctx.db
      .query("usageLogs")
      .withIndex("by_address", (q) => q.eq("address", args.address!))
      .filter((q) => q.gte(q.field("createdAt"), todayTimestamp))
      .collect();

    const promptsToday = usageToday.length;
    const dailyLimit = args.limit || 50;

    return {
      allowed: promptsToday < dailyLimit,
      remaining: Math.max(0, dailyLimit - promptsToday),
      resetTime: todayTimestamp + 24 * 60 * 60 * 1000,
      current: promptsToday,
    };
  },
});

export const getRateLimitStatus = query({
  args: {
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    if (!args.address) {
      return {
        current: 0,
        remaining: 50,
        resetTime: todayTimestamp + 24 * 60 * 60 * 1000,
        limit: 50,
      };
    }

    const usageToday = await ctx.db
      .query("usageLogs")
      .withIndex("by_address", (q) => q.eq("address", args.address!))
      .filter((q) => q.gte(q.field("createdAt"), todayTimestamp))
      .collect();

    const promptsToday = usageToday.length;
    const dailyLimit = 50;

    return {
      current: promptsToday,
      remaining: Math.max(0, dailyLimit - promptsToday),
      resetTime: todayTimestamp + 24 * 60 * 60 * 1000,
      limit: dailyLimit,
    };
  },
});
