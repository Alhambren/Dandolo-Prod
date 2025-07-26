import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Award points to user for making a prompt (according to specification)
export const awardUserPoints = internalMutation({
  args: {
    address: v.string(),
    userType: v.optional(v.union(v.literal("user"), v.literal("developer"), v.literal("agent"))),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Calculate points per prompt based on user type
    const userType = args.userType || getUserTypeFromApiKey(args.apiKey);
    const pointsPerPrompt = getPointsPerPrompt(userType);
    
    const utcMidnight = getUTCMidnight();
    
    const points = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (points) {
      // Check if we need to reset daily counters (UTC midnight)
      const isNewDay = !points.lastReset || points.lastReset < utcMidnight;

      await ctx.db.patch(points._id, {
        points: points.points + pointsPerPrompt,
        promptsToday: isNewDay ? 1 : points.promptsToday + 1,
        pointsToday: isNewDay ? pointsPerPrompt : points.pointsToday + pointsPerPrompt,
        lastEarned: Date.now(),
        lastReset: isNewDay ? utcMidnight : points.lastReset,
        dailyLimit: getDailyLimit(userType),
      });
    } else {
      await ctx.db.insert("userPoints", {
        address: args.address,
        points: pointsPerPrompt,
        promptsToday: 1,
        pointsToday: pointsPerPrompt,
        lastEarned: Date.now(),
        lastReset: utcMidnight,
        dailyLimit: getDailyLimit(userType),
      });
    }
    
    return pointsPerPrompt;
  },
});

// Helper functions for points calculation
function getUserTypeFromApiKey(apiKey?: string): "user" | "developer" | "agent" {
  if (!apiKey) return "user";
  if (apiKey.startsWith("dk_")) return "developer";
  if (apiKey.startsWith("ak_")) return "agent";
  return "user";
}

function getPointsPerPrompt(userType: string): number {
  const rates = {
    user: 1,      // 1 point per prompt
    developer: 2, // 2 points per prompt
    agent: 2      // 2 points per prompt
  };
  return rates[userType as keyof typeof rates] || 1;
}

function getDailyLimit(userType: string): number {
  const limits = {
    user: 100,      // 100 prompts/day
    developer: 1000, // 1000 prompts/day
    agent: 1000     // 1000 prompts/day
  };
  return limits[userType as keyof typeof limits] || 100;
}

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

// Note: Provider points are now handled by the comprehensive system in providers.ts
// This ensures proper categorization and transaction logging

// Internal query to get provider points (for use in actions)
export const getProviderPointsInternal = internalQuery({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const pointsRecord = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();
    return pointsRecord ?? null;
  },
});

// Internal mutation to update provider points (for use in actions)
export const updateProviderPointsInternal = internalMutation({
  args: {
    providerId: v.id("providers"),
    totalPoints: v.number(),
    totalPrompts: v.number(),
    lastEarned: v.number(),
    lastDailyReward: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const pointsRecord = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();

    const updateData = {
      totalPoints: args.totalPoints,
      totalPrompts: args.totalPrompts,
      lastEarned: args.lastEarned,
      ...(args.lastDailyReward !== undefined && { lastDailyReward: args.lastDailyReward }),
    };

    if (pointsRecord) {
      await ctx.db.patch(pointsRecord._id, updateData);
    } else {
      const provider = await ctx.db.get(args.providerId);
      if (!provider) return;
      
      await ctx.db.insert("providerPoints", {
        providerId: args.providerId,
        address: provider.address,
        vcuProviderPoints: 0,
        promptServicePoints: 0,
        developerApiPoints: 0,
        agentApiPoints: 0,
        isProviderActive: provider.isActive,
        ...updateData,
      });
    }
  },
});

