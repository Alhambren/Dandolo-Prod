#!/usr/bin/env node

// scripts/migrate-vcu-points.js - Script to run VCU points migration for Diem requirements

import { ConvexHttpClient } from "convex/browser";

async function runMigration() {
  const convexUrl = process.env.CONVEX_URL || "https://judicious-hornet-148.convex.cloud";
  const client = new ConvexHttpClient(convexUrl);

  console.log("🔍 VCU Points Migration for Diem Requirements");
  console.log("=".repeat(50));
  
  try {
    // First, verify current state
    console.log("📊 Checking current VCU points state...");
    const currentStats = await client.action("migrations/migrateVCUPoints:verifyMigrationResults");
    
    console.log(`\n📈 Current State:`);
    console.log(`   Total provider records: ${currentStats.totalRecords}`);
    console.log(`   Records with VCU points: ${currentStats.recordsWithVCUPoints}`);
    console.log(`   Total VCU points: ${currentStats.totalVCUPoints.toLocaleString()}`);
    console.log(`   Average VCU points: ${Math.round(currentStats.averageVCUPoints).toLocaleString()}`);
    console.log(`   Max VCU points: ${currentStats.maxVCUPoints.toLocaleString()}`);
    
    if (currentStats.recordsNeedingAttention.length > 0) {
      console.log(`\n⚠️  High VCU point records (>1000):`);
      currentStats.recordsNeedingAttention.forEach(record => {
        console.log(`   - ${record.providerName}: ${record.vcuPoints.toLocaleString()} VCU points`);
      });
    }
    
    // Calculate expected changes
    const expectedReduction = Math.floor(currentStats.totalVCUPoints * 0.9); // 90% reduction
    const expectedRemaining = currentStats.totalVCUPoints - expectedReduction;
    
    console.log(`\n🎯 Expected Migration Results:`);
    console.log(`   VCU points will be reduced by: ${expectedReduction.toLocaleString()} (90%)`);
    console.log(`   VCU points remaining after migration: ${expectedRemaining.toLocaleString()}`);
    console.log(`   Total provider points will be reduced accordingly`);
    
    // Confirmation prompt
    console.log(`\n⚡ This migration will:`);
    console.log(`   1. Divide all VCU provider points by 10`);
    console.log(`   2. Reduce total points by the VCU points difference`);
    console.log(`   3. Update daily progress tracking`);
    console.log(`   4. Preserve all other point types unchanged`);
    
    console.log(`\n⏳ Starting migration in 5 seconds...`);
    console.log(`   Press Ctrl+C to cancel`);
    
    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log(`\n🚀 Running migration...`);
    const migrationResult = await client.action("migrations/migrateVCUPoints:migrateVCUPointsForDiem");
    
    console.log(`\n✅ Migration Complete!`);
    console.log(`   Records updated: ${migrationResult.totalRecords}`);
    console.log(`   Total points adjusted: ${migrationResult.totalPointsAdjusted.toLocaleString()}`);
    console.log(`   VCU points adjusted: ${migrationResult.totalVCUPointsAdjusted.toLocaleString()}`);
    console.log(`   Average adjustment per record: ${Math.round(migrationResult.averageAdjustmentPerRecord).toLocaleString()}`);
    
    // Verify results
    console.log(`\n🔍 Verifying migration results...`);
    const finalStats = await client.action("migrations/migrateVCUPoints:verifyMigrationResults");
    
    console.log(`\n📊 Final State:`);
    console.log(`   Total VCU points: ${finalStats.totalVCUPoints.toLocaleString()}`);
    console.log(`   Average VCU points: ${Math.round(finalStats.averageVCUPoints).toLocaleString()}`);
    console.log(`   Max VCU points: ${finalStats.maxVCUPoints.toLocaleString()}`);
    
    if (finalStats.recordsNeedingAttention.length > 0) {
      console.log(`\n⚠️  Records still with high VCU points:`);
      finalStats.recordsNeedingAttention.forEach(record => {
        console.log(`   - ${record.providerName}: ${record.vcuPoints.toLocaleString()} VCU points`);
      });
    } else {
      console.log(`\n✅ All VCU point values look correct!`);
    }
    
    console.log(`\n🎉 VCU Points Migration completed successfully!`);
    console.log(`   The system is now aligned with Diem requirements.`);
    
  } catch (error) {
    console.error(`\n❌ Migration failed:`, error);
    process.exit(1);
  }
}

// Handle script execution
runMigration().catch(console.error);

export { runMigration };