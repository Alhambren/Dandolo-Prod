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
  handler: async (ctx, args) => {
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
      // Regenerate if collision (recursive call)
      return await ctx.runMutation(api.developers.generateApiKey, args);
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
      keyType: k.keyType,
      maskedKey: k.key.substring(0, 7) + "..." + k.key.substring(k.key.length - 4),
      isActive: k.isActive,
      createdAt: k.createdAt,
      lastUsed: k.lastUsed,
      dailyUsage: k.dailyUsage,
      dailyLimit: k.keyType === "agent" ? 5000 : 500,
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
