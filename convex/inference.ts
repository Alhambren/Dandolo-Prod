// convex/inference.ts - Complete fixed version
// -------------------------------------------------
// This module handles routing prompts to Venice.ai models. It dynamically
// selects a model based on the intent (chat, code, image, analysis), calculates
// the VCU cost of each request and records usage stats. All external calls are
// wrapped with appropriate error handling.

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/** Venice.ai model definition returned by the models endpoint. */
interface VeniceModel {
  id: string;
  name: string;
  type: "text" | "image";
  owned_by?: string;
  created?: number;
}

/** Wrapper type for the Venice models list response. */
interface VeniceModelsResponse {
  data: VeniceModel[];
}

/** Message format used when calling Venice text models. */
interface VeniceMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Response structure for Venice text completions. */
interface VeniceTextResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Response structure for Venice image generation. */
interface VeniceImageResponse {
  id: string;
  images: string[]; // Base64 encoded image data
  request?: any;
  timing?: any;
}

/** Provider record stored in Convex. */
// Provider record as returned from the database. veniceApiKey is optional when
// fetched via the public query so we treat it as such here.
interface Provider {
  _id: Id<"providers">;
  veniceApiKey?: string;
  name: string;
  isActive: boolean;
}

// Preferred image model order (safe models)
const PREFERRED_IMAGE_MODELS = [
  "venice-sd35",
  "stable-diffusion-3.5",
  "flux-dev",
  "hidream"
];

// Preferred uncensored image models for adult content (based on live Venice.ai data)
const PREFERRED_UNCENSORED_IMAGE_MODELS = [
  "pony-realism",        // Has "most_uncensored" trait
  "lustify-sdxl",        // Specifically for adult content  
  "flux-dev-uncensored", // Uncensored FLUX variant
  "hidream",             // Known for adult content
  "flux-dev",            // Standard FLUX (high quality)
  "flux-realism",        // If available
  "flux-1.1-pro"         // If available
];

// Models with strong internal filters that may need special handling
const MODELS_WITH_INTERNAL_FILTERS = [
  "venice-sd35",
  "stable-diffusion-3.5", 
  "fluently-xl"
];

/**
 * Fetch available models from live Venice.ai API (same as frontend)
 */
async function fetchAvailableModelsFromAPI(ctx: any): Promise<any[]> {
  try {
    // Use the same function the frontend uses to ensure consistency
    const categorizedModels = await ctx.runAction(api.models.fetchAndCategorizeModels, {});
    
    // Flatten the categorized models into a single array with type information
    const allModels = [
      ...categorizedModels.text.map((m: any) => ({ ...m, type: "text" })),
      ...categorizedModels.code.map((m: any) => ({ ...m, type: "code" })),
      ...categorizedModels.image.map((m: any) => ({ ...m, type: "image" })),
      ...categorizedModels.multimodal.map((m: any) => ({ ...m, type: "multimodal" })),
      ...categorizedModels.audio.map((m: any) => ({ ...m, type: "audio" })),
    ];
    
    
    return allModels;
  } catch (error) {
    // Fallback to cached models if live fetch fails
    return await ctx.runQuery(api.models.getAvailableModels, {});
  }
}

/**
 * Select the best image model from available models
 */
function selectBestImageModel(models: any[], allowAdultContent?: boolean): string | undefined {
  const imageModels = models.filter((m) => m.type === "image");
  
  // If adult content is allowed, prefer uncensored models
  if (allowAdultContent) {
    for (const preferred of PREFERRED_UNCENSORED_IMAGE_MODELS) {
      const found = imageModels.find((m) => m.id === preferred);
      if (found) {
        return found.id;
      }
    }
  }
  
  // Otherwise use regular preferred models
  for (const preferred of PREFERRED_IMAGE_MODELS) {
    const found = imageModels.find((m) => m.id === preferred);
    if (found) {
      return found.id;
    }
  }
  
  // Fallback: return first available image model
  const fallback = imageModels[0]?.id;
  return fallback;
}

/**
 * Select the most appropriate model based on intent and availability
 */
