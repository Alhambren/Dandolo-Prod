import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { 
  createApiKeyFingerprint, 
  createSecureHash,
  validateApiKeyFormat 
} from "./crypto";

// Helper to verify wallet ownership for authenticated mutations
async function verifyWalletOwnership(ctx: any, claimedAddress: string, signature: string, message: string): Promise<boolean> {
  try {
    return await ctx.runAction(internal.cryptoSecure.verifyEthereumSignature, {
      message: message,
      signature: signature,
      expectedSigner: claimedAddress
    });
  } catch (error) {
    console.error("Wallet verification failed:", error);
    return false;
  }
}

// DEPRECATED: Legacy hash function - replaced with secure fingerprinting
// Kept temporarily for migration compatibility
function hashApiKey(apiKey: string): string {
  return createSecureHash(apiKey);
}

// Internal helper to get provider by ID
export const getProviderById = internalQuery({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.providerId);
  },
});

// Internal mutation to check existing provider by address
export const checkExistingProvider = internalMutation({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("address"), args.address))
      .first();
  },
});

// Internal mutation to check duplicate API key
export const checkDuplicateApiKey = internalMutation({
  args: { apiKeyHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("apiKeyHash"), args.apiKeyHash))
      .first();
  },
});

// Internal mutation to create provider
export const createProviderMutation = internalMutation({
  args: {
    address: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    veniceApiKey: v.string(),
    encryptionIv: v.string(),
    authTag: v.string(),
    apiKeyHash: v.string(),
  },
  handler: async (ctx, args) => {
    const providerId = await ctx.db.insert("providers", {
      address: args.address,
      name: args.name,
      description: args.description,
      veniceApiKey: args.veniceApiKey,
      encryptionIv: args.encryptionIv,
      authTag: args.authTag,
      encryptionVersion: 2, // Mark as using AES-256-GCM
      apiKeyHash: args.apiKeyHash,
      vcuBalance: 0,
      isActive: false,
      totalPrompts: 0,
      registrationDate: Date.now(),
      avgResponseTime: 0,
      status: "pending",
    });

    // Initialize points
    await ctx.db.insert("providerPoints", {
      providerId: providerId,
      address: args.address,
      totalPoints: 0,
      vcuProviderPoints: 0,
      promptServicePoints: 0,
      developerApiPoints: 0,
      agentApiPoints: 0,
      totalPrompts: 0,
      lastEarned: Date.now(),
      isProviderActive: false,
    });

    return providerId;
  },
});

// Internal mutation to create provider with VCU
export const createProviderWithVCUMutation = internalMutation({
  args: {
    address: v.string(),
    name: v.string(),
    veniceApiKey: v.string(),
    encryptionIv: v.string(),
    authTag: v.string(),
    apiKeyHash: v.string(),
    vcuBalance: v.number(),
  },
  handler: async (ctx, args) => {
    const providerId = await ctx.db.insert("providers", {
      address: args.address,
      name: args.name,
      description: "Venice.ai Provider",
      veniceApiKey: args.veniceApiKey,
      encryptionIv: args.encryptionIv,
      authTag: args.authTag,
      encryptionVersion: 2, // Mark as using AES-256-GCM
      apiKeyHash: args.apiKeyHash,
      vcuBalance: args.vcuBalance,
      isActive: true,
      totalPrompts: 0,
      registrationDate: Date.now(),
      avgResponseTime: 0,
      status: "active",
    });

    // Initialize points
    await ctx.db.insert("providerPoints", {
      providerId: providerId,
      address: args.address,
      totalPoints: 0,
      vcuProviderPoints: 0,
      promptServicePoints: 0,
      developerApiPoints: 0,
      agentApiPoints: 0,
      totalPrompts: 0,
      lastEarned: Date.now(),
      isProviderActive: true,
    });

    return providerId;
  },
});

// Internal action to securely decrypt API keys for inference
export const getDecryptedApiKey = internalAction({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args): Promise<string> => {
    const provider = await ctx.runQuery(internal.providers.getProviderById, { 
      providerId: args.providerId 
    });
    if (!provider) {
      throw new Error("Provider not found");
    }

    // Check encryption version
    if (provider.encryptionVersion === 2 && provider.encryptionIv && provider.authTag) {
      // AES-256-GCM encryption - use secure crypto actions
      try {
        return await ctx.runAction(internal.cryptoSecure.decryptApiKey, {
          encrypted: provider.veniceApiKey,
          iv: provider.encryptionIv,
          authTag: provider.authTag
        });
      } catch (error) {
        throw new Error("Failed to decrypt API key with AES-256-GCM");
      }
    } else if (provider.apiKeySalt) {
      // Legacy XOR encryption - DEPRECATED but supported for migration
      try {
        const encrypted = atob(provider.veniceApiKey);
        let decrypted = '';
        for (let i = 0; i < encrypted.length; i++) {
          const encChar = encrypted.charCodeAt(i);
          const saltChar = provider.apiKeySalt.charCodeAt(i % provider.apiKeySalt.length);
          decrypted += String.fromCharCode(encChar ^ saltChar);
        }
        return decrypted;
      } catch (error) {
        throw new Error("Failed to decrypt API key with legacy XOR");
      }
    }
    
    // Check if it's base64 encoded (temporary encoding)
    try {
      const decoded = atob(provider.veniceApiKey);
      if (decoded.length > 10 && (decoded.startsWith('vn_') || decoded.startsWith('sk-'))) {
        return decoded;
      }
    } catch {
      // Not base64, treat as plaintext
    }
    
    // Legacy plaintext providers
    return provider.veniceApiKey;
  },
});

