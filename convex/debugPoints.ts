import { v } from "convex/values";
import { query } from "./_generated/server";

// Debug query to check points accumulation
export const debugUserPoints = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    if (args.address) {
      // Get specific user's points
      const userPoints = await ctx.db
        .query("userPoints")
        .withIndex("by_address", (q) => q.eq("address", args.address))
        .first();
      
      return {
        user: userPoints,
      };
    } else {
      // Get all user points for analysis
      const allUserPoints = await ctx.db.query("userPoints").collect();
      
      return {
        totalUsers: allUserPoints.length,
        users: allUserPoints.map(up => ({
          address: up.address.substring(0, 8) + "...",
          totalPoints: up.points,
          promptsToday: up.promptsToday,
          pointsToday: up.pointsToday,
          lastEarned: new Date(up.lastEarned).toISOString(),
          lastReset: up.lastReset ? new Date(up.lastReset).toISOString() : null,
        })),
      };
    }
  },
});

// Debug provider points
export const debugProviderPoints = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    if (args.providerId) {
      // Get specific provider's points
      const providerPoints = await ctx.db
        .query("providerPoints")
        .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
        .first();
      
      return {
        provider: providerPoints,
      };
    } else {
      // Get all provider points
      const allProviderPoints = await ctx.db.query("providerPoints").collect();
      
      return {
        totalProviders: allProviderPoints.length,
        providers: allProviderPoints.map(pp => ({
          providerId: pp.providerId,
          address: pp.address.substring(0, 8) + "...",
          totalPoints: pp.totalPoints,
          totalPrompts: pp.totalPrompts,
          lastEarned: new Date(pp.lastEarned).toISOString(),
          breakdown: {
            vcuProviding: pp.vcuProviderPoints,
            promptService: pp.promptServicePoints,
            developerApi: pp.developerApiPoints,
            agentApi: pp.agentApiPoints,
          }
        })),
      };
    }
  },
});

// Debug points transactions
export const debugPointsTransactions = query({
  args: { 
    address: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    let query = ctx.db.query("pointsTransactions").order("desc");
    
    if (args.address) {
      query = query.filter((q) => q.eq(q.field("address"), args.address));
    }
    
    const transactions = await query.take(limit);
    
    return {
      recentTransactions: transactions.map(tx => ({
        address: tx.address.substring(0, 8) + "...",
        pointsEarned: tx.pointsEarned,
        transactionType: tx.transactionType,
        timestamp: new Date(tx.timestamp).toISOString(),
        details: tx.details,
      })),
    };
  },
});