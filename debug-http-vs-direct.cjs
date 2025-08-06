// Test script to compare ConvexHttpClient vs direct function calls
const { ConvexHttpClient } = require("convex/browser");

async function testKeyValidation() {
  const testKey = "dk_d6037e5451aa52886d6ab32a6e0d123140604fbccab86d80";
  const convexUrl = "https://judicious-hornet-148.convex.cloud";
  
  console.log("Testing API key validation via ConvexHttpClient...");
  console.log("Key:", testKey);
  console.log("URL:", convexUrl);
  
  try {
    const client = new ConvexHttpClient(convexUrl);
    
    // Test via HTTP client (same as Vercel API)
    console.log("\n=== ConvexHttpClient Test ===");
    const httpResult = await client.query("apiKeys:validateKey", { key: testKey });
    console.log("HTTP Result:", httpResult);
    
    // Also test a simple data query
    console.log("\n=== Basic Data Query Test ===");
    const providers = await client.query("providers:list", {});
    console.log("Providers count:", providers?.length || 0);
    
    // Test if we can access the apiKeys table directly
    console.log("\n=== Direct Table Access Test ===");
    try {
      // This might not work due to permissions, but let's try
      const keys = await client.query("debug:listAllApiKeys", {});
      console.log("Keys found:", keys?.length || 0);
    } catch (error) {
      console.log("Direct access failed:", error.message);
    }
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testKeyValidation();