// Validate Venice.ai API key and calculate available VCU
export const validateVeniceApiKey = action({
  args: { apiKey: v.string() },
  handler: async (_ctx, args) => {
    const key = args.apiKey.trim();
    
    // 1. Check against blocked patterns from other providers
    const BLOCKED_PREFIXES = [
      'sk-',     // Another provider
      'claude-', // Anthropic legacy
      'sk-ant-', // Anthropic current
      'key-',    // Generic/Perplexity
      'hf_',     // HuggingFace
      'api-',    // Generic
      'gsk_',    // Groq
      'pk-',     // Poe
      'xai-',    // xAI
    ];
    
    // Check if key starts with known non-Venice prefixes
    for (const prefix of BLOCKED_PREFIXES) {
      if (key.startsWith(prefix)) {
        const providerName = prefix === 'sk-' ? 'another provider' :
                            prefix === 'claude-' || prefix === 'sk-ant-' ? 'Anthropic' :
                            prefix === 'hf_' ? 'HuggingFace' :
                            prefix === 'gsk_' ? 'Groq' :
                            prefix === 'xai-' ? 'xAI' :
                            'another provider';
        return { 
          isValid: false, 
          error: `This appears to be a ${providerName} API key. Dandolo requires Venice.ai keys for decentralized compute. Get your key from venice.ai`
        };
      }
    }
    
    // 2. Basic format validation for Venice.ai keys
    if (key.length < 16) {
      return { 
        isValid: false, 
        error: "API key too short. Venice.ai keys are typically 32+ characters of alphanumeric text."
      };
    }
    
    try {
      // 3. Get VCU balance from Venice.ai models endpoint (rate limits endpoint doesn't exist)
      const modelsResponse = await fetch("https://api.venice.ai/api/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
      });

      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        
        // Verify response contains Venice.ai-specific model patterns
        const veniceModelPrefixes = ['venice-', 'v-', 'model-'];
        const hasVeniceModel = modelsData.data?.some((model: any) => 
          veniceModelPrefixes.some(prefix => model.id?.toLowerCase().includes(prefix.toLowerCase()))
        );
        
        if (!hasVeniceModel && modelsData.data?.length > 0) {
          return { 
            isValid: false, 
            error: "This API key works but doesn't appear to be from Venice.ai. Please get your key from venice.ai"
          };
        }

        // UPDATED: Venice.ai has fixed their API - inference keys can now query balances!
        // Try to fetch balance from the rate_limits endpoint
        let balanceUSD = 0;
        let balanceWarning = null;
        
        try {
          console.log('Fetching balance from Venice.ai rate_limits endpoint...');
          const balanceResponse = await fetch("https://api.venice.ai/api/v1/api_keys/rate_limits", {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${args.apiKey}`,
              "Content-Type": "application/json",
            },
          });
          
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            console.log('Venice balance response:', balanceData);
            
            // Extract balance from different possible response formats
            if (balanceData.balance !== undefined) {
              balanceUSD = parseFloat(balanceData.balance) || 0;
            } else if (balanceData.vcu_balance !== undefined) {
              balanceUSD = parseFloat(balanceData.vcu_balance) || 0;
            } else if (balanceData.credits !== undefined) {
              balanceUSD = parseFloat(balanceData.credits) || 0;
            } else if (balanceData.remaining_credits !== undefined) {
              balanceUSD = parseFloat(balanceData.remaining_credits) || 0;
            } else {
              console.log('No balance field found in response, checking for nested data...');
              // Check if balance is nested in data or account object
              const dataObj = balanceData.data || balanceData.account || balanceData;
              if (dataObj.balance !== undefined) {
                balanceUSD = parseFloat(dataObj.balance) || 0;
              } else if (dataObj.vcu_balance !== undefined) {
                balanceUSD = parseFloat(dataObj.vcu_balance) || 0;
              }
            }
            
            console.log('Extracted balance:', balanceUSD);
          } else {
            console.log('Balance fetch failed:', balanceResponse.status, await balanceResponse.text());
            balanceWarning = "Balance detection failed - you can enter it manually";
          }
        } catch (balanceError) {
          console.log('Balance fetch error:', balanceError);
          balanceWarning = "Balance detection unavailable - you can enter it manually";
        }
        
        return {
          isValid: true,
          balance: balanceUSD,
          currency: "USD", 
          models: modelsData.data?.length || 0,
          warning: balanceWarning
        };
      } else if (modelsResponse.status === 401) {
        return { isValid: false, error: "Invalid Venice.ai API key. Check your key at venice.ai" };
      } else if (modelsResponse.status === 429) {
        // Rate limited but key is valid
        return { isValid: true, balance: 0, currency: "USD", warning: "Rate limited during validation" };
      } else {
        return { isValid: false, error: `Venice.ai API error: ${modelsResponse.status}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // 5. Check for provider-specific error patterns
      if (errorMessage.includes("Invalid API key provided")) {
        return { isValid: false, error: "This appears to be a different provider's error. Please use your Venice.ai API key." };
      }
      
      return { isValid: false, error: "Failed to connect to Venice.ai. Please check your internet connection and API key." };
    }
  },
});


// SECURE: Register provider with wallet ownership verification and anti-Sybil checks
export const registerProvider = action({
  args: {
    address: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    veniceApiKey: v.string(),
    signature: v.string(), // Wallet signature proving ownership
    timestamp: v.number(), // Timestamp to prevent replay attacks
  },
  handler: async (ctx, args): Promise<any> => {
    const walletAddress = args.address;
    
    // Verify timestamp is recent (within 10 minutes)
    if (Math.abs(Date.now() - args.timestamp) > 10 * 60 * 1000) {
      throw new Error("Registration signature expired. Please sign again.");
    }
    
    // Verify wallet ownership - user must sign a message proving they control the wallet
    const message = `DANDOLO_PROVIDER_REGISTRATION_${args.address}_${args.timestamp}`;
    const isValidSignature = await verifyWalletOwnership(ctx, walletAddress, args.signature, message);
    
    if (!isValidSignature) {
      throw new Error("Invalid wallet signature. You must prove ownership of the wallet address to register as a provider.");
    }

    // One provider per wallet
    const existingProvider = await ctx.runMutation(internal.providers.checkExistingProvider, {
      address: walletAddress
    });

    if (existingProvider) {
      throw new Error("One provider per wallet address");
    }

    // No duplicate API keys - use secure fingerprinting
    const cleanApiKey = args.veniceApiKey.trim().replace(/['"]/g, "");
    
    // Validate API key format before processing
    if (!validateApiKeyFormat(cleanApiKey)) {
      throw new Error("Invalid API key format. Please use a valid Venice.ai API key.");
    }
    
    const apiKeyFingerprint = createApiKeyFingerprint(cleanApiKey);
    const duplicateKey = await ctx.runMutation(internal.providers.checkDuplicateApiKey, {
      apiKeyHash: apiKeyFingerprint
    });

    if (duplicateKey) {
      throw new Error("This API key is already registered");
    }

    // Encrypt API key with AES-256-GCM before storage
    const encryptionResult: { encrypted: string; iv: string; authTag: string } = await ctx.runAction(internal.cryptoSecure.encryptApiKey, {
      apiKey: cleanApiKey
    });

    // Create provider with AES-encrypted API key
    const providerId = await ctx.runMutation(internal.providers.createProviderMutation, {
      address: args.address,
      name: args.name,
      description: args.description,
      veniceApiKey: encryptionResult.encrypted,
      encryptionIv: encryptionResult.iv,
      authTag: encryptionResult.authTag,
      apiKeyHash: apiKeyFingerprint,
    });

    return providerId;
  },
});

// PROVIDER REGISTRATION WITH ACTUAL VCU BALANCE
export const registerProviderWithVCU = action({
  args: {
    address: v.string(),
    name: v.string(),
    veniceApiKey: v.string(),
    vcuBalance: v.number(),
  },
  handler: async (ctx, args): Promise<any> => {
    // No auth check needed - using wallet signatures for verification
    const walletAddress = args.address;

    // One provider per wallet
    const existingProvider = await ctx.runMutation(internal.providers.checkExistingProvider, {
      address: walletAddress
    });

    if (existingProvider) {
      throw new Error("One provider per wallet address");
    }

    // No duplicate API keys - use secure fingerprinting
    const cleanApiKey = args.veniceApiKey.trim().replace(/['"]/g, "");
    
    // Validate API key format before processing
    if (!validateApiKeyFormat(cleanApiKey)) {
      throw new Error("Invalid API key format. Please use a valid Venice.ai API key.");
    }
    
    const apiKeyFingerprint = createApiKeyFingerprint(cleanApiKey);
    const duplicateKey = await ctx.runMutation(internal.providers.checkDuplicateApiKey, {
      apiKeyHash: apiKeyFingerprint
    });

    if (duplicateKey) {
      throw new Error("This API key is already registered");
    }

    // Encrypt API key with AES-256-GCM before storage
    const encryptionResult: { encrypted: string; iv: string; authTag: string } = await ctx.runAction(internal.cryptoSecure.encryptApiKey, {
      apiKey: cleanApiKey
    });

    // Create provider with actual VCU balance and AES-encrypted API key
    const providerId = await ctx.runMutation(internal.providers.createProviderWithVCUMutation, {
      address: walletAddress,
      name: args.name,
      veniceApiKey: encryptionResult.encrypted,
      encryptionIv: encryptionResult.iv,
      authTag: encryptionResult.authTag,
      apiKeyHash: apiKeyFingerprint,
      vcuBalance: args.vcuBalance,
    });

    return providerId;
  },
});

// SECURE: Select random active provider (internal use only - no API keys exposed)
export const selectProvider = internalQuery({
  args: {},
  handler: async (ctx) => {
    const activeProviders = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    if (activeProviders.length === 0) return null;
    
    // MVP: Simple random selection
    const randomIndex = Math.floor(Math.random() * activeProviders.length);
    return activeProviders[randomIndex];
  },
});

// PUBLIC: Get provider info without sensitive data (for client-side display)
export const getProviderInfo = query({
  args: { providerId: v.optional(v.id("providers")) },
  handler: async (ctx, args) => {
    if (args.providerId) {
      const provider = await ctx.db.get(args.providerId);
      if (!provider) return null;
      
      // Return only safe, public information
      return {
        _id: provider._id,
        name: provider.name,
        region: provider.region || 'Unknown',
        isActive: provider.isActive,
        totalPrompts: provider.totalPrompts || 0,
        joinedAt: provider._creationTime,
        // NEVER include veniceApiKey, apiKeySalt, walletAddress, or other sensitive data
      };
    }
    
    // Return list of active providers (public info only)
    const activeProviders = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    return activeProviders.map(provider => ({
      _id: provider._id,
      name: provider.name,
      region: provider.region,
      isActive: provider.isActive,
      totalPrompts: provider.totalPrompts || 0,
      joinedAt: provider._creationTime,
    }));
  },
});

export const awardProviderPoints = mutation({
  args: {
    providerId: v.id("providers"),
    promptsServed: v.number(),
    tokensProcessed: v.optional(v.number()),
    transactionType: v.optional(v.union(
      v.literal("prompt_served"),
      v.literal("developer_api"),
      v.literal("agent_api"),
      v.literal("vcu_daily_reward")
    )),
    apiKeyType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return;

    // New point system: 1 point per 100 tokens processed
    const pointsEarned = args.tokensProcessed
      ? Math.floor(args.tokensProcessed / 100)
      : args.promptsServed * 100;

    const transactionType = args.transactionType || "prompt_served";

    // Update provider stats
    await ctx.db.patch(args.providerId, {
      totalPrompts: (provider.totalPrompts ?? 0) + args.promptsServed,
    });

    // Get or create provider points record
    const pointsRecord = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();

    if (pointsRecord) {
      // Update existing record with categorized points
      // Handle legacy 'points' field if totalPoints is missing
      const currentTotalPoints = pointsRecord.totalPoints ?? pointsRecord.points ?? 0;
      const updates: any = {
        totalPoints: currentTotalPoints + pointsEarned,
        totalPrompts: (pointsRecord.totalPrompts ?? 0) + args.promptsServed,
        lastEarned: Date.now(),
        isProviderActive: provider.isActive,
      };

      // Categorize points by type
      switch (transactionType) {
        case "prompt_served":
          updates.promptServicePoints = (pointsRecord.promptServicePoints ?? 0) + pointsEarned;
          break;
        case "developer_api":
          updates.developerApiPoints = (pointsRecord.developerApiPoints ?? 0) + pointsEarned;
          break;
        case "agent_api":
          updates.agentApiPoints = (pointsRecord.agentApiPoints ?? 0) + pointsEarned;
          break;
        case "vcu_daily_reward":
          updates.vcuProviderPoints = (pointsRecord.vcuProviderPoints ?? 0) + pointsEarned;
          break;
      }

      await ctx.db.patch(pointsRecord._id, updates);
    } else {
      // Create new provider points record
      const newRecord: any = {
        providerId: args.providerId,
        address: provider.address,
        totalPoints: pointsEarned,
        vcuProviderPoints: 0,
        promptServicePoints: 0,
        developerApiPoints: 0,
        agentApiPoints: 0,
        totalPrompts: args.promptsServed,
        lastEarned: Date.now(),
        isProviderActive: provider.isActive,
      };

      // Set category-specific points
      switch (transactionType) {
        case "prompt_served":
          newRecord.promptServicePoints = pointsEarned;
          break;
        case "developer_api":
          newRecord.developerApiPoints = pointsEarned;
          break;
        case "agent_api":
          newRecord.agentApiPoints = pointsEarned;
          break;
        case "vcu_daily_reward":
          newRecord.vcuProviderPoints = pointsEarned;
          break;
      }

      await ctx.db.insert("providerPoints", newRecord);
    }

    // Log detailed transaction
    await ctx.db.insert("pointsTransactions", {
      address: provider.address,
      providerId: args.providerId,
      pointsEarned,
      transactionType,
      details: {
        tokensProcessed: args.tokensProcessed,
        requestCount: args.promptsServed,
        apiKeyType: args.apiKeyType,
      },
      timestamp: Date.now(),
      isProviderActive: provider.isActive,
    });
  },
});

// MVP: Update provider health
export const updateProviderHealth = mutation({
  args: {
    providerId: v.id("providers"),
    isHealthy: v.boolean(),
    responseTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    const newAvgResponseTime = provider.avgResponseTime && args.responseTime
      ? (provider.avgResponseTime * 0.9) + (args.responseTime * 0.1)
      : args.responseTime || provider.avgResponseTime || 0;

    await ctx.db.patch(args.providerId, {
      isActive: args.isHealthy,
      avgResponseTime: newAvgResponseTime,
    });
  },
});


// Get provider stats for dashboard with detailed points breakdown
export const getStats = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return null;

    const points = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();

    return {
      ...provider,
      veniceApiKey: undefined, // Never expose API key
      apiKeyHash: undefined, // Never expose hash
      points: points?.totalPoints ?? 0,
      pointsBreakdown: points ? {
        total: points.totalPoints ?? 0,
        vcuProviding: points.vcuProviderPoints ?? 0,
        promptService: points.promptServicePoints ?? 0,
        developerApi: points.developerApiPoints ?? 0,
        agentApi: points.agentApiPoints ?? 0,
      } : {
        total: 0,
        vcuProviding: 0,
        promptService: 0,
        developerApi: 0,
        agentApi: 0,
      }
    };
  },
});

// Get comprehensive points breakdown by address (persists even after provider removal)
export const getPointsByAddress = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    // Get all points records for this address (including inactive providers)
    const pointsRecords = await ctx.db
      .query("providerPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .collect();

    // Get recent transactions for this address
    const recentTransactions = await ctx.db
      .query("pointsTransactions")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .order("desc")
      .take(50);

    // Aggregate all points across all provider records
    const totalBreakdown = pointsRecords.reduce((acc, record) => {
      acc.total += record.totalPoints ?? 0;
      acc.vcuProviding += record.vcuProviderPoints ?? 0;
      acc.promptService += record.promptServicePoints ?? 0;
      acc.developerApi += record.developerApiPoints ?? 0;
      acc.agentApi += record.agentApiPoints ?? 0;
      return acc;
    }, {
      total: 0,
      vcuProviding: 0,
      promptService: 0,
      developerApi: 0,
      agentApi: 0,
    });

    return {
      address: args.address,
      totalPoints: totalBreakdown.total,
      breakdown: totalBreakdown,
      activeProviders: pointsRecords.filter(r => r.isProviderActive).length,
      totalProviders: pointsRecords.length,
      recentTransactions: recentTransactions.map(tx => ({
        id: tx._id,
        points: tx.pointsEarned,
        type: tx.transactionType,
        timestamp: tx.timestamp,
        details: tx.details,
        wasProviderActive: tx.isProviderActive,
      })),
    };
  },
});

export const getProviderHealth = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return null;

    return {
      lastCheck: provider.lastHealthCheck,
      isHealthy: provider.isActive,
      avgResponseTime: provider.avgResponseTime,
    };
  },
});

