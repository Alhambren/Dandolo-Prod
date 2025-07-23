#!/usr/bin/env node

/**
 * VCU Balance Investigation Script
 * 
 * This script investigates the VCU balances of all providers in the Dandolo system:
 * 1. Lists all providers with their names, status, and VCU balances
 * 2. Identifies providers with zero or low balances
 * 3. Shows total VCU available across all providers
 * 4. Analyzes if providers with zero balances should be marked as inactive
 * 
 * Run with: node investigate-vcu-balances.js
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function investigateVCUBalances() {
  try {

    console.log("🔍 DANDOLO VCU BALANCE INVESTIGATION");
    console.log("===================================\n");

    // 1. Get all providers from the database
    console.log("1. 📋 FETCHING ALL PROVIDERS");
    console.log("---------------------------");
    
    const { stdout: providersOutput } = await execPromise('npx convex run providers:list');
    const allProviders = JSON.parse(providersOutput);
    console.log(`Total providers in database: ${allProviders.length}\n`);

    if (allProviders.length === 0) {
      console.log("❌ No providers found in the database");
      return;
    }

    // 2. Categorize providers by status and balance
    console.log("2. 📊 PROVIDER ANALYSIS");
    console.log("----------------------");

    const activeProviders = allProviders.filter(p => p.isActive);
    const inactiveProviders = allProviders.filter(p => !p.isActive);
    const zeroBalanceProviders = allProviders.filter(p => (p.vcuBalance || 0) === 0);
    const lowBalanceProviders = allProviders.filter(p => (p.vcuBalance || 0) > 0 && (p.vcuBalance || 0) < 1);

    console.log(`Active providers: ${activeProviders.length}`);
    console.log(`Inactive providers: ${inactiveProviders.length}`);
    console.log(`Providers with zero balance: ${zeroBalanceProviders.length}`);
    console.log(`Providers with low balance (<$1): ${lowBalanceProviders.length}\n`);

    // 3. Calculate total VCU available
    const totalVCU = allProviders.reduce((sum, provider) => sum + (provider.vcuBalance || 0), 0);
    const activeVCU = activeProviders.reduce((sum, provider) => sum + (provider.vcuBalance || 0), 0);

    console.log("3. 💰 VCU BALANCE SUMMARY");
    console.log("------------------------");
    console.log(`Total VCU across all providers: $${totalVCU.toFixed(2)}`);
    console.log(`Total VCU from active providers: $${activeVCU.toFixed(2)}`);
    console.log(`Average VCU per provider: $${(totalVCU / allProviders.length).toFixed(2)}\n`);

    // 4. Detailed provider breakdown
    console.log("4. 🏪 DETAILED PROVIDER BREAKDOWN");
    console.log("--------------------------------");

    // Sort providers by VCU balance (highest first)
    const sortedProviders = [...allProviders].sort((a, b) => (b.vcuBalance || 0) - (a.vcuBalance || 0));

    console.log("All providers (sorted by VCU balance):\n");
    
    sortedProviders.forEach((provider, index) => {
      const balance = provider.vcuBalance || 0;
      const status = provider.isActive ? "✅ ACTIVE" : "❌ INACTIVE";
      const balanceIcon = balance === 0 ? "🔴" : balance < 1 ? "🟡" : "🟢";
      
      console.log(`${index + 1}. ${balanceIcon} "${provider.name || 'Unnamed'}"`);
      console.log(`   Status: ${status}`);
      console.log(`   VCU Balance: $${balance.toFixed(2)}`);
      console.log(`   Address: ${provider.address}`);
      console.log(`   Total Prompts: ${provider.totalPrompts || 0}`);
      console.log(`   Registration: ${new Date(provider.registrationDate || provider._creationTime).toISOString()}`);
      console.log(`   Last Health Check: ${provider.lastHealthCheck ? new Date(provider.lastHealthCheck).toISOString() : 'Never'}`);
      console.log('');
    });

    // 5. Zero balance analysis
    if (zeroBalanceProviders.length > 0) {
      console.log("5. 🔴 ZERO BALANCE PROVIDERS ANALYSIS");
      console.log("-----------------------------------");
      
      console.log(`Found ${zeroBalanceProviders.length} providers with zero VCU balance:\n`);
      
      zeroBalanceProviders.forEach((provider, index) => {
        const daysSinceRegistration = Math.floor((Date.now() - (provider.registrationDate || provider._creationTime)) / (1000 * 60 * 60 * 24));
        const shouldBeInactive = provider.isActive && (provider.totalPrompts || 0) === 0 && daysSinceRegistration > 1;
        
        console.log(`${index + 1}. "${provider.name || 'Unnamed'}"`);
        console.log(`   Status: ${provider.isActive ? "ACTIVE (🚨 PROBLEM)" : "INACTIVE (✅ CORRECT)"}`);
        console.log(`   VCU Balance: $0.00`);
        console.log(`   Total Prompts Served: ${provider.totalPrompts || 0}`);
        console.log(`   Days Since Registration: ${daysSinceRegistration}`);
        console.log(`   Should be marked inactive: ${shouldBeInactive ? "YES 🚨" : "NO ✅"}`);
        
        if (shouldBeInactive) {
          console.log(`   ⚠️  RECOMMENDATION: Mark as inactive - zero balance, no prompts served, registered ${daysSinceRegistration} days ago`);
        }
        console.log('');
      });
    }

    // 6. Active providers with zero balance (critical issue)
    const activeZeroBalance = zeroBalanceProviders.filter(p => p.isActive);
    
    if (activeZeroBalance.length > 0) {
      console.log("6. 🚨 CRITICAL ISSUE: ACTIVE PROVIDERS WITH ZERO BALANCE");
      console.log("-------------------------------------------------------");
      
      console.log(`Found ${activeZeroBalance.length} ACTIVE providers with zero VCU balance:`);
      console.log("These providers cannot serve requests and should be marked inactive!\n");
      
      activeZeroBalance.forEach((provider, index) => {
        console.log(`${index + 1}. "${provider.name || 'Unnamed'}"`);
        console.log(`   Address: ${provider.address}`);
        console.log(`   Prompts Served: ${provider.totalPrompts || 0}`);
        console.log(`   Last Health Check: ${provider.lastHealthCheck ? new Date(provider.lastHealthCheck).toISOString() : 'Never'}`);
        console.log('');
      });
    }

    // 7. Summary and recommendations
    console.log("7. 📋 SUMMARY & RECOMMENDATIONS");
    console.log("==============================");
    
    if (activeZeroBalance.length > 0) {
      console.log("🚨 CRITICAL ISSUES FOUND:");
      console.log(`   • ${activeZeroBalance.length} active providers have zero VCU balance`);
      console.log("   • These providers cannot serve requests effectively");
      console.log("   • They should be marked as inactive or have their balances refreshed\n");
      
      console.log("🔧 RECOMMENDED ACTIONS:");
      console.log("   1. Run VCU balance refresh for all providers:");
      console.log("      npx convex dev --run providers:refreshAllVCUBalances");
      console.log("   2. If balances are actually zero, mark providers as inactive");
      console.log("   3. Check provider health checks are running properly");
      console.log("   4. Consider implementing automatic deactivation for zero-balance providers\n");
    } else {
      console.log("✅ NO CRITICAL ISSUES:");
      console.log("   • All active providers have non-zero VCU balances");
      console.log("   • Providers with zero balances are correctly marked as inactive\n");
    }

    console.log("📈 SYSTEM HEALTH:");
    console.log(`   • Total Available VCU: $${activeVCU.toFixed(2)}`);
    console.log(`   • Active Providers: ${activeProviders.length}/${allProviders.length}`);
    console.log(`   • Effective Providers (active + balance > 0): ${activeProviders.filter(p => (p.vcuBalance || 0) > 0).length}`);
    
    if (activeVCU < 10) {
      console.log("   ⚠️  WARNING: Low total VCU balance - consider adding more providers or topping up existing ones");
    } else {
      console.log("   ✅ VCU balance appears healthy");
    }

  } catch (error) {
    console.error("❌ Investigation failed:", error.message);
    console.error("\n🔧 Troubleshooting:");
    console.error("   1. Ensure Convex is running: npx convex dev");
    console.error("   2. Check environment variables in .env.local");
    console.error("   3. Verify network connection");
    console.error("   4. Try running: npx convex dev --run providers:list");
  }
}

// Run the investigation
investigateVCUBalances();