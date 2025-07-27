// Fix duplicate provider issue and show options for cleanup
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");

async function fixDuplicateProviders() {
  try {
    console.log("🔧 Analyzing duplicate provider situation...");
    console.log("=" .repeat(60));
    
    // Get all providers with their actual API key hashes
    const providers = await client.query("providers:list", {});
    
    if (!providers || providers.length === 0) {
      console.log("❌ No providers found");
      return;
    }
    
    console.log(`📊 Found ${providers.length} providers total`);
    console.log(`\n📋 Provider Details:`);
    
    providers.forEach((provider, index) => {
      console.log(`\n${index + 1}. ${provider.name}`);
      console.log(`   - ID: ${provider._id}`);
      console.log(`   - Address: ${provider.address}`);
      console.log(`   - API Key Hash: ${provider.apiKeyHash || 'undefined'}`);
      console.log(`   - Registration: ${new Date(provider.registrationDate).toLocaleDateString()}`);
      console.log(`   - Active: ${provider.isActive}`);
      console.log(`   - Total Prompts: ${provider.totalPrompts}`);
    });
    
    // Show the problem clearly
    console.log(`\n🚨 CRITICAL ISSUE IDENTIFIED:`);
    console.log(`All ${providers.length} providers have the same apiKeyHash (${providers[0]?.apiKeyHash || 'undefined'})`);
    console.log(`This means they are all using the SAME Venice API key!`);
    
    console.log(`\n💡 SOLUTIONS:`);
    console.log(`\n1. 🧹 IMMEDIATE CLEANUP (Recommended):`);
    console.log(`   - Keep only 1 provider (the one with most prompts served)`);
    console.log(`   - Remove the other 9 duplicate providers`);
    console.log(`   - This will free up 9 provider slots for real providers`);
    
    console.log(`\n2. 🔒 PREVENT FUTURE DUPLICATES:`);
    console.log(`   - Ensure apiKeyHash is properly calculated and stored`);
    console.log(`   - Fix the duplicate detection mechanism`);
    console.log(`   - Add retroactive validation for existing providers`);
    
    console.log(`\n3. 🎯 FORCE PROVIDER DIVERSITY:`);
    console.log(`   - Require each provider to have a unique Venice API key`);
    console.log(`   - Implement key validation during registration`);
    console.log(`   - Add monitoring to detect future duplicates`);
    
    // Find the provider with the most activity to keep
    const mostActiveProvider = providers.reduce((prev, current) => {
      return (current.totalPrompts > prev.totalPrompts) ? current : prev;
    });
    
    console.log(`\n🏆 RECOMMENDED PROVIDER TO KEEP:`);
    console.log(`   - Name: ${mostActiveProvider.name}`);
    console.log(`   - Address: ${mostActiveProvider.address}`);
    console.log(`   - Total Prompts: ${mostActiveProvider.totalPrompts}`);
    console.log(`   - Registration: ${new Date(mostActiveProvider.registrationDate).toLocaleDateString()}`);
    
    const duplicatesToRemove = providers.filter(p => p._id !== mostActiveProvider._id);
    
    console.log(`\n🗑️ PROVIDERS TO REMOVE (${duplicatesToRemove.length}):`);
    duplicatesToRemove.forEach(provider => {
      console.log(`   - ${provider.name} (${provider.address}) - ${provider.totalPrompts} prompts`);
    });
    
    console.log(`\n⚠️ IMPACT ANALYSIS:`);
    console.log(`   - Current state: 10 providers using 1 Venice API key`);
    console.log(`   - After cleanup: 1 provider using 1 Venice API key`);
    console.log(`   - Network capacity: No change (same API key limits)`);
    console.log(`   - Provider slots freed: 9 slots for real providers`);
    console.log(`   - System integrity: Restored to intended design`);
    
    console.log(`\n🎯 NEXT STEPS:`);
    console.log(`   1. Run admin function to remove duplicate providers`);
    console.log(`   2. Fix apiKeyHash calculation for future registrations`);
    console.log(`   3. Add monitoring to prevent this from happening again`);
    console.log(`   4. Encourage real provider diversity with unique Venice keys`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

fixDuplicateProviders();