// Get all providers (without API keys) and refresh VCU for active ones
export const list = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db
      .query("providers")
      .collect();

    // Schedule VCU refresh for any providers with stale data (>2 hours old)
    const staleThreshold = Date.now() - (2 * 60 * 60 * 1000); // 2 hours
    
    // Note: Background VCU refresh is handled by hourly cron job

    return providers.map(provider => ({
      ...provider,
      veniceApiKey: undefined, // Never expose
      apiKeyHash: undefined, // Never expose
    }));
  },
});

// Get only active providers
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return providers.map(provider => ({
      ...provider,
      veniceApiKey: undefined,
      apiKeyHash: undefined,
    }));
  },
});

// CRITICAL: Internal query for active providers (with API keys for routing)
export const listActiveInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    try {
      const providers = await ctx.db
        .query("providers")
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
      
      return providers || [];
    } catch (error) {
      return [];
    }
  },
});

// Simple increment for prompt count
export const incrementPromptCount = mutation({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return;

    // Update provider stats
    await ctx.db.patch(args.providerId, {
      totalPrompts: (provider.totalPrompts ?? 0) + 1,
    });

    // Award 100 points per prompt
    const pointsRecord = await ctx.db
      .query("providerPoints")
      .filter((q) => q.eq(q.field("providerId"), args.providerId))
      .first();

    if (pointsRecord) {
      await ctx.db.patch(pointsRecord._id, {
        totalPoints: (pointsRecord.totalPoints ?? 0) + 100,
        totalPrompts: (pointsRecord.totalPrompts ?? 0) + 1,
      });
    }
  },
});

