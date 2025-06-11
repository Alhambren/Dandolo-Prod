import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Insert a usage log entry. Used by HTTP endpoints to record anonymous usage.
 */
export const create = mutation({
  args: {
    address: v.string(),
    providerId: v.optional(v.id("providers")),
    model: v.string(),
    tokens: v.number(),
    latencyMs: v.number(),
    createdAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("usageLogs", args);
    return null;
  },
});
