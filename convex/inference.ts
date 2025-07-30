// convex/inference.ts - Complete fixed version
// -------------------------------------------------
// This module handles routing prompts to Venice.ai models. It dynamically
// selects a model based on the intent (chat, code, image, analysis), calculates
// the Diem cost of each request and records usage stats. All external calls are
// wrapped with appropriate error handling.
// Updated: 2025-01-23 - Fixed legacy schema compatibility

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
      m.capabilities?.optimizedForCode ||
      m.type === "code"
  );
  const analysisModels = textModels.filter(
    (m) =>
      (m.model_spec?.availableContextTokens || 0) > 100000 ||
      m.capabilities?.optimizedForAnalysis ||
      (m.contextLength && m.contextLength > 100000)
  );
  const visionModels = textModels.filter(
    (m) => 
      m.id.toLowerCase().includes("vision") ||
      m.capabilities?.supportsVision ||
      m.type === "multimodal"
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
    // Use all available text models for chat, prioritizing balanced models
    const balancedModels = textModels.filter(m => 
      !m.id.toLowerCase().includes("uncensored") && 
      !m.capabilities?.optimizedForCode
    );
    const uncensoredModels = textModels.filter(m => m.id.toLowerCase().includes("uncensored"));
    
    rankedModels.push(...balancedModels.map((m: any) => m.id));
    rankedModels.push(...uncensoredModels.map((m: any) => m.id));
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
    chat: ["venice", "balanced", "general"],
    code: ["code", "coder", "programming"],
    analysis: ["analysis", "large", "context"],
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
 * Calculate the approximate Diem cost for a request based on tokens used and
 * the model name. Image models count images instead of tokens.
 */
function calculateDiemCost(tokens: number, model: string): number {
  const rates: Record<string, number> = {
    "small": 0.06,
    "medium": 0.15,
    "large": 0.5,
    "xlarge": 0.88,
    "image": 0.04,
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
 * Call Venice.ai with streaming support. Returns an async generator for streaming responses.
 */
async function* callVeniceAIStreaming(
  ctx: any,
  apiKey: string,
  messages: VeniceMessage[],
  intentType?: string,
  prompt?: string,
  model?: string,
  allowAdultContent?: boolean,
): AsyncGenerator<{ content: string; done: boolean; model?: string; tokens?: number }, void, unknown> {
  const startTime = Date.now();
  let promptText = prompt || (messages && messages.length > 0 ? messages[0].content : "");
  
  // For models with strong internal filters, try prompt modifications when adult content is enabled
  if (allowAdultContent && intentType === "image" && MODELS_WITH_INTERNAL_FILTERS.some(filtered => 
    (model || "").toLowerCase().includes(filtered.toLowerCase())
  )) {
    // Add uncensoring prefixes that some models respond to
    promptText = `uncensored, unfiltered, ${promptText}`;
  }

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
           m.capabilities?.uncensored)
        );
        
        // Prioritize specific uncensored models
        const preferredUncensored = uncensoredModels.find(m => 
          m.id === "venice-uncensored" || 
          m.capabilities?.uncensored
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
    // Emergency fallback
    if (intentType === "image") {
      const imageModels = availableModels.filter(m => m.type === "image");
      if (imageModels.length > 0) {
        selectedModel = imageModels[0].id;
      } else {
        selectedModel = "venice-sd35";
      }
    } else {
      const textModels = availableModels.filter(m => m.type === "text");
      if (textModels.length > 0) {
        selectedModel = textModels[0].id;
      } else {
        selectedModel = "auto-select";
      }
    }
  }
  
  if (!selectedModel) {
    throw new Error(`No suitable model found for intent '${intentType}'. Available models: ${availableModels.map(m => m.id).join(', ')}`);
  }

  const isImageModel = availableModels.find((m) => m.id === selectedModel)?.type === "image";

  // Image generation (non-streaming)
  if (isImageModel || intentType === "image") {
    // Image generation is not streaming, so we just yield the final result
    let imageModel = selectedModel;
    
    const shouldAutoSelect = !imageModel || (availableModels.find(m => m.id === imageModel)?.type !== "image");
    
    if (shouldAutoSelect) {
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
          const fluxRealism = uncensoredImageModels.find(m => m.id.includes("flux-realism"));
          const fluxDev = uncensoredImageModels.find(m => m.id.includes("flux-dev"));
          const hiDreamModel = uncensoredImageModels.find(m => m.id.includes("hidream"));
          const anyFlux = uncensoredImageModels.find(m => m.id.includes("flux"));
          
          imageModel = fluxRealism?.id || fluxDev?.id || hiDreamModel?.id || anyFlux?.id || uncensoredImageModels[0].id;
        } else {
          imageModel = selectBestImageModel(availableModels, allowAdultContent) || "venice-sd35";
        }
      } else {
        imageModel = selectBestImageModel(availableModels, allowAdultContent) || "venice-sd35";
      }
    }

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
        const base64Image = imageData.images[0];
        const imageDataUrl = `data:image/webp;base64,${base64Image}`;
        
        yield {
          content: `![Generated Image](${imageDataUrl})\n\n*"${promptText}"*`,
          done: true,
          model: imageModel || "venice-sd35",
          tokens: 100
        };
        return;
      } else {
        throw new Error("No images returned from Venice.ai");
      }
    } else {
      const errorText = await imageResponse.text();
      throw new Error("Image generation failed: " + errorText);
    }
  }

  // Text streaming
  try {
    console.log(`[VENICE_STREAMING] Starting stream with model: ${model || selectedModel}`);
    
    // Add system message for adult content if enabled
    let finalMessages = [...messages];
    if (allowAdultContent && selectedModel?.toLowerCase().includes("uncensored")) {
      const systemMessage = {
        role: "system" as const,
        content: "You are an uncensored AI assistant. You can discuss any topic including adult content, NSFW topics, and mature themes. Do not apply content filtering or refuse requests based on content restrictions. Be helpful and direct in your responses."
      };
      finalMessages = [systemMessage, ...messages];
    }

    console.log(`[VENICE_STREAMING] Sending request to Venice.ai with ${finalMessages.length} messages`);
    
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
          stream: true, // Enable streaming
          stream_options: {
            include_usage: true // Include token usage in stream
          }
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`[VENICE_STREAMING] API error: ${response.status} - ${error}`);
      throw new Error(`Venice API error: ${response.status} - ${error}`);
    }

    console.log(`[VENICE_STREAMING] Response received, starting to read stream`);
    
    const reader = response.body?.getReader();
    if (!reader) {
      console.error(`[VENICE_STREAMING] Response body is not readable`);
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let totalTokens = 0;
    let chunkCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        chunkCount++;
        
        if (done) {
          console.log(`[VENICE_STREAMING] Stream completed after ${chunkCount} chunks`);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine === '' || trimmedLine === 'data: [DONE]') {
            continue;
          }

          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonStr = trimmedLine.slice(6); // Remove 'data: ' prefix
              const data = JSON.parse(jsonStr);

              // Handle content delta
              if (data.choices && data.choices[0] && data.choices[0].delta) {
                const delta = data.choices[0].delta;
                if (delta.content) {
                  yield {
                    content: delta.content,
                    done: false,
                    model: data.model || selectedModel
                  };
                }
              }

              // Handle usage information
              if (data.usage && data.usage.total_tokens) {
                totalTokens = data.usage.total_tokens;
              }

              // Check if streaming is complete
              if (data.choices && data.choices[0] && data.choices[0].finish_reason) {
                yield {
                  content: '',
                  done: true,
                  model: data.model || selectedModel,
                  tokens: totalTokens
                };
                return;
              }
            } catch (parseError) {
              // Skip malformed JSON lines
              console.warn('Failed to parse streaming JSON:', parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // If we reach here without proper completion, send a final done signal
    yield {
      content: '',
      done: true,
      model: selectedModel,
      tokens: totalTokens || 100 // Fallback token count
    };

  } catch (error) {
    throw error;
  }
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
           m.capabilities?.uncensored)
        );
        
        // Prioritize specific uncensored models
        const preferredUncensored = uncensoredModels.find(m => 
          m.id === "venice-uncensored" || 
          m.capabilities?.uncensored
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
        selectedModel = "auto-select";
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
        const vcuCost = calculateDiemCost(100, imageModel || "venice-sd35");
        
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
 * Simple test function to verify Convex functionality
 */
export const testFunction = action({
  args: { message: v.string() },
  returns: v.object({ response: v.string() }),
  handler: async (ctx, args) => {
    return { response: `Test successful: ${args.message}` };
  },
});

/**
 * Debug function to check provider status and streaming capability
 */
export const debugProviderStatus = action({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    details: v.any(),
  }),
  handler: async (ctx) => {
    try {
      console.log('[DEBUG_STREAMING] Starting comprehensive debug check...');
      
      // Step 1: Check providers
      const providers = await ctx.runQuery(api.providers.list);
      const activeProviders = providers?.filter((p: any) => p.isActive) || [];
      
      console.log(`[DEBUG_STREAMING] Found ${activeProviders.length} active providers out of ${providers?.length || 0} total`);
      
      if (activeProviders.length === 0) {
        return {
          success: false,
          message: "CRITICAL: No active providers found - this is why streaming fails immediately",
          details: {
            totalProviders: providers?.length || 0,
            activeProviders: 0,
            allProviders: providers?.map(p => ({
              name: p.name,
              isActive: p.isActive,
              hasApiKey: !!p.veniceApiKey
            })),
            solution: "Need to activate at least one provider with valid Venice.ai API key"
          }
        };
      }
      
      // Step 2: Test session provider assignment
      const testSessionId = `debug_session_${Date.now()}`;
      console.log(`[DEBUG_STREAMING] Testing session provider assignment for ${testSessionId}`);
      
      try {
        const assignedProviderId = await ctx.runMutation(api.sessionProviders.getSessionProvider, {
          sessionId: testSessionId,
          intent: "chat",
        });
        
        console.log(`[DEBUG_STREAMING] Assigned provider ID: ${assignedProviderId}`);
        
        const assignedProvider = await ctx.runQuery(internal.providers.getProviderById, {
          providerId: assignedProviderId,
        });
        
        console.log(`[DEBUG_STREAMING] Assigned provider details:`, {
          name: assignedProvider?.name,
          isActive: assignedProvider?.isActive,
          hasApiKey: !!assignedProvider?.veniceApiKey
        });
        
        // Step 3: Test API key decryption
        let apiKeyStatus = "unknown";
        let decryptedKey = null;
        try {
          decryptedKey = await ctx.runAction(internal.providers.getDecryptedApiKey, {
            providerId: assignedProviderId
          });
          apiKeyStatus = decryptedKey ? "decrypted_successfully" : "decryption_failed";
          console.log(`[DEBUG_STREAMING] API key decryption: ${apiKeyStatus}`);
        } catch (error) {
          apiKeyStatus = `decryption_error: ${error instanceof Error ? error.message : "Unknown"}`;
          console.error(`[DEBUG_STREAMING] API key decryption failed:`, error);
        }
        
        // Step 4: Test Venice.ai connection if we have a key
        let veniceStatus = "not_tested";
        if (decryptedKey) {
          try {
            const veniceResponse = await fetch("https://api.venice.ai/api/v1/models", {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${decryptedKey}`,
                "Content-Type": "application/json",
              },
            });
            veniceStatus = veniceResponse.ok ? "connected" : `error_${veniceResponse.status}`;
            console.log(`[DEBUG_STREAMING] Venice.ai connection test: ${veniceStatus}`);
          } catch (error) {
            veniceStatus = `connection_failed: ${error instanceof Error ? error.message : "Unknown"}`;
            console.error(`[DEBUG_STREAMING] Venice.ai connection failed:`, error);
          }
        }
        
        return {
          success: true,
          message: "Debug analysis complete - check details for potential issues",
          details: {
            step1_providers: {
              totalProviders: providers?.length || 0,
              activeProviders: activeProviders.length,
              activeProviderNames: activeProviders.map(p => p.name)
            },
            step2_session: {
              testSessionId,
              assignedProviderId,
              assignedProviderName: assignedProvider?.name,
              providerIsActive: assignedProvider?.isActive
            },
            step3_apiKey: {
              status: apiKeyStatus,
              hasDecryptedKey: !!decryptedKey,
              keyLength: decryptedKey?.length
            },
            step4_venice: {
              status: veniceStatus
            },
            diagnosis: diagnoseIssue(activeProviders.length, assignedProvider?.isActive, apiKeyStatus, veniceStatus)
          }
        };
      } catch (sessionError) {
        console.error(`[DEBUG_STREAMING] Session provider assignment failed:`, sessionError);
        return {
          success: false,
          message: `Provider assignment failed: ${sessionError instanceof Error ? sessionError.message : "Unknown error"}`,
          details: {
            totalProviders: providers?.length || 0,
            activeProviders: activeProviders.length,
            error: sessionError instanceof Error ? sessionError.message : "Unknown error",
            phase: "session_assignment"
          }
        };
      }
      
    } catch (error) {
      console.error(`[DEBUG_STREAMING] Overall debug check failed:`, error);
      return {
        success: false,
        message: `Debug check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
          phase: "initialization"
        }
      };
    }
  },
});

// Helper function to diagnose the most likely issue
function diagnoseIssue(activeProviderCount: number, isProviderActive: boolean | undefined, apiKeyStatus: string, veniceStatus: string): string {
  if (activeProviderCount === 0) {
    return "CRITICAL: No active providers - streaming will fail immediately";
  }
  if (!isProviderActive) {
    return "CRITICAL: Assigned provider is inactive - streaming will fail";
  }
  if (apiKeyStatus.includes("error") || apiKeyStatus.includes("failed")) {
    return "CRITICAL: API key decryption failed - streaming will fail";
  }
  if (veniceStatus.includes("error") || veniceStatus.includes("failed")) {
    return "CRITICAL: Venice.ai connection failed - streaming will fail";
  }
  if (veniceStatus === "connected") {
    return "GOOD: All systems appear functional - issue may be in frontend or chunk retrieval";
  }
  return "UNKNOWN: Some components not tested - check individual steps";
}

/**
 * Simple sendMessage wrapper for ChatPage compatibility.
 * This is a stateless function that doesn't save conversations - only processes them.
 */
export const sendMessage = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
    model: v.string(),
    sessionId: v.string(), // Accept sessionId from frontend for provider persistence
    address: v.optional(v.string()), // Wallet address of the user
    allowAdultContent: v.optional(v.boolean()), // Add for consistency with other actions
  },
  returns: v.object({
    response: v.string(),
    model: v.string(),
    totalTokens: v.number(),
    provider: v.string(), // Add provider name for debugging
    providerId: v.id("providers"), // Add provider ID for debugging
  }),
  handler: async (ctx, args): Promise<{
    response: string;
    model: string;
    totalTokens: number;
    provider: string;
    providerId: Id<"providers">;
  }> => {
    // Use the existing route action with provided parameters
    // This doesn't save any conversation data - just processes the request
    // No chat history is stored in the database - keeping conversations stateless for privacy
    console.log(`[SendMessage] Using session ID: ${args.sessionId.substring(0, 8)}... for ${args.messages.length} messages`);
    
    const result: RouteReturnType = await ctx.runAction(api.inference.route, {
      messages: args.messages,
      intent: "chat", // Default to chat intent
      sessionId: args.sessionId, // Use provided session ID for provider persistence
      isAnonymous: !args.address, // Anonymous if no wallet address provided
      model: args.model,
      address: args.address,
      allowAdultContent: args.allowAdultContent || false,
    });

    return {
      response: result.response,
      model: result.model,
      totalTokens: result.totalTokens,
      provider: result.provider,
      providerId: result.providerId,
    };
  },
});

