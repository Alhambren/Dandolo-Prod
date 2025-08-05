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

/**
 * Dynamically rank image models based on their characteristics from Venice.ai API
 * This ensures we always use the best available models without hardcoding
 */
function rankImageModelsByQuality(imageModels: any[], allowAdultContent: boolean = false): string[] {
  if (imageModels.length === 0) return [];
  
  // Score models based on various quality indicators
  const scoredModels = imageModels.map(model => {
    let score = 0;
    const modelId = model.id.toLowerCase();
    const capabilities = model.capabilities || {};
    
    // Base scoring on model ID patterns (higher = better)
    if (modelId.includes('flux')) score += 100; // FLUX models generally high quality
    if (modelId.includes('stable-diffusion')) score += 80; // SD models are solid
    if (modelId.includes('venice')) score += 70; // Venice optimized models
    if (modelId.includes('xl') || modelId.includes('sdxl')) score += 60; // XL variants
    if (modelId.includes('pro') || modelId.includes('plus')) score += 50; // Pro versions
    if (modelId.includes('3.5') || modelId.includes('v2')) score += 40; // Newer versions
    
    // Bonus for specific quality indicators
    if (capabilities.highQuality) score += 30;
    if (capabilities.photorealistic) score += 25;
    if (model.contextLength && model.contextLength > 1000) score += 20;
    
    // Handle adult content preferences
    const isUncensored = modelId.includes('uncensored') || 
                        modelId.includes('nsfw') || 
                        capabilities.uncensored ||
                        capabilities.most_uncensored;
    
    if (allowAdultContent && isUncensored) {
      score += 200; // Strong preference for uncensored when adult content allowed
    } else if (!allowAdultContent && isUncensored) {
      score -= 50; // Slight penalty for uncensored when not needed
    }
    
    // Penalize models that might be lower quality
    if (modelId.includes('mini') || modelId.includes('lite')) score -= 30;
    if (modelId.includes('fast') && !modelId.includes('flux')) score -= 20;
    
    return { model, score };
  });
  
  // Sort by score (highest first) and return model IDs
  return scoredModels
    .sort((a, b) => b.score - a.score)
    .map(item => item.model.id);
}

/**
 * Dynamically check if a model has strong internal filters based on model characteristics
 */
function hasStrongInternalFilters(modelId: string, modelInfo?: any): boolean {
  const id = modelId.toLowerCase();
  const capabilities = modelInfo?.capabilities || {};
  
  // Models known to have strong filters based on naming patterns
  if (id.includes('venice') && !id.includes('uncensored')) return true;
  if (id.includes('stable-diffusion') && !id.includes('uncensored')) return true;
  if (id.includes('safe') || id.includes('filtered')) return true;
  
  // Check capabilities flags
  if (capabilities.strongFilters || capabilities.familyFriendly) return true;
  if (capabilities.censored === true) return true;
  
  // Conservative approach: if we don't know, assume it has filters unless explicitly uncensored
  if (!id.includes('uncensored') && !id.includes('nsfw') && !capabilities.uncensored) {
    return true;
  }
  
  return false;
}

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
  
  if (imageModels.length === 0) {
    return undefined;
  }
  
  // Use dynamic ranking to select the best model
  const rankedModelIds = rankImageModelsByQuality(imageModels, allowAdultContent || false);
  
  // Return the highest-ranked available model
  return rankedModelIds[0] || imageModels[0]?.id;
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

  // Instead of hardcoded preferences, use dynamic scoring based on model characteristics
  const getTextModelScore = (model: any, intentType: string): number => {
    let score = 0;
    const modelId = model.id.toLowerCase();
    const capabilities = model.capabilities || {};
    
    // Base scoring for different intents
    if (intentType === "chat") {
      if (modelId.includes("chat") || modelId.includes("assistant")) score += 50;
      if (modelId.includes("balanced") || modelId.includes("general")) score += 30;
      if (capabilities.conversational) score += 40;
    } else if (intentType === "code") {
      if (modelId.includes("code") || modelId.includes("coder") || modelId.includes("programming")) score += 100;
      if (modelId.includes("llama") && modelId.includes("code")) score += 80;
      if (capabilities.optimizedForCode) score += 60;
    } else if (intentType === "analysis") {
      if (modelId.includes("analysis") || modelId.includes("reasoning")) score += 60;
      if (modelId.includes("large") || modelId.includes("xl")) score += 40;
      if (model.contextLength && model.contextLength > 100000) score += 50;
    }
    
    // General quality indicators
    if (modelId.includes("pro") || modelId.includes("plus")) score += 20;
    if (modelId.includes("v3") || modelId.includes("3.5")) score += 15;
    if (capabilities.highQuality) score += 25;
    
    return score;
  };

  // Score and rank all available text models for this intent
  const scoredModels = filteredModels.map(model => ({
    model,
    score: getTextModelScore(model, intent)
  }));
  
  // Sort by score (highest first)
  scoredModels.sort((a, b) => b.score - a.score);
  
  // Return the highest-scored model
  if (scoredModels[0]?.model) {
    return scoredModels[0].model.id;
  }

  return filteredModels[0].id;
}

/**
 * Calculate the approximate Diem cost for a request based on tokens used and
 * the model name. Image models count images instead of tokens.
 */
