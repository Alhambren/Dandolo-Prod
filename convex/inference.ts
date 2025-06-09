import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Venice.ai API integration - direct routing
async function callVeniceAI(
  prompt: string,
  apiKey: string,
  model?: string,
  intentType?: string
) {
  console.log("CallVeniceAI:", {
    prompt: prompt.substring(0, 50),
    model,
    intentType,
    isImageRequest: intentType === 'image',
  });

  // Image generation detection
  if (intentType === 'image') {
    console.log("Processing image generation request");

    try {
      // Venice.ai OpenAI-compatible image endpoint
      const imageEndpoint = "https://api.venice.ai/v1/images/generations";
      console.log("Calling image endpoint:", imageEndpoint);

      const imageResponse = await fetch(imageEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: prompt,
          n: 1,
          size: "1024x1024",
        }),
      });

      console.log("Image response status:", imageResponse.status);
      const responseText = await imageResponse.text();
      console.log("Image response body:", responseText);

      if (imageResponse.ok) {
        try {
          const imageData = JSON.parse(responseText);
          console.log("Parsed image data:", imageData);

          if (imageData.data && imageData.data[0] && imageData.data[0].url) {
            return {
              text: `![Generated Image](${imageData.data[0].url})\n\n*"${prompt}"*`,
              tokens: 100,
              model: "dall-e",
              cost: calculateCost(100, "dall-e"),
            };
          }
        } catch (parseError) {
          console.error("Failed to parse image response:", parseError);
        }
      }

      // If image generation fails, fall back to text description
      console.log("Image generation failed, falling back to text description");
    } catch (error) {
      console.error("Image generation error:", error);
    }
  }

  // Text generation (for all non-image requests or fallback)
  const isCodeRequest = intentType === 'code';
  const isAnalysisRequest = intentType === 'analysis';

  let systemPrompt: string | undefined = undefined;
  if (isCodeRequest) {
    systemPrompt =
      "You are an expert programmer. Generate clean, well-commented code with explanations.";
  } else if (isAnalysisRequest) {
    systemPrompt =
      "You are an expert analyst. Provide deep, thoughtful analysis with multiple perspectives.";
  } else if (intentType === 'image') {
    // Fallback for failed image generation
    systemPrompt =
      "The user requested an image but generation is currently unavailable. Create a vivid, detailed text description of: " +
      prompt;
  }

  const messages = systemPrompt
    ? [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ]
    : [{ role: "user", content: prompt }];

  // Use appropriate model based on intent
  let selectedModel = model || "gpt-3.5-turbo";
  if (intentType === 'analysis' && !model) {
    selectedModel = "gpt-4"; // Use GPT-4 for analysis
  }

  const textEndpoint = "https://api.venice.ai/v1/chat/completions";
  console.log("Calling Venice text completion with model:", selectedModel);

  const response = await fetch(
    textEndpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        max_tokens: isCodeRequest ? 2000 : 1000,
        temperature: isCodeRequest ? 0.3 : isAnalysisRequest ? 0.7 : 0.8,
        stream: false,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Venice API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    text: data.choices[0].message.content,
    tokens: data.usage?.total_tokens || 0,
    model: data.model || selectedModel,
    cost: calculateCost(
      data.usage?.total_tokens || 0,
      data.model || selectedModel
    ),
  };
}

// Map user-friendly model names to Venice.ai model IDs
function mapToVeniceModel(model?: string): string {
  const modelMap: Record<string, string> = {
    "gpt-4": "gpt-4",
    "gpt-3.5-turbo": "gpt-3.5-turbo",
    "claude-3-sonnet": "claude-3-sonnet-20240229",
    "claude-3-haiku": "claude-3-haiku-20240307",
    "llama-3": "meta-llama/Llama-2-70b-chat-hf",
    "mixtral": "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "codellama": "codellama/CodeLlama-34b-Instruct-hf",
    "deepseek-coder": "deepseek-ai/deepseek-coder-33b-instruct"
  };
  
  return modelMap[model || "gpt-3.5-turbo"] || "gpt-3.5-turbo";
}