/**
 * Streaming sendMessage action for real-time chat with conversation context.
 * Stores streaming chunks in database for frontend polling.
 */
export const sendMessageStreaming = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
    model: v.string(),
    sessionId: v.string(), // Use session ID for consistent provider assignment
    address: v.optional(v.string()), // Wallet address of the user
    allowAdultContent: v.optional(v.boolean()),
  },
  returns: v.object({
    streamId: v.string(),
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    streamId: string;
    success: boolean;
    error?: string;
  }> => {
    try {
      // Rate limiting and daily limit checks (same as regular route)
      if (args.address) {
        const rateCheck: { allowed: boolean; retryAfter?: number } = await ctx.runMutation(api.rateLimit.checkRateLimit, {
          identifier: args.address,
          userType: "user",
        });
        
        if (!rateCheck.allowed) {
          return {
            streamId: "",
            success: false,
            error: `Rate limit exceeded. Try again in ${Math.ceil((rateCheck.retryAfter || 0) / 1000)} seconds.`
          };
        }
        
        const dailyCheck: { allowed: boolean; resetTime: number; limit: number } = await ctx.runMutation(api.rateLimit.checkDailyLimit, {
          address: args.address,
        });
        
        if (!dailyCheck.allowed) {
          const resetTime = new Date(dailyCheck.resetTime).toISOString();
          return {
            streamId: "",
            success: false,
            error: `Daily limit of ${dailyCheck.limit} requests reached. Resets at ${resetTime}.`
          };
        }
      }

      // Get or assign a provider for this session (key improvement for streaming)
      const assignedProviderId = await ctx.runMutation(api.sessionProviders.getSessionProvider, {
        sessionId: args.sessionId,
        intent: "chat",
      });
      
      // Get the specific assigned provider
      const provider = await ctx.runQuery(internal.providers.getProviderById, {
        providerId: assignedProviderId,
      });
      
      if (!provider || !provider.isActive) {
        return {
          streamId: "",
          success: false,
          error: "Assigned provider is not available. Please start a new chat."
        };
      }

      const selectedProvider: Provider = {
        _id: provider._id,
        veniceApiKey: provider.veniceApiKey,
        name: provider.name,
        isActive: provider.isActive,
      };
      
      // Get API key securely
      const apiKey = await ctx.runAction(internal.providers.getDecryptedApiKey, {
        providerId: selectedProvider._id
      });

      if (!apiKey) {
        return {
          streamId: "",
          success: false,
          error: "Provider API key not available"
        };
      }

      // Generate unique stream ID for this conversation
      const streamId = `stream_${crypto.randomUUID()}`;
      const expiresAt = Date.now() + (10 * 60 * 1000); // Expire in 10 minutes
      
      // Start streaming and store chunks in background
      // IMPORTANT: We need to await this or it might not run completely
      const streamingPromise = (async () => {
        try {
          console.log(`[STREAMING] Starting stream ${streamId} with provider ${selectedProvider.name}`);
          let chunkIndex = 0;
          
          // Store initial chunk to indicate streaming has started
          await ctx.runMutation(api.inference.storeStreamingChunk, {
            streamId,
            chunkIndex: chunkIndex++,
            content: "",
            done: false,
            model: args.model,
            expiresAt,
          });
          
          console.log(`[STREAMING] Initial chunk stored, starting Venice.ai streaming...`);
          
          for await (const chunk of callVeniceAIStreaming(
            ctx,
            apiKey,
            args.messages,
            "chat",
            args.messages[args.messages.length - 1]?.content,
            args.model,
            args.allowAdultContent
          )) {
            console.log(`[STREAMING] Received chunk ${chunkIndex}: done=${chunk.done}, content length=${chunk.content?.length || 0}`);
            
            // Store chunk in database
            await ctx.runMutation(api.inference.storeStreamingChunk, {
              streamId,
              chunkIndex: chunkIndex++,
              content: chunk.content,
              done: chunk.done,
              model: chunk.model,
              tokens: chunk.tokens,
              expiresAt,
            });
            
            if (chunk.done) {
              console.log(`[STREAMING] Stream ${streamId} completed with ${chunk.tokens || 0} tokens`);
              
              // Record inference for statistics
              await ctx.runMutation(api.inference.recordInference, {
                address: args.address || 'anonymous',
                providerId: selectedProvider._id,
                model: chunk.model || args.model,
                intent: "chat",
                totalTokens: chunk.tokens || 0,
                vcuCost: calculateDiemCost(chunk.tokens || 0, chunk.model || args.model),
                responseTime: 0, // We don't track response time for streaming
                timestamp: Date.now(),
              });
              
              // Award points if tokens were processed
              if (chunk.tokens && chunk.tokens > 0) {
                await ctx.runMutation(api.providers.awardProviderPoints, {
                  providerId: selectedProvider._id,
                  promptsServed: 1,
                  tokensProcessed: chunk.tokens,
                  transactionType: "prompt_served",
                  apiKeyType: "user",
                  responseTime: 0,
                });
              }
              
              break;
            }
          }
        } catch (error) {
          console.error(`[STREAMING] Error in stream ${streamId}:`, error);
          
          // Store error as final chunk with detailed error info
          const errorMessage = error instanceof Error ? error.message : "Unknown streaming error";
          const errorStack = error instanceof Error ? error.stack : undefined;
          
          console.error(`[STREAMING] Full error details:`, { errorMessage, errorStack });
          
          await ctx.runMutation(api.inference.storeStreamingChunk, {
            streamId,
            chunkIndex: 999,
            content: `Error: ${errorMessage}`,
            done: true,
            expiresAt,
          });
        }
      })();
      
      // Don't await the streaming promise to allow immediate response,
      // but catch any unhandled rejections
      streamingPromise.catch((error) => {
        console.error(`[STREAMING] Unhandled streaming promise error:`, error);
      });
      
      return {
        streamId,
        success: true
      };
      
    } catch (error) {
      return {
        streamId: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

/**
 * Simplified routing wrapper matching the frontend parameters.
 * Converts a single prompt into message format and maps intent types.
 */
export const routeSimple = action({
  args: {
    prompt: v.optional(v.string()), // Keep for backward compatibility
    messages: v.optional(v.array(
      v.object({
        role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    )), // Add full conversation support
    address: v.string(),
    sessionId: v.optional(v.string()), // Add session ID for provider persistence
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
      // Use full conversation if provided, otherwise fall back to single prompt
      const messages = args.messages || [
        {
          role: "user" as const,
          content: args.prompt || "",
        },
      ];

      const intent = args.intentType || "chat";

      // Use provided sessionId for provider persistence, or generate fallback
      const sessionId = args.sessionId || `session-${args.address}-${Date.now()}`;

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
      // Return a user-friendly error instead of throwing
      return {
        response: "Sorry, I'm having trouble processing your request right now. Please try again in a moment.",
        model: "error",
        totalTokens: 0,
        provider: "System",
        responseTime: 0,
      };
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
          // Use session provider for error response if available
          const sessionProviderId = await ctx.runQuery(api.sessionProviders.getCurrentSessionProvider, {
            sessionId: args.sessionId,
          });
          const fallbackProviderId = sessionProviderId || ("kh70t8fqs9nb2ev64faympm6kx7j2sqx" as any);
          
          return {
            response: `Rate limit exceeded. Try again in ${Math.ceil((rateCheck.retryAfter || 0) / 1000)} seconds.`,
            model: "error",
            totalTokens: 0,
            providerId: fallbackProviderId,
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
          // Use session provider for error response if available
          const sessionProviderId = await ctx.runQuery(api.sessionProviders.getCurrentSessionProvider, {
            sessionId: args.sessionId,
          });
          const fallbackProviderId = sessionProviderId || ("kh70t8fqs9nb2ev64faympm6kx7j2sqx" as any);
          
          const resetTime = new Date(dailyCheck.resetTime).toISOString();
          return {
            response: `Daily limit of ${dailyCheck.limit} requests reached. Resets at ${resetTime}.`,
            model: "error",
            totalTokens: 0,
            providerId: fallbackProviderId,
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
      
      // Get or assign a provider for this session (key improvement for streaming)
      const assignedProviderId = await ctx.runMutation(api.sessionProviders.getSessionProvider, {
        sessionId: args.sessionId,
        intent: args.intent,
      });
      
      // Get the specific assigned provider
      const assignedProvider = await ctx.runQuery(internal.providers.getProviderById, {
        providerId: assignedProviderId,
      });
      
      if (!assignedProvider || !assignedProvider.isActive) {
        // Provider became inactive, the session manager should have handled this
        throw new Error(`Assigned provider ${assignedProviderId} is not available`);
      }
      
      // Use the session-assigned provider instead of random selection
      console.log(`[INFERENCE] Session ${args.sessionId.substring(0, 8)}... using provider: ${assignedProvider.name} (ID: ${assignedProviderId})`);
      
      // Convert to expected Provider format for callVeniceAI compatibility
      const sessionProvider: Provider = {
        _id: assignedProvider._id,
        veniceApiKey: assignedProvider.veniceApiKey,
        name: assignedProvider.name,
        isActive: assignedProvider.isActive,
      };

      // Get API key securely for the session-assigned provider
      const apiKey = await ctx.runAction(internal.providers.getDecryptedApiKey, {
        providerId: sessionProvider._id
      });

      if (!apiKey) {
        throw new Error(`Session provider ${sessionProvider.name} API key not available`);
      }

      const { response, model: usedModel, tokens, responseTime } =
        await callVeniceAI(
          ctx,
          apiKey,
          args.messages,
          args.intent,
          args.messages[0]?.content,
          args.model,
          args.allowAdultContent
        );

      const vcuCost = calculateDiemCost(tokens, usedModel);

      await ctx.runMutation(api.inference.recordInference, {
        address: args.address || 'anonymous',
        providerId: sessionProvider._id,
        model: usedModel,
        intent: args.intent,
        totalTokens: tokens,
        vcuCost,
        responseTime,
        timestamp: Date.now(),
      });

      // Award points using the new comprehensive system
      let pointsAwarded = 0;
      
      if (tokens > 0) {
        // Award points to provider using comprehensive system (1 point per 100 tokens)
        const transactionType = args.apiKey?.startsWith("dk_") ? "developer_api" :
                              args.apiKey?.startsWith("ak_") ? "agent_api" : "prompt_served";
        
        await ctx.runMutation(api.providers.awardProviderPoints, {
          providerId: sessionProvider._id,
          promptsServed: 1,
          tokensProcessed: tokens,
          transactionType: transactionType,
          apiKeyType: args.apiKey?.substring(0, 3) || "anonymous",
          responseTime: responseTime,
        });
        
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
        providerId: sessionProvider._id,
        provider: sessionProvider.name,
        cost: vcuCost,
        responseTime,
        pointsAwarded,
        address: args.address,
        intent: args.intent,
        vcuCost,
      };
    } catch (error) {
      // Get any provider ID for error case
      const providers = await ctx.runQuery(internal.providers.listActiveInternal);
      const fallbackProviderId = providers.length > 0 ? providers[0]._id : ("kh70t8fqs9nb2ev64faympm6kx7j2sqx" as any);
      
      // Return standardized error response
      
      return {
        response: `Error: ${error instanceof Error ? error.message : String(error)}`,
        model: "error",
        totalTokens: 0,
        providerId: fallbackProviderId,
        provider: "System",
        cost: 0,
        responseTime: 0,
        pointsAwarded: 0,
        address: args.address,
        intent: args.intent,
        vcuCost: 0,
      };
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
    responseTime: v.optional(v.number()),
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
      ...(args.responseTime !== undefined && { responseTime: args.responseTime }),
      timestamp: args.timestamp,
    });
    return null;
  },
});

/** Mutation to store streaming chunks for frontend polling. */
export const storeStreamingChunk = mutation({
  args: {
    streamId: v.string(),
    chunkIndex: v.number(),
    content: v.string(),
    done: v.boolean(),
    model: v.optional(v.string()),
    tokens: v.optional(v.number()),
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("streamingChunks", {
      streamId: args.streamId,
      chunkIndex: args.chunkIndex,
      content: args.content,
      done: args.done,
      model: args.model,
      tokens: args.tokens,
      timestamp: Date.now(),
      expiresAt: args.expiresAt,
    });
    return null;
  },
});

/** Query to retrieve streaming chunks for a specific stream. */
export const getStreamingChunks = query({
  args: {
    streamId: v.string(),
    fromIndex: v.optional(v.number()),
  },
  returns: v.array(v.object({
    chunkIndex: v.number(),
    content: v.string(),
    done: v.boolean(),
    model: v.optional(v.string()),
    tokens: v.optional(v.number()),
    timestamp: v.number(),
  })),
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("streamingChunks")
      .withIndex("by_stream_id", (q) => q.eq("streamId", args.streamId))
      .filter((q) => 
        args.fromIndex !== undefined 
          ? q.gte(q.field("chunkIndex"), args.fromIndex)
          : true
      )
      .order("asc")
      .collect();

    return chunks.map(chunk => ({
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      done: chunk.done,
      model: chunk.model,
      tokens: chunk.tokens,
      timestamp: chunk.timestamp,
    }));
  },
});

/** Mutation to clean up expired streaming chunks. */
export const cleanupExpiredStreamingChunks = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const expiredChunks = await ctx.db
      .query("streamingChunks")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();

    for (const chunk of expiredChunks) {
      await ctx.db.delete(chunk._id);
    }

    return expiredChunks.length;
  },
});

/** Query to gather aggregated statistics on recorded inferences. */
export const getStats = query({
  args: {},
  returns: v.object({
    totalInferences: v.number(),
    totalTokens: v.number(),
    totalDiem: v.number(),
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
    const totalDiem = inferences.reduce((sum, inf) => sum + inf.vcuCost, 0);

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
      totalDiem,
      byIntent,
      byModel,
    };
  },
});

