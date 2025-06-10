import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Analyze the prompt to guess the intent and choose an appropriate model.
 * Returns the suggested model, confidence score, and reasoning.
 */
function analyzePromptIntent(prompt: string): {
  suggestedModel: string;
  confidence: number;
  reasoning: string;
} {
  const promptLower = prompt.toLowerCase();

  // Patterns to detect code-related requests
  const codePatterns = [
    /write.*code/i,
    /implement/i,
    /function/i,
    /algorithm/i,
    /debug/i,
    /fix.*bug/i,
    /error/i,
    /syntax/i,
    /program/i,
    /script/i,
    /```/,
    /class\s+\w+/,
    /def\s+\w+/,
    /function\s+\w+/,
    /const\s+\w+/,
  ];

  // Patterns for image generation requests
  const imagePatterns = [
    /generate.*image/i,
    /create.*image/i,
    /draw/i,
    /sketch/i,
    /design/i,
    /illustration/i,
    /picture/i,
    /photo/i,
    /artwork/i,
    /visual/i,
    /imagine/i,
    /depict/i,
    /render/i,
    /portrait/i,
    /landscape/i,
  ];

  // Patterns for analysis or deep reasoning
  const analysisPatterns = [
    /analyze/i,
    /compare/i,
    /evaluate/i,
    /assess/i,
    /examine/i,
    /research/i,
    /investigate/i,
    /study/i,
    /report/i,
    /summarize/i,
    /explain.*detail/i,
    /deep.*dive/i,
    /comprehensive/i,
    /thorough/i,
  ];

  const complexPatterns = [
    /philosophy/i,
    /ethics/i,
    /quantum/i,
    /theoretical/i,
    /abstract/i,
    /complex/i,
    /advanced/i,
    /mathematical proof/i,
    /dissertation/i,
  ];

  if (imagePatterns.some((p) => p.test(promptLower))) {
    return {
      suggestedModel: "fluently-xl",
      confidence: 0.95,
      reasoning: "Image generation request detected",
    };
  }

  if (codePatterns.some((p) => p.test(promptLower))) {
    const isComplex =
      promptLower.includes("architect") ||
      promptLower.includes("system design") ||
      promptLower.includes("optimization");
    return {
      suggestedModel: isComplex
        ? "dolphin-mixtral-8x7b"
        : "llama-3.2-3b-instruct",
      confidence: 0.9,
      reasoning: "Code-related task detected",
    };
  }

  if (
    analysisPatterns.some((p) => p.test(promptLower)) ||
    complexPatterns.some((p) => p.test(promptLower))
  ) {
    return {
      suggestedModel: "dolphin-mixtral-8x7b",
      confidence: 0.85,
      reasoning: "Complex analysis or reasoning required",
    };
  }

  if (prompt.length > 500) {
    return {
      suggestedModel: "dolphin-mixtral-8x7b",
      confidence: 0.7,
      reasoning: "Long prompt suggests complex task",
    };
  }

  return {
    suggestedModel: "llama-3.2-3b-instruct",
    confidence: 0.8,
    reasoning: "Standard conversational query",
  };
}

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
 * Wrapper around Venice.ai to handle model selection, images, and cost tracking.
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

  try {
    // Fetch available models from Venice to ensure we select a valid one
    const modelsResponse = await fetch("https://api.venice.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!modelsResponse.ok) {
      throw new Error(`Failed to fetch models: ${modelsResponse.status}`);
    }

    const modelsData = await modelsResponse.json();
    const availableModels = modelsData.data.map((m: any) => m.id);
    console.log("Available models from Venice:", availableModels);

    let selectedModel = model;

    // Choose a model based on intent if none provided
    if (!selectedModel && intentType) {
      switch (intentType) {
        case "image":
          selectedModel =
            availableModels.find((m: string) =>
              m.includes("fluently") ||
              m.includes("dalle") ||
              m.includes("stable-diffusion")
            ) || availableModels[0];
          break;
        case "code":
          selectedModel =
            availableModels.find((m: string) =>
              m.includes("deepseek") ||
              m.includes("code") ||
              m.includes("starcoder")
            ) || availableModels[0];
          break;
        case "vision":
          selectedModel =
            availableModels.find((m: string) =>
              m.includes("vision") ||
              m.includes("llava") ||
              m.includes("gpt-4v")
            ) || availableModels[0];
          break;
        case "audio":
          selectedModel =
            availableModels.find((m: string) =>
              m.includes("whisper") ||
              m.includes("audio") ||
              m.includes("speech")
            ) || availableModels[0];
          break;
        case "analysis":
          selectedModel =
            availableModels.find((m: string) =>
              m.includes("mixtral") ||
              m.includes("gpt-4") ||
              m.includes("claude")
            ) || availableModels[0];
          break;
        default:
          selectedModel = availableModels[0];
      }
    }

    if (!selectedModel) {
      selectedModel = availableModels[0];
    }

    console.log(`Selected model: ${selectedModel} for intent: ${intentType}`);

    // ----- Image generation -----
    if (intentType === "image" && selectedModel.includes("fluently")) {
      const imageResponse = await fetch(
        "https://api.venice.ai/api/v1/image/generate",
        {
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
        }
      );

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        if (imageData.images && imageData.images.length > 0) {
          const imageUrl = imageData.images[0];
          return {
            text: `![Generated Image](${imageUrl})\n\n*"${prompt}"*`,
            tokens: 100,
            model: selectedModel,
            cost: 5,
            vcuUsed: 5,
          };
        }
      }
    }

    // ----- Text generation -----
    let systemPrompt: string | undefined;
    if (intentType === "vision") {
      systemPrompt =
        "You are a computer vision assistant. Analyze the provided image and respond.";
    } else if (intentType === "audio") {
      systemPrompt =
        "You are an audio assistant. Transcribe or summarize the provided audio.";
    }
    if (intentType === "code" || selectedModel.includes("code")) {
      systemPrompt =
        "You are an expert programmer. Generate clean, well-commented code with explanations.";
    } else if (intentType === "analysis") {
      systemPrompt =
        "You are an expert analyst. Provide deep, thoughtful analysis with multiple perspectives.";
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
        max_tokens: 1000,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Venice API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const totalTokens = data.usage?.total_tokens || 0;

    return {
      text: data.choices[0].message.content,
      tokens: totalTokens,
      model: data.model || selectedModel,
      cost: Math.ceil(totalTokens / 1000),
      vcuUsed: Math.ceil(totalTokens / 1000),
    };
  } catch (error) {
    console.error("Venice AI error:", error);
    throw error;
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
