// Simple provider state check that can be run with: node check-provider-state.js

async function checkProviderState() {
  try {
    // Use dynamic import for ES modules
    const { ConvexHttpClient } = await import("convex/browser");
    const client = new ConvexHttpClient("https://good-monitor-677.convex.cloud");

    console.log("🔍 DANDOLO PROVIDER DATABASE INVESTIGATION");
    console.log("==========================================\n");

    // 1. System Health Check
    console.log("1. 🏥 SYSTEM HEALTH CHECK");
    console.log("-----------------------");
    try {
      const health = await client.query("debug:systemHealth");
      console.log(`📊 Total Providers: ${health.totalProviders}`);
      console.log(`✅ Active Providers: ${health.activeProviders}`);
      console.log(`🔧 Valid Providers: ${health.validProviders}`);
      console.log(`❌ Has Valid Providers: ${health.hasValidProviders}`);
      
      if (health.providerIssues && health.providerIssues.length > 0) {
        console.log(`⚠️  Provider Issues Found:`);
        health.providerIssues.forEach((issue, index) => {
          console.log(`   ${index + 1}. Provider "${issue.name}" - Issue: ${issue.issue}`);
        });
      } else {
        console.log(`✅ No provider issues detected`);
      }
    } catch (error) {
      console.log(`❌ Health check failed: ${error.message}`);
    }

    console.log("\n2. 📋 PROVIDER LIST");
    console.log("------------------");
    try {
      const providers = await client.query("debug:listProviders");
      if (providers.length === 0) {
        console.log("❌ No providers found in database");
      } else {
        providers.forEach((provider, index) => {
          console.log(`${index + 1}. Name: "${provider.name}"`);
          console.log(`   - Active: ${provider.isActive}`);
          console.log(`   - Has Valid API Key: ${provider.hasValidApiKey}`);
          console.log(`   - Total Prompts: ${provider.totalPrompts}`);
          console.log(`   - Registered: ${new Date(provider.registrationDate).toISOString()}`);
          console.log("");
        });
      }
    } catch (error) {
      console.log(`❌ Provider listing failed: ${error.message}`);
    }

    console.log("\n3. 💰 PROVIDER BALANCES");
    console.log("----------------------");
    try {
      const balances = await client.action("debug:checkProviderBalances");
      if (balances.length === 0) {
        console.log("❌ No providers with balance information");
      } else {
        balances.forEach((provider, index) => {
          console.log(`${index + 1}. "${provider.name}"`);
          console.log(`   - VCU Balance: ${provider.vcuBalance}`);
          console.log(`   - USD Value: $${provider.usdValue.toFixed(2)}`);
          console.log(`   - Has API Key: ${provider.hasApiKey}`);
          console.log(`   - Is Active: ${provider.isActive}`);
          console.log("");
        });
      }
    } catch (error) {
      console.log(`❌ Balance check failed: ${error.message}`);
    }

    console.log("\n4. 🔍 PROVIDER FILTERING ANALYSIS (Admin Required)");
    console.log("------------------------------------------------");
    try {
      const filtering = await client.action("debug:debugProviderFiltering", {
        adminAddress: "0xC07481520d98c32987cA83B30EAABdA673cDbe8c"
      });
      
      console.log(`📊 Total Providers: ${filtering.totalProviders}`);
      console.log(`✅ Valid Providers: ${filtering.validProviders}`);
      console.log(`🚨 Issue: ${filtering.issue}`);
      console.log(`💬 Message: ${filtering.message}`);
      
      if (filtering.providerAnalysis && filtering.providerAnalysis.length > 0) {
        console.log(`\n🔍 Detailed Provider Analysis:`);
        filtering.providerAnalysis.forEach((analysis, index) => {
          console.log(`\n   ${index + 1}. Provider: "${analysis.name}"`);
          console.log(`      - Active: ${analysis.isActive}`);
          console.log(`      - Has API Key: ${analysis.hasApiKey}`);
          console.log(`      - API Key Length: ${analysis.apiKeyLength}`);
          console.log(`      - Starts with Test: ${analysis.startsWithTest}`);
          console.log(`      - Name has Test: ${analysis.nameHasTest}`);
          console.log(`      - Is Valid: ${analysis.isValid}`);
          if (analysis.failureReasons.length > 0) {
            console.log(`      - Failure Reasons: ${analysis.failureReasons.join(", ")}`);
          }
        });
      }
    } catch (error) {
      console.log(`❌ Filtering analysis failed: ${error.message}`);
    }

    console.log("\n📋 SUMMARY & RECOMMENDATIONS");
    console.log("============================");
    
    // Provide actionable recommendations based on the findings
    const health = await client.query("debug:systemHealth").catch(() => ({ totalProviders: 0, validProviders: 0 }));
    
    if (health.totalProviders === 0) {
      console.log("🚨 NO PROVIDERS REGISTERED");
      console.log("   → Register providers through the /providers page");
      console.log("   → Ensure you have valid Venice.ai API keys");
      console.log("   → Connect your wallet to register as a provider");
    } else if (health.validProviders === 0) {
      console.log("🚨 PROVIDERS EXIST BUT NONE ARE VALID");
      console.log("   → Check provider names don't contain 'test'");
      console.log("   → Verify Venice.ai API keys are > 30 characters");
      console.log("   → Ensure API keys don't start with 'test_'");
      console.log("   → Run cleanup: npx convex dev --run debug:cleanupTestProviders --arg adminAddress '0xC07481520d98c32987cA83B30EAABdA673cDbe8c'");
    } else {
      console.log(`✅ SYSTEM HEALTHY - ${health.validProviders} valid providers available`);
    }

  } catch (error) {
    console.error("❌ Investigation failed:", error.message);
    console.error("\n🔧 Troubleshooting:");
    console.error("   1. Ensure Convex is running: npx convex dev");
    console.error("   2. Check environment variables in .env.local");
    console.error("   3. Verify network connection");
    console.error("   4. Try: npx convex dev --run debug:systemHealth");
  }
}

// Run the investigation
checkProviderState();