// Daily rewards for providers (runs at UTC midnight as per specification)
export const distributeDailyRewards = internalAction({
  args: {},
  handler: async (ctx) => {
    // Refresh balances first to ensure accuracy for daily rewards
    await ctx.runAction(internal.providers.refreshAllVCUBalances);
    
    // Get all active providers for daily rewards (after balance refresh)
    const activeProviders = await ctx.runQuery(internal.providers.listActiveInternal);
    
    const utcMidnight = getUTCMidnightForCron();
    let totalAwarded = 0;
    let providersAwarded = 0;
    
    for (const provider of activeProviders) {
      try {
        // Daily reward = VCU balance * 1 (Diem requirement: 1 point per VCU)
        const dailyReward = Math.round((provider.vcuBalance || 0) * 1);
        
        if (dailyReward <= 0) {
          continue;
        }
        
        // Get current points record
        const pointsRecord = await ctx.runQuery(internal.points.getProviderPointsInternal, {
          providerId: provider._id,
        });
        
        // Check if already awarded today (UTC midnight check)
        if (pointsRecord?.lastDailyReward && pointsRecord.lastDailyReward >= utcMidnight) {
          continue;
        }
        
        const currentPoints = pointsRecord?.totalPoints ?? 0;
        const newTotalPoints = currentPoints + dailyReward;
        
        // Award daily balance points
        await ctx.runMutation(internal.points.updateProviderPointsInternal, {
          providerId: provider._id,
          totalPoints: newTotalPoints,
          totalPrompts: pointsRecord?.totalPrompts ?? 0,
          lastEarned: Date.now(),
          lastDailyReward: utcMidnight,
        });
        
        totalAwarded += dailyReward;
        providersAwarded++;
        
      } catch (error) {
        // Error awarding points - continue to next provider
      }
    }
    
    return { providersAwarded, totalAwarded };
  },
});

// Helper function for cron job UTC midnight calculation
function getUTCMidnightForCron(): number {
  const now = new Date();
  const utcMidnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));
  return utcMidnight.getTime();
}

// Get provider points and stats (public query)
export const getProviderPoints = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const pointsRecord = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();
    return {
      points: pointsRecord?.totalPoints ?? 0,
      totalPrompts: pointsRecord?.totalPrompts ?? 0,
      lastEarned: pointsRecord?.lastEarned ?? 0,
    };
  },
});

// Debug query to get all provider points
export const getAllProviderPoints = query({
  args: {},
  handler: async (ctx) => {
    const allProviderPoints = await ctx.db.query("providerPoints").collect();
    const providersWithPoints = [];
    
    for (const pp of allProviderPoints) {
      const provider = await ctx.db.get(pp.providerId);
      providersWithPoints.push({
        providerId: pp.providerId,
        providerName: provider?.name || "Unknown",
        points: pp.totalPoints ?? pp.points ?? 0,
        totalPrompts: pp.totalPrompts,
        lastEarned: pp.lastEarned,
      });
    }
    
    return providersWithPoints;
  },
});

// Get points leaderboard with current user's ranking
export const getPointsLeaderboardWithUserRank = query({
  args: { 
    limit: v.optional(v.number()),
    currentAddress: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    
    // Get all users with points
    const allUserPoints = await ctx.db.query("userPoints").collect();
    
    // Create leaderboard entries
    const leaderboard = allUserPoints
      .map(up => ({
        address: up.address,
        points: up.points,
        promptsToday: up.promptsToday,
        isCurrentUser: up.address === args.currentAddress,
        rank: 0, // Will be set after sorting
      }))
      .sort((a, b) => b.points - a.points);
    
    // Add rankings
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    // Get top N
    const topLeaders = leaderboard.slice(0, limit);
    
    // Find current user's entry if not in top N
    let currentUserEntry = null;
    if (args.currentAddress) {
      const userInTop = topLeaders.some(l => l.address === args.currentAddress);
      if (!userInTop) {
        currentUserEntry = leaderboard.find(l => l.address === args.currentAddress);
      }
    }
    
    return {
      topLeaders,
      currentUserEntry,
      totalParticipants: leaderboard.length,
    };
  },
});

