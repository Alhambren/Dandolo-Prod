#!/usr/bin/env node

/**
 * Comprehensive validation test script for Dandolo provider system
 * Tests the current status of provider validation fixes
 * Usage: node test-system-validation.js
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL || "https://deep-reindeer-817.convex.cloud");

// Admin address for debug functions
const ADMIN_ADDRESS = "0xC07481520d98c32987cA83B30EAABdA673cDbe8c";

async function runComprehensiveTests() {
  console.log("🚀 Dandolo Provider Validation Test Suite");
  console.log("========================================\n");

  const results = {
    systemHealth: null,
    providerAnalysis: null,
    apiKeyValidation: null,
    balanceValidation: null,
    totalProviders: 0,
    activeProviders: 0,
    validProviders: 0,
    issues: []
  };

  try {
    // Test 1: System Health Check
    console.log("1️⃣  Running System Health Check...");
    try {
      results.systemHealth = await client.query(api.debug.systemHealth);
      console.log(`   Total Providers: ${results.systemHealth.totalProviders}`);
      console.log(`   Active Providers: ${results.systemHealth.activeProviders}`);
      console.log(`   Valid Providers: ${results.systemHealth.validProviders}`);
      console.log(`   System Status: ${results.systemHealth.hasValidProviders ? '✅ Healthy' : '❌ No Valid Providers'}\n`);
      
      results.totalProviders = results.systemHealth.totalProviders;
      results.activeProviders = results.systemHealth.activeProviders;
      results.validProviders = results.systemHealth.validProviders;
    } catch (error) {
      console.log(`   ❌ System health check failed: ${error.message}\n`);
      results.issues.push(`System health check failed: ${error.message}`);
    }

    // Test 2: Provider Filtering Analysis
    console.log("2️⃣  Running Provider Filtering Analysis...");
    try {
      results.providerAnalysis = await client.action(api.debug.debugProviderFiltering, {
        adminAddress: ADMIN_ADDRESS
      });
      
      console.log(`   Analysis: ${results.providerAnalysis.message}`);
      console.log(`   Issue Type: ${results.providerAnalysis.issue}`);
      
      if (results.providerAnalysis.providerAnalysis) {
        console.log("\n   Provider Details:");
        results.providerAnalysis.providerAnalysis.forEach((provider, index) => {
          console.log(`   ${index + 1}. ${provider.name}`);
          console.log(`      - Active: ${provider.isActive}`);
          console.log(`      - Has API Key: ${provider.hasApiKey}`);
          console.log(`      - Valid: ${provider.isValid}`);
          if (provider.failureReasons.length > 0) {
            console.log(`      - Issues: ${provider.failureReasons.join(', ')}`);
          }
        });
      }
      console.log("");
    } catch (error) {
      console.log(`   ❌ Provider filtering analysis failed: ${error.message}\n`);
      results.issues.push(`Provider filtering analysis failed: ${error.message}`);
    }

    // Test 3: Provider Balance Validation
    console.log("3️⃣  Running Provider Balance Validation...");
    try {
      results.balanceValidation = await client.action(api.debug.checkProviderBalances);
      
      if (Array.isArray(results.balanceValidation)) {
        console.log(`   Found ${results.balanceValidation.length} providers with balance data:`);
        results.balanceValidation.forEach((provider, index) => {
          console.log(`   ${index + 1}. ${provider.name}`);
          console.log(`      - VCU Balance: ${provider.vcuBalance} ($${provider.usdValue.toFixed(2)})`);
          console.log(`      - Has API Key: ${provider.hasApiKey}`);
          console.log(`      - Active: ${provider.isActive}`);
        });
      }
      console.log("");
    } catch (error) {
      console.log(`   ❌ Provider balance validation failed: ${error.message}\n`);
      results.issues.push(`Provider balance validation failed: ${error.message}`);
    }

    // Test 4: API Key Validation
    console.log("4️⃣  Running API Key Validation Test...");
    try {
      results.apiKeyValidation = await client.action(api.debug.testApiKeyValidation, {
        adminAddress: ADMIN_ADDRESS
      });
      
      console.log(`   API Key Test: ${results.apiKeyValidation.success ? '✅ Passed' : '❌ Failed'}`);
      if (results.apiKeyValidation.keyData) {
        console.log(`   Key Type: ${results.apiKeyValidation.keyData.keyType}`);
        console.log(`   Active: ${results.apiKeyValidation.keyData.isActive}`);
        console.log(`   Daily Usage: ${results.apiKeyValidation.keyData.dailyUsage}/${results.apiKeyValidation.keyData.dailyLimit}`);
      }
      
      if (results.apiKeyValidation.error) {
        console.log(`   Error: ${results.apiKeyValidation.error}`);
      }
      console.log("");
    } catch (error) {
      console.log(`   ❌ API key validation failed: ${error.message}\n`);
      results.issues.push(`API key validation failed: ${error.message}`);
    }

    // Test 5: Simple Provider List
    console.log("5️⃣  Running Simple Provider List Query...");
    try {
      const providers = await client.query(api.debug.listProviders);
      console.log(`   Found ${providers.length} providers in database:`);
      providers.forEach((provider, index) => {
        console.log(`   ${index + 1}. ${provider.name}`);
        console.log(`      - Active: ${provider.isActive}`);
        console.log(`      - Has Valid Key: ${provider.hasValidApiKey}`);
        console.log(`      - Total Prompts: ${provider.totalPrompts}`);
      });
      console.log("");
    } catch (error) {
      console.log(`   ❌ Provider list query failed: ${error.message}\n`);
      results.issues.push(`Provider list query failed: ${error.message}`);
    }

    // Final Analysis
    console.log("📊 FINAL ANALYSIS");
    console.log("=================");
    
    if (results.validProviders > 0) {
      console.log(`✅ System Status: OPERATIONAL`);
      console.log(`   - ${results.validProviders} valid providers available`);
      console.log(`   - ${results.activeProviders} total active providers`);
      console.log(`   - Provider validation fixes appear to be working`);
    } else if (results.activeProviders > 0) {
      console.log(`⚠️  System Status: DEGRADED`);
      console.log(`   - ${results.activeProviders} active providers found`);
      console.log(`   - But validation is failing - providers may need manual activation`);
      console.log(`   - Check API key formats and provider names`);
    } else {
      console.log(`❌ System Status: CRITICAL`);
      console.log(`   - No active providers found`);
      console.log(`   - System cannot process inference requests`);
      console.log(`   - Immediate provider registration or activation needed`);
    }

    console.log("\n🔧 VALIDATION IMPROVEMENTS DEPLOYED:");
    console.log("   - API key length requirement reduced from 30 to 20 characters");
    console.log("   - Removed 'test' name filtering (only blocks dummy/placeholder/fake)");
    console.log("   - Added fallback validation with relaxed rules (≥10 chars)");
    console.log("   - Enhanced error logging and debugging");
    console.log("   - Manual admin activation functions available");

    if (results.issues.length > 0) {
      console.log("\n⚠️  ISSUES ENCOUNTERED:");
      results.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    console.log("\n💡 NEXT STEPS:");
    if (results.validProviders === 0 && results.activeProviders > 0) {
      console.log("   1. Run manual provider activation for legitimate providers");
      console.log("   2. Check API key formats - ensure they're real Venice.ai keys");
      console.log("   3. Verify provider names don't contain 'dummy', 'placeholder', or 'fake'");
    } else if (results.totalProviders === 0) {
      console.log("   1. Register new providers through the dashboard");
      console.log("   2. Ensure Venice.ai API keys are valid and have sufficient balance");
      console.log("   3. Test provider registration flow");
    } else {
      console.log("   1. Monitor system performance with current providers");
      console.log("   2. Consider registering additional providers for redundancy");
      console.log("   3. Set up automated health monitoring");
    }

  } catch (error) {
    console.error("❌ Test suite failed:", error);
    
    if (error.message?.includes("ECONNREFUSED")) {
      console.log("\n💡 Tip: Make sure your Convex backend is running:");
      console.log("   npx convex dev");
    }
  }
}

// Run the test suite
runComprehensiveTests().catch(console.error);