function selectModel(models: any[], intentType?: string, preferredModel?: string): string[] {
  const rankedModels: string[] = [];

  // If a preferred model is specified and available, add it to the top of the list
  if (preferredModel) {
    const exists = models.some((m) => m.id === preferredModel);
    if (exists) {
      rankedModels.push(preferredModel);
    } else {
    }
  }

  // Filter models by type and capabilities
  const textModels = models.filter((m) => m.type === "text");
  const imageModels = models.filter((m) => m.type === "image");
  const codeModels = textModels.filter(
    (m) =>
      m.id.toLowerCase().includes("code") ||
      m.id.toLowerCase().includes("deepseek") ||
      m.id.toLowerCase().includes("starcoder")
  );
  const analysisModels = textModels.filter(
    (m) =>
      (m.model_spec?.availableContextTokens || 0) > 100000 ||
      m.id.toLowerCase().includes("mixtral") ||
      m.id.toLowerCase().includes("dolphin")
  );
  const visionModels = textModels.filter(
    (m) => m.id.toLowerCase().includes("qwen-2.5-vl")
  );

  // Populate rankedModels based on intent
  if (intentType === "image" && imageModels.length > 0) {
    rankedModels.push(...imageModels.map((m) => m.id));
  } else if (intentType === "code" && codeModels.length > 0) {
    rankedModels.push(...codeModels.map((m) => m.id));
  } else if (intentType === "analysis" && analysisModels.length > 0) {
    rankedModels.push(...analysisModels.map((m) => m.id));
  } else if (intentType === "vision" && visionModels.length > 0) {
    rankedModels.push(...visionModels.map((m) => m.id));
  } else if (intentType === "chat" && textModels.length > 0) {
    const preferredChatModel = textModels.find(m => m.id === "llama-3.2-3b");
    if (preferredChatModel) {
      rankedModels.push(preferredChatModel.id);
    }
    const otherTextModels = textModels.filter(m => m.id !== "venice-uncensored" && m.id !== (preferredChatModel?.id));
    rankedModels.push(...otherTextModels.map((m: any) => m.id));
    const veniceUncensored = textModels.find(m => m.id === "venice-uncensored");
    if (veniceUncensored) {
      rankedModels.push(veniceUncensored.id);
    }
  }

  // Add any remaining models of the appropriate type if not already added
  const currentRankedIds = new Set(rankedModels);
  if (intentType === "image") {
    imageModels.forEach(m => { if (!currentRankedIds.has(m.id)) rankedModels.push(m.id); });
  } else if (intentType === "code") {
    codeModels.forEach(m => { if (!currentRankedIds.has(m.id)) rankedModels.push(m.id); });
  } else if (intentType === "analysis") {
    analysisModels.forEach(m => { if (!currentRankedIds.has(m.id)) rankedModels.push(m.id); });
  } else if (intentType === "vision") {
    visionModels.forEach(m => { if (!currentRankedIds.has(m.id)) rankedModels.push(m.id); });
  } else {
    textModels.forEach(m => { if (!currentRankedIds.has(m.id)) rankedModels.push(m.id); });
  }

  // Ensure all models are added if specific intent models aren't found or as a general fallback
  models.forEach(m => { if (!currentRankedIds.has(m.id)) rankedModels.push(m.id); });

  return rankedModels;
}

/**
 * Select a model based on the user's intent. If no preferred model is found,
 * fall back to the first available model of the required type.
 */
async function selectModelForIntent(
  models: VeniceModel[],
  intent: "chat" | "code" | "image" | "analysis"
): Promise<string> {
  const targetType = intent === "image" ? "image" : "text";
  const filteredModels = models.filter((m) => m.type === targetType);

  if (filteredModels.length === 0) {
    throw new Error(`No ${targetType} models available`);
  }

  if (intent === "image") {
    // For image generation just return the first available model
    return filteredModels[0].id;
  }

  const preferences = {
    chat: ["llama-3.3-70b", "llama-3.2-3b", "llama"],
    code: ["qwen-2.5-coder", "qwen", "llama-3.3-70b"],
    analysis: ["llama-3.3-70b", "nous-hermes", "llama"],
  } as const;

  const intendedModels = preferences[intent];

  for (const preferred of intendedModels) {
    const model = filteredModels.find(
      (m) =>
        m.id.toLowerCase().includes(preferred.toLowerCase()) ||
        m.name.toLowerCase().includes(preferred.toLowerCase())
    );
    if (model) return model.id;
  }

  return filteredModels[0].id;
}

/**
 * Calculate the approximate VCU cost for a request based on tokens used and
 * the model name. Image models count images instead of tokens.
 */
