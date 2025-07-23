#!/usr/bin/env node

import { ConvexHttpClient } from "convex/browser";

async function main() {
  const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://judicious-hornet-148.convex.cloud");

  try {
    console.log("🔍 Checking provider VCU balances...\n");
    
    // Get all providers
    const providers = await client.query("providers:list", {});
    
    console.log(`📊 Found ${providers.length} total providers\n`);
    
    // Analyze provider balances
    let totalVCU = 0;
    let activeProviders = 0;
    let inactiveProviders = 0;
    let zeroBalanceActive = 0;
    let zeroBalanceInactive = 0;
    
    console.log("Provider Details:");
    console.log("================");
    
    providers.forEach((provider, index) => {
      const balance = provider.vcuBalance || 0;
      const isActive = provider.isActive;
      const status = provider.status || 'unknown';
      
      totalVCU += balance;
      
      if (isActive) {
        activeProviders++;
        if (balance === 0) zeroBalanceActive++;
      } else {
        inactiveProviders++;
        if (balance === 0) zeroBalanceInactive++;
      }
      
      const balanceStatus = balance === 0 ? "❌ ZERO BALANCE" : balance < 1 ? "⚠️  LOW BALANCE" : "✅ HAS BALANCE";
      const activeStatus = isActive ? "🟢 ACTIVE" : "🔴 INACTIVE";
      
      console.log(`${index + 1}. ${provider.name}`);
      console.log(`   Status: ${activeStatus} (${status})`);
      console.log(`   Balance: $${balance.toFixed(2)} ${balanceStatus}`);
      console.log(`   Total Prompts: ${provider.totalPrompts || 0}`);
      console.log(`   Registered: ${new Date(provider.registrationDate).toLocaleDateString()}`);
      console.log("");
    });
    
    console.log("📈 Summary:");
    console.log("============");
    console.log(`Total Providers: ${providers.length}`);
    console.log(`Active Providers: ${activeProviders}`);
    console.log(`Inactive Providers: ${inactiveProviders}`);
    console.log(`Total VCU Balance: $${totalVCU.toFixed(2)}`);
    console.log("");
    
    console.log("⚠️  Critical Issues:");
    console.log("===================");
    console.log(`Active providers with ZERO balance: ${zeroBalanceActive}`);
    console.log(`Inactive providers with ZERO balance: ${zeroBalanceInactive}`);
    
    if (zeroBalanceActive > 0) {
      console.log("");
      console.log("🚨 ALERT: You have active providers with zero VCU balance!");
      console.log("These providers cannot serve requests and should be:");
      console.log("1. Recharged with VCU balance, OR");
      console.log("2. Marked as inactive until recharged");
    }
    
    if (totalVCU === 0) {
      console.log("");
      console.log("🚨 CRITICAL: Total network VCU balance is ZERO!");
      console.log("Your network cannot serve any paid inference requests.");
    }
    
    console.log("");
    console.log("💡 Recommendations:");
    console.log("==================");
    if (zeroBalanceActive > 0) {
      console.log("- Run VCU balance refresh for all providers");
      console.log("- Consider deactivating zero-balance providers");
    }
    if (totalVCU < 10) {
      console.log("- Network has low total VCU - consider provider funding");
    }
    console.log("- Monitor provider balances regularly");
    console.log("- Set up alerts for low balance conditions");

  } catch (error) {
    console.error("Error checking provider balances:", error);
  }
}

main().catch(console.error);