// Get provider leaderboard with rank - with better error handling
export const getProviderLeaderboardWithRank = query({
  args: { 
    limit: v.optional(v.number()),
    currentAddress: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit ?? 10;
      
      // Debug: Check if providerPoints exist
      const allProviderPoints = await ctx.db.query("providerPoints").collect();
      console.log(`[getProviderLeaderboardWithRank] Found ${allProviderPoints.length} provider points records`);
      
      if (allProviderPoints.length === 0) {
        console.log("[getProviderLeaderboardWithRank] No provider points data found, initializing...");
        
        // Initialize points for all existing providers
        const allProviders = await ctx.db.query("providers").collect();
        console.log(`[getProviderLeaderboardWithRank] Found ${allProviders.length} providers to initialize`);
        
        // Return empty result for now (initialization will happen separately)
        return {
          topProviders: [],
          currentProviderEntry: null,
          totalProviders: allProviders.length,
        };
      }
      
      // Get provider details and create leaderboard
      const leaderboardPromises = allProviderPoints.map(async (pp) => {
        try {
          const provider = await ctx.db.get(pp.providerId);
          
          // Skip if provider no longer exists
          if (!provider) {
            console.log(`[getProviderLeaderboardWithRank] Provider ${pp.providerId} not found, skipping`);
            return null;
          }
          
          return {
            providerId: pp.providerId,
            name: provider.name ?? "Unknown Provider",
            address: provider.address ?? "",
            points: pp.totalPoints ?? pp.points ?? 0,
            totalPrompts: pp.totalPrompts ?? 0,
            vcuBalance: provider.vcuBalance ?? 0,
            lastEarned: pp.lastEarned,
            isCurrentUser: provider.address === args.currentAddress,
            rank: 0, // Will be set after sorting
          };
        } catch (error) {
          console.error(`[getProviderLeaderboardWithRank] Error processing provider ${pp.providerId}:`, error);
          return null;
        }
      });
      
      // Wait for all promises and filter out nulls
      const leaderboardResults = await Promise.all(leaderboardPromises);
      const leaderboard = leaderboardResults.filter(entry => entry !== null);
      
      console.log(`[getProviderLeaderboardWithRank] Created leaderboard with ${leaderboard.length} entries`);
      
      // Sort by points and add rankings
      leaderboard.sort((a, b) => b.points - a.points);
      leaderboard.forEach((entry, index) => {
        entry.rank = index + 1;
      });
      
      // Get top N
      const topProviders = leaderboard.slice(0, limit);
      
      // Find current user's provider entry if not in top N
      let currentProviderEntry = null;
      if (args.currentAddress) {
        const userInTop = topProviders.some(p => p.address === args.currentAddress);
        if (!userInTop) {
          currentProviderEntry = leaderboard.find(p => p.address === args.currentAddress);
        }
      }
      
      console.log(`[getProviderLeaderboardWithRank] Returning ${topProviders.length} top providers`);
      
      return {
        topProviders,
        currentProviderEntry,
        totalProviders: leaderboard.length,
      };
    } catch (error) {
      console.error("[getProviderLeaderboardWithRank] Fatal error:", error);
      
      // Return safe default on any error
      return {
        topProviders: [],
        currentProviderEntry: null,
        totalProviders: 0,
      };
    }
  },
});

// Get user stats - Updated to use new points system
export const getUserStats = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const points = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    // Default user limit (non-API key users get 100)
    const defaultLimit = 100;

    if (!points) {
      return {
        points: 0,
        promptsToday: 0,
        promptsRemaining: defaultLimit,
        canMakePrompt: true,
      };
    }

    // Check if it's a new day using UTC midnight (as per specification)
    const utcMidnight = getUTCMidnight();
    const isNewDay = !points.lastReset || points.lastReset < utcMidnight;
    
    // Use current daily limit or default
    const dailyLimit = points.dailyLimit || defaultLimit;
    const promptsToday = isNewDay ? 0 : points.promptsToday;
    const promptsRemaining = Math.max(0, dailyLimit - promptsToday);

    return {
      points: points.points,
      promptsToday,
      promptsRemaining,
      canMakePrompt: promptsRemaining > 0,
    };
  },
});

