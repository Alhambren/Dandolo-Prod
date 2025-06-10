import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Analyze the prompt to guess the intent and choose an appropriate model.
 * Returns the suggested model, confidence score, and reasoning.
 */
// NOTE: Previously contained analyzePromptIntent function for guessing
// prompt intent. It has been removed to enforce dynamic model selection
// based solely on available Venice.ai models.

/**
 * Calculate VCU cost for a given token count and model.
 */
function calculateVCUCost(tokens: number, model: string): number {
  const vcuPricing: Record<string, number> = {
    "dolphin-mixtral-8x7b": 30,
    "llama-3.2-3b-instruct": 2,
    "claude-3-sonnet-20240229": 15,
    "claude-3-haiku-20240307": 2.5,
    "meta-llama/Llama-2-70b-chat-hf": 10,
    "mistralai/Mixtral-8x7B-Instruct-v0.1": 7,
    "codellama/CodeLlama-34b-Instruct-hf": 10,
    "deepseek-ai/deepseek-coder-33b-instruct": 8,
    "fluently-xl": 5,
    "dalle-3": 20,
  };

  const rate = vcuPricing[model] || 2;
  return Math.ceil((tokens / 1000) * rate);
}

/**
 * Wrapper around Venice.ai to call the chat or image endpoints using whatever
 * models are currently available. Selection is dynamic based on the intent
 * type. No model IDs are hardcoded so that renaming on Venice won't break us.
 */
async function callVeniceAI(
  prompt: string,
  apiKey: string,
  model?: string,
  intentType?: string,
) {
  console.log("CallVeniceAI:", {
    prompt: prompt.substring(0, 50),
    model,
    intentType,
  });

  // Fetch current available models from Venice
  let availableModels: any[] = [];
  try {
    const modelsResponse = await fetch("https://api.venice.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      availableModels = modelsData.data || [];
    }
  } catch (error) {
    console.error("Failed to fetch models:", error);
  }

  // Dynamic model selection based on available models and intent
  let selectedModel = model;
  if (!selectedModel) {
    if (intentType === "image") {
      selectedModel =
        availableModels.find((m) =>
          m.id.toLowerCase().includes("fluently") ||
          m.id.toLowerCase().includes("dalle") ||
          m.id.toLowerCase().includes("stable") ||
          m.id.toLowerCase().includes("image")
        )?.id ||
        availableModels[0]?.id ||
        "fluently-xl";
    } else if (intentType === "code") {
      selectedModel =
        availableModels.find((m) =>
          m.id.toLowerCase().includes("code") ||
          m.id.toLowerCase().includes("deepseek") ||
          m.id.toLowerCase().includes("starcoder")
        )?.id ||
        availableModels[0]?.id ||
        "llama-3.2-3b-instruct";
    } else if (intentType === "analysis") {
      selectedModel =
        availableModels.find((m) =>
          m.id.toLowerCase().includes("mixtral") ||
          m.id.toLowerCase().includes("dolphin") ||
          m.id.toLowerCase().includes("claude")
        )?.id ||
        availableModels[0]?.id ||
        "dolphin-mixtral-8x7b";
    } else {
      selectedModel = availableModels[0]?.id || "llama-3.2-3b-instruct";
    }
  }

  // Image generation handling
  if (
    intentType === "image" ||
    (selectedModel && selectedModel.toLowerCase().includes("fluently"))
  ) {
    try {
      const imageEndpoint = "https://api.venice.ai/api/v1/image/generate";
      const imageResponse = await fetch(imageEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt,
          width: 1024,
          height: 1024,
          steps: 20,
          cfg_scale: 7.5,
          return_binary: false,
        }),
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        if (imageData.images && imageData.images.length > 0) {
          const imageUrl = imageData.images[0];
          const vcuCost = calculateVCUCost(100, selectedModel);
          return {
            text: `![Generated Image](${imageUrl})\n\n*"${prompt}"*`,
            tokens: 100,
            model: selectedModel,
            cost: vcuCost,
            vcuUsed: vcuCost,
          };
        }
      }
      console.log("Image generation failed, falling back to text");
    } catch (err) {
      console.error("Image generation error:", err);
    }
  }

  // Text generation with dynamic system prompts
  let systemPrompt: string | undefined;
  if (
    intentType === "code" ||
    (selectedModel && selectedModel.toLowerCase().includes("code"))
  ) {
    systemPrompt =
      "You are an expert programmer. Generate clean, well-commented code with explanations.";
  } else if (intentType === "analysis") {
    systemPrompt =
      "You are an expert analyst. Provide deep, thoughtful analysis with multiple perspectives.";
  } else if (intentType === "image") {
    systemPrompt =
      "The user requested an image. Create a vivid, detailed text description instead.";
  }

  const messages = systemPrompt
    ? [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ]
    : [{ role: "user", content: prompt }];

  const response = await fetch("https://api.venice.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      messages,
      max_tokens: intentType === "code" ? 2000 : 1000,
      temperature:
        intentType === "code"
          ? 0.3
          : intentType === "analysis"
          ? 0.7
          : 0.8,
      stream: false,
    }),
  });

  try {
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Venice API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const totalTokens = data.usage?.total_tokens || 0;
    const vcuCost = calculateVCUCost(totalTokens, selectedModel);

    return {
      text: data.choices[0].message.content,
      tokens: totalTokens,
      model: data.model || selectedModel,
      cost: vcuCost,
      vcuUsed: vcuCost,
    };
  } catch (err) {
    console.error("Text generation error:", err);
    return {
      text: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      tokens: 0,
      model: selectedModel,
      cost: 0,
      vcuUsed: 0,
    };
  }
}

