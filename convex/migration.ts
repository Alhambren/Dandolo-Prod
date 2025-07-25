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

// Execute the legacy points migration (90% reduction for Diem compliance)
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
    
    console.log(`Starting legacy total points reduction for ${providerPoints.length} records...`);
    
    for (const record of providerPoints) {
      const currentTotalPoints = record.totalPoints || record.points || 0;
      
      // Apply 90% reduction to legacy high points (above 1000)
      if (currentTotalPoints > 1000) {
        const newTotalPoints = Math.floor(currentTotalPoints * 0.1); // Keep 10%
        const pointsReduction = currentTotalPoints - newTotalPoints;
        
        // Get provider for logging
        const provider = await ctx.db.get(record.providerId);
        console.log(`Reducing ${provider?.name || 'Unknown'}: ${currentTotalPoints.toLocaleString()} → ${newTotalPoints.toLocaleString()} (-${pointsReduction.toLocaleString()})`);
        
        // Update the record
        await ctx.db.patch(record._id, {
          totalPoints: newTotalPoints,
          points: newTotalPoints, // Update legacy field too
        });
        
        recordsUpdated++;
        totalPointsReduced += pointsReduction;
      }
    }
    
    return {
      success: true,
      recordsUpdated,
      totalPointsReduced,
      totalVCUPointsReduced: totalPointsReduced, // Same for legacy migration
      message: `Legacy migration complete: Updated ${recordsUpdated} records, reduced ${totalPointsReduced.toLocaleString()} points (90% reduction)`
    };
  },
});

// NEW FUNCTION: Execute retrospective legacy points reduction
export const executeRetrospectivePointsReduction = mutation({
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
    
    console.log(`Starting retrospective legacy points reduction for ${providerPoints.length} records...`);
    
    for (const record of providerPoints) {
      const currentTotalPoints = record.totalPoints || record.points || 0;
      
      // Apply 90% reduction to legacy high points (above 1000)
      if (currentTotalPoints > 1000) {
        const newTotalPoints = Math.floor(currentTotalPoints * 0.1); // Keep 10%
        const pointsReduction = currentTotalPoints - newTotalPoints;
        
        // Get provider for logging
        const provider = await ctx.db.get(record.providerId);
        console.log(`Reducing ${provider?.name || 'Unknown'}: ${currentTotalPoints.toLocaleString()} → ${newTotalPoints.toLocaleString()} (-${pointsReduction.toLocaleString()})`);
        
        // Update the record
        await ctx.db.patch(record._id, {
          totalPoints: newTotalPoints,
          points: newTotalPoints, // Update legacy field too
        });
        
        recordsUpdated++;
        totalPointsReduced += pointsReduction;
      }
    }
    
    console.log(`Retrospective reduction complete: ${recordsUpdated} records updated, ${totalPointsReduced.toLocaleString()} points reduced`);
    
    return {
      success: true,
      recordsUpdated,
      totalPointsReduced,
      message: `Retrospective reduction complete: Updated ${recordsUpdated} records, reduced ${totalPointsReduced.toLocaleString()} points (90% reduction)`
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