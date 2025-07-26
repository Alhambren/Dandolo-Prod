#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function debugProviders() {
  console.log('🔍 Debugging providers and Venice API keys...\n');
  
  try {
    const { stdout } = await execAsync('npx convex run providers:list --prod');
    const providers = JSON.parse(stdout);
    
    console.log(`Total providers: ${providers.length}`);
    console.log(`Active providers: ${providers.filter(p => p.isActive).length}`);
    
    const activeProviders = providers.filter(p => p.isActive);
    console.log('\nActive providers:');
    activeProviders.forEach(p => {
      console.log(`- ${p.name} (${p.address})`);
      console.log(`  Venice API Key: ${p.veniceApiKey ? 'EXISTS' : 'MISSING'}`);
      console.log(`  Is Active: ${p.isActive}`);
      console.log('');
    });
    
    const providersWithVenice = activeProviders.filter(p => p.veniceApiKey);
    console.log(`Providers with Venice API keys: ${providersWithVenice.length}`);
    
  } catch (error) {
    console.error('Error debugging providers:', error.message);
  }
}

debugProviders();