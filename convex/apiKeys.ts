import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";

// API Key types and limits according to specification
const API_KEY_TYPES = {
  developer: { prefix: "dk_", dailyLimit: 500, pointsPerPrompt: 2 },
  agent: { prefix: "ak_", dailyLimit: 5000, pointsPerPrompt: 2 }
} as const;

type ApiKeyType = keyof typeof API_KEY_TYPES;

// Internal mutation to create API key record
export const createApiKeyRecord = internalMutation({
  args: {
    address: v.string(),
    name: v.string(),
    keyType: v.union(v.literal("developer"), v.literal("agent")),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already has a key of this type
    const existingKeyOfType = await ctx.db
      .query("apiKeys")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .filter((q) => q.and(
        q.eq(q.field("keyType"), args.keyType),
        q.eq(q.field("isActive"), true)
      ))
      .first();
    
    if (existingKeyOfType) {
      throw new Error(`You already have an active ${args.keyType} key. Each user can only have one developer key and one agent key.`);
    }
    
    // Check if key already exists
    const existingKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    
    if (existingKey) {
      throw new Error("Key collision detected");
    }
    
    return await ctx.db.insert("apiKeys", {
      address: args.address,
      name: args.name,
      key: args.key,
      keyType: args.keyType,
      isActive: true,
      createdAt: Date.now(),
      totalUsage: 0,
      dailyUsage: 0,
      lastReset: Date.now(),
    });
  },
});

/**
 * Determine API key type from the key string
 */
function getApiKeyType(key: string): ApiKeyType | "user" {
  if (key.startsWith("dk_")) return "developer";
  if (key.startsWith("ak_")) return "agent";
  return "user";
}

/**
 * Create a new API key for a wallet address
 */
export const createApiKey = action({
  args: {
    address: v.string(),
    name: v.string(),
    keyType: v.union(v.literal("developer"), v.literal("agent")),
  },
  returns: v.object({
    key: v.string(),
    keyId: v.id("apiKeys"),
  }),
  handler: async (ctx, args): Promise<{ key: string; keyId: Id<"apiKeys"> }> => {
    // Validate user is authenticated (must have wallet address)
    if (!args.address || args.address.length !== 42 || !args.address.startsWith('0x')) {
      throw new Error("Valid wallet address required to generate API keys");
    }
    
    // Generate cryptographically secure API key using Web Crypto API
    const prefix = args.keyType === 'agent' ? 'ak_' : 'dk_';
    
    // Generate 24 bytes of secure random data
    const randomArray = new Uint8Array(24);
    crypto.getRandomValues(randomArray);
    
    // Convert to hex string
    const randomHex = Array.from(randomArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const newKey = `${prefix}${randomHex}`;
    
    // Use mutation to create the key record with all validations
    try {
      const keyId = await ctx.runMutation(internal.apiKeys.createApiKeyRecord, {
        address: args.address,
        name: args.name,
        keyType: args.keyType,
        key: newKey,
      });

      return {
        key: newKey,
        keyId: keyId,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "Key collision detected") {
        // Very unlikely, but try again with a new key
        // Retry by generating a new key instead of recursion
        throw new Error("Key generation failed - please try again");
      }
      throw error;
    }
  },
});

/**
 * Validate an API key and return the record if active with enhanced info
 */
export const validateKey = query({
  args: { key: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("apiKeys"),
      address: v.optional(v.string()),
      name: v.string(),
      isActive: v.boolean(),
      keyType: v.optional(v.string()),
      dailyUsage: v.optional(v.number()),
      totalUsage: v.number(),
      dailyLimit: v.number(),
      pointsPerPrompt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const keyRecord = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!keyRecord || !keyRecord.isActive) {
      return null;
    }
    
    const keyType = getApiKeyType(args.key);
    const config = keyType !== "user" ? API_KEY_TYPES[keyType] : { dailyLimit: 100, pointsPerPrompt: 1 };

    return {
      _id: keyRecord._id,
      address: keyRecord.address,
      name: keyRecord.name,
      isActive: keyRecord.isActive,
      keyType: keyRecord.keyType,
      dailyUsage: keyRecord.dailyUsage || 0,
      totalUsage: keyRecord.totalUsage || 0,
      dailyLimit: config.dailyLimit,
      pointsPerPrompt: config.pointsPerPrompt,
    };
  },
});

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

/**
 * Record usage information for an API key with daily reset logic
 */
