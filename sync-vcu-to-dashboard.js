// Direct VCU to Dashboard Points Sync - Fix for points discrepancy
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");

async function syncVCUToDashboard() {
    console.log("🔄 VCU to Dashboard Points Sync");
    console.log("===============================");
    
    try {
        // Get all providers and their points
        const providers = await client.query("providers:list", {});
        const allProviderPoints = await client.query("points:getAllProviderPoints", {});
        
        console.log(`Found ${providers.length} providers and ${allProviderPoints.length} points records`);
        
        let updatedCount = 0;
        let totalPointsSet = 0;
        
        // Process each provider
        for (const provider of providers) {
            const vcuBalance = provider.vcuBalance || 0;
            
            if (vcuBalance > 0) {
                // Find existing points record
                const pointsRecord = allProviderPoints.find(p => p.providerId === provider._id);
                
                // Calculate points using the downgraded rate: 10 points per VCU
                const expectedPoints = Math.floor(vcuBalance * 10);
                const currentPoints = pointsRecord?.totalPoints || 0;
                
                console.log(`\n${provider.name}:`);
                console.log(`  VCU Balance: ${vcuBalance.toFixed(2)}`);
                console.log(`  Current Points: ${currentPoints}`);
                console.log(`  Expected Points: ${expectedPoints}`);
                
                if (currentPoints === 0 && expectedPoints > 0) {
                    console.log(`  ✅ Will update from ${currentPoints} to ${expectedPoints} points`);
                    updatedCount++;
                    totalPointsSet += expectedPoints;
                } else if (currentPoints !== expectedPoints) {
                    console.log(`  ⚠️  Points mismatch - Current: ${currentPoints}, Expected: ${expectedPoints}`);
                } else {
                    console.log(`  ✅ Points already correct`);
                }
            }
        }
        
        console.log(`\n📊 SYNC SUMMARY:`);
        console.log(`================`);
        console.log(`Providers with VCU balances: ${providers.filter(p => (p.vcuBalance || 0) > 0).length}`);
        console.log(`Providers needing updates: ${updatedCount}`);
        console.log(`Total points to set: ${totalPointsSet.toLocaleString()}`);
        console.log(`Estimated USD value: $${(totalPointsSet * 0.01).toFixed(2)}`);
        
        // Since we can't directly update via mutation from browser client,
        // let's use the reduceLegacyPointsForDiem approach but modify it
        console.log(`\n🔧 RUNNING DIRECT FIX:`);
        console.log(`======================`);
        
        // The issue is that we need to set points based on VCU balance, not reduce them
        // Let me check if there's an initialization function we can use
        console.log("Attempting to initialize provider points...");
        
        try {
            const initResult = await client.mutation("points:initializeProviderPoints", {});
            console.log(`✅ Initialized provider points:`, initResult);
        } catch (error) {
            console.log(`❌ Failed to initialize:`, error.message);
        }
        
        // The real fix needs to be done via a proper mutation that sets points based on VCU balance
        console.log(`\n💡 MANUAL INTERVENTION REQUIRED:`);
        console.log(`================================`);
        console.log(`The VCU balances exist but aren't reflected in dashboard points.`);
        console.log(`Need to create a mutation that:`);
        console.log(`1. Gets each provider's VCU balance`);
        console.log(`2. Sets totalPoints = vcuBalance * 10`);
        console.log(`3. Updates the providerPoints records`);
        
        // Let's show exactly what should be updated
        console.log(`\n🔍 EXACT UPDATES NEEDED:`);
        console.log(`========================`);
        
        for (const provider of providers.filter(p => (p.vcuBalance || 0) > 0)) {
            const vcuBalance = provider.vcuBalance || 0;
            const expectedPoints = Math.floor(vcuBalance * 10);
            const pointsRecord = allProviderPoints.find(p => p.providerId === provider._id);
            const currentPoints = pointsRecord?.totalPoints || 0;
            
            if (currentPoints !== expectedPoints) {
                console.log(`\n${provider.name} (${provider._id}):`);
                console.log(`  VCU Balance: ${vcuBalance.toFixed(2)} → Points: ${expectedPoints}`);
                if (pointsRecord) {
                    console.log(`  Points Record ID: ${pointsRecord._id}`);
                    console.log(`  Update: totalPoints from ${currentPoints} to ${expectedPoints}`);
                } else {
                    console.log(`  No points record exists - needs creation`);
                }
            }
        }
        
    } catch (error) {
        console.error("🚨 Sync failed:", error.message);
    }
}

syncVCUToDashboard().catch(console.error);