import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Validate an API key and return the record if active.
 */
export const validateKey = query({
  args: { key: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("apiKeys"),
      address: v.optional(v.string()),
      name: v.string(),
      isActive: v.boolean(),
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

    return keyRecord;
  },
});

/**
 * Record usage information for an API key.
 */
export const recordUsage = mutation({
  args: { keyId: v.id("apiKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.keyId);
    if (record) {
      await ctx.db.patch(args.keyId, {
        lastUsed: Date.now(),
        totalUsage: (record.totalUsage || 0) + 1,
      });
    }
    return null;
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

export const getApiKeyStats = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_address", q => q.eq("address", args.address))
      .collect();
    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.isActive).length,
      totalUsage: keys.reduce((sum, k) => sum + (k.totalUsage || 0), 0),
      keys: keys.map(k => ({
        id: k._id,
        name: k.name,
        key: `${k.key.substring(0, 8)}...`,
        isActive: k.isActive,
        totalUsage: k.totalUsage || 0,
        lastUsed: k.lastUsed,
        createdAt: k.createdAt,
      })),
    };
  },
});
