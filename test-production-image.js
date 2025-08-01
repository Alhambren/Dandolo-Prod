#!/usr/bin/env node

/**
 * Test image generation on production website
 * This script makes a direct API call to the production endpoint
 */

const API_URL = "https://dandolo-prod.vercel.app/chat";

async function testProductionImageGeneration() {
  console.log("🎨 TESTING PRODUCTION IMAGE GENERATION");
  console.log("=====================================\n");

  const testPrompt = "beautiful sunset over the ocean";
  
  console.log(`Testing prompt: "${testPrompt}"`);
  console.log("Making request to production API...\n");

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testPrompt,
        intentType: "image"
      })
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    
    console.log("📊 RESPONSE ANALYSIS");
    console.log("-------------------");
    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Model used: ${data.model || 'Not specified'}`);
    console.log(`✅ Provider: ${data.provider || 'Not specified'}`);
    console.log(`✅ Tokens: ${data.totalTokens || 'Not specified'}`);
    console.log(`✅ Response time: ${data.responseTime || 'Not specified'}ms`);
    
    // Check if response contains image data
    if (data.response && data.response.includes('data:image')) {
      console.log("✅ BASE64 IMAGE DATA DETECTED");
      const base64Match = data.response.match(/data:image\/[^;]+;base64,([^)]+)/);
      if (base64Match) {
        console.log(`✅ Base64 length: ${base64Match[1].length} characters`);
      }
    } else if (data.response && data.response.includes('![Generated Image]')) {
      console.log("✅ MARKDOWN IMAGE FORMAT DETECTED");
    } else {
      console.log("❌ NO IMAGE DATA FOUND IN RESPONSE");
      console.log("Raw response preview:");
      console.log(data.response?.substring(0, 200) + "...");
    }

    // Check for debug information
    if (data.response && data.response.includes('Debug:')) {
      console.log("✅ DEBUG INFORMATION PRESENT");
      const debugMatch = data.response.match(/Debug: (.+)/);
      if (debugMatch) {
        console.log(`   ${debugMatch[1]}`);
      }
    }

    // Check for error indicators
    if (data.response && (
      data.response.includes('Sorry, no AI providers') ||
      data.response.includes('No suitable model') ||
      data.response.includes('Error:') ||
      data.model === 'error'
    )) {
      console.log("❌ ERROR DETECTED IN RESPONSE");
      console.log("Error details:", data.response);
    }

    console.log("\n🔍 FULL RESPONSE DETAILS");
    console.log("------------------------");
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error("❌ Request failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Test with different prompts
async function testMultiplePrompts() {
  const prompts = [
    "beautiful sunset over the ocean",
    "create an image of a cat",
    "generate a mountain landscape",
    "draw a DJ mixing music" // This was the problematic case mentioned
  ];

  for (const prompt of prompts) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`TESTING: "${prompt}"`);
    console.log(`${'='.repeat(50)}`);
    
    await testProductionImageGeneration(prompt);
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Helper function for single prompt test
async function testProductionImageGeneration(customPrompt) {
  const testPrompt = customPrompt || "beautiful sunset over the ocean";
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testPrompt,
        intentType: "image"
      })
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    
    console.log(`Model: ${data.model || 'Not specified'}`);
    console.log(`Provider: ${data.provider || 'Not specified'}`);
    
    // Check if response contains expected content
    if (data.response && data.response.includes('data:image')) {
      console.log("✅ Image generated successfully");
    } else if (data.response && data.response.includes('![Generated Image]')) {
      console.log("✅ Image markdown detected");
    } else {
      console.log("❌ No image data found");
      console.log("Response preview:", data.response?.substring(0, 100));
    }

  } catch (error) {
    console.error("❌ Request failed:", error.message);
  }
}

// Run the test
if (process.argv.includes('--multiple')) {
  testMultiplePrompts().catch(console.error);
} else {
  testProductionImageGeneration().catch(console.error);
}