#!/usr/bin/env node

import { ConvexHttpClient } from "convex/browser";

async function main() {
  const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://judicious-hornet-148.convex.cloud");

  try {
    console.log("🔍 Checking current network stats cache...");
    
    // Get current cached stats
    const currentStats = await client.query("stats:getNetworkStats", {});
    console.log("Current cached stats:", {
      totalProviders: currentStats.totalProviders,
      activeProviders: currentStats.activeProviders,
      cacheAge: currentStats.cacheAge ? Math.round(currentStats.cacheAge / 1000 / 60) + " minutes" : "unknown"
    });

    // Get actual provider data
    console.log("\n📊 Checking actual provider data...");
    const providers = await client.query("providers:list", {});
    const activeProviders = providers.filter(p => p.isActive);
    
    console.log("Actual provider counts:", {
      totalProviders: providers.length,
      activeProviders: activeProviders.length,
      providerStatuses: providers.reduce((acc, p) => {
        acc[p.status || 'unknown'] = (acc[p.status || 'unknown'] || 0) + 1;
        return acc;
      }, {})
    });

    console.log("\n🔄 Refreshing network stats cache...");
    const refreshResult = await client.mutation("stats:updateNetworkStatsCache", {});
    
    if (refreshResult.success) {
      console.log("✅ Cache refresh successful!");
      console.log("New stats:", {
        totalProviders: refreshResult.stats.totalProviders,
        activeProviders: refreshResult.stats.activeProviders,
        totalPrompts: refreshResult.stats.totalPrompts,
        networkHealth: refreshResult.stats.networkHealth
      });
    } else {
      console.log("❌ Cache refresh failed:", refreshResult.error);
    }

    // Verify the cache was updated
    console.log("\n✔️ Verifying updated cache...");
    const updatedStats = await client.query("stats:getNetworkStats", {});
    console.log("Updated cached stats:", {
      totalProviders: updatedStats.totalProviders,
      activeProviders: updatedStats.activeProviders,
      cacheAge: updatedStats.cacheAge ? Math.round(updatedStats.cacheAge / 1000 / 60) + " minutes" : "unknown"
    });

  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);