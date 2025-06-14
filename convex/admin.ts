import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

interface ModelCache {
  models?: {
    text: Array<{ id: string; name: string; contextLength?: number }>;
    code: Array<{ id: string; name: string; contextLength?: number }>;
    image: Array<{ id: string; name: string }>;
    multimodal: Array<{ id: string; name: string; contextLength?: number }>;
    audio: Array<{ id: string; name: string }>;
  };
  lastUpdated?: number;
}

interface RefreshResult {
  success: boolean;
  timestamp: string;
  models: {
    text: number;
    code: number;
    image: number;
    multimodal: number;
    audio: number;
  };
  imageModels: Array<{ id: string; name: string }>;
  totalModels: number;
}

// Manual model refresh
export const refreshModels = action({
  handler: async (ctx): Promise<RefreshResult> => {
    console.log("Starting model refresh...");
    
    // Run the refresh
    await ctx.runAction(internal.models.refreshModelCacheInternal);
    
    // Get the updated cache
    const cache = await ctx.runQuery(internal.models.getModelCacheInternal) as ModelCache;
    
    const result: RefreshResult = {
      success: true,
      timestamp: new Date().toISOString(),
      models: {
        text: cache?.models?.text?.length || 0,
        code: cache?.models?.code?.length || 0,
        image: cache?.models?.image?.length || 0,
        multimodal: cache?.models?.multimodal?.length || 0,
        audio: cache?.models?.audio?.length || 0,
      },
      imageModels: cache?.models?.image || [],
      totalModels: Object.values(cache?.models || {}).flat().length || 0,
    };
    
    console.log("Model refresh complete:", result);
    return result;
  },
});

// Get current model cache
export const getModelCache = query({
  handler: async (ctx) => {
    const cache = await ctx.db.query("modelCache").first() as ModelCache;
    return {
      lastUpdated: cache?.lastUpdated ? new Date(cache.lastUpdated).toISOString() : null,
      models: cache?.models,
      imageModels: cache?.models?.image || [],
    };
  },
});

// Seed test points for leaderboard
export const seedLeaderboard = mutation({
  handler: async (ctx) => {
    console.log("Seeding leaderboard with test data...");
    
    const testUsers = [
      { address: "0x1234567890abcdef...test1", points: 1250, promptsToday: 25 },
      { address: "0x2345678901bcdef0...test2", points: 980, promptsToday: 18 },
      { address: "0x3456789012cdef01...test3", points: 750, promptsToday: 15 },
      { address: "0x4567890123def012...test4", points: 625, promptsToday: 12 },
      { address: "0x5678901234ef0123...test5", points: 500, promptsToday: 10 },
      { address: "0x6789012345f01234...test6", points: 425, promptsToday: 8 },
      { address: "0x789012345601234...test7", points: 350, promptsToday: 7 },
      { address: "0x8901234567012345...test8", points: 275, promptsToday: 5 },
      { address: "0x9012345678123456...test9", points: 200, promptsToday: 4 },
      { address: "0xa123456789234567...test10", points: 150, promptsToday: 3 },
    ];

    let created = 0;
    let skipped = 0;

    for (const user of testUsers) {
      // Check if user already exists
      const existing = await ctx.db
        .query("userPoints")
        .withIndex("by_address", q => q.eq("address", user.address))
        .first();
      
      if (!existing) {
        await ctx.db.insert("userPoints", {
          address: user.address,
          points: user.points,
          promptsToday: user.promptsToday,
          pointsToday: user.points,
          lastEarned: Date.now(),
        });
        created++;
      } else {
        skipped++;
      }
    }
    
    return {
      message: "Leaderboard seeding complete!",
      created,
      skipped,
      total: testUsers.length,
    };
  },
});

// Clear test data (optional)
export const clearTestData = mutation({
  handler: async (ctx) => {
    const testUsers = await ctx.db
      .query("userPoints")
      .filter(q => q.or(
        q.eq(q.field("address"), "test"),
        q.eq(q.field("address"), "0x1234"),
        q.eq(q.field("address"), "0x2345")
      ))
      .collect();

    let deleted = 0;
    for (const user of testUsers) {
      if (user.address.includes("test")) {
        await ctx.db.delete(user._id);
        deleted++;
      }
    }

    return {
      message: "Test data cleared!",
      deleted,
    };
  },
});

// Check current leaderboard
export const checkLeaderboard = query({
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("userPoints").collect();
    const sorted = allUsers.sort((a, b) => b.points - a.points);
    
    return {
      totalUsers: sorted.length,
      top10: sorted.slice(0, 10).map((user, index) => ({
        rank: index + 1,
        address: user.address,
        points: user.points,
        promptsToday: user.promptsToday,
      })),
    };
  },
});

// Migrate legacy usage logs to new schema fields
export const migrateUsageLogs = mutation({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("usageLogs").collect();
    let migrated = 0;

    for (const log of logs) {
      const updates: Record<string, unknown> = {};

      // Move legacy 'tokens' into 'totalTokens'
      if ("tokens" in log && !log.totalTokens) {
        updates.totalTokens = (log as any).tokens;
      }

      // Ensure intent exists for older entries
      if (!log.intent) {
        updates.intent = "chat";
      }

      // Legacy entries may be missing vcuCost
      if (!log.vcuCost && (updates.totalTokens || log.totalTokens)) {
        updates.vcuCost = 0;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(log._id, updates);
        migrated++;
      }
    }

    return { migrated };
  },
});
