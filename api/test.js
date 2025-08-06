// Simple test endpoint
import { ConvexHttpClient } from "convex/browser";

export default async (req, res) => {
  try {
    const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");
    
    // Test key validation
    const testKey = "dk_38f1597e8d2a08f20d68bd6943c35b98bbb2cf4c1c88f94a";
    const validation = await client.query("apiKeys:validateKey", { key: testKey });
    
    return res.status(200).json({
      success: true,
      validation: validation,
      timestamp: Date.now()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
};