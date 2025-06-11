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
        usageCount: (record.usageCount || 0) + 1,
        totalUsage: (record.totalUsage || 0) + 1,
      });
    }
    return null;
  },
});