// Record health check result
export const recordHealthCheck = internalMutation({
  args: {
    providerId: v.id("providers"),
    status: v.boolean(),
    responseTime: v.number(),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    // Update provider health
    await ctx.db.patch(args.providerId, {
      lastHealthCheck: Date.now(),
      isActive: args.status,
      avgResponseTime: args.responseTime,
    });
  },
});

// Remove provider but preserve points history
export const remove = mutation({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return;

    // Mark provider points as inactive but don't delete them
    const points = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();
    
    if (points) {
      await ctx.db.patch(points._id, {
        isProviderActive: false,
      });
    }

    // Log the provider removal as a transaction
    await ctx.db.insert("pointsTransactions", {
      address: provider.address,
      providerId: args.providerId,
      pointsEarned: 0,
      transactionType: "adjustment",
      details: {
        description: "Provider removed - points preserved",
      },
      timestamp: Date.now(),
      isProviderActive: false,
    });

    // Remove the provider itself
    await ctx.db.delete(args.providerId);
  },
});

// Get top providers by points
export const getTopProviders = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const providersWithPoints = await Promise.all(
      providers.map(async (provider) => {
        const points = await ctx.db
          .query("providerPoints")
          .withIndex("by_provider", (q) => q.eq("providerId", provider._id))
          .first();

        return {
          ...provider,
          points: points?.totalPoints ?? 0,
          veniceApiKey: undefined,
          apiKeyHash: undefined,
        };
      })
    );

    return providersWithPoints
      .sort((a, b) => b.points - a.points)
      .slice(0, args.limit)
      .map(p => ({
        _id: p._id,
        name: p.name,
        address: p.address,
        isActive: p.isActive,
        vcuBalance: p.vcuBalance,
        totalPrompts: p.totalPrompts,
      }));
  },
});

