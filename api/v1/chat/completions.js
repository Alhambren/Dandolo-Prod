// Vercel serverless function to proxy chat completions to Convex
import { ConvexHttpClient } from "convex/browser";

export default async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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
    const body = req.body;
    
    // Validate required fields
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return res.status(400).json({
        error: {
          message: "Messages array is required and cannot be empty",
          type: "validation_error",
          code: "invalid_messages"
        }
      });
    }

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

    // Determine intent from model or content
    let intent = "chat";
    if (body.model && body.model.includes("code")) {
      intent = "code";
    } else if (body.model && body.model.includes("image")) {
      intent = "image";
    }

    // Map auto-select to a valid Venice model
    let modelName = body.model || "llama-3.3-70b";
    if (modelName === "auto-select") {
      modelName = "llama-3.3-70b";
    }
    
    // Use Convex inference system
    const result = await client.action("inference:route", {
      messages: body.messages,
      intent: intent,
      sessionId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36),
      isAnonymous: false,
      address: validation.address,
      model: modelName,
      apiKey: apiKey,
      allowAdultContent: false,
      ...(body.venice_parameters && { venice_parameters: body.venice_parameters })
    });

    // Record API usage
    await client.mutation("apiKeys:recordUsage", { keyId: validation._id });

    // Convert Dandolo response to OpenAI format
    const openAIResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: result.model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: result.response
        },
        finish_reason: "stop"
      }],
      usage: {
        prompt_tokens: Math.max(1, Math.floor(result.totalTokens * 0.7)),
        completion_tokens: Math.max(1, Math.floor(result.totalTokens * 0.3)),
        total_tokens: result.totalTokens
      }
    };

    // Add rate limit headers
    const remainingRequests = validation.dailyLimit - validation.dailyUsage - 1;
    const resetTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
    
    res.setHeader('X-RateLimit-Limit', validation.dailyLimit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remainingRequests).toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toString());
    res.setHeader('X-RateLimit-Type', validation.keyType || 'unknown');

    return res.status(200).json(openAIResponse);

  } catch (error) {
    console.error("Chat completions error:", error);
    return res.status(500).json({ 
      error: {
        message: "Internal server error",
        type: "server_error",
        code: "internal_error"
      }
    });
  }
};