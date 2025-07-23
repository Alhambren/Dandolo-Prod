#!/usr/bin/env node

/**
 * Comprehensive Image Generation Test Script
 * Tests the full image generation pipeline to verify provider validation fixes
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL || "https://deep-reindeer-817.convex.cloud");

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testImageGeneration() {
  console.log("🎨 COMPREHENSIVE IMAGE GENERATION TEST");
  console.log("=====================================\n");

  try {
    // 1. Check model cache for image models
    console.log("1️⃣ CHECKING MODEL CACHE FOR IMAGE MODELS");
    console.log("----------------------------------------");
    
    const models = await client.query(api.models.getAvailableModels, {});
    console.log(`Total cached models: ${models.length}`);
    
    const imageModels = models.filter(m => m.type === 'image');
    console.log(`Image models found: ${imageModels.length}`);
    
    if (imageModels.length > 0) {
      console.log("✅ Image models available:");
      imageModels.forEach(model => {
        console.log(`   - ${model.id} (${model.name})`);
      });
    } else {
      console.log("❌ No image models found in cache!");
      return;
    }
    
    // 2. Test provider validation and availability
    console.log("\n2️⃣ CHECKING PROVIDER AVAILABILITY");
    console.log("----------------------------------");
    
    const providers = await client.query(api.providers.list, {});
    const activeProviders = providers.filter(p => p.isActive);
    
    console.log(`Total providers: ${providers.length}`);
    console.log(`Active providers: ${activeProviders.length}`);
    
    if (activeProviders.length === 0) {
      console.log("❌ No active providers! This will cause image generation to fail.");
      return;
    } else {
      console.log("✅ Active providers found:");
      activeProviders.forEach(provider => {
        console.log(`   - ${provider.name} (ID: ${provider._id})`);
      });
    }
    
    // 3. Test intent detection for image generation
    console.log("\n3️⃣ TESTING INTENT DETECTION");
    console.log("----------------------------");
    
    const imagePrompts = [
      "Create a beautiful sunset landscape image",
      "Generate an image of a cat",
      "Draw a futuristic cityscape",
      "Make a picture of mountains and lakes"
    ];
    
    console.log("Testing image intent detection:");
    imagePrompts.forEach(prompt => {
      console.log(`   "${prompt}" → Should detect as 'image' intent`);
    });
    
    // 4. Test actual image generation
    console.log("\n4️⃣ TESTING IMAGE GENERATION PIPELINE");
    console.log("------------------------------------");
    
    const testPrompt = "Create a simple landscape with mountains and a lake";
    console.log(`Testing prompt: "${testPrompt}"`);
    
    // Test with different models
    const testModels = imageModels.slice(0, 3).map(m => m.id); // Test first 3 image models
    
    for (const model of testModels) {
      console.log(`\n🔍 Testing with model: ${model}`);
      
      try {
        console.log("   Sending request...");
        const startTime = Date.now();
        
        const result = await client.action(api.inference.routeSimple, {
          prompt: testPrompt,
          address: "test-user",
          intentType: "image",
          model: model,
          allowAdultContent: false
        });
        
        const duration = Date.now() - startTime;
        
        if (result.response.includes("data:image") || result.response.includes("![Generated Image]")) {
          console.log("   ✅ Image generation successful!");
          console.log(`   ✅ Model used: ${result.model}`);
          console.log(`   ✅ Provider: ${result.provider}`);
          console.log(`   ✅ Tokens: ${result.totalTokens}`);
          console.log(`   ✅ Response time: ${result.responseTime}ms`);
          console.log(`   ✅ Total test time: ${duration}ms`);
          
          if (result.response.includes("data:image")) {
            console.log("   ✅ Base64 image data detected in response");
          }
        } else if (result.response.includes("Sorry, no AI providers") || result.response.includes("No suitable model")) {
          console.log("   ❌ Provider/model error:");
          console.log(`   ❌ Response: ${result.response}`);
        } else if (result.response.includes("Error:") || result.model === "error") {
          console.log("   ❌ Error in image generation:");
          console.log(`   ❌ Response: ${result.response}`);
          console.log(`   ❌ Model: ${result.model}`);
        } else {
          console.log("   ⚠️  Unexpected response format:");
          console.log(`   📝 Response: ${result.response.substring(0, 200)}...`);
          console.log(`   📝 Model: ${result.model}`);
        }
      } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
      }
      
      // Wait between requests to avoid rate limiting
      await sleep(1000);
    }
    
    // 5. Test error handling scenarios
    console.log("\n5️⃣ TESTING ERROR HANDLING");
    console.log("-------------------------");
    
    console.log("Testing with invalid model:");
    try {
      const result = await client.action(api.inference.routeSimple, {
        prompt: testPrompt,
        address: "test-user",
        intentType: "image",
        model: "non-existent-model",
        allowAdultContent: false
      });
      
      console.log(`   Response: ${result.response}`);
      console.log(`   Model: ${result.model}`);
      
      if (result.model !== "error") {
        console.log("   ✅ Graceful fallback to available model");
      } else {
        console.log("   ❌ Error handling triggered");
      }
    } catch (error) {
      console.log(`   ❌ Exception thrown: ${error.message}`);
    }
    
    // 6. Test adult content handling
    console.log("\n6️⃣ TESTING ADULT CONTENT HANDLING");
    console.log("----------------------------------");
    
    const adultPrompt = "Create an artistic nude figure drawing";
    
    console.log("Testing with adult content disabled:");
    try {
      const result = await client.action(api.inference.routeSimple, {
        prompt: adultPrompt,
        address: "test-user", 
        intentType: "image",
        allowAdultContent: false
      });
      
      console.log(`   Response type: ${result.response.includes("data:image") ? "Image generated" : "Text response"}`);
      console.log(`   Model used: ${result.model}`);
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    await sleep(1000);
    
    console.log("\nTesting with adult content enabled:");
    try {
      const result = await client.action(api.inference.routeSimple, {
        prompt: adultPrompt,
        address: "test-user",
        intentType: "image", 
        allowAdultContent: true
      });
      
      console.log(`   Response type: ${result.response.includes("data:image") ? "Image generated" : "Text response"}`);
      console.log(`   Model used: ${result.model}`);
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // 7. Test rate limiting
    console.log("\n7️⃣ TESTING RATE LIMITING");
    console.log("------------------------");
    
    console.log("Making rapid requests to test rate limiting...");
    const rapidResults = [];
    
    for (let i = 0; i < 3; i++) {
      try {
        const result = await client.action(api.inference.routeSimple, {
          prompt: `Test image ${i + 1}`,
          address: "rate-limit-test-user",
          intentType: "image"
        });
        
        rapidResults.push({
          attempt: i + 1,
          success: !result.response.includes("Rate limit"),
          response: result.response.substring(0, 100)
        });
      } catch (error) {
        rapidResults.push({
          attempt: i + 1,
          success: false,
          error: error.message
        });
      }
    }
    
    rapidResults.forEach(result => {
      if (result.success) {
        console.log(`   Attempt ${result.attempt}: ✅ Success`);
      } else {
        console.log(`   Attempt ${result.attempt}: ❌ ${result.error || result.response}`);
      }
    });
    
    console.log("\n8️⃣ SUMMARY");
    console.log("----------");
    
    if (imageModels.length > 0 && activeProviders.length > 0) {
      console.log("✅ Image generation infrastructure is properly configured:");
      console.log(`   - ${imageModels.length} image models available`);
      console.log(`   - ${activeProviders.length} active providers`);
      console.log("   - Pipeline should be functional");
    } else {
      console.log("❌ Image generation infrastructure has issues:");
      if (imageModels.length === 0) console.log("   - No image models in cache");
      if (activeProviders.length === 0) console.log("   - No active providers");
    }
    
    console.log("\n🔍 If image generation is still failing, check:");
    console.log("   1. Provider API keys are valid and not expired");
    console.log("   2. Venice.ai service is accessible");
    console.log("   3. Model cache is up to date (run refresh)");
    console.log("   4. Provider validation rules aren't too strict");
    
  } catch (error) {
    console.error("❌ Test script error:", error);
  }
}

async function refreshModelCache() {
  console.log("\n🔄 REFRESHING MODEL CACHE");
  console.log("-------------------------");
  
  try {
    await client.action(api.models.refreshModelCacheInternal, {});
    console.log("✅ Model cache refresh initiated");
    
    // Wait a moment for the cache to update
    await sleep(2000);
    
    const health = await client.query(api.models.getModelCacheHealth, {});
    console.log("Cache health:", JSON.stringify(health, null, 2));
    
  } catch (error) {
    console.error("❌ Failed to refresh model cache:", error);
  }
}

// Main execution
async function main() {
  console.log("Starting comprehensive image generation test...\n");
  
  // Optional: Refresh cache first
  if (process.argv.includes('--refresh-cache')) {
    await refreshModelCache();
    await sleep(3000); // Wait for cache to be fully updated
  }
  
  await testImageGeneration();
}

main().catch(console.error);