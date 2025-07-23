#!/usr/bin/env node

/**
 * Debug script to check provider data in the database
 * Run with: node debug-providers-data.js
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function debugProviderData() {
  console.log('🔍 Debugging provider data in database...\n');
  
  try {
    // Check providers list
    console.log('📋 Checking providers list...');
    const { stdout: providersOutput } = await execPromise('npx convex run providers:list');
    const providers = JSON.parse(providersOutput);
    
    console.log(`Total providers found: ${providers.length}`);
    console.log(`Active providers: ${providers.filter(p => p.isActive).length}`);
    console.log(`Inactive providers: ${providers.filter(p => !p.isActive).length}`);
    
    if (providers.length > 0) {
      console.log('\n📊 Provider details:');
      providers.forEach((provider, index) => {
        console.log(`${index + 1}. ${provider.name || 'Unnamed'}`);
        console.log(`   - Address: ${provider.address}`);
        console.log(`   - Active: ${provider.isActive}`);
        console.log(`   - VCU Balance: ${provider.vcuBalance || 0}`);
        console.log(`   - Total Prompts: ${provider.totalPrompts || 0}`);
        console.log(`   - Status: ${provider.status || 'unknown'}`);
        console.log('');
      });
    }
    
    // Check network stats cache
    console.log('🗄️ Checking network stats cache...');
    try {
      const { stdout: statsOutput } = await execPromise('npx convex run stats:getNetworkStats');
      const stats = JSON.parse(statsOutput);
      
      console.log('Network stats from cache:');
      console.log(`- Total Providers: ${stats.totalProviders}`);
      console.log(`- Active Providers: ${stats.activeProviders}`);
      console.log(`- Cache Age: ${stats.cacheAge ? `${Math.round(stats.cacheAge / 1000)}s` : 'N/A'}`);
      
    } catch (error) {
      console.error('❌ Failed to get network stats:', error.message);
    }
    
    // Try to manually refresh the stats cache
    console.log('\n🔄 Attempting to refresh network stats cache...');
    try {
      const { stdout: refreshOutput } = await execPromise('npx convex run stats:updateNetworkStatsCache');
      const refreshResult = JSON.parse(refreshOutput);
      
      if (refreshResult.success) {
        console.log('✅ Network stats cache refreshed successfully');
        console.log('Updated stats:', refreshResult.stats);
      } else {
        console.log('❌ Cache refresh failed:', refreshResult.error);
      }
    } catch (error) {
      console.error('❌ Failed to refresh cache:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
    
    // Check if convex is properly configured
    console.log('\n🔧 Checking Convex configuration...');
    try {
      const { stdout } = await execPromise('npx convex dev --once --run providers:list 2>&1');
      console.log('Convex output:', stdout);
    } catch (convexError) {
      console.error('Convex configuration issue:', convexError.message);
    }
  }
}

debugProviderData();