// Get provider by ID (internal use)
export const getProvider = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    return provider ? {
      ...provider,
      veniceApiKey: undefined,
      apiKeyHash: undefined,
    } : null;
  },
});

// CRITICAL: Update VCU balance (internal mutation)
export const updateVCUBalance = internalMutation({
  args: {
    providerId: v.id("providers"),
    vcuBalance: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.db.patch(args.providerId, {
        vcuBalance: args.vcuBalance,
      });
    } catch (error) {
    }
  },
});

// Single health check implementation
async function runSingleHealthCheck(provider: any): Promise<{
  status: boolean;
  responseTime: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    // Use Venice.ai /models endpoint for lightweight health checks (as per MVP spec)
    const response = await fetch('https://api.venice.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${provider.veniceApiKey}`,
        'Content-Type': 'application/json'
      },
      // 30 second timeout for health checks
      signal: AbortSignal.timeout(30000)
    });
    
    const responseTime = Date.now() - start;
    
    if (response.ok) {
      return { status: true, responseTime };
    } else {
      return { 
        status: false, 
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    const responseTime = Date.now() - start;
    return {
      status: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Comprehensive health check system
export const runHealthChecks = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all providers (including inactive ones to potentially reactivate)
    const allProviders = await ctx.runQuery(internal.providers.getAllProviders);
    
    let healthyCount = 0;
    let unhealthyCount = 0;
    
    for (const provider of allProviders) {
      try {
        const result = await runSingleHealthCheck(provider);
        
        // Record health check result
        await ctx.runMutation(internal.providers.recordHealthCheckResult, {
          providerId: provider._id,
          status: result.status,
          responseTime: result.responseTime,
          error: result.error,
        });
        
        // Update provider status based on consecutive failures
        await ctx.runMutation(internal.providers.updateProviderStatus, {
          providerId: provider._id,
          healthCheckPassed: result.status,
        });
        
        if (result.status) {
          healthyCount++;
        } else {
          unhealthyCount++;
        }
        
      } catch (error) {
        unhealthyCount++;
        
        // Record failed health check
        await ctx.runMutation(internal.providers.recordHealthCheckResult, {
          providerId: provider._id,
          status: false,
          responseTime: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    
    return { healthy: healthyCount, unhealthy: unhealthyCount };
  },
});

// Get all providers including inactive ones (internal)
export const getAllProviders = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("providers").collect();
  },
});

// Debug function to test VCU validation
export const debugVCUValidation = action({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider: any = await ctx.runQuery(internal.providers.getById, { 
      id: args.providerId 
    });
    
    if (!provider || !provider.veniceApiKey) {
      return { error: "Provider not found or no API key" };
    }

    // Get current VCU balance from Venice.ai rate limits endpoint
    const validation: any = await ctx.runAction(api.providers.validateVeniceApiKey, {
      apiKey: provider.veniceApiKey
    });
    
    return {
      provider: {
        name: provider.name,
        currentVCUBalance: provider.vcuBalance,
        isActive: provider.isActive
      },
      validation: validation
    };
  },
});


