import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Check if user has exceeded rate limits
export const checkRateLimit = mutation({
  args: {
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    // Get user's usage today
    let usageToday;
    if (args.address) {
      usageToday = await ctx.db
        .query("usageLogs")
        .withIndex("by_address", (q) => q.eq("address", args.address!))
        .filter((q) => q.gte(q.field("createdAt"), todayTimestamp))
        .collect();
    } else {
      return { allowed: false, remaining: 0, resetTime: todayTimestamp + 24 * 60 * 60 * 1000 };
    }

    const promptsToday = usageToday.length;
    const dailyLimit = 50; // MVP limit
    
    return {
      allowed: promptsToday < dailyLimit,
      remaining: Math.max(0, dailyLimit - promptsToday),
      resetTime: todayTimestamp + 24 * 60 * 60 * 1000,
      current: promptsToday,
    };
  },
});

// Get current rate limit status
export const getRateLimitStatus = query({
  args: {
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    let usageToday;
    if (args.address) {
      usageToday = await ctx.db
        .query("usageLogs")
        .withIndex("by_address", (q) => q.eq("address", args.address!))
        .filter((q) => q.gte(q.field("createdAt"), todayTimestamp))
        .collect();
    } else {
      return { current: 0, remaining: 50, resetTime: todayTimestamp + 24 * 60 * 60 * 1000 };
    }

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
