const { ConvexHttpClient } = require("convex/browser");

async function testHttpRoutes() {
  console.log("Testing HTTP routes directly...");
  
  try {
    // Test health endpoint
    const response = await fetch("https://judicious-hornet-148.convex.cloud/health");
    console.log("Health endpoint status:", response.status);
    const text = await response.text();
    console.log("Health response:", text);
  } catch (error) {
    console.error("Error testing health endpoint:", error);
  }
  
  try {
    // Test v1/models endpoint
    const response = await fetch("https://judicious-hornet-148.convex.cloud/v1/models", {
      headers: {
        "Authorization": "Bearer test-key"
      }
    });
    console.log("Models endpoint status:", response.status);
    const text = await response.text();
    console.log("Models response:", text);
  } catch (error) {
    console.error("Error testing models endpoint:", error);
  }
}

testHttpRoutes();