#!/usr/bin/env node

// Simple debug script to check basic system health
const { ConvexHttpClient } = require("convex/browser");

async function simpleDebug() {
  console.log("🔍 Quick Dandolo System Check...\n");
  
  try {
    // Initialize Convex client
    const client = new ConvexHttpClient("https://good-monitor-677.convex.cloud");
    
    console.log("1. Checking system health...");
    const health = await client.query("debug:systemHealth", {});
    
    console.log("\n📊 SYSTEM HEALTH:");
    console.log("Total Providers:", health.totalProviders);
    console.log("Active Providers:", health.activeProviders);
    console.log("Valid Providers:", health.validProviders);
    console.log("Has Valid Providers:", health.hasValidProviders);
    
    if (!health.hasValidProviders) {
      console.log("\n❌ CRITICAL: No valid providers!");
      console.log("This is why streaming is failing immediately.");
      
      if (health.providerIssues.length > 0) {
        console.log("\n🔧 Provider Issues:");
        health.providerIssues.forEach((issue, i) => {
          console.log(`${i + 1}. ${issue.name} - Issue: ${issue.issue}`);
        });
      }
      
      console.log("\n💡 SOLUTION:");
      console.log("1. Go to the Providers page in the web app");
      console.log("2. Register a provider with a valid Venice.ai API key");
      console.log("3. Ensure the API key is from venice.ai and has sufficient balance");
    } else {
      console.log("\n✅ BACKEND PROVIDERS HEALTHY");
      console.log("The issue may be in the streaming pipeline or frontend polling.");
      
      console.log("\n2. Testing provider selection...");
      const providers = await client.action("debug:checkProviders", {});
      console.log("Provider check result:", providers);
    }
    
  } catch (error) {
    console.error("\n💥 DEBUG FAILED:");
    console.error("Error:", error.message);
    console.error("\nPossible causes:");
    console.error("- Convex backend not running");
    console.error("- Network connectivity issues");
    console.error("- Incorrect Convex URL");
  }
}

// Run the debug
simpleDebug().catch(console.error);