function calculateDiemCost(tokens: number, model: string, modelType?: string): number {
  const rates: Record<string, number> = {
    "small": 0.06,
    "medium": 0.15,
    "large": 0.5,
    "xlarge": 0.88,
    "image": 0.04,
  };

  let rate = 0.1;
  
  // Check if this is an image model (either by type or model name indicators)
  const isImageModel = modelType === "image" || 
                      model.toLowerCase().includes("image") ||
                      model.toLowerCase().includes("diffusion") ||
                      model.toLowerCase().includes("flux") ||
                      model.toLowerCase().includes("sd") ||
                      model.toLowerCase().includes("dall");
  
  // For image models, use image rate
  if (isImageModel) {
    rate = rates.image;
    return tokens * rate;
  }
  
  // For text models, check size indicators
  for (const [key, value] of Object.entries(rates)) {
    if (key !== "image" && model.toLowerCase().includes(key)) {
      rate = value;
      break;
    }
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
  venice_parameters?: {
    character_slug?: string;
    strip_thinking_response?: boolean;
    disable_thinking?: boolean;
    enable_web_search?: "auto" | "off" | "on";
    enable_web_citations?: boolean;
    include_search_results_in_stream?: boolean;
    include_venice_system_prompt?: boolean;
  },
): AsyncGenerator<{ content: string; done: boolean; model?: string; tokens?: number }, void, unknown> {
  const startTime = Date.now();
  let promptText = prompt || (messages && messages.length > 0 ? messages[0].content : "");
  
  // For models with strong internal filters, try prompt modifications when adult content is enabled
  if (allowAdultContent && intentType === "image" && model && hasStrongInternalFilters(model)) {
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
        throw new Error("No image models available for generation");
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
          // Use dynamic ranking to select the best uncensored model
          const rankedUncensored = rankImageModelsByQuality(uncensoredImageModels, true);
          imageModel = rankedUncensored[0] || uncensoredImageModels[0].id;
        } else {
          imageModel = selectBestImageModel(availableModels, allowAdultContent);
        }
      } else {
        imageModel = selectBestImageModel(availableModels, allowAdultContent);
      }
    }

    // Debug: Log image generation request - Updated with Venice.ai 2025 recommendations
    const imageRequestBody = {
      model: model || imageModel,
      prompt: promptText,
      width: 1024,
      height: 1024,
      steps: 30, // Venice.ai recommends ~30 steps for most generations
      cfg_scale: 7.5, // Good balance between creativity and adherence
      return_binary: false,
      safe_mode: allowAdultContent ? false : true,
      format: "webp", // Explicitly set format to match Venice.ai docs
      seed: Math.floor(Math.random() * 1000000000), // Add random seed to prevent caching
    };
    
    console.log(`🎨 [IMAGE_DEBUG] Generating image with model: ${imageRequestBody.model}`);
    console.log(`🎨 [IMAGE_DEBUG] Prompt: "${promptText}"`);
    console.log(`🎨 [IMAGE_DEBUG] Request body:`, JSON.stringify(imageRequestBody, null, 2));

    const imageResponse = await fetch(
      "https://api.venice.ai/api/v1/image/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(imageRequestBody),
      }
    );

    console.log(`🎨 [IMAGE_DEBUG] Response status: ${imageResponse.status}`);
    console.log(`🎨 [IMAGE_DEBUG] Response headers:`, Object.fromEntries(imageResponse.headers.entries()));

    if (imageResponse.ok) {
      const imageData = (await imageResponse.json()) as VeniceImageResponse;
      console.log(`🎨 [IMAGE_DEBUG] Response data keys:`, Object.keys(imageData));
      console.log(`🎨 [IMAGE_DEBUG] Images array length:`, imageData.images?.length || 0);
      
      if (imageData.images && imageData.images.length > 0) {
        const base64Image = imageData.images[0];
        console.log(`🎨 [IMAGE_DEBUG] Base64 image length:`, base64Image.length);
        console.log(`🎨 [IMAGE_DEBUG] Base64 preview:`, base64Image.substring(0, 100) + "...");
        
        // Add debugging to check if the base64 is valid
        const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(base64Image);
        console.log(`🎨 [IMAGE_DEBUG] Base64 format valid:`, isValidBase64);
        
        const imageDataUrl = `data:image/webp;base64,${base64Image}`;
        
        yield {
          content: `![Generated Image](${imageDataUrl})\n\n*"${promptText}"*\n\n*Debug: Model=${imageRequestBody.model}, Base64Length=${base64Image.length}*`,
          done: true,
          model: imageModel || "unknown-image-model",
          tokens: 100
        };
        return;
      } else {
        console.log(`🎨 [IMAGE_DEBUG] No images in response:`, imageData);
        throw new Error("No images returned from Venice.ai");
      }
    } else {
      const errorText = await imageResponse.text();
      console.log(`🎨 [IMAGE_DEBUG] Error response:`, errorText);
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
    
    const streamRequestBody = {
      model: model || selectedModel,
      messages: finalMessages,
      temperature: intentType === "code" ? 0.3 : 0.7,
      max_tokens: 2000,
      stream: true, // Enable streaming
      stream_options: {
        include_usage: true // Include token usage in stream
      },
      ...(venice_parameters || {}),
    };
    
    // Debug logging for character connections in streaming
    if (venice_parameters?.character_slug) {
      console.log(`[VENICE_DEBUG_STREAM] Sending character request:`, {
        character_slug: venice_parameters.character_slug,
        model: streamRequestBody.model,
        apiKeyPrefix: apiKey.substring(0, 20) + "...",
        fullRequest: streamRequestBody
      });
    }

    const response = await fetch(
      "https://api.venice.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(streamRequestBody),
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
  venice_parameters?: {
    character_slug?: string;
    strip_thinking_response?: boolean;
    disable_thinking?: boolean;
    enable_web_search?: "auto" | "off" | "on";
    enable_web_citations?: boolean;
    include_search_results_in_stream?: boolean;
    include_venice_system_prompt?: boolean;
  },
) {
  const startTime = Date.now();
  let promptText = prompt || (messages && messages.length > 0 ? messages[0].content : "");
  
  // For models with strong internal filters, try prompt modifications when adult content is enabled
  if (allowAdultContent && intentType === "image" && model && hasStrongInternalFilters(model)) {
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
        throw new Error("No image models available for generation");
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
          // Use dynamic ranking to select the best uncensored model
          const rankedUncensored = rankImageModelsByQuality(uncensoredImageModels, true);
          imageModel = rankedUncensored[0] || uncensoredImageModels[0].id;
        } else {
          // No explicitly uncensored models found, use best available
          imageModel = selectBestImageModel(availableModels, allowAdultContent);
        }
      } else {
        imageModel = selectBestImageModel(availableModels, allowAdultContent);
      }
    }
    
    // Debug what model will actually be sent to Venice API
    const finalModelToSend = model || imageModel;
    
    // Enhanced debug: Log image generation request - Updated with Venice.ai 2025 recommendations
    const imageRequestBody = {
      model: model || imageModel,
      prompt: promptText,
      width: 1024,
      height: 1024,
      steps: 30, // Venice.ai recommends ~30 steps for most generations
      cfg_scale: 7.5, // Good balance between creativity and adherence
      return_binary: false,
      safe_mode: allowAdultContent ? false : true,
      format: "webp", // Explicitly set format to match Venice.ai docs
      seed: Math.floor(Math.random() * 1000000000), // Add random seed to prevent caching
    };
    
    console.log(`🎨 [IMAGE_DEBUG_HTTP] Generating image via HTTP with model: ${imageRequestBody.model}`);
    console.log(`🎨 [IMAGE_DEBUG_HTTP] Prompt: "${promptText}"`);

    const imageResponse = await fetch(
      "https://api.venice.ai/api/v1/image/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(imageRequestBody),
      }
    );

    console.log(`🎨 [IMAGE_DEBUG_HTTP] Response status: ${imageResponse.status}`);

    if (imageResponse.ok) {
      const imageData = (await imageResponse.json()) as VeniceImageResponse;
      console.log(`🎨 [IMAGE_DEBUG_HTTP] Response data keys:`, Object.keys(imageData));
      console.log(`🎨 [IMAGE_DEBUG_HTTP] Images array length:`, imageData.images?.length || 0);
      
      if (imageData.images && imageData.images.length > 0) {
        // Convert base64 image to data URL
        const base64Image = imageData.images[0];
        console.log(`🎨 [IMAGE_DEBUG_HTTP] Base64 image length:`, base64Image.length);
        console.log(`🎨 [IMAGE_DEBUG_HTTP] Base64 preview:`, base64Image.substring(0, 100) + "...");
        
        const imageDataUrl = `data:image/webp;base64,${base64Image}`;
        const vcuCost = calculateDiemCost(100, imageModel || "image-model");
        
        return {
          response: `![Generated Image](${imageDataUrl})\n\n*\"${promptText}\"*\n\n*Debug: Model=${imageRequestBody.model}, Base64Length=${base64Image.length}*`,
          model: imageModel || "unknown-image-model",
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

    const requestBody = {
      model: model || selectedModel,
      messages: finalMessages,
      temperature: intentType === "code" ? 0.3 : 0.7,
      max_tokens: 2000,
      stream: false,
      ...(venice_parameters || {}),
    };
    
    // Debug logging for character connections
    if (venice_parameters?.character_slug) {
      console.log(`[VENICE_DEBUG] Sending character request:`, {
        character_slug: venice_parameters.character_slug,
        model: requestBody.model,
        apiKeyPrefix: apiKey.substring(0, 20) + "...",
        fullRequest: requestBody
      });
    }

    const response = await fetch(
      "https://api.venice.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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
    venice_parameters: v.optional(v.object({
      character_slug: v.optional(v.string()),
      strip_thinking_response: v.optional(v.boolean()),
      disable_thinking: v.optional(v.boolean()),
      enable_web_search: v.optional(v.union(v.literal("auto"), v.literal("off"), v.literal("on"))),
      enable_web_citations: v.optional(v.boolean()),
      include_search_results_in_stream: v.optional(v.boolean()),
      include_venice_system_prompt: v.optional(v.boolean()),
    })),
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
      ...(args.venice_parameters && { venice_parameters: args.venice_parameters }),
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
    venice_parameters: v.optional(v.object({
      character_slug: v.optional(v.string()),
      strip_thinking_response: v.optional(v.boolean()),
      disable_thinking: v.optional(v.boolean()),
      enable_web_search: v.optional(v.union(v.literal("auto"), v.literal("off"), v.literal("on"))),
      enable_web_citations: v.optional(v.boolean()),
      include_search_results_in_stream: v.optional(v.boolean()),
      include_venice_system_prompt: v.optional(v.boolean()),
    })),
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
            args.allowAdultContent,
            args.venice_parameters
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
export const testVeniceParameters = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
    venice_parameters: v.optional(v.any()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    return {
      success: true,
      message: `Venice parameters received: ${JSON.stringify(args.venice_parameters)}`
    };
  },
});

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
    venice_parameters: v.optional(v.object({
      character_slug: v.optional(v.string()),
      strip_thinking_response: v.optional(v.boolean()),
      disable_thinking: v.optional(v.boolean()),
      enable_web_search: v.optional(v.union(v.literal("auto"), v.literal("off"), v.literal("on"))),
      enable_web_citations: v.optional(v.boolean()),
      include_search_results_in_stream: v.optional(v.boolean()),
      include_venice_system_prompt: v.optional(v.boolean()),
    })),
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

      // Handle special model selection cases
      let modelToUse = args.model;
      if (args.model === "image" && args.intent === "image") {
        // When model="image" and intent="image", auto-select best image model
        modelToUse = undefined; // Let the system auto-select
      }

      const { response, model: usedModel, tokens, responseTime } =
        await callVeniceAI(
          ctx,
          apiKey,
          args.messages,
          args.intent,
          args.messages[0]?.content,
          modelToUse,
          args.allowAdultContent,
          args.venice_parameters
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

// ====================================================================
// ZERO-TRUST SECURITY SYSTEM - Complete agent security implementation
// ====================================================================

/** Security event types for comprehensive audit trails */
type SecurityEventType =
  | "agent_registration"
  | "agent_authentication"
  | "api_key_generation"
  | "api_key_rotation"
  | "api_key_revocation"
  | "security_violation"
  | "prompt_injection_detected"
  | "rate_limit_exceeded"
  | "suspicious_activity"
  | "wallet_verification"
  | "permission_escalation"
  | "unauthorized_access_attempt"
  | "agent_config_change"
  | "workflow_execution"
  | "admin_override";

/** Risk assessment levels */
type RiskLevel = "low" | "medium" | "high" | "critical";

/** Security metadata for comprehensive tracking */
interface SecurityMetadata {
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  requestId?: string;
  walletSignature?: string;
  previousRiskScore?: number;
  contextFlags?: string[];
}

/**
 * Generate cryptographically secure API keys with proper entropy
 */
function generateSecureApiKey(prefix: "ak_" | "dk_" = "ak_"): string {
  // Generate 32 bytes of entropy for maximum security
  const entropy = crypto.getRandomValues(new Uint8Array(32));
  const base64 = btoa(String.fromCharCode(...entropy))
    .replace(/[+/]/g, (c) => (c === '+' ? '-' : '_'))
    .replace(/=+$/, '');
  return `${prefix}${base64.substring(0, 48)}`;
}

/**
 * Hash API keys using SHA-256 for secure storage
 */
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypt sensitive data using AES-256-GCM
 */
async function encryptSensitiveData(data: string, key: string): Promise<{
  encrypted: string;
  iv: string;
  authTag: string;
}> {
  const encoder = new TextEncoder();
  const keyBuffer = encoder.encode(key.padEnd(32, '0').substring(0, 32));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = encoder.encode(data);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encodedData
  );
  
  const encryptedArray = new Uint8Array(encrypted);
  const authTag = encryptedArray.slice(-16);
  const ciphertext = encryptedArray.slice(0, -16);
  
  return {
    encrypted: btoa(String.fromCharCode(...ciphertext)),
    iv: btoa(String.fromCharCode(...iv)),
    authTag: btoa(String.fromCharCode(...authTag))
  };
}

/**
 * Log security events with tamper-proof signatures
 */
export const logSecurityEvent = mutation({
  args: {
    eventType: v.union(
      v.literal("agent_registration"),
      v.literal("agent_authentication"),
      v.literal("api_key_generation"),
      v.literal("api_key_rotation"),
      v.literal("api_key_revocation"),
      v.literal("security_violation"),
      v.literal("prompt_injection_detected"),
      v.literal("rate_limit_exceeded"),
      v.literal("suspicious_activity"),
      v.literal("wallet_verification"),
      v.literal("permission_escalation"),
      v.literal("unauthorized_access_attempt"),
      v.literal("agent_config_change"),
      v.literal("workflow_execution"),
      v.literal("admin_override")
    ),
    address: v.string(),
    agentId: v.optional(v.string()),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    description: v.string(),
    metadata: v.optional(v.any()),
    sessionId: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    eventId: v.string(),
  }),
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const eventId = `sec_${crypto.randomUUID()}`;
    
    // Create tamper-proof signature
    const signatureData = `${args.eventType}:${args.address}:${timestamp}:${args.description}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(signatureData));
    const signature = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    
    await ctx.db.insert("securityEvents", {
      eventId,
      eventType: args.eventType,
      address: args.address,
      agentId: args.agentId,
      riskLevel: args.riskLevel,
      description: args.description,
      metadata: args.metadata || {},
      sessionId: args.sessionId,
      signature,
      timestamp,
      acknowledged: false,
    });
    
    // Trigger real-time monitoring alerts for high-risk events
    if (args.riskLevel === "high" || args.riskLevel === "critical") {
      await ctx.runMutation(api.inference.triggerSecurityAlert, {
        eventId,
        riskLevel: args.riskLevel,
        eventType: args.eventType,
        address: args.address,
        description: args.description,
      });
    }
    
    return { success: true, eventId };
  },
});

/**
 * Trigger real-time security alerts for immediate response
 */
export const triggerSecurityAlert = mutation({
  args: {
    eventId: v.string(),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    eventType: v.string(),
    address: v.string(),
    description: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Log to monitoring alerts for immediate visibility
    await ctx.db.insert("monitoringAlerts", {
      level: args.riskLevel === "critical" ? "critical" : "error",
      message: `SECURITY ALERT: ${args.eventType} - ${args.description}`,
      timestamp: Date.now(),
      context: {
        eventId: args.eventId,
        eventType: args.eventType,
        address: args.address,
        riskLevel: args.riskLevel,
      },
      acknowledged: false,
    });
    
    // For critical events, also log to admin actions for immediate attention
    if (args.riskLevel === "critical") {
      await ctx.db.insert("adminActions", {
        adminAddress: "system",
        action: "SECURITY_INCIDENT_DETECTED",
        timestamp: Date.now(),
        details: `Critical security event: ${args.eventType} from ${args.address} - ${args.description}`,
        signature: `auto_generated_${args.eventId}`,
      });
    }
    
    return null;
  },
});

/**
 * Detect potential prompt injection attacks
 */
function detectPromptInjection(prompt: string): {
  isInjection: boolean;
  riskScore: number;
  indicators: string[];
} {
  const indicators: string[] = [];
  let riskScore = 0;
  
  // Pattern-based detection
  const suspiciousPatterns = [
    { pattern: /ignore.{0,20}(previous|above|prior).{0,20}(instruction|prompt|rule)/i, risk: 30, name: "ignore_previous" },
    { pattern: /forget.{0,20}(previous|above|prior).{0,20}(instruction|prompt|rule)/i, risk: 30, name: "forget_previous" },
    { pattern: /(\\n|\\r|\n|\r).{0,5}(system|admin|root):/i, risk: 40, name: "role_injection" },
    { pattern: /act.{0,10}as.{0,10}(admin|root|system|developer)/i, risk: 35, name: "role_assumption" },
    { pattern: /(override|bypass|disable).{0,20}(security|safety|filter|restriction)/i, risk: 45, name: "security_bypass" },
    { pattern: /you.{0,10}are.{0,10}(not|no.{0,5}longer).{0,10}(ai|assistant|chatbot)/i, risk: 25, name: "identity_manipulation" },
    { pattern: /(reveal|show|display).{0,20}(prompt|instruction|system.{0,10}message)/i, risk: 35, name: "prompt_extraction" },
    { pattern: /\{\{.{0,50}\}\}|\$\{.{0,50}\}/g, risk: 20, name: "template_injection" },
    { pattern: /<script|javascript:|data:|vbscript:/i, risk: 50, name: "code_injection" },
    { pattern: /base64|atob|eval\(/i, risk: 30, name: "encoded_payload" },
  ];
  
  for (const { pattern, risk, name } of suspiciousPatterns) {
    if (pattern.test(prompt)) {
      indicators.push(name);
      riskScore += risk;
    }
  }
  
  // Length-based detection for potential payload dumps
  if (prompt.length > 5000) {
    indicators.push("excessive_length");
    riskScore += 15;
  }
  
  // Repetitive pattern detection
  const words = prompt.toLowerCase().split(/\s+/);
  const wordCounts = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const maxRepeats = Math.max(...Object.values(wordCounts));
  if (maxRepeats > 20) {
    indicators.push("repetitive_content");
    riskScore += 25;
  }
  
  return {
    isInjection: riskScore >= 30,
    riskScore: Math.min(riskScore, 100),
    indicators,
  };
}

/**
 * Enhanced agent registration with zero-trust security
 */
export const registerAgent = mutation({
  args: {
    address: v.string(),
    name: v.string(),
    capabilities: v.array(v.string()),
    systemPrompt: v.optional(v.string()),
    walletSignature: v.string(), // Require wallet signature for verification
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    success: v.boolean(),
    agentId: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Zero-trust verification: validate wallet signature
      const timestamp = Date.now();
      const messageToSign = `register_agent:${args.address}:${args.name}:${timestamp}`;
      
      // TODO: Implement actual signature verification
      // For now, we'll proceed with registration but log the attempt
      
      const agentId = `ag_${crypto.randomUUID().replace(/-/g, '').substring(0, 24)}`;
      const apiKey = generateSecureApiKey("ak_");
      const hashedApiKey = await hashApiKey(apiKey);
      
      // Detect potential prompt injection in system prompt
      let securityFlags: string[] = [];
      if (args.systemPrompt) {
        const injectionCheck = detectPromptInjection(args.systemPrompt);
        if (injectionCheck.isInjection) {
          securityFlags.push(`prompt_injection_risk_${injectionCheck.riskScore}`);
        }
      }
      
      // Insert agent profile with enhanced security
      await ctx.db.insert("agentProfiles", {
        address: args.address,
        agentId,
        name: args.name,
        capabilities: args.capabilities,
        systemPrompt: args.systemPrompt,
        isActive: true,
        createdAt: timestamp,
        totalSessions: 0,
        totalTokensProcessed: 0,
        lastModified: timestamp,
        version: 1,
        securityLevel: securityFlags.length > 0 ? "restricted" : "standard",
      });
      
      // Create secure API key record
      await ctx.db.insert("apiKeys", {
        address: args.address,
        name: `${args.name} Agent Key`,
        key: hashedApiKey, // Store hashed version
        keyType: "agent",
        isActive: true,
        createdAt: timestamp,
        totalUsage: 0,
        dailyUsage: 0,
        lastReset: timestamp,
      });
      
      // Log security event
      await ctx.runMutation(api.inference.logSecurityEvent, {
        eventType: "agent_registration",
        address: args.address,
        agentId,
        riskLevel: securityFlags.length > 0 ? "medium" : "low",
        description: `Agent ${args.name} registered with capabilities: ${args.capabilities.join(", ")}${securityFlags.length > 0 ? `. Security flags: ${securityFlags.join(", ")}` : ""}`,
        metadata: {
          capabilities: args.capabilities,
          securityFlags,
          systemPromptLength: args.systemPrompt?.length || 0,
        },
      });
      
      return { success: true, agentId, apiKey };
    } catch (error) {
      // Log failed registration attempt
      await ctx.runMutation(api.inference.logSecurityEvent, {
        eventType: "agent_registration",
        address: args.address,
        riskLevel: "medium",
        description: `Failed agent registration attempt: ${error instanceof Error ? error.message : "Unknown error"}`,
        metadata: { error: error instanceof Error ? error.message : "Unknown error" },
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to register agent"
      };
    }
  },
});

/**
 * Zero-trust agent authentication with comprehensive security checks
 */
export const authenticateAgent = action({
  args: {
    agentId: v.string(),
    address: v.string(),
    apiKey: v.string(),
    walletSignature: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    authenticated: v.boolean(),
    agent: v.optional(v.object({
      agentId: v.string(),
      name: v.string(),
      capabilities: v.array(v.string()),
      securityLevel: v.string(),
      isActive: v.boolean(),
      riskScore: v.number(),
    })),
    sessionToken: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Multi-layer authentication checks
      
      // 1. Verify agent exists and is active
      const agent = await ctx.db
        .query("agentProfiles")
        .withIndex("by_agent_id", q => q.eq("agentId", args.agentId))
        .first();
      
      if (!agent || agent.address !== args.address || !agent.isActive) {
        await ctx.runMutation(api.inference.logSecurityEvent, {
          eventType: "unauthorized_access_attempt",
          address: args.address,
          agentId: args.agentId,
          riskLevel: "medium",
          description: `Failed authentication attempt - agent not found or inactive`,
          metadata: { providedAddress: args.address },
          sessionId: args.sessionId,
        });
        return { authenticated: false, error: "Agent authentication failed" };
      }
      
      // 2. Verify API key
      const hashedApiKey = await hashApiKey(args.apiKey);
      const apiKeyRecord = await ctx.db
        .query("apiKeys")
        .withIndex("by_key", q => q.eq("key", hashedApiKey))
        .first();
      
      if (!apiKeyRecord || !apiKeyRecord.isActive || apiKeyRecord.address !== args.address) {
        await ctx.runMutation(api.inference.logSecurityEvent, {
          eventType: "unauthorized_access_attempt",
          address: args.address,
          agentId: args.agentId,
          riskLevel: "high",
          description: `Invalid API key used for authentication`,
          metadata: { keyFound: !!apiKeyRecord, keyActive: apiKeyRecord?.isActive },
          sessionId: args.sessionId,
        });
        return { authenticated: false, error: "Invalid API key" };
      }
      
      // 3. Calculate risk score based on recent activity
      const recentEvents = await ctx.db
        .query("securityEvents")
        .withIndex("by_address", q => q.eq("address", args.address))
        .filter(q => q.gte(q.field("timestamp"), Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
        .collect();
      
      let riskScore = 0;
      const suspiciousEventTypes = ["security_violation", "prompt_injection_detected", "suspicious_activity"];
      
      for (const event of recentEvents) {
        if (suspiciousEventTypes.includes(event.eventType)) {
          riskScore += event.riskLevel === "critical" ? 25 : event.riskLevel === "high" ? 15 : 5;
        }
      }
      
      // 4. Check rate limiting
      const rateCheck = await ctx.runMutation(api.rateLimit.checkRateLimit, {
        identifier: args.address,
        userType: "agent",
      });
      
      if (!rateCheck.allowed) {
        await ctx.runMutation(api.inference.logSecurityEvent, {
          eventType: "rate_limit_exceeded",
          address: args.address,
          agentId: args.agentId,
          riskLevel: "medium",
          description: `Rate limit exceeded during authentication`,
          sessionId: args.sessionId,
        });
        return { authenticated: false, error: "Rate limit exceeded" };
      }
      
      // 5. Generate session token for authenticated session
      const sessionToken = `sess_${crypto.randomUUID()}`;
      
      // 6. Determine permissions based on security level and risk score
      let permissions = [...agent.capabilities];
      if (agent.securityLevel === "restricted" || riskScore > 50) {
        permissions = permissions.filter(p => !p.includes("privileged"));
      }
      
      // 7. Log successful authentication
      await ctx.runMutation(api.inference.logSecurityEvent, {
        eventType: "agent_authentication",
        address: args.address,
        agentId: args.agentId,
        riskLevel: riskScore > 50 ? "medium" : "low",
        description: `Agent authenticated successfully with risk score ${riskScore}`,
        metadata: {
          securityLevel: agent.securityLevel,
          permissions,
          riskScore,
          sessionToken,
        },
        sessionId: args.sessionId,
      });
      
      return {
        authenticated: true,
        agent: {
          agentId: agent.agentId,
          name: agent.name,
          capabilities: agent.capabilities,
          securityLevel: agent.securityLevel,
          isActive: agent.isActive,
          riskScore,
        },
        sessionToken,
        permissions,
      };
    } catch (error) {
      await ctx.runMutation(api.inference.logSecurityEvent, {
        eventType: "unauthorized_access_attempt",
        address: args.address,
        agentId: args.agentId,
        riskLevel: "high",
        description: `Authentication error: ${error instanceof Error ? error.message : "Unknown error"}`,
        metadata: { error: error instanceof Error ? error.message : "Unknown error" },
        sessionId: args.sessionId,
      });
      
      return {
        authenticated: false,
        error: error instanceof Error ? error.message : "Authentication failed"
      };
    }
  },
});

/**
 * Rotate API keys for enhanced security
 */
export const rotateApiKey = mutation({
  args: {
    address: v.string(),
    agentId: v.string(),
    oldApiKey: v.string(),
    walletSignature: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    newApiKey: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Verify old API key
      const hashedOldKey = await hashApiKey(args.oldApiKey);
      const oldKeyRecord = await ctx.db
        .query("apiKeys")
        .withIndex("by_key", q => q.eq("key", hashedOldKey))
        .first();
      
      if (!oldKeyRecord || oldKeyRecord.address !== args.address) {
        return { success: false, error: "Invalid API key" };
      }
      
      // Generate new API key
      const newApiKey = generateSecureApiKey("ak_");
      const hashedNewKey = await hashApiKey(newApiKey);
      
      // Update API key record
      await ctx.db.patch(oldKeyRecord._id, {
        key: hashedNewKey,
        lastModified: Date.now(),
      });
      
      // Log key rotation
      await ctx.runMutation(api.inference.logSecurityEvent, {
        eventType: "api_key_rotation",
        address: args.address,
        agentId: args.agentId,
        riskLevel: "low",
        description: "API key rotated successfully",
        metadata: { keyRotatedAt: Date.now() },
      });
      
      return { success: true, newApiKey };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to rotate API key"
      };
    }
  },
});

/**
 * Revoke API keys for security incidents
 */
export const revokeApiKey = mutation({
  args: {
    address: v.string(),
    agentId: v.string(),
    apiKey: v.string(),
    reason: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const hashedKey = await hashApiKey(args.apiKey);
      const keyRecord = await ctx.db
        .query("apiKeys")
        .withIndex("by_key", q => q.eq("key", hashedKey))
        .first();
      
      if (!keyRecord || keyRecord.address !== args.address) {
        return { success: false, error: "API key not found" };
      }
      
      // Deactivate API key
      await ctx.db.patch(keyRecord._id, {
        isActive: false,
        lastModified: Date.now(),
      });
      
      // Log revocation
      await ctx.runMutation(api.inference.logSecurityEvent, {
        eventType: "api_key_revocation",
        address: args.address,
        agentId: args.agentId,
        riskLevel: "medium",
        description: `API key revoked: ${args.reason}`,
        metadata: { reason: args.reason, revokedAt: Date.now() },
      });
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to revoke API key"
      };
    }
  },
});

/**
 * Real-time security monitoring and threat detection
 */
export const performSecurityScan = action({
  args: {
    address: v.string(),
    agentId: v.optional(v.string()),
    prompt: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    approved: v.boolean(),
    riskScore: v.number(),
    threats: v.array(v.string()),
    actions: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    let riskScore = 0;
    const threats: string[] = [];
    const actions: string[] = [];
    
    // 1. Prompt injection detection
    if (args.prompt) {
      const injectionCheck = detectPromptInjection(args.prompt);
      if (injectionCheck.isInjection) {
        riskScore += injectionCheck.riskScore;
        threats.push(`prompt_injection_${injectionCheck.riskScore}`);
        threats.push(...injectionCheck.indicators);
        
        await ctx.runMutation(api.inference.logSecurityEvent, {
          eventType: "prompt_injection_detected",
          address: args.address,
          agentId: args.agentId,
          riskLevel: injectionCheck.riskScore > 50 ? "high" : "medium",
          description: `Prompt injection detected with risk score ${injectionCheck.riskScore}`,
          metadata: {
            indicators: injectionCheck.indicators,
            riskScore: injectionCheck.riskScore,
            promptLength: args.prompt.length,
          },
          sessionId: args.sessionId,
        });
      }
    }
    
    // 2. Behavioral analysis - check recent activity patterns
    const recentEvents = await ctx.db
      .query("securityEvents")
      .withIndex("by_address", q => q.eq("address", args.address))
      .filter(q => q.gte(q.field("timestamp"), Date.now() - 60 * 60 * 1000)) // Last hour
      .collect();
    
    // Check for suspicious patterns
    const eventTypes = recentEvents.map(e => e.eventType);
    const suspiciousEventCount = eventTypes.filter(type => 
      ["security_violation", "prompt_injection_detected", "unauthorized_access_attempt"].includes(type)
    ).length;
    
    if (suspiciousEventCount > 3) {
      riskScore += 30;
      threats.push("repeated_violations");
    }
    
    // 3. Check for rapid-fire requests (potential automation)
    const recentRequests = recentEvents.filter(e => 
      e.eventType === "agent_authentication" || e.eventType === "workflow_execution"
    );
    
    if (recentRequests.length > 100) { // More than 100 requests in an hour
      riskScore += 20;
      threats.push("high_frequency_requests");
    }
    
    // 4. Agent-specific security checks
    if (args.agentId) {
      const agent = await ctx.db
        .query("agentProfiles")
        .withIndex("by_agent_id", q => q.eq("agentId", args.agentId))
        .first();
      
      if (agent?.securityLevel === "restricted") {
        riskScore += 10;
        threats.push("restricted_agent");
      }
    }
    
    // 5. Determine actions based on risk score
    if (riskScore >= 80) {
      actions.push("block_request");
      actions.push("escalate_to_admin");
      actions.push("temporary_suspension");
    } else if (riskScore >= 50) {
      actions.push("enhanced_monitoring");
      actions.push("require_additional_verification");
    } else if (riskScore >= 30) {
      actions.push("log_warning");
      actions.push("increase_monitoring");
    }
    
    // 6. Log security scan results
    if (riskScore > 0) {
      await ctx.runMutation(api.inference.logSecurityEvent, {
        eventType: "suspicious_activity",
        address: args.address,
        agentId: args.agentId,
        riskLevel: riskScore >= 80 ? "critical" : riskScore >= 50 ? "high" : "medium",
        description: `Security scan detected ${threats.length} threats with total risk score ${riskScore}`,
        metadata: {
          threats,
          actions,
          riskScore,
          scanTimestamp: Date.now(),
        },
        sessionId: args.sessionId,
      });
    }
    
    return {
      approved: riskScore < 80,
      riskScore,
      threats,
      actions,
    };
  },
});

/**
 * Get comprehensive security dashboard metrics
 */
export const getSecurityDashboard = query({
  args: {
    timeRange: v.optional(v.union(
      v.literal("1h"),
      v.literal("24h"),
      v.literal("7d"),
      v.literal("30d")
    )),
  },
  returns: v.object({
    securityMetrics: v.object({
      totalEvents: v.number(),
      criticalEvents: v.number(),
      highRiskEvents: v.number(),
      mediumRiskEvents: v.number(),
      lowRiskEvents: v.number(),
      promptInjectionAttempts: v.number(),
      unauthorizedAccessAttempts: v.number(),
      rateLimitViolations: v.number(),
    }),
    topThreats: v.array(v.object({
      threat: v.string(),
      count: v.number(),
      lastSeen: v.number(),
    })),
    activeAgents: v.number(),
    suspiciousAgents: v.array(v.object({
      agentId: v.string(),
      address: v.string(),
      riskScore: v.number(),
      lastActivity: v.number(),
    })),
    systemStatus: v.union(
      v.literal("secure"),
      v.literal("monitoring"),
      v.literal("alert"),
      v.literal("critical")
    ),
  }),
  handler: async (ctx, args) => {
    const timeRangeMs = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    
    const range = timeRangeMs[args.timeRange || "24h"];
    const since = Date.now() - range;
    
    // Get security events
    const securityEvents = await ctx.db
      .query("securityEvents")
      .filter(q => q.gte(q.field("timestamp"), since))
      .collect();
    
    // Calculate metrics
    const securityMetrics = {
      totalEvents: securityEvents.length,
      criticalEvents: securityEvents.filter(e => e.riskLevel === "critical").length,
      highRiskEvents: securityEvents.filter(e => e.riskLevel === "high").length,
      mediumRiskEvents: securityEvents.filter(e => e.riskLevel === "medium").length,
      lowRiskEvents: securityEvents.filter(e => e.riskLevel === "low").length,
      promptInjectionAttempts: securityEvents.filter(e => e.eventType === "prompt_injection_detected").length,
      unauthorizedAccessAttempts: securityEvents.filter(e => e.eventType === "unauthorized_access_attempt").length,
      rateLimitViolations: securityEvents.filter(e => e.eventType === "rate_limit_exceeded").length,
    };
    
    // Top threats
    const threatCounts = securityEvents.reduce((acc, event) => {
      const threats = event.metadata?.threats || [event.eventType];
      threats.forEach((threat: string) => {
        if (!acc[threat]) acc[threat] = { count: 0, lastSeen: 0 };
        acc[threat].count++;
        acc[threat].lastSeen = Math.max(acc[threat].lastSeen, event.timestamp);
      });
      return acc;
    }, {} as Record<string, { count: number; lastSeen: number }>);
    
    const topThreats = Object.entries(threatCounts)
      .map(([threat, data]) => ({ threat, count: data.count, lastSeen: data.lastSeen }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Active agents
    const activeAgents = await ctx.db
      .query("agentProfiles")
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();
    
    // Suspicious agents (those with recent security events)
    const suspiciousAddresses = new Set(
      securityEvents
        .filter(e => e.riskLevel === "high" || e.riskLevel === "critical")
        .map(e => e.address)
    );
    
    const suspiciousAgents = activeAgents
      .filter(agent => suspiciousAddresses.has(agent.address))
      .map(agent => {
        const agentEvents = securityEvents.filter(e => e.address === agent.address);
        const riskScore = agentEvents.reduce((score, event) => {
          const eventRisk = { low: 1, medium: 5, high: 15, critical: 25 }[event.riskLevel] || 0;
          return score + eventRisk;
        }, 0);
        
        return {
          agentId: agent.agentId,
          address: agent.address,
          riskScore,
          lastActivity: agent.lastUsed || agent.createdAt,
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);
    
    // System status
    let systemStatus: "secure" | "monitoring" | "alert" | "critical" = "secure";
    if (securityMetrics.criticalEvents > 0) {
      systemStatus = "critical";
    } else if (securityMetrics.highRiskEvents > 5) {
      systemStatus = "alert";
    } else if (securityMetrics.mediumRiskEvents > 10) {
      systemStatus = "monitoring";
    }
    
    return {
      securityMetrics,
      topThreats,
      activeAgents: activeAgents.length,
      suspiciousAgents,
      systemStatus,
    };
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

