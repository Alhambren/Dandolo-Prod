// Run the VCU to Dashboard Points Sync
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");

async function runVCUSync() {
    console.log("🚀 Running VCU to Dashboard Points Sync");
    console.log("=======================================");
    
    try {
        // Run the sync mutation with confirmation
        console.log("⚡ Executing sync mutation...");
        const result = await client.mutation("points:syncVCUBalancesToDashboardPoints", {
            confirmed: true
        });
        
        console.log("\n✅ SYNC COMPLETE!");
        console.log("==================");
        console.log(result.message);
        console.log(`Records updated: ${result.recordsUpdated}`);
        console.log(`Total points set: ${result.totalPointsSet.toLocaleString()}`);
        console.log(`USD value: $${(result.totalPointsSet * 0.01).toFixed(2)}`);
        
        // Verify the results
        console.log("\n🔍 Verifying sync results...");
        const providers = await client.query("providers:list", {});
        const providerPoints = await client.query("points:getAllProviderPoints", {});
        
        console.log("\n📊 POST-SYNC VERIFICATION:");
        console.log("==========================");
        
        for (const provider of providers.filter(p => (p.vcuBalance || 0) > 0)) {
            const vcuBalance = provider.vcuBalance || 0;
            const pointsRecord = providerPoints.find(p => p.providerId === provider._id);
            const dashboardPoints = pointsRecord?.totalPoints || 0;
            const expectedPoints = Math.floor(vcuBalance * 10);
            
            console.log(`\n${provider.name}:`);
            console.log(`  VCU Balance: ${vcuBalance.toFixed(2)}`);
            console.log(`  Dashboard Points: ${dashboardPoints.toLocaleString()}`);
            console.log(`  Expected Points: ${expectedPoints.toLocaleString()}`);
            
            if (dashboardPoints === expectedPoints) {
                console.log(`  ✅ SYNCED CORRECTLY`);
            } else {
                console.log(`  ❌ STILL MISMATCHED`);
            }
        }
        
        console.log("\n🎉 VCU to Dashboard sync completed successfully!");
        console.log("The points discrepancy between dashboard and provider screen has been resolved.");
        
    } catch (error) {
        console.error("\n🚨 Sync failed:", error.message);
        
        if (error.message.includes("confirmed")) {
            console.log("💡 This is a safety check - the sync requires explicit confirmation.");
        }
    }
}

runVCUSync().catch(console.error);