// Get user's total points
export const getUserPoints = query({
  args: { address: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const points = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    return points?.points ?? 0;
  },
});

// Helper mutation to initialize provider points if missing
// RETROSPECTIVE MIGRATION: Reduce legacy high points for Diem compliance
export const reduceLegacyPointsForDiem = mutation({
  args: { 
    confirmed: v.boolean() 
  },
  handler: async (ctx, args) => {
    if (!args.confirmed) {
      throw new Error("Migration must be explicitly confirmed with confirmed: true");
    }
    
    const providerPoints = await ctx.db.query("providerPoints").collect();
    
    let recordsUpdated = 0;
    let totalPointsReduced = 0;
    
    console.log(`Starting retrospective legacy points reduction for ${providerPoints.length} records...`);
    
    for (const record of providerPoints) {
      const currentTotalPoints = record.totalPoints || record.points || 0;
      
      // Reduce legacy high points by 90% (keep 10%)
      // Only apply to points above 1000 to avoid affecting small balances
      if (currentTotalPoints > 1000) {
        const newTotalPoints = Math.floor(currentTotalPoints * 0.1); // Keep 10%
        const pointsReduction = currentTotalPoints - newTotalPoints;
        
        // Get provider for logging
        const provider = await ctx.db.get(record.providerId);
        console.log(`Reducing ${provider?.name || 'Unknown'}: ${currentTotalPoints.toLocaleString()} → ${newTotalPoints.toLocaleString()} points (-${pointsReduction.toLocaleString()})`);
        
        // Update the record
        await ctx.db.patch(record._id, {
          totalPoints: newTotalPoints,
          points: newTotalPoints, // Update legacy field too
        });
        
        recordsUpdated++;
        totalPointsReduced += pointsReduction;
      }
    }
    
    const summary = {
      success: true,
      recordsUpdated,
      totalPointsReduced,
      message: `Retrospective migration complete: Updated ${recordsUpdated} records, reduced ${totalPointsReduced.toLocaleString()} legacy points (90% reduction)`,
    };
    
    console.log("Retrospective Legacy Points Migration Summary:", summary);
    return summary;
  },
});

export const initializeProviderPoints = mutation({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db.query("providers").collect();
    const existingPoints = await ctx.db.query("providerPoints").collect();
    
    const existingProviderIds = new Set(existingPoints.map(pp => pp.providerId));
    
    let initialized = 0;
    for (const provider of providers) {
      if (!existingProviderIds.has(provider._id)) {
        await ctx.db.insert("providerPoints", {
          providerId: provider._id,
          totalPoints: 0,
          totalPrompts: provider.totalPrompts ?? 0,
          lastEarned: Date.now(),
          isProviderActive: provider.isActive,
        });
        initialized++;
      }
    }
    
    console.log(`Initialized points for ${initialized} providers`);
    return { initialized };
  },
});

