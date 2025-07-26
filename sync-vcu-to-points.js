// Emergency fix to sync VCU balances to points system
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");

async function syncVCUToPoints() {
    console.log("🚀 Emergency VCU to Points Sync");
    console.log("===============================");
    
    try {
        // Get all providers
        const providers = await client.query("providers:list", {});
        console.log(`Found ${providers.length} providers to sync`);
        
        let totalSynced = 0;
        let totalPointsAdded = 0;
        
        for (const provider of providers) {
            const vcuBalance = provider.vcuBalance || 0;
            
            if (vcuBalance > 0) {
                // Calculate points using downgraded rate: 10 points per VCU
                const newPoints = Math.floor(vcuBalance * 10);
                const usdValue = vcuBalance * 0.10; // VCU to USD conversion
                
                console.log(`\n🔄 Syncing ${provider.name}:`);
                console.log(`   VCU Balance: ${vcuBalance.toFixed(2)}`);
                console.log(`   Points to add: ${newPoints.toLocaleString()}`);
                console.log(`   USD value: $${usdValue.toFixed(2)}`);
                
                try {
                    // Update provider points - we'll need to create this mutation
                    // For now, let's show what needs to be done
                    console.log(`   ✅ Would update: ${provider._id}`);
                    
                    totalSynced++;
                    totalPointsAdded += newPoints;
                    
                } catch (updateError) {
                    console.log(`   ❌ Failed to update: ${updateError.message}`);
                }
            } else {
                console.log(`\n⏭️  Skipping ${provider.name}: No VCU balance`);
            }
        }
        
        console.log(`\n📊 SYNC SUMMARY:`);
        console.log(`================`);
        console.log(`Providers synced: ${totalSynced}/${providers.length}`);
        console.log(`Total points to add: ${totalPointsAdded.toLocaleString()}`);
        console.log(`Estimated USD value: $${(totalPointsAdded * 0.01).toFixed(2)}`);
        
        // Since we can't directly update from this script, let's create the update commands
        console.log(`\n🔧 REQUIRED CONVEX MUTATIONS:`);
        console.log(`============================`);
        
        for (const provider of providers.filter(p => (p.vcuBalance || 0) > 0)) {
            const vcuBalance = provider.vcuBalance || 0;
            const newPoints = Math.floor(vcuBalance * 10);
            const usdValue = vcuBalance * 0.10;
            
            console.log(`\n// Update ${provider.name}`);
            console.log(`await client.mutation("points:updateProviderPoints", {`);
            console.log(`    providerId: "${provider._id}",`);
            console.log(`    totalPoints: ${newPoints},`);
            console.log(`    vcuProviderPoints: ${newPoints},`);
            console.log(`    balance: ${usdValue.toFixed(2)}`);
            console.log(`});`);
        }
        
        console.log(`\n⚡ IMMEDIATE ACTION NEEDED:`);
        console.log(`=========================`);
        console.log(`1. Create/update the points:updateProviderPoints mutation`);
        console.log(`2. Run the above mutations to sync VCU → Points`);
        console.log(`3. Update provider USD balances`);
        console.log(`4. This will fix the dashboard display immediately`);
        
    } catch (error) {
        console.error("🚨 Sync failed:", error.message);
    }
}

syncVCUToPoints().catch(console.error);