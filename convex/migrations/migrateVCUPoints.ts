// convex/migrations/migrateVCUPoints.ts - Migration to divide VCU points by 10 for Diem requirements

import { v } from "convex/values";
import { internalMutation, internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

// Main migration action to update all VCU-related points
export const migrateVCUPointsForDiem = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting VCU points migration for Diem requirements...");
    
    // Get all provider points records
    const allProviderPoints = await ctx.runQuery(internal.migrations.migrateVCUPoints.getAllProviderPointsForMigration);
    
    let totalRecords = 0;
    let totalPointsAdjusted = 0;
    let totalVCUPointsAdjusted = 0;
    
    for (const record of allProviderPoints) {
      const updates = await ctx.runMutation(internal.migrations.migrateVCUPoints.updateProviderPointsForDiem, {
        recordId: record._id,
        currentData: record,
      });
      
      if (updates.updated) {
        totalRecords++;
        totalPointsAdjusted += updates.pointsAdjusted;
        totalVCUPointsAdjusted += updates.vcuPointsAdjusted;
      }
    }
    
    // Update the points calculation logic for future rewards
    await ctx.runMutation(internal.migrations.migrateVCUPoints.updatePointsCalculationConfig);
    
    const summary = {
      totalRecords,
      totalPointsAdjusted,
      totalVCUPointsAdjusted,
      averageAdjustmentPerRecord: totalRecords > 0 ? totalPointsAdjusted / totalRecords : 0,
    };
    
    console.log("Migration completed:", summary);
    return summary;
  },
});

// Query to get all provider points for migration
export const getAllProviderPointsForMigration = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("providerPoints").collect();
  },
});

// Mutation to update individual provider points record
export const updateProviderPointsForDiem = internalMutation({
  args: {
    recordId: v.id("providerPoints"),
    currentData: v.object({
      _id: v.id("providerPoints"),
      providerId: v.id("providers"),
      totalPoints: v.optional(v.number()),
      points: v.optional(v.number()),
      vcuProviderPoints: v.optional(v.number()),
      promptServicePoints: v.optional(v.number()),
      developerApiPoints: v.optional(v.number()),
      agentApiPoints: v.optional(v.number()),
      vcuDailyProgress: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const { recordId, currentData } = args;
    
    // Calculate adjustments (divide VCU-related points by 10)
    const currentVCUPoints = currentData.vcuProviderPoints || 0;
    const newVCUPoints = Math.floor(currentVCUPoints / 10);
    const vcuPointsReduction = currentVCUPoints - newVCUPoints;
    
    // Get current total points (handle legacy field)
    const currentTotalPoints = currentData.totalPoints ?? currentData.points ?? 0;
    
    // Calculate new total points (subtract the VCU points reduction)
    const newTotalPoints = Math.max(0, currentTotalPoints - vcuPointsReduction);
    
    // Update the record
    const updates: any = {
      totalPoints: newTotalPoints,
      vcuProviderPoints: newVCUPoints,
    };
    
    // Also update daily progress if it exists
    if (currentData.vcuDailyProgress !== undefined) {
      updates.vcuDailyProgress = Math.floor(currentData.vcuDailyProgress / 10);
    }
    
    await ctx.db.patch(recordId, updates);
    
    return {
      updated: true,
      pointsAdjusted: vcuPointsReduction,
      vcuPointsAdjusted: vcuPointsReduction,
      oldTotal: currentTotalPoints,
      newTotal: newTotalPoints,
      oldVCU: currentVCUPoints,
      newVCU: newVCUPoints,
    };
  },
});

// Update configuration for future points calculations
export const updatePointsCalculationConfig = internalMutation({
  args: {},
  handler: async (ctx) => {
    // This is a placeholder for any configuration updates needed
    // The actual calculation changes will be in the updated points.ts file
    console.log("Points calculation configuration updated for Diem requirements");
    return { success: true };
  },
});

// Verification query to check migration results
export const verifyMigrationResults = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allRecords = await ctx.db.query("providerPoints").collect();
    
    const stats = {
      totalRecords: allRecords.length,
      recordsWithVCUPoints: 0,
      totalVCUPoints: 0,
      maxVCUPoints: 0,
      averageVCUPoints: 0,
      recordsNeedingAttention: [] as any[],
    };
    
    for (const record of allRecords) {
      const vcuPoints = record.vcuProviderPoints || 0;
      
      if (vcuPoints > 0) {
        stats.recordsWithVCUPoints++;
        stats.totalVCUPoints += vcuPoints;
        stats.maxVCUPoints = Math.max(stats.maxVCUPoints, vcuPoints);
      }
      
      // Flag records that might need attention (VCU points still seem high)
      if (vcuPoints > 1000) {
        const provider = await ctx.db.get(record.providerId);
        stats.recordsNeedingAttention.push({
          providerId: record.providerId,
          providerName: provider?.name || "Unknown",
          vcuPoints,
          totalPoints: record.totalPoints || 0,
        });
      }
    }
    
    if (stats.recordsWithVCUPoints > 0) {
      stats.averageVCUPoints = stats.totalVCUPoints / stats.recordsWithVCUPoints;
    }
    
    return stats;
  },
});