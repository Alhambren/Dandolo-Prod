#!/usr/bin/env node

/**
 * Debug script to identify providers that may have been caught by overly strict validation
 * Usage: node debug-provider-validation.js
 * 
 * This script will:
 * 1. List all registered providers
 * 2. Show which ones are active/inactive
 * 3. Identify validation issues that might prevent activation
 * 4. Suggest manual activation commands for legitimate providers
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL || "https://deep-reindeer-817.convex.cloud");

async function debugProviderValidation() {
  try {
    console.log("🔍 Debugging Provider Validation Issues\n");
    console.log("=====================================");
    
    // Get all providers (public info only)
    const providers = await client.query(api.providers.list);
    
    if (providers.length === 0) {
      console.log("❌ No providers found in the system.");
      return;
    }
    
    console.log(`📊 Found ${providers.length} total providers:`);
    console.log("");
    
    const activeProviders = providers.filter(p => p.isActive);
    const inactiveProviders = providers.filter(p => !p.isActive);
    
    console.log(`✅ Active providers: ${activeProviders.length}`);
    console.log(`❌ Inactive providers: ${inactiveProviders.length}\n`);
    
    // Show active providers
    if (activeProviders.length > 0) {
      console.log("🟢 ACTIVE PROVIDERS:");
      console.log("===================");
      activeProviders.forEach((provider, index) => {
        console.log(`${index + 1}. ${provider.name}`);
        console.log(`   ID: ${provider._id}`);
        console.log(`   VCU Balance: $${(provider.vcuBalance || 0).toFixed(2)}`);
        console.log(`   Total Prompts: ${provider.totalPrompts || 0}`);
        console.log(`   Status: ${provider.status || 'active'}`);
        console.log("");
      });
    }
    
    // Show inactive providers with potential issues
    if (inactiveProviders.length > 0) {
      console.log("🔴 INACTIVE PROVIDERS:");
      console.log("======================");
      inactiveProviders.forEach((provider, index) => {
        console.log(`${index + 1}. ${provider.name}`);
        console.log(`   ID: ${provider._id}`);
        console.log(`   VCU Balance: $${(provider.vcuBalance || 0).toFixed(2)}`);
        console.log(`   Status: ${provider.status || 'unknown'}`);
        console.log(`   Registration: ${provider.registrationDate ? new Date(provider.registrationDate).toLocaleString() : 'unknown'}`);
        
        // Suggest potential issues and solutions
        const issues = [];
        const solutions = [];
        
        if (provider.vcuBalance && provider.vcuBalance > 0) {
          issues.push("Has VCU balance but inactive");
          solutions.push("Manual activation recommended");
        }
        
        if (provider.status === 'pending') {
          issues.push("Status is 'pending'");
          solutions.push("May need admin approval");
        }
        
        if (provider.consecutiveFailures && provider.consecutiveFailures >= 2) {
          issues.push(`${provider.consecutiveFailures} consecutive health check failures`);
          solutions.push("Health checks may be failing - verify API key");
        }
        
        if (issues.length > 0) {
          console.log(`   Issues: ${issues.join(', ')}`);
          console.log(`   Solutions: ${solutions.join(', ')}`);
        }
        
        // Provide manual activation command
        console.log(`   Manual Activation Command:`);
        console.log(`   await client.action(api.providers.adminActivateProviderAction, {`);
        console.log(`     providerId: "${provider._id}",`);
        console.log(`     reason: "Manual activation after validation fix"`);
        console.log(`   });`);
        console.log("");
      });
    }
    
    // Provide summary and recommendations
    console.log("📋 SUMMARY & RECOMMENDATIONS:");
    console.log("=============================");
    
    if (activeProviders.length === 0 && inactiveProviders.length > 0) {
      console.log("⚠️  CRITICAL: No active providers found! This will cause inference failures.");
      console.log("   Recommendation: Manually activate providers using the commands above.");
    } else if (activeProviders.length < 2 && inactiveProviders.length > 0) {
      console.log("⚠️  Warning: Very few active providers. Consider activating more for redundancy.");
    } else if (activeProviders.length > 0) {
      console.log("✅ System has active providers and should be functional.");
    }
    
    console.log(`\n🔧 New validation rules in effect:`);
    console.log("   - API key length requirement reduced from 30 to 20 characters");
    console.log("   - Removed 'test' name filtering (only blocks dummy/placeholder/fake)");
    console.log("   - Added fallback validation with relaxed rules");
    console.log("   - Enhanced error logging and debugging");
    
    console.log(`\n📚 To manually activate a provider:`);
    console.log(`   1. Use the adminActivateProviderAction function with provider ID`);
    console.log(`   2. Check provider health with adminDebugProvider`);
    console.log(`   3. Monitor logs for validation details`);
    
  } catch (error) {
    console.error("❌ Error debugging provider validation:", error);
    
    if (error.message?.includes("ECONNREFUSED")) {
      console.log("\n💡 Tip: Make sure your Convex backend is running:");
      console.log("   npx convex dev");
    }
  }
}

debugProviderValidation();