// Record health check result with detailed tracking
export const recordHealthCheckResult = internalMutation({
  args: {
    providerId: v.id("providers"),
    status: v.boolean(),
    responseTime: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Record in health tracking table
    await ctx.db.insert("providerHealth", {
      providerId: args.providerId,
      status: args.status,
      responseTime: args.responseTime,
      timestamp: Date.now(),
      error: args.error,
    });
    
    // Update provider's last health check
    await ctx.db.patch(args.providerId, {
      lastHealthCheck: Date.now(),
    });
  },
});

// Update provider status based on health check results
export const updateProviderStatus = internalMutation({
  args: {
    providerId: v.id("providers"),
    healthCheckPassed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return;
    
    const currentFailures = provider.consecutiveFailures || 0;
    
    if (args.healthCheckPassed) {
      // Health check passed - reset failures and activate
      await ctx.db.patch(args.providerId, {
        consecutiveFailures: 0,
        isActive: true,
        markedInactiveAt: undefined,
      });
    } else {
      // Health check failed - increment failures
      const newFailures = currentFailures + 1;
      
      // Mark inactive after 2 consecutive failures
      const shouldMarkInactive = newFailures >= 2 && provider.isActive;
      
      await ctx.db.patch(args.providerId, {
        consecutiveFailures: newFailures,
        isActive: shouldMarkInactive ? false : provider.isActive,
        markedInactiveAt: shouldMarkInactive ? Date.now() : provider.markedInactiveAt,
      });
      
    }
  },
});

