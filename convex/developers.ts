import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";

// Generate API key
export const generateApiKey = mutation({
  args: {
    address: v.string(),
    name: v.string(),
    keyType: v.union(v.literal("developer"), v.literal("agent")),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    // Check existing keys (limit 5 per user for MVP)
    const existingKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_address", q => q.eq("address", args.address))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();
    
    if (existingKeys.length >= 5) {
      throw new Error("Maximum 5 active keys allowed");
    }
    
    // Generate key
    const prefix = args.keyType === "agent" ? "ak_" : "dk_";
    const randomPart = Math.random().toString(36).substring(2) + 
                      Math.random().toString(36).substring(2);
    const key = prefix + randomPart;
    
    // Check for collisions (very unlikely but let's be safe)
    const existingKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", q => q.eq("key", key))
      .first();
    
    if (existingKey) {
      // Collision detected - use a different approach to avoid recursion
      throw new Error("Key generation collision - please try again");
    }
    
    await ctx.db.insert("apiKeys", {
      address: args.address,
      name: args.name,
      key,
      keyType: args.keyType,
      isActive: true,
      createdAt: Date.now(),
      totalUsage: 0,
      dailyUsage: 0,
      lastReset: Date.now(),
    });
    
    return key;
  },
});


// Get user's API keys (masked)
export const getUserApiKeys = query({
  args: { address: v.string() },
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
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_address", q => q.eq("address", args.address))
      .collect();
    
    return keys.map(k => ({
      _id: k._id,
      name: k.name,
      keyType: k.keyType || "developer",
      maskedKey: k.key.substring(0, 7) + "..." + k.key.substring(k.key.length - 4),
      isActive: k.isActive,
      createdAt: k.createdAt,
      lastUsed: k.lastUsed,
      dailyUsage: k.dailyUsage || 0,
      dailyLimit: (k.keyType || "developer") === "agent" ? 5000 : 500,
    }));
  },
});

// Revoke API key
export const revokeApiKey = mutation({
  args: { 
    keyId: v.id("apiKeys"),
    address: v.string(), // For ownership verification
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key || key.address !== args.address) {
      throw new Error("Key not found or unauthorized");
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