// ONE-TIME MIGRATION: Reduce legacy high points by 90% for Diem compliance
export const migrateVCUPointsForDiem = mutation({
  args: { 
    confirmed: v.boolean() 
  },
  handler: async (ctx, args) => {
    if (!args.confirmed) {
      throw new Error("Migration must be explicitly confirmed with confirmed: true");
    }
    
    const providerPoints = await ctx.db.query("providerPoints").collect();
    
    let recordsUpdated = 0;
    let totalPointsReduced = 0;
    
    console.log(`Starting legacy points migration for ${providerPoints.length} records...`);
    
    for (const record of providerPoints) {
      const currentTotalPoints = record.totalPoints || record.points || 0;
      
      // Reduce legacy high points by 90% (keep 10%)
      // Only apply to points above 1000 to avoid affecting small balances
      if (currentTotalPoints > 1000) {
        const newTotalPoints = Math.floor(currentTotalPoints * 0.1); // Keep 10%
        const pointsReduction = currentTotalPoints - newTotalPoints;
        
        // Get provider for logging
        const provider = await ctx.db.get(record.providerId);
        console.log(`Reducing ${provider?.name || 'Unknown'}: ${currentTotalPoints.toLocaleString()} → ${newTotalPoints.toLocaleString()} points (-${pointsReduction.toLocaleString()})`);
        
        // Update the record
        await ctx.db.patch(record._id, {
          totalPoints: newTotalPoints,
          points: newTotalPoints, // Update legacy field too
        });
        
        recordsUpdated++;
        totalPointsReduced += pointsReduction;
      }
    }
    
    const summary = {
      success: true,
      recordsUpdated,
      totalPointsReduced,
      message: `Migration complete: Updated ${recordsUpdated} records, reduced ${totalPointsReduced.toLocaleString()} legacy points (90% reduction)`,
    };
    
    console.log("Legacy Points Migration Summary:", summary);
    return summary;
  },
});

// DIRECT FIX: Sync VCU balances to dashboard points
export const syncVCUBalancesToDashboardPoints = mutation({
  args: { 
    confirmed: v.boolean() 
  },
  handler: async (ctx, args) => {
    if (!args.confirmed) {
      throw new Error("Sync must be explicitly confirmed with confirmed: true");
    }
    
    console.log("🔄 Starting VCU to Dashboard Points Sync...");
    
    // Get all providers
    const providers = await ctx.db.query("providers").collect();
    const providerPoints = await ctx.db.query("providerPoints").collect();
    
    let recordsUpdated = 0;
    let totalPointsSet = 0;
    
    for (const provider of providers) {
      const vcuBalance = provider.vcuBalance || 0;
      
      if (vcuBalance > 0) {
        // Calculate points using downgraded rate: 10 points per VCU
        const expectedPoints = Math.floor(vcuBalance * 10);
        
        // Find existing points record
        const pointsRecord = providerPoints.find(p => p.providerId === provider._id);
        
        if (pointsRecord) {
          const currentPoints = pointsRecord.totalPoints || 0;
          
          if (currentPoints !== expectedPoints) {
            console.log(`Updating ${provider.name}: ${currentPoints} → ${expectedPoints} points (VCU: ${vcuBalance.toFixed(2)})`);
            
            await ctx.db.patch(pointsRecord._id, {
              totalPoints: expectedPoints,
              points: expectedPoints, // Update legacy field too
              vcuProviderPoints: expectedPoints, // Set VCU provider points
            });
            
            recordsUpdated++;
            totalPointsSet += expectedPoints;
          }
        } else {
          console.log(`Creating points record for ${provider.name}: ${expectedPoints} points (VCU: ${vcuBalance.toFixed(2)})`);
          
          await ctx.db.insert("providerPoints", {
            providerId: provider._id,
            address: provider.address,
            totalPoints: expectedPoints,
            points: expectedPoints,
            vcuProviderPoints: expectedPoints,
            promptServicePoints: 0,
            developerApiPoints: 0,
            agentApiPoints: 0,
            totalPrompts: provider.totalPrompts || 0,
            isProviderActive: provider.isActive,
            lastEarned: Date.now(),
          });
          
          recordsUpdated++;
          totalPointsSet += expectedPoints;
        }
      }
    }
    
    const summary = {
      success: true,
      recordsUpdated,
      totalPointsSet,
      message: `VCU sync complete: Updated ${recordsUpdated} records, set ${totalPointsSet.toLocaleString()} total points from VCU balances`,
    };
    
    console.log("VCU to Dashboard Points Sync Summary:", summary);
    return summary;
  },
});
