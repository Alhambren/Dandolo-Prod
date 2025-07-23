#!/usr/bin/env node

/**
 * VCU Balance Check Script
 * 
 * Investigates VCU balances of all providers to identify which ones have zero balances
 * Run with: node vcu-balance-check.js
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function checkVCUBalances() {
  console.log('🔍 DANDOLO VCU BALANCE INVESTIGATION');
  console.log('===================================\n');
  
  try {
    // Get all providers
    console.log('📋 Fetching all providers...');
    const { stdout: providersOutput } = await execPromise('npx convex run providers:list');
    const providers = JSON.parse(providersOutput);
    
    console.log(`Total providers found: ${providers.length}`);
    
    if (providers.length === 0) {
      console.log('❌ No providers found in database');
      return;
    }
    
    // Analyze providers
    const activeProviders = providers.filter(p => p.isActive);
    const inactiveProviders = providers.filter(p => !p.isActive);
    const zeroBalanceProviders = providers.filter(p => (p.vcuBalance || 0) === 0);
    const activeZeroBalance = providers.filter(p => p.isActive && (p.vcuBalance || 0) === 0);
    
    console.log(`Active providers: ${activeProviders.length}`);
    console.log(`Inactive providers: ${inactiveProviders.length}`);
    console.log(`Providers with zero balance: ${zeroBalanceProviders.length}`);
    console.log(`CRITICAL - Active providers with zero balance: ${activeZeroBalance.length}\n`);
    
    // Calculate totals
    const totalVCU = providers.reduce((sum, p) => sum + (p.vcuBalance || 0), 0);
    const activeVCU = activeProviders.reduce((sum, p) => sum + (p.vcuBalance || 0), 0);
    
    console.log('💰 VCU BALANCE SUMMARY');
    console.log('----------------------');
    console.log(`Total VCU across all providers: $${totalVCU.toFixed(2)}`);
    console.log(`Total VCU from active providers: $${activeVCU.toFixed(2)}`);
    console.log(`Average VCU per provider: $${(totalVCU / providers.length).toFixed(2)}\n`);
    
    // Detailed provider list
    console.log('🏪 DETAILED PROVIDER BREAKDOWN');
    console.log('------------------------------');
    
    // Sort by balance (highest first)
    const sortedProviders = [...providers].sort((a, b) => (b.vcuBalance || 0) - (a.vcuBalance || 0));
    
    sortedProviders.forEach((provider, index) => {
      const balance = provider.vcuBalance || 0;
      const status = provider.isActive ? '✅ ACTIVE' : '❌ INACTIVE';
      const balanceIcon = balance === 0 ? '🔴' : balance < 1 ? '🟡' : '🟢';
      
      console.log(`${index + 1}. ${balanceIcon} "${provider.name || 'Unnamed'}"`);
      console.log(`   Status: ${status}`);
      console.log(`   VCU Balance: $${balance.toFixed(2)}`);
      console.log(`   Address: ${provider.address}`);
      console.log(`   Total Prompts: ${provider.totalPrompts || 0}`);
      console.log(`   Registration: ${new Date(provider.registrationDate || provider._creationTime).toLocaleDateString()}`);
      console.log('');
    });
    
    // Zero balance analysis
    if (zeroBalanceProviders.length > 0) {
      console.log('🔴 ZERO BALANCE PROVIDERS');
      console.log('------------------------');
      
      zeroBalanceProviders.forEach((provider, index) => {
        const daysSinceReg = Math.floor((Date.now() - (provider.registrationDate || provider._creationTime)) / (1000 * 60 * 60 * 24));
        console.log(`${index + 1}. "${provider.name || 'Unnamed'}"`);
        console.log(`   Status: ${provider.isActive ? 'ACTIVE (🚨 PROBLEM)' : 'INACTIVE (✅ CORRECT)'}`);
        console.log(`   Prompts Served: ${provider.totalPrompts || 0}`);
        console.log(`   Days Since Registration: ${daysSinceReg}`);
        console.log('');
      });
    }
    
    // Critical issues
    if (activeZeroBalance.length > 0) {
      console.log('🚨 CRITICAL ISSUES');
      console.log('==================');
      console.log(`Found ${activeZeroBalance.length} ACTIVE providers with ZERO VCU balance!`);
      console.log('These providers cannot serve requests and should be deactivated:\n');
      
      activeZeroBalance.forEach((provider, index) => {
        console.log(`${index + 1}. "${provider.name || 'Unnamed'}"`);
        console.log(`   Address: ${provider.address}`);
        console.log(`   Last Health Check: ${provider.lastHealthCheck ? new Date(provider.lastHealthCheck).toLocaleString() : 'Never'}`);
        console.log('');
      });
      
      console.log('🔧 RECOMMENDED ACTIONS:');
      console.log('1. Refresh VCU balances: npx convex dev --run providers:refreshAllVCUBalances');
      console.log('2. If balances are truly zero, deactivate these providers');
      console.log('3. Check health monitoring system\n');
    } else {
      console.log('✅ NO CRITICAL ISSUES');
      console.log('====================');
      console.log('All active providers have non-zero VCU balances\n');
    }
    
    // Summary
    console.log('📊 FINAL SUMMARY');
    console.log('================');
    console.log(`Total Providers: ${providers.length}`);
    console.log(`Active Providers: ${activeProviders.length}`);
    console.log(`Effective Providers (active + balance > 0): ${activeProviders.filter(p => (p.vcuBalance || 0) > 0).length}`);
    console.log(`Total Available VCU: $${activeVCU.toFixed(2)}`);
    
    if (activeVCU < 5) {
      console.log('⚠️  WARNING: Very low total VCU balance!');
    } else if (activeVCU < 20) {
      console.log('⚠️  CAUTION: Low total VCU balance');
    } else {
      console.log('✅ VCU balance appears healthy');
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Ensure Convex is running: npx convex dev');
    console.error('2. Check .env.local configuration');
    console.error('3. Try: npx convex dev --run providers:list');
  }
}

checkVCUBalances();