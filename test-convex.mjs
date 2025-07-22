import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://good-monitor-677.convex.cloud");

console.log("Testing Convex connection...");

try {
  // Test creating test API key
  const result = await client.mutation("debug:createTestApiKey", {
    adminAddress: "0xC07481520d98c32987cA83B30EAABdA673cDbe8c"
  });
  
  console.log("Test API key creation result:", result);
  
  // List all API keys
  const keys = await client.query("debug:listAllApiKeys", {
    adminAddress: "0xC07481520d98c32987cA83B30EAABdA673cDbe8c"
  });
  
  console.log("All API keys:", keys);
  
} catch (error) {
  console.error("Error:", error);
}