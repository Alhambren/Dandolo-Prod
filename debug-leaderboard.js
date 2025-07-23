#!/usr/bin/env node

import { ConvexHttpClient } from "convex/browser";

async function main() {
  const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://judicious-hornet-148.convex.cloud");

  try {
    console.log("🔍 Debugging leaderboard query step by step...\n");
    
    // Step 1: Check if we can get providers with the by_active index
    console.log("1. Testing providers query with by_active index...");
    try {
      const providers = await client.query("providers:list", {});
      const activeProviders = providers.filter(p => p.isActive);
      console.log(`✅ Found ${activeProviders.length} active providers`);
      
      if (activeProviders.length > 0) {
        const firstProvider = activeProviders[0];
        console.log(`First active provider: ${firstProvider.name} (ID: ${firstProvider._id})`);
        console.log(`Fields: isActive=${firstProvider.isActive}, vcuBalance=${firstProvider.vcuBalance}`);
        console.log(`Optional fields: uptime=${firstProvider.uptime}, avgResponseTime=${firstProvider.avgResponseTime}, status=${firstProvider.status}`);
      }
    } catch (error) {
      console.log("❌ Providers query failed:", error.message);
      return;
    }
    
    // Step 2: Check if providerPoints table exists and has data
    console.log("\n2. Testing direct database access...");
    try {
      // Try to get provider points for the first active provider
      const providers = await client.query("providers:list", {});
      const activeProviders = providers.filter(p => p.isActive);
      
      if (activeProviders.length > 0) {
        const firstProviderId = activeProviders[0]._id;
        console.log(`Checking provider points for ${firstProviderId}...`);
        
        // We can't directly query providerPoints from the client, so let's check if the issue
        // is with the providerPoints query in the leaderboard function
        console.log("This would require checking providerPoints table internally");
      }
    } catch (error) {
      console.log("❌ Database access failed:", error.message);
    }

    // Step 3: Try a simplified version of the leaderboard logic
    console.log("\n3. Testing simplified provider data...");
    try {
      const providers = await client.query("providers:list", {});
      const activeProviders = providers.filter(p => p.isActive);
      
      console.log("Active providers summary:");
      activeProviders.forEach((provider, index) => {
        console.log(`  ${index + 1}. ${provider.name}`);
        console.log(`     ID: ${provider._id}`);
        console.log(`     VCU: $${provider.vcuBalance || 0}`);
        console.log(`     Prompts: ${provider.totalPrompts || 0}`);
        console.log(`     Status: ${provider.status || 'unknown'}`);
        console.log(`     Uptime: ${provider.uptime || 'undefined'}`);
        console.log(`     Avg Response: ${provider.avgResponseTime || 'undefined'}`);
        console.log("");
      });
      
    } catch (error) {
      console.log("❌ Simplified data test failed:", error.message);
    }

    // Step 4: Check if the issue is with the return schema
    console.log("4. The issue is likely in the getProviderLeaderboard function itself");
    console.log("   Possible causes:");
    console.log("   - providerPoints table doesn't exist or has no data");
    console.log("   - Schema mismatch between interface and actual database");
    console.log("   - Query index 'by_active' doesn't exist");
    console.log("   - Return schema validation fails");

  } catch (error) {
    console.error("❌ Debug script error:", error.message);
  }
}

main().catch(console.error);