// Refresh the model cache to fix categorization
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");

async function refreshCache() {
  try {
    console.log("🔄 Refreshing model cache...");
    
    // Call the internal refresh action through the public interface
    const result = await client.action("models:refreshModelCache", {});
    
    console.log("✅ Model cache refresh initiated");
    
    // Wait a bit and check the results
    console.log("⏳ Waiting 3 seconds for cache to update...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const allModels = await client.query("models:getAvailableModels", {});
    console.log(`📊 Total models after refresh: ${allModels.length}`);
    
    const typeCount = {};
    allModels.forEach(model => {
      const type = model.type || 'undefined';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    console.log("\n🏷️ New model breakdown by type:");
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} models`);
    });
    
    // Check if problematic models are still there
    const embedding = allModels.find(m => m.id.includes('embedding'));
    const upscaler = allModels.find(m => m.id.includes('upscal'));
    
    if (embedding) {
      console.log(`⚠️ Embedding model still found: ${embedding.id} (type: ${embedding.type || 'undefined'})`);
    } else {
      console.log("✅ No embedding models found in cache");
    }
    
    if (upscaler) {
      console.log(`⚠️ Upscaler model still found: ${upscaler.id} (type: ${upscaler.type || 'undefined'})`);
    } else {
      console.log("✅ No upscaler models found in cache");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

refreshCache();