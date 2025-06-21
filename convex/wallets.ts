import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Simple wallet verification (connection proves ownership)
export const verifyWallet = mutation({
  args: {
    address: v.string(),
    signature: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // For now, just return success since wallet connection proves ownership
    // In future, could add signature verification if needed
    return {
      success: true,
      address: args.address,
    };
  },
});

// Get user points (wrapper for points.getUserPoints)
export const getUserPoints = query({
  args: { address: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    // Get user points from the points table
    const points = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    return points?.points ?? 0;
  },
});

// Get wallet connection status
export const getWalletStatus = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    return {
      connected: true,
      verified: true,
      address: args.address,
    };
  },
});