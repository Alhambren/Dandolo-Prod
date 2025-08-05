// Comprehensive Convex connection and API key validation test
import { ConvexHttpClient } from "convex/browser";

export default async function handler(req, res) {
  const testKey = "dk_d6037e5451aa52886d6ab32a6e0d123140604fbccab86d80";
  const convexUrl = process.env.VITE_CONVEX_URL || "https://judicious-hornet-148.convex.cloud";
  
  try {
    console.log("Testing Convex connection to:", convexUrl);
    const client = new ConvexHttpClient(convexUrl);
    
    // Test 1: Basic connection
    let basicConnection = true;
    let connectionError = null;
    try {
      // Try a simple query first
      await client.query("apiKeys:validateKey", { key: "test" });
    } catch (error) {
      basicConnection = false;
      connectionError = error.message;
    }
    
    // Test 2: API key validation
    let apiKeyValidation = null;
    let validationError = null;
    try {
      apiKeyValidation = await client.query("apiKeys:validateKey", { key: testKey });
    } catch (error) {
      validationError = error.message;
    }
    
    // Test 3: Try to list some data to verify deployment
    let dataTest = null;
    let dataError = null;
    try {
      // Try to get providers count as a connectivity test
      const providers = await client.query("providers:list", {});
      dataTest = { providersCount: providers?.length || 0 };
    } catch (error) {
      dataError = error.message;
    }
    
    // Test 4: Environment variables
    const envVars = {
      VITE_CONVEX_URL: process.env.VITE_CONVEX_URL,
      NODE_ENV: process.env.NODE_ENV,
      hasConvexDeployKey: !!process.env.CONVEX_DEPLOY_KEY
    };
    
    return res.status(200).json({
      success: true,
      timestamp: Date.now(),
      convexUrl: convexUrl,
      tests: {
        basicConnection: {
          success: basicConnection,
          error: connectionError
        },
        apiKeyValidation: {
          result: apiKeyValidation,
          error: validationError,
          testKey: testKey.substring(0, 10) + "..."
        },
        dataConnectivity: {
          result: dataTest,
          error: dataError
        }
      },
      environment: envVars
    });
    
  } catch (error) {
    console.error("Test endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      convexUrl: convexUrl,
      timestamp: Date.now()
    });
  }
}