function calculateVCUCost(tokens: number, model: string): number {
  const rates: Record<string, number> = {
    "llama-3.2-3b": 0.06,
    "llama-3.3-70b": 0.88,
    "qwen-2.5-coder-32b": 0.5,
    "nous-hermes-3-8b": 0.15,
    "flux-1.1-pro": 0.04,
    "flux-realism": 0.03,
  };

  let rate = 0.1;
  for (const [key, value] of Object.entries(rates)) {
    if (model.toLowerCase().includes(key)) {
      rate = value;
      break;
    }
  }

  if (model.includes("flux") || model.includes("image")) {
    return tokens * rate;
  }

  return (tokens / 1_000_000) * rate;
}

/**
 * Call Venice.ai with the supplied messages. Returns the response text (or
 * image URL), the model used and the total tokens consumed.
 */
async function callVeniceAI(
  ctx: any,
  apiKey: string,
  messages: VeniceMessage[],
  intentType?: string,
  prompt?: string,
  model?: string,
  allowAdultContent?: boolean,
) {
  const startTime = Date.now();
  let promptText = prompt || (messages && messages.length > 0 ? messages[0].content : "");
  
  // For models with strong internal filters, try prompt modifications when adult content is enabled
  if (allowAdultContent && intentType === "image" && MODELS_WITH_INTERNAL_FILTERS.some(filtered => 
    (model || "").toLowerCase().includes(filtered.toLowerCase())
  )) {
    // Add uncensoring prefixes that some models respond to
    promptText = `uncensored, unfiltered, ${promptText}`;
  }
  

  // Remove the bypass - let it go through normal model selection

  // Fetch available models from live Venice.ai API (same as frontend)
  const availableModels = await fetchAvailableModelsFromAPI(ctx);
  
  // Debug image models specifically
  const imageModels = availableModels.filter(m => m.type === "image");

  // Select appropriate model
  let selectedModel: string | undefined = model;
  if (!selectedModel) {
    if (intentType === "image") {
      selectedModel = selectBestImageModel(availableModels, allowAdultContent);
    } else {
      
      // If adult content is allowed, prefer uncensored models
      if (allowAdultContent) {
        const uncensoredModels = availableModels.filter(m => 
          m.type === "text" && 
          (m.id.toLowerCase().includes("uncensored") || 
           m.id.toLowerCase().includes("nsfw") ||
           m.id.toLowerCase().includes("dolphin"))
        );
        
        // Prioritize specific uncensored models
        const preferredUncensored = uncensoredModels.find(m => 
          m.id === "venice-uncensored" || 
          m.id.includes("dolphin")
        );
        
        if (preferredUncensored) {
          selectedModel = preferredUncensored.id;
        } else if (uncensoredModels.length > 0) {
          selectedModel = uncensoredModels[0].id;
        }
      }
      
      // If no uncensored model found or adult content not allowed, use normal selection
      if (!selectedModel) {
        const ranked = selectModel(availableModels, intentType);
        selectedModel = ranked[0];
        
        // Fallback to first available text model if no ranked models found
        if (!selectedModel && availableModels.length > 0) {
          const textModels = availableModels.filter(m => m.type === "text");
          selectedModel = textModels[0]?.id;
        }
      }
    }
  }
  if (!selectedModel) {
    // Emergency fallback: use any available model or hardcoded fallbacks
    if (intentType === "image") {
      const imageModels = availableModels.filter(m => m.type === "image");
      if (imageModels.length > 0) {
        selectedModel = imageModels[0].id;
      } else {
        // Hardcoded fallback for image generation
        selectedModel = "venice-sd35";
      }
    } else {
      const textModels = availableModels.filter(m => m.type === "text");
      if (textModels.length > 0) {
        selectedModel = textModels[0].id;
      } else {
        // Hardcoded fallback for text generation  
        selectedModel = "llama-3.2-3b";
      }
    }
  }
  
  if (!selectedModel) {
    throw new Error(`No suitable model found for intent '${intentType}'. Available models: ${availableModels.map(m => m.id).join(', ')}`);
  }

  const isImageModel = availableModels.find((m) => m.id === selectedModel)?.type === "image";

  // Image generation
  if (isImageModel || intentType === "image") {
    
    // Use the selected model or fallback to preferred image model
    let imageModel = selectedModel;
    
    // Check if the manually selected model is an image model
    const manuallySelectedModelInfo = availableModels.find(m => m.id === imageModel);
    
    // Only auto-select if no model was manually chosen OR if the manually chosen model is confirmed to be non-image
    const shouldAutoSelect = !imageModel || (manuallySelectedModelInfo && manuallySelectedModelInfo.type !== "image");
    
    if (shouldAutoSelect) {
    } else if (imageModel && !manuallySelectedModelInfo) {
    } else if (imageModel && manuallySelectedModelInfo) {
    }
    
    if (shouldAutoSelect) {
        
      // If adult content is enabled, prefer uncensored image models
      if (allowAdultContent) {
        
        const uncensoredImageModels = availableModels.filter(m => 
          m.type === "image" && 
          (m.id.toLowerCase().includes("uncensored") || 
           m.id.toLowerCase().includes("nsfw") ||
           m.id.toLowerCase().includes("flux") ||
           m.id.toLowerCase().includes("hidream") ||
           m.id.toLowerCase().includes("realism"))
        );
        
        if (uncensoredImageModels.length > 0) {
          // Prefer specific uncensored models in order of preference
          const fluxRealism = uncensoredImageModels.find(m => m.id.includes("flux-realism"));
          const fluxDev = uncensoredImageModels.find(m => m.id.includes("flux-dev"));
          const hiDreamModel = uncensoredImageModels.find(m => m.id.includes("hidream"));
          const anyFlux = uncensoredImageModels.find(m => m.id.includes("flux"));
          
          imageModel = fluxRealism?.id || fluxDev?.id || hiDreamModel?.id || anyFlux?.id || uncensoredImageModels[0].id;
        } else {
          // No explicitly uncensored models found, use best available
          imageModel = selectBestImageModel(availableModels, allowAdultContent) || "venice-sd35";
        }
      } else {
        imageModel = selectBestImageModel(availableModels, allowAdultContent) || "venice-sd35";
      }
    }
    
    // Debug what model will actually be sent to Venice API
    const finalModelToSend = model || imageModel;

    const imageResponse = await fetch(
      "https://api.venice.ai/api/v1/image/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model || imageModel,
          prompt: promptText,
          width: 1024,
          height: 1024,
          steps: 20,
          cfg_scale: 7.5,
          return_binary: false,
          safe_mode: allowAdultContent ? false : true,
        }),
      }
    );

    if (imageResponse.ok) {
      const imageData = (await imageResponse.json()) as VeniceImageResponse;
      
      if (imageData.images && imageData.images.length > 0) {
        // Convert base64 image to data URL
        const base64Image = imageData.images[0];
        const imageDataUrl = `data:image/webp;base64,${base64Image}`;
        const vcuCost = calculateVCUCost(100, imageModel || "venice-sd35");
        
        return {
          response: `![Generated Image](${imageDataUrl})\n\n*\"${promptText}\"*`,
          model: imageModel || "venice-sd35",
          tokens: 100,
          cost: vcuCost,
          responseTime: Date.now() - startTime,
        };
      } else {
        throw new Error("No images returned from Venice.ai");
      }
    } else {
      const errorText = await imageResponse.text();
      throw new Error("Image generation failed: " + errorText);
    }
  }

  // Text/completions branch
  try {
    // Add system message for adult content if enabled
    let finalMessages = [...messages];
    if (allowAdultContent && selectedModel?.toLowerCase().includes("uncensored")) {
      const systemMessage = {
        role: "system" as const,
        content: "You are an uncensored AI assistant. You can discuss any topic including adult content, NSFW topics, and mature themes. Do not apply content filtering or refuse requests based on content restrictions. Be helpful and direct in your responses."
      };
      finalMessages = [systemMessage, ...messages];
    }

    const response = await fetch(
      "https://api.venice.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || selectedModel,
          messages: finalMessages,
          temperature: intentType === "code" ? 0.3 : 0.7,
          max_tokens: 2000,
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Venice API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as VeniceTextResponse;
    
    // Fallback token calculation if Venice doesn't provide usage data
    let tokenCount = data.usage?.total_tokens || 0;
    if (tokenCount === 0) {
      // Estimate tokens: roughly 4 characters per token
      const responseText = data.choices[0]?.message?.content || "";
      const promptText = finalMessages.map(m => m.content).join(" ");
      tokenCount = Math.ceil((promptText.length + responseText.length) / 4);
    }
    
    return {
      response: data.choices[0]?.message?.content || "No response generated",
      model: data.model || model || selectedModel,
      tokens: tokenCount,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    throw error;
  }
}

/** Return type for the route action. */
// Response returned to router.ts after routing a request
export type RouteReturnType = {
  response: string;
  model: string;
  totalTokens: number;
  providerId: Id<"providers">;
  provider: string;
  cost: number;
  responseTime: number;
  pointsAwarded: number;
  address?: string;
  intent: string;
  vcuCost: number;
};

export type RouteSimpleReturnType = {
  response: string;
  model: string;
  totalTokens: number;
  provider: string;
  responseTime: number;
};

/**
 * Simplified routing wrapper matching the frontend parameters.
 * Converts a single prompt into message format and maps intent types.
 */
export const routeSimple = action({
  args: {
    prompt: v.string(),
    address: v.string(),
    intentType: v.optional(
      v.union(
        v.literal("chat"),
        v.literal("code"),
        v.literal("image"),
        v.literal("analysis")
      )
    ),
    model: v.optional(v.string()),
    allowAdultContent: v.optional(v.boolean()),
  },
  returns: v.object({
    response: v.string(),
    model: v.string(),
    totalTokens: v.number(),
    provider: v.string(),
    responseTime: v.number(),
  }),
  handler: async (ctx, args): Promise<RouteSimpleReturnType> => {
    try {
      const messages = [
        {
          role: "user" as const,
          content: args.prompt,
        },
      ];

      const intent = args.intentType || "chat";

      const sessionId = `session-${args.address}-${Date.now()}`;

      const result: RouteReturnType = await ctx.runAction(api.inference.route, {
        messages,
        intent,
        sessionId,
        isAnonymous: args.address === "anonymous",
        address: args.address,
        model: args.model,
        allowAdultContent: args.allowAdultContent,
      });

      return {
        response: result.response,
        model: result.model,
        totalTokens: result.totalTokens,
        provider: result.provider,
        responseTime: result.responseTime,
      };
    } catch (error) {
      throw error;
    }
  },
});

/**
 * Main inference routing action. Selects a provider, forwards the request to
 * Venice.ai and records usage. Returns the generated text or image URL.
 */
export const route = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
    intent: v.union(
      v.literal("chat"),
      v.literal("code"),
      v.literal("image"),
      v.literal("analysis")
    ),
    sessionId: v.string(),
    isAnonymous: v.boolean(),
    address: v.optional(v.string()),
    model: v.optional(v.string()),
    allowAdultContent: v.optional(v.boolean()),
    apiKey: v.optional(v.string()),
  },
  returns: v.object({
    response: v.string(),
    model: v.string(),
    totalTokens: v.number(),
    providerId: v.id("providers"),
    provider: v.string(),
    cost: v.number(),
    responseTime: v.number(),
    pointsAwarded: v.number(),
    address: v.optional(v.string()),
    intent: v.string(),
    vcuCost: v.number(),
  }),
  handler: async (ctx, args): Promise<RouteReturnType> => {
    try {
      // Rate limiting and daily limit checks
      if (!args.isAnonymous && args.address) {
        // Check rate limits for authenticated users
        const userType = args.apiKey?.startsWith("dk_") ? "developer" :
                        args.apiKey?.startsWith("ak_") ? "agent" : "user";
        
        const rateCheck = await ctx.runMutation(api.rateLimit.checkRateLimit, {
          identifier: args.address,
          userType,
        });
        
        if (!rateCheck.allowed) {
          return {
            response: `Rate limit exceeded. Try again in ${Math.ceil((rateCheck.retryAfter || 0) / 1000)} seconds.`,
            model: "error",
            totalTokens: 0,
            providerId: "error" as any,
            provider: "System",
            cost: 0,
            responseTime: 0,
            pointsAwarded: 0,
            address: args.address,
            intent: args.intent,
            vcuCost: 0,
          };
        }
        
        // Check daily limits
        const dailyCheck = await ctx.runMutation(api.rateLimit.checkDailyLimit, {
          address: args.address,
          apiKey: args.apiKey,
        });
        
        if (!dailyCheck.allowed) {
          const resetTime = new Date(dailyCheck.resetTime).toISOString();
          return {
            response: `Daily limit of ${dailyCheck.limit} requests reached. Resets at ${resetTime}.`,
            model: "error",
            totalTokens: 0,
            providerId: "error" as any,
            provider: "System",
            cost: 0,
            responseTime: 0,
            pointsAwarded: 0,
            address: args.address,
            intent: args.intent,
            vcuCost: 0,
          };
        }
      }
      
      const providers: Provider[] = await ctx.runQuery(internal.providers.listActiveInternal);
      
      // Debug: Log each provider's details
      providers.forEach((provider, index) => {
      });

      if (providers.length === 0) {
        // Return a helpful error message instead of throwing
        return {
          response: "Sorry, no AI providers are currently available. Please try again later or contact support.",
          model: "error",
          totalTokens: 0,
          providerId: "error" as any,
          provider: "System",
          cost: 0,
          responseTime: 0,
          pointsAwarded: 0,
          address: args.address,
          intent: args.intent,
          vcuCost: 0,
        };
      }

      const validProviders = providers.filter((p) => 
        p.veniceApiKey && 
        !p.veniceApiKey.startsWith('test_') && 
        p.veniceApiKey.length > 30
      );
      
      // Debug: Log which providers passed the filter
      validProviders.forEach((provider, index) => {
      });

      if (validProviders.length === 0) {
        return {
          response: "Sorry, no AI providers with valid API keys are currently available. Please try again later.",
          model: "error",
          totalTokens: 0,
          providerId: "error" as any,
          provider: "System",
          cost: 0,
          responseTime: 0,
          pointsAwarded: 0,
          address: args.address,
          intent: args.intent,
          vcuCost: 0,
        };
      }

      const randomProvider: Provider =
        validProviders[Math.floor(Math.random() * validProviders.length)];

      const { response, model: usedModel, tokens, responseTime } =
        await callVeniceAI(
          ctx,
          randomProvider.veniceApiKey as string,
          args.messages,
          args.intent,
          args.messages[0]?.content,
          args.model,
          args.allowAdultContent
        );

      const vcuCost = calculateVCUCost(tokens, usedModel);

      await ctx.runMutation(api.inference.recordInference, {
        address: args.address || 'anonymous',
        providerId: randomProvider._id,
        model: usedModel,
        intent: args.intent,
        totalTokens: tokens,
        vcuCost,
        timestamp: Date.now(),
      });

      // Award points using the new comprehensive system
      let pointsAwarded = 0;
      
      if (tokens > 0) {
        // Award points to provider (1 point per 100 tokens)
        const providerPoints = Math.floor(tokens / 100);
        if (providerPoints > 0) {
          await ctx.runMutation(internal.points.awardProviderPoints, {
            providerId: randomProvider._id,
            tokens: tokens,
          });
        }
        
        // Award points to user if authenticated
        if (!args.isAnonymous && args.address) {
          const userType = args.apiKey?.startsWith("dk_") ? "developer" :
                          args.apiKey?.startsWith("ak_") ? "agent" : "user";
          
          const userPoints = await ctx.runMutation(internal.points.awardUserPoints, {
            address: args.address,
            userType,
            apiKey: args.apiKey,
          });
          
          pointsAwarded = userPoints;
        }
      }

      return {
        response,
        model: usedModel,
        totalTokens: tokens,
        providerId: randomProvider._id,
        provider: randomProvider.name,
        cost: vcuCost,
        responseTime,
        pointsAwarded,
        address: args.address,
        intent: args.intent,
        vcuCost,
      };
    } catch (error) {
      throw error;
    }
  },
});

