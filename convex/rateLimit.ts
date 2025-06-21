// convex/rateLimit.ts - Rate limiting system for Dandolo.ai
// Implements Redis-like rate limiting using Convex database

import { v } from "convex/values";
import { mutation, query, internalAction } from "./_generated/server";

// Rate limit configurations
const RATE_LIMITS = {
  user: { requests: 1, window: 1000 },        // 1 request/second
  developer: { requests: 50, window: 60000 }, // 50 requests/minute
  agent: { requests: 50, window: 60000 }      // 50 requests/minute
} as const;

// Daily limits
const DAILY_LIMITS = {
  user: 100,
  developer: 1000,
  agent: 1000
} as const;

type UserType = keyof typeof RATE_LIMITS;

/**
 * Check if a request is allowed under rate limiting rules
 */
export const checkRateLimit = mutation({
  args: {
    identifier: v.string(),
    userType: v.union(v.literal("user"), v.literal("developer"), v.literal("agent")),
  },
  returns: v.object({
    allowed: v.boolean(),
    remaining: v.number(),
    resetTime: v.number(),
    retryAfter: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const config = RATE_LIMITS[args.userType];
    
    // Find existing rate limit record
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
      .first();

    if (!existing) {
      // First request - create new record
      await ctx.db.insert("rateLimits", {
        identifier: args.identifier,
        type: args.userType,
        requests: 1,
        windowStart: now,
        lastRequest: now,
      });

      return {
        allowed: true,
        remaining: config.requests - 1,
        resetTime: now + config.window,
      };
    }

    // Check if window has expired
    const windowExpired = now - existing.windowStart > config.window;
    
    if (windowExpired) {
      // Reset window
      await ctx.db.patch(existing._id, {
        requests: 1,
        windowStart: now,
        lastRequest: now,
      });

      return {
        allowed: true,
        remaining: config.requests - 1,
        resetTime: now + config.window,
      };
    }

    // Check if limit exceeded
    if (existing.requests >= config.requests) {
      const resetTime = existing.windowStart + config.window;
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: resetTime - now,
      };
    }

    // Increment counter
    await ctx.db.patch(existing._id, {
      requests: existing.requests + 1,
      lastRequest: now,
    });

    return {
      allowed: true,
      remaining: config.requests - existing.requests - 1,
      resetTime: existing.windowStart + config.window,
    };
  },
});

/**
 * Check daily usage limits with UTC midnight reset
 */
export const checkDailyLimit = mutation({
  args: {
    address: v.string(),
    apiKey: v.optional(v.string()),
  },
  returns: v.object({
    allowed: v.boolean(),
    used: v.number(),
    limit: v.number(),
    remaining: v.number(),
    resetTime: v.number(),
    userType: v.string(),
  }),
  handler: async (ctx, args) => {
    const userType = getUserType(args.apiKey);
    const limit = DAILY_LIMITS[userType];
    
    // Get user points record
    let userPoints = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (!userPoints) {
      // Create new user record
      const id = await ctx.db.insert("userPoints", {
        address: args.address,
        points: 0,
        promptsToday: 0,
        pointsToday: 0,
        lastEarned: Date.now(),
        lastReset: getUTCMidnight(),
        dailyLimit: limit,
      });
      
      userPoints = await ctx.db.get(id);
      if (!userPoints) {
        throw new Error("Failed to create user points record");
      }
    }

    // Check if new day (UTC midnight reset)
    const today = getUTCMidnight();
    const isNewDay = !userPoints.lastReset || userPoints.lastReset < today;

    let used = userPoints.promptsToday;
    if (isNewDay) {
      // Reset daily counters
      used = 0;
      await ctx.db.patch(userPoints._id, {
        promptsToday: 0,
        pointsToday: 0,
        lastReset: today,
        dailyLimit: limit,
      });
    }

    const remaining = Math.max(0, limit - used);
    const allowed = remaining > 0;

    return {
      allowed,
      used,
      limit,
      remaining,
      resetTime: getNextUTCMidnight(),
      userType,
    };
  },
});

/**
 * Increment daily usage counter
 */
export const incrementDailyUsage = mutation({
  args: {
    address: v.string(),
    apiKey: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    newCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const userType = getUserType(args.apiKey);
    const limit = DAILY_LIMITS[userType];
    
    let userPoints = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (!userPoints) {
      // Create new user record
      const id = await ctx.db.insert("userPoints", {
        address: args.address,
        points: 0,
        promptsToday: 1,
        pointsToday: 0,
        lastEarned: Date.now(),
        lastReset: getUTCMidnight(),
        dailyLimit: limit,
      });
      
      return { success: true, newCount: 1 };
    }

    // Check if new day
    const today = getUTCMidnight();
    const isNewDay = !userPoints.lastReset || userPoints.lastReset < today;

    if (isNewDay) {
      // Reset and increment
      await ctx.db.patch(userPoints._id, {
        promptsToday: 1,
        pointsToday: 0,
        lastReset: today,
        dailyLimit: limit,
      });
      return { success: true, newCount: 1 };
    }

    // Check if would exceed limit
    if (userPoints.promptsToday >= limit) {
      return { success: false, newCount: userPoints.promptsToday };
    }

    // Increment
    const newCount = userPoints.promptsToday + 1;
    await ctx.db.patch(userPoints._id, {
      promptsToday: newCount,
    });

    return { success: true, newCount };
  },
});

/**
 * Get current rate limit status
 */
export const getRateLimitStatus = query({
  args: {
    identifier: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      requests: v.number(),
      windowStart: v.number(),
      lastRequest: v.number(),
      type: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
      .first();

    if (!record) return null;

    return {
      requests: record.requests,
      windowStart: record.windowStart,
      lastRequest: record.lastRequest,
      type: record.type,
    };
  },
});

/**
 * Legacy support for existing rate limit checks
 */
export const checkRateLimitLegacy = mutation({
  args: { sessionId: v.string() },
  returns: v.object({
    allowed: v.boolean(),
    remaining: v.number(),
    limit: v.number(),
    current: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    // Extract address from sessionId
    const addressMatch = args.sessionId.match(/session-([^-]+)/);
    const address = addressMatch ? addressMatch[1] : 'anonymous';
    
    if (address === 'anonymous') {
      return { allowed: true, remaining: 100, limit: 100 };
    }
    
    // Use the daily limit check directly  
    const userType = getUserType(undefined);
    const limit = DAILY_LIMITS[userType];
    
    // Get user points record
    let userPoints = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    if (!userPoints) {
      return { allowed: true, remaining: limit, limit, current: 0 };
    }

    // Check if new day (UTC midnight reset)
    const today = getUTCMidnight();
    const isNewDay = !userPoints.lastReset || userPoints.lastReset < today;

    const used = isNewDay ? 0 : userPoints.promptsToday;
    const remaining = Math.max(0, limit - used);

    return {
      allowed: remaining > 0,
      remaining,
      limit,
      current: used,
    };
  },
});

// Cleanup function removed - will be implemented later

// Helper functions
function getUserType(apiKey?: string): UserType {
  if (!apiKey) return "user";
  if (apiKey.startsWith("dk_")) return "developer";
  if (apiKey.startsWith("ak_")) return "agent";
  return "user";
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

function getNextUTCMidnight(): number {
  const now = new Date();
  const nextMidnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return nextMidnight.getTime();
}