export const recordUsage = mutation({
  args: { keyId: v.id("apiKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.keyId);
    if (!record) return null;
    
    const utcMidnight = getUTCMidnight();
    const isNewDay = !record.lastReset || record.lastReset < utcMidnight;
    
    await ctx.db.patch(args.keyId, {
      lastUsed: Date.now(),
      totalUsage: (record.totalUsage || 0) + 1,
      dailyUsage: isNewDay ? 1 : (record.dailyUsage || 0) + 1,
      lastReset: isNewDay ? utcMidnight : record.lastReset,
    });
    
    return null;
  },
});

/**
 * Check daily usage limit for an API key
 */
export const checkDailyUsageLimit = query({
  args: { key: v.string() },
  returns: v.object({
    allowed: v.boolean(),
    used: v.number(),
    limit: v.number(),
    remaining: v.number(),
    keyType: v.string(),
  }),
  handler: async (ctx, args) => {
    const keyRecord = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    
    if (!keyRecord || !keyRecord.isActive) {
      throw new Error("Invalid or inactive API key");
    }
    
    const keyType = getApiKeyType(args.key);
    const limit = keyType !== "user" ? API_KEY_TYPES[keyType].dailyLimit : 100;
    
    const utcMidnight = getUTCMidnight();
    const isNewDay = !keyRecord.lastReset || keyRecord.lastReset < utcMidnight;
    const used = isNewDay ? 0 : (keyRecord.dailyUsage || 0);
    const remaining = Math.max(0, limit - used);
    
    return {
      allowed: remaining > 0,
      used,
      limit,
      remaining,
      keyType: keyType,
    };
  },
});

/**
 * Deactivate an API key
 */
export const deactivateApiKey = mutation({
  args: {
    keyId: v.id("apiKeys"),
    address: v.string(), // For ownership verification
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const keyRecord = await ctx.db.get(args.keyId);
    
    if (!keyRecord) {
      throw new Error("API key not found");
    }
    
    if (keyRecord.address !== args.address) {
      throw new Error("Not authorized to deactivate this API key");
    }
    
    await ctx.db.patch(args.keyId, {
      isActive: false,
    });
    
    return true;
  },
});

/**
 * Reactivate an API key
 */
export const reactivateApiKey = mutation({
  args: {
    keyId: v.id("apiKeys"),
    address: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const keyRecord = await ctx.db.get(args.keyId);
    
    if (!keyRecord) {
      throw new Error("API key not found");
    }
    
    if (keyRecord.address !== args.address) {
      throw new Error("Not authorized to reactivate this API key");
    }
    
    await ctx.db.patch(args.keyId, {
      isActive: true,
    });
    
    return true;
  },
});

export const trackApiKeyUsage = mutation({
  args: { 
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", q => q.eq("key", args.key))
      .first();
    if (!apiKey) {
      throw new Error("Invalid API key");
    }
    if (!apiKey.isActive) {
      throw new Error("API key is inactive");
    }
    // Update usage count and last used
    await ctx.db.patch(apiKey._id, {
      lastUsed: Date.now(),
      totalUsage: (apiKey.totalUsage || 0) + 1,
    });
    return { success: true };
  },
});

/**
 * Get comprehensive API key statistics for a wallet address
 */
export const getApiKeyStats = query({
  args: { address: v.string() },
  returns: v.object({
    totalKeys: v.number(),
    activeKeys: v.number(),
    totalUsage: v.number(),
    dailyUsage: v.number(),
    keys: v.array(v.object({
      id: v.id("apiKeys"),
      name: v.string(),
      keyPreview: v.string(),
      keyType: v.optional(v.string()),
      isActive: v.boolean(),
      totalUsage: v.number(),
      dailyUsage: v.number(),
      dailyLimit: v.number(),
      lastUsed: v.optional(v.number()),
      createdAt: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .collect();
    
    const utcMidnight = getUTCMidnight();
    
    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.isActive).length,
      totalUsage: keys.reduce((sum, k) => sum + (k.totalUsage || 0), 0),
      dailyUsage: keys.reduce((sum, k) => {
        const isNewDay = !k.lastReset || k.lastReset < utcMidnight;
        return sum + (isNewDay ? 0 : (k.dailyUsage || 0));
      }, 0),
      keys: keys.map(k => {
        const keyType = getApiKeyType(k.key);
        const config = keyType !== "user" ? API_KEY_TYPES[keyType] : { dailyLimit: 100 };
        const isNewDay = !k.lastReset || k.lastReset < utcMidnight;
        
        return {
          id: k._id,
          name: k.name,
          keyPreview: `${k.key.substring(0, 12)}...${k.key.slice(-4)}`,
          keyType: k.keyType,
          isActive: k.isActive,
          totalUsage: k.totalUsage || 0,
          dailyUsage: isNewDay ? 0 : (k.dailyUsage || 0),
          dailyLimit: config.dailyLimit,
          lastUsed: k.lastUsed,
          createdAt: k.createdAt,
        };
      }),
    };
  },
});

/**
 * Get user's API usage across all keys for balance endpoint
 */
export const getUserApiUsage = query({
  args: { address: v.string() },
  returns: v.object({
    dailyUsage: v.number(),
    dailyLimit: v.number(),
    remaining: v.number(),
    hasApiKeys: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    if (keys.length === 0) {
      return {
        dailyUsage: 0,
        dailyLimit: 100, // Default user limit
        remaining: 100,
        hasApiKeys: false,
      };
    }
    
    const utcMidnight = getUTCMidnight();
    
    // Find the highest limit among user's keys
    const maxLimit = Math.max(...keys.map(k => {
      const keyType = getApiKeyType(k.key);
      return keyType !== "user" ? API_KEY_TYPES[keyType].dailyLimit : 100;
    }));
    
    // Sum daily usage across all active keys
    const totalDailyUsage = keys.reduce((sum, k) => {
      const isNewDay = !k.lastReset || k.lastReset < utcMidnight;
      return sum + (isNewDay ? 0 : (k.dailyUsage || 0));
    }, 0);
    
    return {
      dailyUsage: totalDailyUsage,
      dailyLimit: maxLimit,
      remaining: Math.max(0, maxLimit - totalDailyUsage),
      hasApiKeys: true,
    };
  },
});
