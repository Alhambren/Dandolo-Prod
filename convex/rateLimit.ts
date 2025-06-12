import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Rate limiting based on userPoints promptsToday
export const checkRateLimit = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    // Extract address from sessionId
    const addressMatch = args.sessionId.match(/session-([^-]+)/);
    const address = addressMatch ? addressMatch[1] : 'anonymous';
    
    if (address === 'anonymous') {
      // Anonymous users get limited access
      return { allowed: true, remaining: 5, limit: 5 };
    }
    
    // Get user's points record
    const userPoints = await ctx.db
      .query("userPoints")
      .withIndex("by_address", q => q.eq("address", address))
      .first();
    
    const promptsToday = userPoints?.promptsToday ?? 0;
    const limit = 50;
    const remaining = Math.max(0, limit - promptsToday);
    
    return {
      allowed: remaining > 0,
      remaining,
      limit,
      current: promptsToday,
    };
  },
});

export const getRateLimitStatus = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const addressMatch = args.sessionId.match(/session-([^-]+)/);
    const address = addressMatch ? addressMatch[1] : 'anonymous';
    
    if (address === 'anonymous') {
      return { current: 0, remaining: 5, limit: 5 };
    }
    
    const userPoints = await ctx.db
      .query("userPoints")
      .withIndex("by_address", q => q.eq("address", address))
      .first();
    
    const promptsToday = userPoints?.promptsToday ?? 0;
    const limit = 50;
    
    return {
      current: promptsToday,
      remaining: Math.max(0, limit - promptsToday),
      limit,
    };
  },
});
