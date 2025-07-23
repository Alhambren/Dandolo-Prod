#!/usr/bin/env node

import { ConvexHttpClient } from "convex/browser";

async function main() {
  const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://judicious-hornet-148.convex.cloud");

  try {
    console.log("🔍 COMPREHENSIVE PROVIDERS TAB DATA AUDIT");
    console.log("==========================================\n");

    // Get real provider data
    console.log("📊 Fetching real provider data...");
    const realProviders = await client.query("providers:list", {});
    
    // Get leaderboard data (what UI displays)
    console.log("🏆 Fetching provider leaderboard data...");
    const leaderboardData = await client.query("stats:getProviderLeaderboard", {});
    
    // Get network stats
    console.log("📈 Fetching network statistics...");
    const networkStats = await client.query("stats:getNetworkStats", {});
    
    console.log("\n" + "=".repeat(80));
    console.log("OVERVIEW COMPARISON");
    console.log("=".repeat(80));
    
    const realActive = realProviders.filter(p => p.isActive);
    const realTotal = realProviders.length;
    const realTotalVCU = realProviders.reduce((sum, p) => sum + (p.vcuBalance || 0), 0);
    
    console.log(`\n📊 REAL DATA (from providers:list):`);
    console.log(`   Total Providers: ${realTotal}`);
    console.log(`   Active Providers: ${realActive.length}`);
    console.log(`   Total VCU Balance: $${realTotalVCU.toFixed(2)}`);
    console.log(`   UI Display VCU (×0.10): $${(realTotalVCU * 0.10).toFixed(2)}`);
    
    console.log(`\n🎯 CACHED STATS (from stats:getNetworkStats):`);
    console.log(`   Total Providers: ${networkStats.totalProviders}`);
    console.log(`   Active Providers: ${networkStats.activeProviders}`);
    console.log(`   Cache Age: ${networkStats.cacheAge ? Math.round(networkStats.cacheAge / 1000 / 60) + ' minutes' : 'unknown'}`);
    
    console.log(`\n🏆 LEADERBOARD DATA (from stats:getProviderLeaderboard):`);
    console.log(`   Leaderboard Entries: ${leaderboardData.length}`);
    
    console.log("\n" + "=".repeat(80));
    console.log("DETAILED PROVIDER COMPARISON");
    console.log("=".repeat(80));
    
    // Create comprehensive comparison
    const issues = [];
    const providerMap = new Map();
    
    // Index real providers
    realProviders.forEach(p => {
      providerMap.set(p._id, {
        real: p,
        leaderboard: null
      });
    });
    
    // Match with leaderboard data
    leaderboardData.forEach(p => {
      if (providerMap.has(p._id)) {
        providerMap.get(p._id).leaderboard = p;
      } else {
        // Provider in leaderboard but not in real data
        providerMap.set(p._id, {
          real: null,
          leaderboard: p
        });
      }
    });
    
    console.log("\nProvider-by-Provider Analysis:");
    console.log("-".repeat(80));
    
    let index = 1;
    for (const [providerId, data] of providerMap) {
      const { real, leaderboard } = data;
      
      console.log(`\n${index}. Provider ID: ${providerId}`);
      
      // Name comparison
      const realName = real?.name || "N/A";
      const leaderboardName = leaderboard?.name || "N/A";
      if (realName !== leaderboardName && realName !== "N/A" && leaderboardName !== "N/A") {
        console.log(`   ❌ NAME MISMATCH:`);
        console.log(`      Real: "${realName}"`);
        console.log(`      Leaderboard: "${leaderboardName}"`);
        issues.push(`Provider ${providerId}: Name mismatch (${realName} vs ${leaderboardName})`);
      } else {
        console.log(`   ✅ Name: ${realName}`);
      }
      
      // VCU Balance comparison
      const realBalance = real?.vcuBalance || 0;
      const leaderboardBalance = leaderboard?.vcuBalance || 0;
      if (Math.abs(realBalance - leaderboardBalance) > 0.01) {
        console.log(`   ❌ VCU BALANCE MISMATCH:`);
        console.log(`      Real: $${realBalance.toFixed(2)} (UI: $${(realBalance * 0.10).toFixed(2)})`);
        console.log(`      Leaderboard: $${leaderboardBalance.toFixed(2)} (UI: $${(leaderboardBalance * 0.10).toFixed(2)})`);
        issues.push(`Provider ${providerId}: VCU balance mismatch ($${realBalance} vs $${leaderboardBalance})`);
      } else {
        console.log(`   ✅ VCU Balance: $${realBalance.toFixed(2)} (UI Display: $${(realBalance * 0.10).toFixed(2)})`);
      }
      
      // Active status comparison
      const realActive = real?.isActive || false;
      const realStatus = real?.status || "unknown";
      if (real && !realActive) {
        console.log(`   ⚠️  Status: INACTIVE (${realStatus})`);
      } else if (real) {
        console.log(`   ✅ Status: ACTIVE (${realStatus})`);
      }
      
      // Points comparison
      const leaderboardPoints = leaderboard?.points || 0;
      console.log(`   📊 Points: ${leaderboardPoints}`);
      
      // Prompts comparison
      const realPrompts = real?.totalPrompts || 0;
      const leaderboardPrompts = leaderboard?.totalPrompts || 0;
      if (realPrompts !== leaderboardPrompts) {
        console.log(`   ❌ PROMPTS MISMATCH:`);
        console.log(`      Real: ${realPrompts}`);
        console.log(`      Leaderboard: ${leaderboardPrompts}`);
        issues.push(`Provider ${providerId}: Prompts mismatch (${realPrompts} vs ${leaderboardPrompts})`);
      } else {
        console.log(`   ✅ Total Prompts: ${realPrompts}`);
      }
      
      // Missing data checks
      if (real && !leaderboard) {
        console.log(`   ⚠️  MISSING FROM LEADERBOARD (but exists in real data)`);
        issues.push(`Provider ${providerId}: Missing from leaderboard but exists in database`);
      }
      if (!real && leaderboard) {
        console.log(`   ⚠️  LEADERBOARD ONLY (not found in real data)`);
        issues.push(`Provider ${providerId}: Exists in leaderboard but not in real database`);
      }
      
      index++;
    }
    
    console.log("\n" + "=".repeat(80));
    console.log("ISSUES SUMMARY");
    console.log("=".repeat(80));
    
    if (issues.length === 0) {
      console.log("\n✅ NO ISSUES FOUND! All data is consistent between sources.");
    } else {
      console.log(`\n❌ FOUND ${issues.length} ISSUES:`);
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }
    
    console.log("\n" + "=".repeat(80));
    console.log("UI DISPLAY IMPLICATIONS");
    console.log("=".repeat(80));
    
    console.log(`\n🖥️  What users see on Providers tab:`);
    console.log(`   - Provider count from cache: ${networkStats.activeProviders} active`);
    console.log(`   - Provider list shows: ${realActive.length} active providers`);
    console.log(`   - VCU totals displayed with 0.10 multiplier: $${(realTotalVCU * 0.10).toFixed(2)}`);
    console.log(`   - Leaderboard shows top: ${Math.min(10, leaderboardData.length)} providers`);
    
    if (networkStats.activeProviders !== realActive.length) {
      console.log(`   ⚠️  COUNT MISMATCH: Cache shows ${networkStats.activeProviders} but real data has ${realActive.length}`);
      issues.push(`Network stats cache shows ${networkStats.activeProviders} active providers but real data has ${realActive.length}`);
    }
    
    console.log("\n" + "=".repeat(80));
    console.log("RECOMMENDATIONS");
    console.log("=".repeat(80));
    
    if (issues.length > 0) {
      console.log(`\n🔧 IMMEDIATE ACTIONS NEEDED:`);
      console.log(`   1. Refresh network stats cache: Run refresh-network-cache.js`);
      console.log(`   2. Verify provider points calculation using totalPoints field`);
      console.log(`   3. Check VCU balance synchronization between providers and leaderboard`);
      console.log(`   4. Consider updating UI to show real-time data instead of cached stats`);
      console.log(`   5. Implement data consistency monitoring`);
    } else {
      console.log(`\n✅ SYSTEM HEALTHY:`);
      console.log(`   - All provider data is consistent`);
      console.log(`   - UI should display accurate information`);
      console.log(`   - No immediate actions required`);
    }
    
    console.log(`\n📊 PROVIDER DATA HEALTH SCORE: ${issues.length === 0 ? '100%' : Math.max(0, 100 - (issues.length * 10))}%`);
    
    // Exit with error code if issues found
    if (issues.length > 0) {
      console.log(`\n🚨 Audit completed with ${issues.length} issues found.`);
      process.exit(1);
    } else {
      console.log(`\n✅ Audit completed successfully - no issues found.`);
      process.exit(0);
    }

  } catch (error) {
    console.error("❌ Error during provider audit:", error);
    process.exit(1);
  }
}

main().catch(console.error);