// Calculate cost based on token usage and model
function calculateCost(tokens: number, model: string): number {
  // Venice.ai pricing (approximate, in VCU)
  const pricing: Record<string, number> = {
    "gpt-4": 0.03,
    "gpt-3.5-turbo": 0.002,
    "claude-3-sonnet-20240229": 0.015,
    "claude-3-haiku-20240307": 0.0025,
    "meta-llama/Llama-2-70b-chat-hf": 0.01,
    "mistralai/Mixtral-8x7B-Instruct-v0.1": 0.007,
    "codellama/CodeLlama-34b-Instruct-hf": 0.01,
    "deepseek-ai/deepseek-coder-33b-instruct": 0.008
  };
  
  const rate = pricing[model] || 0.002;
  return Math.ceil(tokens * rate * 1000); // Convert to micro-VCU
}

interface Provider {
  _id: Id<"providers">;
  name: string;
  veniceApiKey: string;
}

interface RouteResponse {
  response: string;
  provider: string;
  tokens: number;
  cost: number;
  responseTime: number;
  model: string;
}

export const route = action({
  args: {
    prompt: v.string(),
    address: v.optional(v.string()),
    model: v.optional(v.string()),
    intentType: v.optional(v.string()), // Add this
  },
  returns: v.object({
    response: v.string(),
    provider: v.string(),
    tokens: v.number(),
    cost: v.number(),
    responseTime: v.number(),
    model: v.string(),
  }),
  handler: async (ctx, args): Promise<RouteResponse> => {
    console.log("Inference route called with:", {
      prompt: args.prompt.substring(0, 50) + "...",
      model: args.model,
      intentType: args.intentType,
    });

    try {
      // Rate limit check
      const rateLimitCheck = await ctx.runMutation(api.rateLimit.checkRateLimit, {
        address: args.address,
      });

      if (!rateLimitCheck.allowed) {
        throw new Error(`Daily limit reached (${rateLimitCheck.current}/50)`);
      }

      // Get active providers
      const providers = (await ctx.runQuery(internal.providers.listActiveInternal)) as Provider[];
      console.log(`Found ${providers.length} active providers`);

      if (providers.length === 0) {
        throw new Error("No providers available. Please register a provider first.");
      }

      // Select random provider
      const selectedProvider: Provider = providers[Math.floor(Math.random() * providers.length)];
      console.log(`Selected provider: ${selectedProvider.name}`);

      const startTime = Date.now();

      try {
        // Call Venice.ai with intent type
        const veniceResponse = await callVeniceAI(
          args.prompt,
          selectedProvider.veniceApiKey,
          args.model,
          args.intentType
        );
        const responseTime = Date.now() - startTime;

        // Log usage (anonymous metrics only)
        await ctx.runMutation(api.inference.logUsage, {
          address: args.address ?? 'anonymous',
          providerId: selectedProvider._id,
          model: args.model || veniceResponse.model,
          tokens: veniceResponse.tokens,
          createdAt: Date.now(),
          latencyMs: responseTime,
        });

        // Award provider points
        await ctx.runMutation(api.providers.incrementPromptCount, {
          providerId: selectedProvider._id,
        });

        return {
          response: veniceResponse.text,
          provider: selectedProvider.name,
          tokens: veniceResponse.tokens,
          cost: veniceResponse.cost,
          responseTime,
          model: args.model || veniceResponse.model,
        };
      } catch (error) {
        console.error("Venice AI call failed:", error);
        throw new Error(`Venice AI error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Inference route error:", error);
      throw error;
    }
  },
});

export const logUsage = mutation({
  args: {
    address: v.optional(v.string()),
    providerId: v.id("providers"),
    model: v.string(),
    tokens: v.number(),
    createdAt: v.number(),
    latencyMs: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("usageLogs", {
      address: args.address ?? 'anonymous',
      providerId: args.providerId,
      model: args.model,
      tokens: args.tokens,
      latencyMs: args.latencyMs,
      createdAt: args.createdAt,
    });
  },
});
