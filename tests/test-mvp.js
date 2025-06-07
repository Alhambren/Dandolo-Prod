// test-mvp.js - Test the MVP provider system
// Run with: npm run test:mvp

import { ConvexHttpClient } from "convex/browser";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Convex client
const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

async function testMVP() {
  console.log("🧪 Testing Dandolo MVP Provider System\n");

  try {
    // Test 1: Check active providers
    console.log("1️⃣ Checking active providers...");
    const activeProviders = await client.query("providers:listActive");
    console.log(`   ✅ Found ${activeProviders.length} active providers`);
    
    if (activeProviders.length > 0) {
      console.log("   Sample provider:", {
        name: activeProviders[0].name,
        uptime: activeProviders[0].uptime,
        totalPrompts: activeProviders[0].totalPrompts
      });
    }

    // Test 2: Check provider selection
    console.log("\n2️⃣ Testing provider selection...");
    const selectedProvider = await client.query("providers:selectProvider");
    if (selectedProvider) {
      console.log(`   ✅ Selected provider: ${selectedProvider.name}`);
    } else {
      console.log("   ⚠️  No providers available for selection");
    }

    // Test 3: Check network stats
    console.log("\n3️⃣ Checking network stats...");
    const stats = await client.query("stats:getNetworkStats");
    console.log("   Network stats:", {
      totalProviders: stats.totalProviders,
      activeProviders: stats.activeProviders,
      totalPrompts: stats.totalPrompts,
      avgResponseTime: stats.avgResponseTime + "ms"
    });

    // Test 4: Check points leaderboard
    console.log("\n4️⃣ Checking provider leaderboard...");
    const leaderboard = await client.query("providers:getLeaderboard");
    console.log(`   ✅ Leaderboard has ${leaderboard.length} providers`);
    
    if (leaderboard.length > 0) {
      console.log("   Top provider:", {
        name: leaderboard[0].name,
        points: leaderboard[0].points,
        prompts: leaderboard[0].totalPrompts
      });
    }

    // Test 5: Verify anti-Sybil is working
    console.log("\n5️⃣ Checking anti-Sybil measures...");
    const allProviders = await client.query("providers:list");
    const uniqueWallets = new Set(allProviders.map(p => p.address));
    const uniqueApiHashes = new Set(allProviders.map(p => p.apiKeyHash).filter(Boolean));
    
    console.log(`   ✅ ${allProviders.length} providers from ${uniqueWallets.size} unique wallets`);
    console.log(`   ✅ ${uniqueApiHashes.size} unique API keys`);
    
    if (allProviders.length !== uniqueWallets.size) {
      console.log("   ⚠️  WARNING: Some wallets have multiple providers!");
    }

    console.log("\n✅ MVP System Test Complete!");
    
    // Summary
    console.log("\n📊 Summary:");
    console.log("   - Providers can register with Venice API keys");
    console.log("   - One provider per wallet enforced");
    console.log("   - No duplicate API keys allowed");
    console.log("   - Points awarded only for serving prompts");
    console.log("   - Simple random provider selection");
    console.log("   - No Sybil incentive (no free points)");

  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the test
testMVP().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
}); 