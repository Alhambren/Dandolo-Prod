// Debug points after sync to see what's happening
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");

async function debugPointsAfterSync() {
    console.log("🔍 Debugging Points After Sync");
    console.log("===============================");
    
    try {
        // Get raw provider points records
        console.log("📋 Getting all provider points records...");
        const allProviderPoints = await client.query("points:getAllProviderPoints", {});
        
        console.log(`Found ${allProviderPoints.length} provider points records:`);
        console.log("Raw records:", JSON.stringify(allProviderPoints, null, 2));
        
        // Also get providers list
        console.log("\n📋 Getting providers list...");
        const providers = await client.query("providers:list", {});
        
        console.log(`Found ${providers.length} providers`);
        
        // Match them up
        console.log("\n🔗 Matching providers with points:");
        console.log("===================================");
        
        for (const provider of providers.filter(p => (p.vcuBalance || 0) > 0)) {
            const vcuBalance = provider.vcuBalance || 0;
            const expectedPoints = Math.floor(vcuBalance * 10);
            
            // Find the points record
            const pointsRecord = allProviderPoints.find(p => 
                p.providerId === provider._id || 
                p.providerName === provider.name
            );
            
            console.log(`\n${provider.name} (${provider._id}):`);
            console.log(`  VCU Balance: ${vcuBalance.toFixed(2)}`);
            console.log(`  Expected Points: ${expectedPoints}`);
            
            if (pointsRecord) {
                console.log(`  Points Record Found:`);
                console.log(`    - Record ID: ${pointsRecord.providerId}`);
                console.log(`    - Provider Name: ${pointsRecord.providerName}`);
                console.log(`    - Points Value: ${pointsRecord.points}`);
                console.log(`    - Raw Record:`, JSON.stringify(pointsRecord, null, 4));
            } else {
                console.log(`  ❌ NO POINTS RECORD FOUND`);
            }
        }
        
    } catch (error) {
        console.error("🚨 Debug failed:", error.message);
    }
}

debugPointsAfterSync().catch(console.error);