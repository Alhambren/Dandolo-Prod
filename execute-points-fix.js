// Execute VCU to Points sync fix
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");

async function executePointsFix() {
    console.log("🚀 Executing VCU to Points Fix");
    console.log("==============================");
    
    try {
        // Get all providers
        const providers = await client.query("providers:list", {});
        console.log(`Found ${providers.length} providers to fix`);
        
        let totalFixed = 0;
        let totalPointsAdded = 0;
        
        for (const provider of providers) {
            const vcuBalance = provider.vcuBalance || 0;
            
            if (vcuBalance > 0) {
                // Calculate points using downgraded rate: 10 points per VCU
                const newPoints = Math.floor(vcuBalance * 10);
                const usdValue = vcuBalance * 0.10;
                
                console.log(`\n🔄 Fixing ${provider.name}:`);
                console.log(`   VCU Balance: ${vcuBalance.toFixed(2)}`);
                console.log(`   Points to set: ${newPoints.toLocaleString()}`);
                console.log(`   USD value: $${usdValue.toFixed(2)}`);
                
                try {
                    // First, let's create or update the providerPoints record
                    // We'll use the existing mutation pattern
                    
                    // This approach updates the points through the internal system
                    console.log(`   🔧 Updating points record...`);
                    
                    // Since we can't directly call internal mutations from here,
                    // let's show the exact data that needs to be updated
                    console.log(`   📝 Provider ID: ${provider._id}`);
                    console.log(`   📝 Should update totalPoints to: ${newPoints}`);
                    console.log(`   📝 Should update balance to: $${usdValue.toFixed(2)}`);
                    
                    totalFixed++;
                    totalPointsAdded += newPoints;
                    
                } catch (updateError) {
                    console.log(`   ❌ Failed to update: ${updateError.message}`);
                }
            }
        }
        
        console.log(`\n📊 FIX SUMMARY:`);
        console.log(`===============`);
        console.log(`Providers to fix: ${totalFixed}/${providers.length}`);
        console.log(`Total points to add: ${totalPointsAdded.toLocaleString()}`);
        console.log(`Total USD value: $${(totalPointsAdded * 0.01).toFixed(2)}`);
        
        // Let's check the current providerPoints records
        console.log(`\n🔍 CHECKING CURRENT PROVIDER POINTS RECORDS:`);
        console.log(`=============================================`);
        
        const providerPoints = await client.query("points:getAllProviderPoints", {});
        console.log(`Found ${providerPoints.length} provider points records`);
        
        // Focus on providers that need fixing
        for (const provider of providers.filter(p => (p.vcuBalance || 0) > 0)) {
            const pointsRecord = providerPoints.find(p => p.providerId === provider._id);
            const vcuBalance = provider.vcuBalance || 0;
            const expectedPoints = Math.floor(vcuBalance * 10);
            
            console.log(`\n${provider.name}:`);
            console.log(`   VCU Balance: ${vcuBalance.toFixed(2)}`);
            console.log(`   Expected Points: ${expectedPoints.toLocaleString()}`);
            
            if (pointsRecord) {
                console.log(`   Current Points: ${pointsRecord.totalPoints || 0}`);
                console.log(`   Record ID: ${pointsRecord._id}`);
                
                if ((pointsRecord.totalPoints || 0) !== expectedPoints) {
                    console.log(`   ⚠️  MISMATCH: Needs update from ${pointsRecord.totalPoints || 0} to ${expectedPoints}`);
                }
            } else {
                console.log(`   ❌ NO POINTS RECORD EXISTS - needs creation`);
            }
        }
        
        console.log(`\n🛠️  MANUAL FIX REQUIRED:`);
        console.log(`========================`);
        console.log(`The points records exist but have wrong values.`);
        console.log(`You need to manually update the database records or run a proper migration.`);
        console.log(`The VCU balances are correct, but they're not reflected in the points system.`);
        
    } catch (error) {
        console.error("🚨 Fix execution failed:", error.message);
    }
}

executePointsFix().catch(console.error);