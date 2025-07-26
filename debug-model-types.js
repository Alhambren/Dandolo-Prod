// Debug model types in the cache
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");

async function debugModelTypes() {
  try {
    console.log("🔍 Debugging Model Types in Cache");
    console.log("=".repeat(50));
    
    // Get all models from cache
    const allModels = await client.query("models:getAvailableModels", {});
    
    console.log(`\n📊 Total models in cache: ${allModels.length}`);
    console.log("\n🏷️ Model breakdown by type:");
    
    const typeCount = {};
    allModels.forEach(model => {
      const type = model.type || 'undefined';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} models`);
    });
    
    console.log("\n📋 Sample models by type:");
    
    Object.keys(typeCount).forEach(type => {
      const modelsOfType = allModels.filter(m => (m.type || 'undefined') === type);
      console.log(`\n${type.toUpperCase()} models (showing first 5):`);
      modelsOfType.slice(0, 5).forEach(model => {
        console.log(`  - ${model.id} (${model.name})`);
      });
    });
    
    console.log("\n🔍 Looking for specific problematic models:");
    const embedding = allModels.find(m => m.id.includes('embedding'));
    const upscaler = allModels.find(m => m.id.includes('upscal'));
    
    if (embedding) {
      console.log(`❌ Embedding model found: ${embedding.id} (type: ${embedding.type || 'undefined'})`);
    }
    if (upscaler) {
      console.log(`❌ Upscaler model found: ${upscaler.id} (type: ${upscaler.type || 'undefined'})`);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

debugModelTypes();