// Debug script to check API key validation
import { ConvexHttpClient } from "convex/browser";

async function debugApiKey() {
    const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");
    
    const testKey = "ak_a0d32b355660d880da02bcb80d6560320f1b47e84c1808ea";
    
    try {
        console.log("🔍 Testing API key validation...");
        console.log(`Key: ${testKey.substring(0, 10)}...`);
        
        // Test the validateKey query directly
        const result = await client.query("apiKeys:validateKey", { key: testKey });
        
        if (result) {
            console.log("✅ API key found in database:");
            console.log(`  - ID: ${result._id}`);
            console.log(`  - Type: ${result.keyType}`);
            console.log(`  - Active: ${result.isActive}`);
            console.log(`  - Daily limit: ${result.dailyLimit}`);
            console.log(`  - Total usage: ${result.totalUsage}`);
        } else {
            console.log("❌ API key not found in database");
        }
        
    } catch (error) {
        console.error("🚨 Error testing API key:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

debugApiKey().catch(console.error);