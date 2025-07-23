#!/usr/bin/env node

const { ConvexHttpClient } = require("convex/browser");
const { api } = require("./convex/_generated/api");

const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");

async function testAdultContentGeneration() {
  console.log("🔍 Testing Adult Content Image Generation...\n");
  
  try {
    // 1. Check available image models
    console.log("1. Checking available image models...");
    const models = await client.query(api.models.getAvailableModels, {});
    const imageModels = models.filter(m => m.type === "image");
    
    console.log(`Found ${imageModels.length} image models:`);
    imageModels.forEach(model => {
      const isUncensored = model.id.includes('uncensored') || 
                          model.id.includes('pony') || 
                          model.id.includes('lustify') || 
                          model.id.includes('hidream');
      console.log(`  - ${model.id} ${isUncensored ? '(UNCENSORED)' : '(SAFE)'}`);
    });
    
    // 2. Test adult content routing
    console.log("\n2. Testing adult content routing...");
    
    const testPrompt = "artistic nude figure study";
    
    // Test with allowAdultContent = true
    try {
      const adultResult = await client.action(api.inference.route, {
        messages: [{ role: "user", content: testPrompt }],
        intent: "image",
        sessionId: "test-adult-content",
        isAnonymous: true,
        allowAdultContent: true
      });
      
      console.log("✅ Adult content generation succeeded");
      console.log(`Model used: ${adultResult.model}`);
      console.log(`Provider: ${adultResult.provider}`);
      console.log(`Response length: ${adultResult.response.length} chars`);
      console.log(`Cost: ${adultResult.cost} VCU`);
      
      // Check if result contains image URL
      if (adultResult.response.includes('http')) {
        console.log("✅ Image URL generated successfully");
      } else {
        console.log("❌ No image URL in response");
        console.log("Response content:", adultResult.response.substring(0, 200));
      }
      
    } catch (error) {
      console.log("❌ Adult content generation failed:");
      console.log(`Error: ${error.message}`);
      
      // Check if it's a "no providers" error
      if (error.message.includes('no AI providers')) {
        console.log("\n🔍 Investigating provider filtering for adult content...");
        
        // Test provider filtering
        const providerDebug = await client.action(api.debug.debugProviderFiltering, {
          adminAddress: "0xC07481520d98c32987cA83B30EAABdA673cDbe8c"
        });
        
        console.log(`Total providers: ${providerDebug.totalProviders}`);
        console.log(`Valid providers: ${providerDebug.validProviders}`);
        console.log(`Issue: ${providerDebug.issue}`);
      }
    }
    
    // 3. Compare with safe content
    console.log("\n3. Testing safe content for comparison...");
    
    try {
      const safeResult = await client.action(api.inference.route, {
        messages: [{ role: "user", content: "a beautiful landscape" }],
        intent: "image", 
        sessionId: "test-safe-content",
        isAnonymous: true,
        allowAdultContent: false
      });
      
      console.log("✅ Safe content generation succeeded");
      console.log(`Model used: ${safeResult.model}`);
      console.log(`Provider: ${safeResult.provider}`);
      
    } catch (error) {
      console.log("❌ Safe content also failed:");
      console.log(`Error: ${error.message}`);
    }
    
    // 4. Check specific uncensored models
    console.log("\n4. Checking uncensored model availability...");
    
    const uncensoredModels = [
      "pony-realism",
      "lustify-sdxl", 
      "flux-dev-uncensored",
      "hidream"
    ];
    
    uncensoredModels.forEach(modelId => {
      const available = imageModels.find(m => m.id === modelId);
      console.log(`  ${modelId}: ${available ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
    });
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

console.log("🔞 ADULT CONTENT GENERATION TEST");
console.log("================================\n");
testAdultContentGeneration();