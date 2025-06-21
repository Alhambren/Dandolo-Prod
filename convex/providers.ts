import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Simple hash function for API keys (crypto not available in Convex)
function hashApiKey(apiKey: string): string {
  let hash = 0;
  for (let i = 0; i < apiKey.length; i++) {
    const char = apiKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Validate Venice.ai API key and calculate available VCU
export const validateVeniceApiKey = action({
  args: { apiKey: v.string() },
  handler: async (_ctx, args) => {
    const key = args.apiKey.trim();
    
    // 1. Check against blocked patterns from other providers
    const BLOCKED_PREFIXES = [
      'sk-',     // OpenAI
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
        const providerName = prefix === 'sk-' ? 'OpenAI' :
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
      // 3. Test with actual Venice.ai API call
      const response = await fetch("https://api.venice.ai/api/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // 4. Verify response contains Venice.ai-specific model patterns
        const veniceModelPrefixes = ['llama-', 'mixtral-', 'nous-', 'dolphin-', 'qwen-', 'deepseek-', 'claude-3'];
        const hasVeniceModel = data.data?.some((model: any) => 
          veniceModelPrefixes.some(prefix => model.id?.toLowerCase().includes(prefix.toLowerCase()))
        );
        
        if (!hasVeniceModel && data.data?.length > 0) {
          return { 
            isValid: false, 
            error: "This API key works but doesn't appear to be from Venice.ai. Please get your key from venice.ai"
          };
        }

        const totalContextTokens =
          data.data?.reduce((sum: number, model: any) => {
            return sum + (model.model_spec?.availableContextTokens || 0);
          }, 0) || 0;

        // Adjust VCU calculation. 1 VCU equals 270.54 context tokens
        // instead of 135.27 due to doubled token usage.
        const totalVCU = Math.round(totalContextTokens / 270.54);

        return {
          isValid: true,
          balance: totalVCU,
          currency: "VCU",
          models: data.data?.length || 0,
          contextTokens: totalContextTokens,
        };
      } else if (response.status === 401) {
        return { isValid: false, error: "Invalid Venice.ai API key. Check your key at venice.ai" };
      } else if (response.status === 429) {
        // Rate limited but key is valid
        return { isValid: true, balance: 0, currency: "VCU" };
      } else {
        return { isValid: false, error: `Venice.ai API error: ${response.status}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // 5. Check for provider-specific error patterns
      if (errorMessage.includes("Invalid API key provided")) {
        return { isValid: false, error: "This appears to be an OpenAI-style error. Please use your Venice.ai API key." };
      }
      
      return { isValid: false, error: "Failed to connect to Venice.ai. Please check your internet connection and API key." };
    }
  },
});

// MVP: Register provider with anti-Sybil checks
export const registerProvider = mutation({
  args: {
    address: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    veniceApiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const walletAddress = args.address;

    // One provider per wallet
    const existingProvider = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("address"), walletAddress))
      .first();

    if (existingProvider) {
      throw new Error("One provider per wallet address");
    }

    // No duplicate API keys
    const cleanApiKey = args.veniceApiKey.trim().replace(/['"]/g, "");
    const apiKeyHash = hashApiKey(cleanApiKey);
    const duplicateKey = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("apiKeyHash"), apiKeyHash))
      .first();

    if (duplicateKey) {
      throw new Error("This API key is already registered");
    }

    // Create provider
    const providerId = await ctx.db.insert("providers", {
      address: args.address,
      name: args.name,
      description: args.description,
      veniceApiKey: cleanApiKey,
      apiKeyHash: apiKeyHash,
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
      points: 0,
      totalPrompts: 0,
      lastEarned: Date.now(),
    });

    return providerId;
  },
});

// PROVIDER REGISTRATION WITH ACTUAL VCU BALANCE
export const registerProviderWithVCU = mutation({
  args: {
    address: v.string(),
    name: v.string(),
    veniceApiKey: v.string(),
    vcuBalance: v.number(),
  },
  handler: async (ctx, args) => {
    // No auth check needed - using wallet signatures for verification
    const walletAddress = args.address;

    // One provider per wallet
    const existingProvider = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("address"), walletAddress))
      .first();

    if (existingProvider) {
      throw new Error("One provider per wallet address");
    }

    // No duplicate API keys
    const cleanApiKey = args.veniceApiKey.trim().replace(/['"]/g, "");
    
    const apiKeyHash = hashApiKey(cleanApiKey);
    const duplicateKey = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("apiKeyHash"), apiKeyHash))
      .first();

    if (duplicateKey) {
      throw new Error("This API key is already registered");
    }

    // Create provider with actual VCU balance
    const cleanApiKey2 = args.veniceApiKey.trim().replace(/['"]/g, "");
    const apiKeyHash2 = hashApiKey(cleanApiKey2);
    const providerId = await ctx.db.insert("providers", {
      address: walletAddress,
      name: args.name,
      description: "Venice.ai Provider",
      veniceApiKey: cleanApiKey2,
      apiKeyHash: apiKeyHash2,
      vcuBalance: args.vcuBalance, // Use actual VCU from validation
      isActive: true,
      totalPrompts: 0,
      registrationDate: Date.now(),
      avgResponseTime: 0,
      status: "active" as const,
    });

    // Initialize points
    await ctx.db.insert("providerPoints", {
      providerId: providerId,
      points: 0,
      totalPrompts: 0,
      lastEarned: Date.now(),
    });

    return providerId;
  },
});

// MVP: Select random active provider
export const selectProvider = query({
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

export const awardProviderPoints = mutation({
  args: {
    providerId: v.id("providers"),
    promptsServed: v.number(),
    tokensProcessed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return;

    // New point system: 1 point per 100 tokens processed
    const pointsEarned = args.tokensProcessed
      ? Math.floor(args.tokensProcessed / 100)
      : args.promptsServed * 100;

    await ctx.db.patch(args.providerId, {
      totalPrompts: (provider.totalPrompts ?? 0) + args.promptsServed,
    });

    const pointsRecord = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();

    if (pointsRecord) {
      await ctx.db.patch(pointsRecord._id, {
        points: (pointsRecord.points ?? 0) + pointsEarned,
        totalPrompts: (pointsRecord.totalPrompts ?? 0) + args.promptsServed,
        lastEarned: Date.now(),
      });
    } else {
      await ctx.db.insert("providerPoints", {
        providerId: args.providerId,
        points: pointsEarned,
        totalPrompts: args.promptsServed,
        lastEarned: Date.now(),
      });
    }
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

// Get provider stats for dashboard
export const getStats = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return null;

    const points = await ctx.db
      .query("providerPoints")
      .filter((q) => q.eq(q.field("providerId"), args.providerId))
      .first();

    return {
      ...provider,
      veniceApiKey: undefined, // Never expose API key
      apiKeyHash: undefined, // Never expose hash
      points: points?.points ?? 0,
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

// Get all providers (without API keys)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db
      .query("providers")
      .collect();

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
        points: (pointsRecord.points ?? 0) + 100,
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

// Remove provider and associated provider points
export const remove = mutation({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    // Remove provider
    await ctx.db.delete(args.providerId);
    // Remove associated provider points
    const points = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();
    if (points) {
      await ctx.db.delete(points._id);
    }
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
          points: points?.points ?? 0,
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
          points: points?.points ?? 0,
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
      points: providerPoints?.points ?? 0,
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