/** Provider record used during routing */
interface Provider {
  _id: Id<"providers">;
  name: string;
  veniceApiKey: string;
  vcuBalance?: number;
  totalPrompts?: number;
}

interface RouteResponse {
  response: string;
  provider: string;
  tokens: number;
  cost: number;
  responseTime: number;
  model: string;
  vcuUsed?: number;
}

/**
 * Route a prompt through the best available provider. Falls back to a demo
 * message when no providers are registered.
 */
export const route = action({
  args: {
    prompt: v.string(),
    address: v.optional(v.string()),
    model: v.optional(v.string()),
    intentType: v.optional(v.string()),
  },
  returns: v.object({
    response: v.string(),
    provider: v.string(),
    tokens: v.number(),
    cost: v.number(),
    responseTime: v.number(),
    model: v.string(),
    vcuUsed: v.optional(v.number()),
  }),
  handler: async (ctx, args): Promise<RouteResponse> => {
    console.log("Inference route called:", {
      prompt: args.prompt.substring(0, 50) + "...",
      model: args.model,
      intentType: args.intentType,
    });

    try {
      const rateLimitCheck = await ctx.runMutation(api.rateLimit.checkRateLimit, {
        address: args.address,
      });

      if (!rateLimitCheck.allowed) {
        throw new Error(`Daily limit reached (${rateLimitCheck.current}/50)`);
      }

      const providers = (await ctx.runQuery(
        internal.providers.listActiveInternal,
      )) as Provider[];
      console.log(`Found ${providers.length} active providers`);

      if (providers.length === 0) {
        console.log("No providers - using demo mode");
        const demoMessages: Record<string, string> = {
          image:
            "🎨 Image generation requires a registered provider with Venice.ai API key.\n\nTo enable:\n1. Go to Dashboard\n2. Get your Venice.ai API key\n3. Register as a provider\n\nThen you can generate amazing images!",
          code:
            `💻 Code generation requires a registered provider.\n\nYour request: "${args.prompt}"\n\nTo enable real code generation:\n1. Register as a provider in Dashboard\n2. Add your Venice.ai API key\n\nI'll then help you write any code!`,
          analysis:
            `📊 Deep analysis requires a registered provider.\n\nYour query: "${args.prompt}"\n\nTo enable:\n1. Get a Venice.ai API key\n2. Register in Dashboard\n\nThen I can provide comprehensive analysis!`,
          default:
            `🤖 Demo Mode Active\n\nYour message: "${args.prompt}"\n\nTo enable real AI responses:\n1. Visit venice.ai for an API key\n2. Go to Dashboard → Register as Provider\n3. Add your API key\n\nOnce registered, I'll provide intelligent responses using Venice.ai!`,
        };

        const plower = args.prompt.toLowerCase();
        const messageType =
          args.intentType ||
          (plower.includes("image")
            ? "image"
            : plower.includes("code")
            ? "code"
            : plower.includes("analy")
            ? "analysis"
            : "default");

        return {
          response:
            demoMessages[messageType as keyof typeof demoMessages] ||
            demoMessages.default,
          provider: "Demo Mode",
          tokens: 50,
          cost: 0,
          responseTime: 100,
          model: "demo",
          vcuUsed: 0,
        };
      }

      // Choose provider with best VCU-to-usage ratio
      const selectedProvider = providers.reduce((best, current) => {
        const bestScore =
          (best.vcuBalance || 0) / (1 + (best.totalPrompts || 0));
        const currentScore =
          (current.vcuBalance || 0) / (1 + (current.totalPrompts || 0));
        return currentScore > bestScore ? current : best;
      });

      console.log(
        `Selected provider: ${selectedProvider.name} (VCU: ${
          selectedProvider.vcuBalance || 0
        })`,
      );

      const startTime = Date.now();

      try {
        const veniceResponse = await callVeniceAI(
          args.prompt,
          selectedProvider.veniceApiKey,
          args.model,
          args.intentType,
        );

        const responseTime = Date.now() - startTime;

        await ctx.runMutation(api.inference.logUsage, {
          address: args.address ?? "anonymous",
          providerId: selectedProvider._id,
          model: veniceResponse.model,
          tokens: veniceResponse.tokens,
          createdAt: Date.now(),
          latencyMs: responseTime,
        });

        await ctx.runMutation(api.providers.incrementPromptCount, {
          providerId: selectedProvider._id,
        });

        if (
          veniceResponse.vcuUsed !== undefined &&
          selectedProvider.vcuBalance !== undefined
        ) {
          await ctx.runMutation(internal.providers.updateVCUBalance, {
            providerId: selectedProvider._id,
            vcuBalance: Math.max(
              0,
              (selectedProvider.vcuBalance || 0) - veniceResponse.vcuUsed,
            ),
          });
        }

        return {
          response: veniceResponse.text,
          provider: selectedProvider.name,
          tokens: veniceResponse.tokens,
          cost: veniceResponse.cost,
          responseTime,
          model: veniceResponse.model,
          vcuUsed: veniceResponse.vcuUsed,
        };
      } catch (error) {
        console.error("Venice AI call failed:", error);
        throw new Error(
          `AI service error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Inference route error:", error);
      throw error;
    }
  },
});

/**
 * Log usage of the inference endpoint. Provider ID is optional to support demo
 * mode when no providers are registered.
 */
export const logUsage = mutation({
  args: {
    address: v.optional(v.string()),
    providerId: v.optional(v.id("providers")),
    model: v.string(),
    tokens: v.number(),
    createdAt: v.number(),
    latencyMs: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.insert("usageLogs", {
      address: args.address ?? "anonymous",
      providerId: args.providerId,
      model: args.model,
      tokens: args.tokens,
      latencyMs: args.latencyMs,
      createdAt: args.createdAt,
    });
  },
});