// Calculate provider uptime based on recent health checks
export const getProviderUptime = query({
  args: { 
    providerId: v.id("providers"),
    hours: v.optional(v.number()),
  },
  returns: v.object({
    uptime: v.number(),
    totalChecks: v.number(),
    successfulChecks: v.number(),
    lastCheck: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const hours = args.hours || 24;
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    
    const healthChecks = await ctx.db
      .query("providerHealth")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .collect();
    
    if (healthChecks.length === 0) {
      return { uptime: 0, totalChecks: 0, successfulChecks: 0 };
    }
    
    const successfulChecks = healthChecks.filter(check => check.status).length;
    const uptime = (successfulChecks / healthChecks.length) * 100;
    const lastCheck = Math.max(...healthChecks.map(check => check.timestamp));
    
    return {
      uptime: Math.round(uptime * 100) / 100, // Round to 2 decimal places
      totalChecks: healthChecks.length,
      successfulChecks,
      lastCheck,
    };
  },
});

// Get recent health check history
export const getHealthHistory = query({
  args: { 
    providerId: v.id("providers"),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    status: v.boolean(),
    responseTime: v.number(),
    timestamp: v.number(),
    error: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    const healthChecks = await ctx.db
      .query("providerHealth")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .order("desc")
      .take(limit);
    
    return healthChecks.map(check => ({
      status: check.status,
      responseTime: check.responseTime,
      timestamp: check.timestamp,
      error: check.error,
    }));
  },
});

// Placeholder for compatibility
export const performHealthCheck = action({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    // Simplified for MVP - actual health checks run via cron
  },
});

// Get leaderboard
export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const providerStats = await Promise.all(
      providers.map(async (provider) => {
        const points = await ctx.db
          .query("providerPoints")
          .filter((q) => q.eq(q.field("providerId"), provider._id))
          .first();

        return {
          ...provider,
          veniceApiKey: undefined,
          apiKeyHash: undefined,
          points: points?.totalPoints ?? 0,
          totalPrompts: points?.totalPrompts ?? 0,
        };
      })
    );

    return providerStats
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  },
});