/** Mutation to record each inference for statistics. */
export const recordInference = mutation({
  args: {
    address: v.string(),
    providerId: v.id("providers"),
    model: v.string(),
    intent: v.string(),
    totalTokens: v.number(),
    vcuCost: v.number(),
    timestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("inferences", {
      address: args.address,
      providerId: args.providerId,
      model: args.model,
      intent: args.intent,
      totalTokens: args.totalTokens,
      vcuCost: args.vcuCost,
      timestamp: args.timestamp,
    });
    return null;
  },
});

/** Query to gather aggregated statistics on recorded inferences. */
export const getStats = query({
  args: {},
  returns: v.object({
    totalInferences: v.number(),
    totalTokens: v.number(),
    totalVCU: v.number(),
    byIntent: v.record(v.string(), v.number()),
    byModel: v.record(v.string(), v.number()),
  }),
  handler: async (ctx) => {
    const inferences = await ctx.db.query("inferences").collect();

    const totalInferences = inferences.length;
    const totalTokens = inferences.reduce(
      (sum, inf) => sum + inf.totalTokens,
      0
    );
    const totalVCU = inferences.reduce((sum, inf) => sum + inf.vcuCost, 0);

    const byIntent = inferences.reduce((acc, inf) => {
      acc[inf.intent] = (acc[inf.intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byModel = inferences.reduce((acc, inf) => {
      acc[inf.model] = (acc[inf.model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalInferences,
      totalTokens,
      totalVCU,
      byIntent,
      byModel,
    };
  },
});

