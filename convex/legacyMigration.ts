// Legacy points migration for retrospective Diem compliance
import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Execute retrospective legacy points reduction (90% reduction for Diem compliance)
export const reduceAllLegacyPoints = mutation({
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
    
    console.log(`🚀 Starting retrospective legacy points reduction for ${providerPoints.length} records...`);
    
    for (const record of providerPoints) {
      const currentTotalPoints = record.totalPoints || record.points || 0;
      
      // Apply 90% reduction to legacy high points (above 1000)
      if (currentTotalPoints > 1000) {
        const newTotalPoints = Math.floor(currentTotalPoints * 0.1); // Keep 10%
        const pointsReduction = currentTotalPoints - newTotalPoints;
        
        // Get provider for logging
        const provider = await ctx.db.get(record.providerId);
        console.log(`📉 Reducing ${provider?.name || 'Unknown'}: ${currentTotalPoints.toLocaleString()} → ${newTotalPoints.toLocaleString()} (-${pointsReduction.toLocaleString()})`);
        
        // Update the record
        await ctx.db.patch(record._id, {
          totalPoints: newTotalPoints,
          points: newTotalPoints, // Update legacy field too
        });
        
        recordsUpdated++;
        totalPointsReduced += pointsReduction;
      }
    }
    
    console.log(`✅ Retrospective reduction complete: ${recordsUpdated} records updated, ${totalPointsReduced.toLocaleString()} points reduced`);
    
    return {
      success: true,
      recordsUpdated,
      totalPointsReduced,
      message: `Retrospective reduction complete: Updated ${recordsUpdated} records, reduced ${totalPointsReduced.toLocaleString()} points (90% reduction for Diem compliance)`
    };
  },
});