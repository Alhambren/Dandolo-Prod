// Debug script to check providers
import { ConvexHttpClient } from "convex/browser";

async function debugProviders() {
    const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");
    
    try {
        console.log("🔍 Checking providers...");
        
        // Test the providers query
        const providers = await client.query("providers:list", {});
        
        if (providers && providers.length > 0) {
            console.log(`✅ Found ${providers.length} providers:`);
            providers.forEach((provider, i) => {
                console.log(`  ${i + 1}. ${provider.name || 'Unnamed'}`);
                console.log(`     - ID: ${provider._id}`);
                console.log(`     - Active: ${provider.isActive}`);
                console.log(`     - Balance: $${provider.balance || 0}`);
                console.log(`     - Last check: ${new Date(provider.lastHealthCheck || 0).toLocaleString()}`);
            });
            
            const activeProviders = providers.filter(p => p.isActive);
            console.log(`\n🟢 Active providers: ${activeProviders.length}/${providers.length}`);
            
            if (activeProviders.length === 0) {
                console.log("⚠️  No active providers - API requests will hang!");
            }
        } else {
            console.log("❌ No providers found in database");
            console.log("⚠️  This explains why API requests hang - no Venice.ai providers configured");
        }
        
    } catch (error) {
        console.error("🚨 Error checking providers:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

debugProviders().catch(console.error);