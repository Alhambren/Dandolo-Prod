// Vercel serverless function to proxy to Convex
import { ConvexHttpClient } from "convex/browser";

export default async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: {
          message: "Missing or invalid Authorization header",
          type: "authentication_error",
          code: "missing_auth_header"
        }
      });
    }

    const apiKey = authHeader.substring(7);
    
    // Connect to Convex
    const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL || "https://judicious-hornet-148.convex.cloud");
    
    // Validate API key
    const validation = await client.query("apiKeys:validateKey", { key: apiKey });
    if (!validation) {
      return res.status(401).json({ 
        error: {
          message: "Invalid API key",
          type: "authentication_error", 
          code: "invalid_api_key"
        }
      });
    }

    // Get available models
    const allModels = await client.query("models:getAvailableModels", {});
    
    // Filter to only chat-appropriate models
    const chatModels = allModels.filter((model) => {
      if (model.id.includes('embedding') || model.id.includes('upscal')) {
        return false;
      }
      return model.type === "text" || 
             model.type === "code" || 
             model.type === "multimodal";
    });
    
    // Convert to OpenAI format
    const openAIModels = chatModels.map((model) => ({
      id: model.id,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "dandolo",
      permission: [],
      root: model.id,
      parent: null
    }));

    return res.status(200).json({
      object: "list",
      data: openAIModels
    });

  } catch (error) {
    console.error("Models endpoint error:", error);
    return res.status(500).json({ 
      error: {
        message: "Internal server error",
        type: "server_error",
        code: "internal_error"
      }
    });
  }
};