import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://good-monitor-677.convex.cloud");

console.log("=== DANDOLO PROVIDER DATABASE INVESTIGATION ===\n");

async function investigateProviders() {
  try {
    console.log("1. Checking system health...");
    const health = await client.query("debug:systemHealth");
    console.log("System Health:", JSON.stringify(health, null, 2));
    console.log();

    console.log("2. Listing all providers (public info)...");
    const providers = await client.query("debug:listProviders");
    console.log("Providers:", JSON.stringify(providers, null, 2));
    console.log();

    console.log("3. Checking provider balances...");
    const balances = await client.action("debug:checkProviderBalances");
    console.log("Provider Balances:", JSON.stringify(balances, null, 2));
    console.log();

    console.log("4. Testing provider filtering...");
    const filtering = await client.action("debug:debugProviderFiltering", {
      adminAddress: "0xC07481520d98c32987cA83B30EAABdA673cDbe8c"
    });
    console.log("Provider Filtering Analysis:", JSON.stringify(filtering, null, 2));
    console.log();

  } catch (error) {
    console.error("Investigation failed:", error.message);
    console.error("Stack:", error.stack);
  }
}

investigateProviders().catch(console.error);