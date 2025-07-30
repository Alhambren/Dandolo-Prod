#!/usr/bin/env node

// Test Venice.ai connection directly
const { ConvexHttpClient } = require("convex/browser");

async function testVeniceConnection() {
  console.log("🔌 Testing Venice.ai Connection...\n");
  
  try {
    const client = new ConvexHttpClient("https://good-monitor-677.convex.cloud");
    
    console.log("1. Testing direct Venice.ai chat completion...");
    const chatTest = await client.action("debug:testChatCompletion", {});
    
    console.log("Chat completion test result:");
    console.log("Status:", chatTest.status);
    console.log("OK:", chatTest.ok);
    
    if (chatTest.ok) {
      console.log("✅ Venice.ai API connection successful");
      console.log("Response preview:", JSON.stringify(chatTest.data, null, 2));
    } else {
      console.log("❌ Venice.ai API connection failed");
      console.log("Error response:", chatTest.data);
      
      if (chatTest.status === 401) {
        console.log("\n🔑 API KEY ISSUE: The Venice.ai API key is invalid or expired");
        console.log("Solution: Update the provider's API key with a valid Venice.ai key");
      } else if (chatTest.status === 429) {
        console.log("\n🚫 RATE LIMIT: Venice.ai is rate limiting requests");
        console.log("Solution: Wait a moment and try again, or check account balance");
      } else if (chatTest.status === 402) {
        console.log("\n💳 PAYMENT REQUIRED: Venice.ai account has insufficient balance");
        console.log("Solution: Add funds to your Venice.ai account");
      }
    }
    
    console.log("\n2. Testing API key balance validation...");
    const balanceTest = await client.action("debug:checkUSDBalance", {});
    
    console.log("Balance test results:");
    balanceTest.forEach((result, i) => {
      console.log(`Provider ${i + 1}: ${result.providerName}`);
      if (result.error) {
        console.log(`  ❌ Error: ${result.error}`);
      } else {
        console.log(`  💰 Current USD: $${result.currentUSD}`);
        console.log(`  📊 Stored USD: $${result.storedUSD}`);
        console.log(`  ✅ Status: ${result.note}`);
      }
    });
    
  } catch (error) {
    console.error("💥 VENICE CONNECTION TEST FAILED:");
    console.error("Error:", error.message);
  }
}

testVeniceConnection().catch(console.error);