// Quick fix to sync VCU balances to points system
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");

async function fixPointsSync() {
    console.log("🔧 Fixing Points Sync");
    console.log("=====================");
    
    try {
        // Get all providers with VCU balances
        console.log("📋 Fetching providers...");
        const providers = await client.query("providers:list", {});
        
        // Get current provider points
        console.log("💰 Fetching provider points...");
        const providerPoints = await client.query("points:getAllProviderPoints", {});
        
        console.log("\n🔍 CURRENT STATE:");
        console.log("================");
        
        for (const provider of providers) {
            const vcuBalance = provider.vcuBalance || 0;
            const pointsRecord = providerPoints.find(p => p.providerId === provider._id);
            const currentPoints = pointsRecord?.totalPoints || 0;
            
            console.log(`\n${provider.name}:`);
            console.log(`  - VCU Balance: ${vcuBalance.toFixed(2)}`);
            console.log(`  - Dashboard Points: ${currentPoints}`);
            
            if (vcuBalance > 0 && currentPoints === 0) {
                // Calculate points based on VCU balance
                // Using the "downgraded" rate: 1 VCU ≈ 10 points (instead of 100)
                const expectedPoints = Math.floor(vcuBalance * 10);
                
                console.log(`  - Expected Points (after downgrade): ${expectedPoints}`);
                console.log(`  - ⚠️  NEEDS FIXING: VCU balance but zero points`);
                
                // This would need to be implemented as a proper Convex mutation
                console.log(`  - Action needed: Update points to ${expectedPoints}`);
            } else if (vcuBalance > 0) {
                const ratio = currentPoints / vcuBalance;
                console.log(`  - Points-to-VCU ratio: ${ratio.toFixed(2)}`);
                
                if (ratio > 50) {
                    console.log(`  - ⚠️  Points may need downgrading (ratio too high)`);
                } else if (ratio < 5) {
                    console.log(`  - ⚠️  Points may be too low`);
                } else {
                    console.log(`  - ✅ Ratio looks reasonable`);
                }
            }
        }
        
        // Focus on Dandolo Master
        const dandoloMaster = providers.find(p => p.name === "Dandolo Master");
        if (dandoloMaster) {
            console.log("\n🎯 DANDOLO MASTER ANALYSIS:");
            console.log("==========================");
            
            const vcuBalance = dandoloMaster.vcuBalance || 0;
            const pointsRecord = providerPoints.find(p => p.providerId === dandoloMaster._id);
            const currentPoints = pointsRecord?.totalPoints || 0;
            
            console.log(`Current VCU Balance: ${vcuBalance.toFixed(2)}`);
            console.log(`Current Dashboard Points: ${currentPoints}`);
            
            // Calculate what points should be based on VCU balance
            const shouldBePoints = Math.floor(vcuBalance * 10); // Downgraded rate
            const usdValue = vcuBalance * 0.10; // VCU to USD conversion
            
            console.log(`Should have points: ${shouldBePoints} (at 10 points per VCU)`);
            console.log(`USD value: $${usdValue.toFixed(2)}`);
            
            console.log("\n💡 RECOMMENDED ACTIONS:");
            console.log("======================");
            console.log(`1. Update Dandolo Master points from ${currentPoints} to ${shouldBePoints}`);
            console.log(`2. Update USD balance from $${dandoloMaster.balance || 0} to $${usdValue.toFixed(2)}`);
            console.log(`3. Apply same logic to other providers with VCU balances`);
        }
        
        console.log("\n🔧 NEXT STEPS:");
        console.log("==============");
        console.log("1. The migration script needs to be fixed");
        console.log("2. Or we need to create a manual sync function");
        console.log("3. VCU balances are correct but not syncing to points display");
        
    } catch (error) {
        console.error("🚨 Error:", error.message);
    }
}

fixPointsSync().catch(console.error);