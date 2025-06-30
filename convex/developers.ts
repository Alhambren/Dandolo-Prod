import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";

// DEPRECATED: Use api.apiKeys.createApiKey instead
// This function is kept for backward compatibility but should not be used
export const generateApiKey = mutation({
  args: {
    address: v.string(),
    name: v.string(),
    keyType: v.union(v.literal("developer"), v.literal("agent")),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    throw new Error("This function is deprecated. Use api.apiKeys.createApiKey instead.");
  },
});


// Get user's API keys (masked) - SECURE VERSION with authentication
export const getUserApiKeys = query({
  args: { 
    sessionToken: v.string() // SECURITY: Require authenticated session
  },
  returns: v.array(v.object({
    _id: v.id("apiKeys"),
    name: v.string(),
    keyType: v.union(v.literal("developer"), v.literal("agent")),
    maskedKey: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    lastUsed: v.optional(v.number()),
    dailyUsage: v.number(),
    dailyLimit: v.number(),
  })),
  handler: async (ctx, args) => {
    // SECURITY: Verify session and get authenticated address
    const session = await ctx.db
      .query("authSessions")
      .filter(q => q.eq(q.field("sessionToken"), args.sessionToken))
      .first();

    if (!session) {
      throw new Error("Authentication required: Invalid session token");
    }

    if (session.expires < Date.now()) {
      throw new Error("Authentication required: Session expired");
    }

    // SECURITY: Only return keys for the authenticated user
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_address", q => q.eq("address", session.address))
      .collect();
    
    return keys.map(k => ({
      _id: k._id,
      name: k.name,
      keyType: k.keyType || "developer",
      maskedKey: k.key.substring(0, 3) + "..." + k.key.substring(k.key.length - 4),
      isActive: k.isActive,
      createdAt: k.createdAt,
      lastUsed: k.lastUsed,
      dailyUsage: k.dailyUsage || 0,
      dailyLimit: (k.keyType || "developer") === "agent" ? 5000 : 500,
    }));
  },
});

// Revoke API key - SECURE VERSION with authentication
export const revokeApiKey = mutation({
  args: { 
    keyId: v.id("apiKeys"),
    sessionToken: v.string(), // SECURITY: Require authenticated session
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // SECURITY: Verify session and get authenticated address
    const session = await ctx.db
      .query("authSessions")
      .filter(q => q.eq(q.field("sessionToken"), args.sessionToken))
      .first();

    if (!session) {
      throw new Error("Authentication required: Invalid session token");
    }

    if (session.expires < Date.now()) {
      throw new Error("Authentication required: Session expired");
    }

    // SECURITY: Verify key ownership
    const key = await ctx.db.get(args.keyId);
    if (!key || key.address !== session.address) {
      throw new Error("Key not found or unauthorized access denied");
    }
    
    await ctx.db.patch(args.keyId, { isActive: false });
    return true;
  },
});

// Validate API key and check rate limits
export const validateApiKey = query({
  args: { key: v.string() },
  returns: v.object({
    isValid: v.boolean(),
    error: v.optional(v.string()),
    status: v.optional(v.number()),
    keyId: v.optional(v.id("apiKeys")),
    keyType: v.optional(v.union(v.literal("developer"), v.literal("agent"))),
    usage: v.optional(v.number()),
    limit: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const keyRecord = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", q => q.eq("key", args.key))
      .filter(q => q.eq(q.field("isActive"), true))
      .first();
    
    if (!keyRecord) {
      return { isValid: false, error: "Invalid or inactive API key", status: 401 };
    }
    
    // Check daily rate limit
    const limit = (keyRecord.keyType || "developer") === "agent" ? 5000 : 500;
    if ((keyRecord.dailyUsage || 0) >= limit) {
      return { 
        isValid: false, 
        error: `Daily limit exceeded (${limit} requests). Resets at midnight UTC.`,
        status: 429 
      };
    }
    
    return { 
      isValid: true, 
      keyId: keyRecord._id,
      keyType: keyRecord.keyType,
      usage: keyRecord.dailyUsage || 0,
      limit 
    };
  },
});

// Record API usage
export const recordUsage = mutation({
  args: { 
    keyId: v.id("apiKeys"),
    tokens: v.number()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key) return null;
    
    // Increment usage
    await ctx.db.patch(args.keyId, {
      dailyUsage: (key.dailyUsage || 0) + 1,
      totalUsage: key.totalUsage + args.tokens,
      lastUsed: Date.now(),
    });
    
    return null;
  },
});

// Reset daily usage (call this from a cron job)
export const resetDailyUsage = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const keys = await ctx.db.query("apiKeys").collect();
    let resetCount = 0;
    
    for (const key of keys) {
      await ctx.db.patch(key._id, {
        dailyUsage: 0,
        lastReset: Date.now(),
      });
      resetCount++;
    }
    
    return resetCount;
  },
});
