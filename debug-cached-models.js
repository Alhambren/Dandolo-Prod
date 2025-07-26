// Debug what the cached models look like
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");

async function debugCachedModels() {
  try {
    console.log("🔍 Debugging cached models structure");
    console.log("=".repeat(50));
    
    const allModels = await client.query("models:getAvailableModels", {});
    
    console.log(`\n📊 Found ${allModels.length} models in cache`);
    
    // Show structure of first few models
    console.log("\n📋 Sample model structures:");
    allModels.slice(0, 5).forEach((model, i) => {
      console.log(`${i + 1}. ${model.id}:`);
      console.log(`   Fields: ${Object.keys(model).join(', ')}`);
      console.log(`   Type: ${model.type || 'undefined'}`);
      console.log(`   Name: ${model.name || 'undefined'}`);
    });
    
    // Check specific problematic models
    console.log("\n🔍 Checking problematic models:");
    const embedding = allModels.find(m => m.id.includes('embedding'));
    const upscaler = allModels.find(m => m.id.includes('upscal'));
    
    if (embedding) {
      console.log(`\nEmbedding model structure:`);
      console.log(`  ID: ${embedding.id}`);
      console.log(`  Fields: ${Object.keys(embedding).join(', ')}`);
      console.log(`  Type: ${embedding.type || 'undefined'}`);
      console.log(`  Full object:`, JSON.stringify(embedding, null, 2));
    }
    
    if (upscaler) {
      console.log(`\nUpscaler model structure:`);
      console.log(`  ID: ${upscaler.id}`);
      console.log(`  Fields: ${Object.keys(upscaler).join(', ')}`);
      console.log(`  Type: ${upscaler.type || 'undefined'}`);
      console.log(`  Full object:`, JSON.stringify(upscaler, null, 2));
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

debugCachedModels();