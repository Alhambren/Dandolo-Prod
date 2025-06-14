import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";

// Generate API key for developers
export const generateApiKey = mutation({
  args: {
    address: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate a secure API key
    const apiKey = "dk_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store API key in database
    await ctx.db.insert("apiKeys", {
      address: args.address,
      key: apiKey,
      name: args.name || "Default API Key",
      isActive: true,
      createdAt: Date.now(),
      lastUsed: undefined,
      totalUsage: 0,
    });

    return apiKey;
  },
});


export const generateAgentKey = mutation({
  args: {
    address: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate agent API key with ak_ prefix
    const apiKey = "ak_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    await ctx.db.insert("apiKeys", {
      address: args.address,
      key: apiKey,
      name: args.name,
      isActive: true,
      createdAt: Date.now(),
      totalUsage: 0,
    });

    return apiKey;
  },
});

// Get user's API keys
export const getUserApiKeys = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .collect();
    return apiKeys?.map(keyRecord => ({
      ...keyRecord,
      key: keyRecord.key.substring(0, 8) + "..." + keyRecord.key.substring(keyRecord.key.length - 4), // Mask the key
    })) || [];
  },
});

// Validate API key (for API requests)
// Validate API key (for API requests)
export const validateApiKey = query({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const keyRecord = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", args.apiKey))
      .first();

    if (!keyRecord || !keyRecord.isActive) {
      return null;
    }

    return {
      address: keyRecord.address,
      name: keyRecord.name,
    };
  },
});

// Update API key usage
export const updateApiKeyUsage = mutation({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    const keyRecord = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", args.apiKey))
      .first();

    if (keyRecord) {
      await ctx.db.patch(keyRecord._id, {
        lastUsed: Date.now(),
        totalUsage: (keyRecord.totalUsage || 0) + 1,
      });
    }
  },
});

// Deactivate API key
export const deactivateApiKey = mutation({
  args: { apiKeyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.apiKeyId, {
      isActive: false,
    });
  },
});

// Get SDK usage statistics
export const getSdkStats = query({
  args: {},
  handler: async (ctx) => {
    const apiKeys = await ctx.db.query("apiKeys").collect();
    const activeKeys = apiKeys.filter(key => key.isActive);
    const totalUsage = apiKeys.reduce((sum, key) => sum + (key.totalUsage || 0), 0);
    
    const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentKeys = apiKeys.filter(key => key.createdAt > last30Days);

    return {
      totalApiKeys: apiKeys.length,
      activeApiKeys: activeKeys.length,
      totalUsage,
      newKeysLast30Days: recentKeys.length,
    };
  },
});

export const getDeveloperDashboard = query({
  args: { address: v.string() },
  handler: async (ctx, args): Promise<any> => {
    // Get API keys
    const apiKeyStats = await ctx.runQuery(api.apiKeys.getApiKeyStats, { address: args.address });
    
    // Get user's inference count from inferences table
    const inferences = await ctx.db
      .query("inferences")
      .filter(q => q.eq(q.field("address"), args.address))
      .collect();
    
    return {
      apiKeys: apiKeyStats,
      usage: {
        totalRequests: inferences.length,
        tokensUsed: inferences.reduce((sum, i) => sum + i.totalTokens, 0),
        modelsUsed: [...new Set(inferences.map(i => i.model))],
      },
    };
  },
});

export const createApiKey = mutation({
  args: {
    address: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    // Generate API key
    const key = `dk_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    
    const id = await ctx.db.insert("apiKeys", {
      address: args.address,
      name: args.name,
      key,
      isActive: true,
      createdAt: Date.now(),
      totalUsage: 0,
    });
    
    return { id, key };
  },
});
