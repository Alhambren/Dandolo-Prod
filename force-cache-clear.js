// Force clear and rebuild model cache
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");

async function forceCacheClear() {
  try {
    console.log("🗑️ Clearing model cache...");
    
    // Clear the old cache
    const result = await client.action("models:cleanupOldModelCache", {});
    console.log("Cache cleanup result:", result);
    
    console.log("🔄 Forcing internal cache refresh...");
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if cache is gone
    const health = await client.query("models:getModelCacheHealth", {});
    console.log("Cache health after cleanup:", health);
    
    // Try to refresh
    await client.action("models:refreshModelCache", {});
    
    console.log("⏳ Waiting for refresh to complete...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const newHealth = await client.query("models:getModelCacheHealth", {});
    console.log("Cache health after refresh:", newHealth);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

forceCacheClear();