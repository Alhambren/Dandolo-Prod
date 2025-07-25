// Simple VCU points migration functions
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all provider points for migration analysis
export const getProviderPointsForMigration = query({
  args: {},
  handler: async (ctx) => {
    const providerPoints = await ctx.db.query("providerPoints").collect();
    
    const summary = {
      totalRecords: providerPoints.length,
      totalVCUPoints: 0,
      totalPoints: 0,
      recordsWithVCUPoints: 0,
      detailedRecords: [] as any[]
    };
    
    for (const record of providerPoints) {
      const vcuPoints = record.vcuProviderPoints || 0;
      const totalPoints = record.totalPoints || record.points || 0;
      
      summary.totalVCUPoints += vcuPoints;
      summary.totalPoints += totalPoints;
      
      if (vcuPoints > 0) {
        summary.recordsWithVCUPoints++;
      }
      
      // Get provider details
      const provider = await ctx.db.get(record.providerId);
      
      summary.detailedRecords.push({
        recordId: record._id,
        providerId: record.providerId,
        providerName: provider?.name || "Unknown",
        currentVCUPoints: vcuPoints,
        currentTotalPoints: totalPoints,
        newVCUPoints: Math.floor(vcuPoints / 10),
        pointsReduction: vcuPoints - Math.floor(vcuPoints / 10),
        newTotalPoints: Math.max(0, totalPoints - (vcuPoints - Math.floor(vcuPoints / 10)))
      });
    }
    
    return summary;
  },
});

// Execute the VCU points migration
export const executeVCUPointsMigration = mutation({
  args: { 
    confirmed: v.boolean() 
  },
  handler: async (ctx, args) => {
    if (!args.confirmed) {
      throw new Error("Migration must be explicitly confirmed");
    }
    
    const providerPoints = await ctx.db.query("providerPoints").collect();
    
    let recordsUpdated = 0;
    let totalPointsReduced = 0;
    let totalVCUPointsReduced = 0;
    
    for (const record of providerPoints) {
      const currentVCUPoints = record.vcuProviderPoints || 0;
      const currentTotalPoints = record.totalPoints || record.points || 0;
      
      if (currentVCUPoints > 0) {
        // Calculate new values (divide VCU points by 10)
        const newVCUPoints = Math.floor(currentVCUPoints / 10);
        const pointsReduction = currentVCUPoints - newVCUPoints;
        const newTotalPoints = Math.max(0, currentTotalPoints - pointsReduction);
        
        // Update the record
        const updates: any = {
          totalPoints: newTotalPoints,
          vcuProviderPoints: newVCUPoints,
        };
        
        // Also update daily progress if it exists (cast to any to handle optional field)
        const recordAny = record as any;
        if (recordAny.vcuDailyProgress !== undefined) {
          updates.vcuDailyProgress = Math.floor(recordAny.vcuDailyProgress / 10);
        }
        
        await ctx.db.patch(record._id, updates);
        
        recordsUpdated++;
        totalPointsReduced += pointsReduction;
        totalVCUPointsReduced += pointsReduction;
      }
    }
    
    return {
      success: true,
      recordsUpdated,
      totalPointsReduced,
      totalVCUPointsReduced,
      message: `Successfully updated ${recordsUpdated} records, reduced ${totalPointsReduced.toLocaleString()} points total`
    };
  },
});

// Verify migration results
export const verifyMigrationResults = query({
  args: {},
  handler: async (ctx) => {
    const providerPoints = await ctx.db.query("providerPoints").collect();
    
    const results = {
      totalRecords: providerPoints.length,
      recordsWithVCUPoints: 0,
      totalVCUPoints: 0,
      maxVCUPoints: 0,
      averageVCUPoints: 0,
      highVCURecords: [] as any[]
    };
    
    for (const record of providerPoints) {
      const vcuPoints = record.vcuProviderPoints || 0;
      
      if (vcuPoints > 0) {
        results.recordsWithVCUPoints++;
        results.totalVCUPoints += vcuPoints;
        results.maxVCUPoints = Math.max(results.maxVCUPoints, vcuPoints);
      }
      
      // Flag records with high VCU points (might need attention)
      if (vcuPoints > 1000) {
        const provider = await ctx.db.get(record.providerId);
        results.highVCURecords.push({
          providerName: provider?.name || "Unknown",
          vcuPoints,
          totalPoints: record.totalPoints || 0,
        });
      }
    }
    
    if (results.recordsWithVCUPoints > 0) {
      results.averageVCUPoints = results.totalVCUPoints / results.recordsWithVCUPoints;
    }
    
    return results;
  },
});