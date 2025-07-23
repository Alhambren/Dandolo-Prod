#!/usr/bin/env node

import { ConvexHttpClient } from "convex/browser";

async function main() {
  const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://judicious-hornet-148.convex.cloud");

  try {
    console.log("🔍 Testing provider leaderboard query...");
    
    // Test each query individually to identify the failing one
    console.log("1. Testing providers:list...");
    const providers = await client.query("providers:list", {});
    console.log(`✅ Got ${providers.length} providers`);
    
    console.log("2. Testing stats:getProviderLeaderboard...");
    try {
      const leaderboard = await client.query("stats:getProviderLeaderboard", {});
      console.log(`✅ Got ${leaderboard.length} leaderboard entries`);
      
      // Show first entry to verify data structure
      if (leaderboard.length > 0) {
        console.log("First leaderboard entry:");
        console.log(JSON.stringify(leaderboard[0], null, 2));
      }
    } catch (error) {
      console.log("❌ Leaderboard query failed:", error.message);
      console.log("This is likely due to the points field fix needing deployment");
    }
    
    console.log("3. Testing stats:getNetworkStats...");
    const stats = await client.query("stats:getNetworkStats", {});
    console.log(`✅ Got network stats: ${stats.activeProviders} active providers`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);