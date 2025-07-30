#!/usr/bin/env node

// Check what type of API keys are currently stored
const { ConvexHttpClient } = require("convex/browser");

async function checkApiKeys() {
  console.log("🔑 Checking API Key Details...\n");
  
  try {
    const client = new ConvexHttpClient("https://good-monitor-677.convex.cloud");
    
    // Get list of providers with safe debugging info
    const providers = await client.query("debug:listProviders", {});
    
    console.log("📋 PROVIDER API KEY ANALYSIS:");
    providers.forEach((provider, i) => {
      console.log(`\n${i + 1}. ${provider.name} (ID: ${provider.id})`);
      console.log(`   Active: ${provider.isActive}`);
      console.log(`   Has Valid Key: ${provider.hasValidApiKey}`);
      console.log(`   Registration: ${new Date(provider.registrationDate).toISOString()}`);
      console.log(`   Total Prompts: ${provider.totalPrompts}`);
    });
    
    console.log("\n💡 DIAGNOSIS:");
    const validProviders = providers.filter(p => p.hasValidApiKey);
    const activeProviders = providers.filter(p => p.isActive);
    
    if (validProviders.length === 0) {
      console.log("❌ No providers have valid API keys");
    } else if (validProviders.length < activeProviders.length) {
      console.log(`⚠️  Only ${validProviders.length}/${activeProviders.length} active providers have valid keys`);
    } else {
      console.log("✅ All active providers have keys, but Venice.ai rejects them");
      console.log("   This suggests the keys are:");
      console.log("   - Test keys (don't work with real Venice.ai API)");
      console.log("   - Keys from a different AI provider");
      console.log("   - Expired/revoked Venice.ai keys");
      console.log("   - Incorrectly copied keys");
    }
    
    console.log("\n🛠️  SOLUTION:");
    console.log("1. Go to https://venice.ai and get a real API key");
    console.log("2. Register as a new provider in the Dandolo dashboard");
    console.log("3. Use the real Venice.ai API key (starts with letters/numbers, not 'test_')");
    console.log("4. Ensure the Venice.ai account has sufficient balance");
    
  } catch (error) {
    console.error("💥 API KEY CHECK FAILED:");
    console.error("Error:", error.message);
  }
}

checkApiKeys().catch(console.error);