export const getProviderStats = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_address", q => q.eq("address", args.address))
      .first();

    if (!provider) {
      return {
        totalPrompts: 0,
        avgResponseTime: 0,
        points: 0,
        isActive: false,
      };
    }

    const providerPoints = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", q => q.eq("providerId", provider._id))
      .first();

    return {
      totalPrompts: provider.totalPrompts ?? 0,
      avgResponseTime: provider.avgResponseTime ?? 0,
      points: providerPoints?.totalPoints ?? 0,
      isActive: provider.isActive,
    };
  },
});

export const updateProviderStats = internalMutation({
  args: {
    providerId: v.id("providers"),
    totalPrompts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return;

    const updates: any = {};
    if (args.totalPrompts !== undefined) updates.totalPrompts = args.totalPrompts;

    await ctx.db.patch(args.providerId, updates);
  },
});

// Internal query to fetch a provider by ID
export const getById = internalQuery({
  args: { id: v.id("providers") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

// Simple health check action
export const healthCheckProviders = action({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.runQuery(internal.providers.listActiveInternal);
    for (const provider of providers) {
      try {
        const response = await fetch("https://api.venice.ai/api/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${provider.veniceApiKey}`,
          },
        });
        await ctx.runMutation(internal.providers.updateHealthCheckInternal, {
          providerId: provider._id,
          isHealthy: response.ok,
          responseTime: Date.now(),
        });
      } catch (error) {
        await ctx.runMutation(internal.providers.updateHealthCheckInternal, {
          providerId: provider._id,
          isHealthy: false,
          responseTime: Date.now(),
        });
      }
    }
  },
});

// Internal mutation to update health check
export const updateHealthCheckInternal = internalMutation({
  args: {
    providerId: v.id("providers"),
    isHealthy: v.boolean(),
    responseTime: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.providerId, {
      lastHealthCheck: args.responseTime,
      isActive: args.isHealthy,
    });
  },
});

// Update provider stats when a prompt is served
export const recordPromptServed = internalMutation({
  args: { 
    providerId: v.id("providers"),
    responseTime: v.number(),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return;
    await ctx.db.patch(args.providerId, {
      totalPrompts: provider.totalPrompts + 1,
      avgResponseTime: ((provider.avgResponseTime || 0) * provider.totalPrompts + args.responseTime) / (provider.totalPrompts + 1),
    });
  },
});

// Refresh VCU balance for a single provider (internal use)
export const refreshSingleProviderVCU = internalAction({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args): Promise<{ success: boolean; updated?: boolean; oldBalance?: number; newBalance?: number; message?: string; error?: string }> => {
    try {
      const provider: any = await ctx.runQuery(internal.providers.getById, { 
        id: args.providerId 
      });
      
      if (!provider || !provider.veniceApiKey) {
        return { success: false, error: "Provider not found or no API key" };
      }

      // Get current VCU balance from Venice.ai rate limits endpoint
      const validation: any = await ctx.runAction(api.providers.validateVeniceApiKey, {
        apiKey: provider.veniceApiKey
      });
      
      if (validation.isValid) {
        // Use the detected balance if available, or 0 if not detected
        const newBalance = validation.balance || 0;
        
        // Always update if current balance is 0, otherwise only update if balance has changed significantly (>$0.50 difference)
        const shouldUpdate = (provider.vcuBalance || 0) === 0 || Math.abs(newBalance - (provider.vcuBalance || 0)) > 5;
        
        if (shouldUpdate) {
          await ctx.runMutation(internal.providers.updateVCUBalance, {
            providerId: args.providerId,
            vcuBalance: newBalance
          });
          return { 
            success: true, 
            updated: true,
            oldBalance: provider.vcuBalance,
            newBalance: newBalance
          };
        }
        return { success: true, updated: false, message: "Balance unchanged" };
      } else {
        // Mark provider as inactive if API key is invalid
        if (provider.isActive) {
          await ctx.runMutation(internal.providers.updateProviderStatus, {
            providerId: args.providerId,
            healthCheckPassed: false
          });
        }
        return { success: false, error: validation.error || "API key validation failed" };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  },
});

// Manual balance refresh action for debugging
// Automatically refresh VCU balances for all providers (called by cron)
export const refreshAllVCUBalances = internalAction({
  args: {},
  handler: async (ctx): Promise<{ totalProviders: number; updatedCount: number; errorCount: number }> => {
    const providers: any[] = await ctx.runQuery(internal.providers.getAllProviders);
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const provider of providers) {
      const result = await ctx.runAction(internal.providers.refreshSingleProviderVCU, {
        providerId: provider._id
      });
      
      if (result.success && result.updated) {
        updatedCount++;
      } else if (!result.success) {
        errorCount++;
      }
    }
    
    return { 
      totalProviders: providers.length, 
      updatedCount, 
      errorCount 
    };
  },
});

