// Debug points discrepancy between dashboard and provider screen
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");

async function debugPointsDiscrepancy() {
    console.log("🔍 Debugging Points Discrepancy");
    console.log("===============================");
    
    try {
        // Get all providers
        console.log("1️⃣ Fetching providers data...");
        const providers = await client.query("providers:list", {});
        
        // Get provider points
        console.log("2️⃣ Fetching provider points...");
        const providerPoints = await client.query("points:getProviderLeaderboard", {});
        
        // Get user points (total system points)
        console.log("3️⃣ Fetching system points data...");
        const userPoints = await client.query("points:getUserPoints", { address: "system" }) || { totalPoints: 0 };
        
        console.log("\n📊 POINTS ANALYSIS:");
        console.log("===================");
        
        // Focus on Dandolo Master provider
        const dandoloMaster = providers.find(p => p.name === "Dandolo Master");
        const dandoloMasterPoints = providerPoints.find(p => p.name === "Dandolo Master");
        
        if (dandoloMaster && dandoloMasterPoints) {
            console.log("\n🎯 DANDOLO MASTER COMPARISON:");
            console.log(`Provider Screen Data:`);
            console.log(`  - VCU Balance: ${dandoloMaster.vcuBalance || 0}`);
            console.log(`  - Balance USD: $${dandoloMaster.balance || 0}`);
            console.log(`  - Provider ID: ${dandoloMaster._id}`);
            
            console.log(`Dashboard/Leaderboard Data:`);
            console.log(`  - Points: ${dandoloMasterPoints.points}`);
            console.log(`  - Provider ID: ${dandoloMasterPoints.providerId}`);
            console.log(`  - Match: ${dandoloMaster._id === dandoloMasterPoints.providerId ? '✅' : '❌'}`);
            
            // Calculate expected points from VCU (1 point per 100 tokens, VCU rate varies)
            const expectedPointsFromVCU = Math.floor((dandoloMaster.vcuBalance || 0) * 10); // Rough estimate
            console.log(`  - Expected points from VCU: ~${expectedPointsFromVCU}`);
            console.log(`  - Actual points: ${dandoloMasterPoints.points}`);
            console.log(`  - Difference: ${dandoloMasterPoints.points - expectedPointsFromVCU}`);
        }
        
        console.log("\n📈 ALL PROVIDERS COMPARISON:");
        console.log("============================");
        
        for (const provider of providers) {
            const matchingPoints = providerPoints.find(p => p.providerId === provider._id);
            const vcuBalance = provider.vcuBalance || 0;
            const pointsBalance = matchingPoints?.points || 0;
            
            console.log(`\n${provider.name}:`);
            console.log(`  - VCU Balance: ${vcuBalance}`);
            console.log(`  - Points: ${pointsBalance}`);
            console.log(`  - Ratio: ${vcuBalance > 0 ? (pointsBalance / vcuBalance).toFixed(2) : 'N/A'} points per VCU`);
            
            if (!matchingPoints) {
                console.log(`  - ⚠️  No points record found!`);
            }
        }
        
        console.log("\n🔍 POTENTIAL ISSUES:");
        console.log("====================");
        
        // Check for common issues
        const providersWithVCU = providers.filter(p => (p.vcuBalance || 0) > 0);
        const providersWithPoints = providerPoints.filter(p => p.points > 0);
        
        console.log(`- Providers with VCU balance: ${providersWithVCU.length}`);
        console.log(`- Providers with points: ${providersWithPoints.length}`);
        
        if (providersWithVCU.length !== providersWithPoints.length) {
            console.log(`- ⚠️  Mismatch between VCU and points providers!`);
        }
        
        // Check for downgrading issues
        const highPointsProviders = providerPoints.filter(p => p.points > 10000);
        if (highPointsProviders.length > 0) {
            console.log(`- ⚠️  Found ${highPointsProviders.length} providers with >10k points (may need downgrading):`);
            highPointsProviders.forEach(p => {
                console.log(`    - ${p.name}: ${p.points} points`);
            });
        }
        
        console.log("\n💡 RECOMMENDATIONS:");
        console.log("===================");
        
        if (dandoloMaster && dandoloMasterPoints) {
            const vcuBalance = dandoloMaster.vcuBalance || 0;
            const currentPoints = dandoloMasterPoints.points;
            
            if (vcuBalance > 0 && currentPoints === 0) {
                console.log("- Need to sync VCU balance to points system");
            } else if (currentPoints > vcuBalance * 100) {
                console.log("- Points may need to be downgraded to match VCU balance");
            } else if (Math.abs(currentPoints - vcuBalance * 10) > 100) {
                console.log("- Points calculation may need recalibration");
            }
        }
        
    } catch (error) {
        console.error("🚨 Error debugging points:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

debugPointsDiscrepancy().catch(console.error);