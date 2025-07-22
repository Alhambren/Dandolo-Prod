#!/usr/bin/env node

const { ConvexHttpClient } = require("convex/browser");
const { api } = require("./convex/_generated/api");

const client = new ConvexHttpClient("https://good-monitor-677.convex.cloud");

async function testApiKey() {
  try {
    console.log("Creating test API key...");
    
    // Generate a test API key
    const result = await client.action(api.apiKeys.createApiKey, {
      address: "0xC07481520d98c32987cA83B30EAABdA673cDbe8c",
      name: "Test Key",
      keyType: "developer"
    });
    
    console.log("Generated API key:", result.key);
    console.log("Key ID:", result.keyId);
    
    // Validate the key
    const validation = await client.query(api.apiKeys.validateKey, {
      key: result.key
    });
    
    console.log("Key validation result:", validation);
    
    // Test the API endpoint with curl
    const testUrl = "https://good-monitor-677.convex.cloud/v1/chat/completions";
    console.log("\nTo test this key, run:");
    console.log(`curl -X POST ${testUrl} \\
  -H "Authorization: Bearer ${result.key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "Hello, test message"}],
    "model": "auto-select",
    "temperature": 0.7,
    "max_tokens": 100
  }'`);
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testApiKey();