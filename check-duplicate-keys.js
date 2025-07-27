// Check for providers using duplicate Venice API keys
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");

async function checkDuplicateKeys() {
  try {
    console.log("🔍 Checking for duplicate Venice API keys...");
    console.log("=" .repeat(60));
    
    // Get all providers
    const providers = await client.query("providers:list", {});
    
    if (!providers || providers.length === 0) {
      console.log("❌ No providers found");
      return;
    }
    
    console.log(`📊 Found ${providers.length} providers total`);
    
    // Group providers by API key hash
    const keyHashGroups = {};
    
    providers.forEach(provider => {
      const hash = provider.apiKeyHash;
      if (!keyHashGroups[hash]) {
        keyHashGroups[hash] = [];
      }
      keyHashGroups[hash].push({
        name: provider.name,
        id: provider._id,
        address: provider.address,
        isActive: provider.isActive,
        registrationDate: new Date(provider.registrationDate).toLocaleDateString()
      });
    });
    
    // Find duplicates
    const duplicates = Object.entries(keyHashGroups).filter(([hash, providers]) => providers.length > 1);
    
    if (duplicates.length === 0) {
      console.log("✅ No duplicate Venice API keys found - all providers are unique");
      return;
    }
    
    console.log(`\n⚠️ Found ${duplicates.length} groups of providers using the same Venice API key:`);
    console.log("=" .repeat(60));
    
    duplicates.forEach(([hash, providerGroup], index) => {
      console.log(`\n🔑 Duplicate Group ${index + 1} (Hash: ${hash.substring(0, 16)}...):`);
      providerGroup.forEach(provider => {
        console.log(`  📍 ${provider.name}`);
        console.log(`     - ID: ${provider.id}`);
        console.log(`     - Address: ${provider.address}`);
        console.log(`     - Active: ${provider.isActive}`);
        console.log(`     - Registered: ${provider.registrationDate}`);
      });
      
      // Check if Jervis and Dandolo 5D are in this group
      const hasJervis = providerGroup.some(p => p.name.toLowerCase().includes('jervis'));
      const hasDandolo5D = providerGroup.some(p => p.name.toLowerCase().includes('dandolo 5d'));
      
      if (hasJervis && hasDandolo5D) {
        console.log(`     🎯 FOUND: Jervis and Dandolo 5D are using the same Venice API key!`);
      }
    });
    
    // Show statistics
    console.log("\n📈 Duplicate Statistics:");
    duplicates.forEach(([hash, providerGroup], index) => {
      console.log(`  Group ${index + 1}: ${providerGroup.length} providers sharing 1 Venice API key`);
    });
    
    const totalDuplicateProviders = duplicates.reduce((sum, [, group]) => sum + group.length, 0);
    const uniqueKeys = duplicates.length;
    const wastedSlots = totalDuplicateProviders - uniqueKeys;
    
    console.log(`\n💡 Summary:`);
    console.log(`  - ${totalDuplicateProviders} providers are using only ${uniqueKeys} unique Venice API keys`);
    console.log(`  - ${wastedSlots} provider slots could be freed up by removing duplicates`);
    console.log(`  - This reduces the effective compute pool and may cause artificial scarcity`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkDuplicateKeys();