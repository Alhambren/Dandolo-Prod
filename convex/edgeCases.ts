// Edge Case Management and Security for Dandolo.ai Points System
import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Security Configuration
const SECURITY_LIMITS = {
  MAX_API_KEYS_PER_WALLET: 5,
  MAX_REQUESTS_PER_SECOND: 10,
  MAX_CONSECUTIVE_FAILURES: 3,
  SUSPICION_THRESHOLD: {
    REQUESTS_PER_MINUTE: 100,
    UNIQUE_IPS_PER_HOUR: 20,
    GEOGRAPHIC_SPREAD_KM: 1000,
  },
  BURST_PROTECTION: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 50,
  }
} as const;

/**
 * Handle provider going offline - implement graceful degradation
 */
export const handleProviderOffline = internalMutation({
  args: {
    providerId: v.id("providers"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return;
    
    const consecutiveFailures = (provider.consecutiveFailures || 0) + 1;
    
    // Mark as unhealthy after 2 consecutive failures (as per specification)
    if (consecutiveFailures >= 2) {
      await ctx.db.patch(args.providerId, {
        isActive: false,
        consecutiveFailures,
        markedInactiveAt: Date.now(),
      });
      
      console.log(`[SECURITY] Provider ${provider.name} marked inactive after ${consecutiveFailures} failures`);
      
      // Don't route traffic to inactive providers, but keep their points intact
      // Points are permanent reputation and never decrease
    } else {
      await ctx.db.patch(args.providerId, {
        consecutiveFailures,
      });
    }
  },
});

/**
 * Rotate provider API key (for compromised keys)
 */
export const rotateProviderApiKey = mutation({
  args: {
    walletAddress: v.string(),
    newApiKey: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    try {
      // Verify wallet owns provider
      const provider = await ctx.db
        .query("providers")
        .withIndex("by_address", (q) => q.eq("address", args.walletAddress))
        .first();
      
      if (!provider) {
        throw new Error("No provider found for this wallet address");
      }
      
      // Simple hash function for API key verification
      function hashApiKey(apiKey: string): string {
        let hash = 0;
        for (let i = 0; i < apiKey.length; i++) {
          const char = apiKey.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
      }
      
      // Check key not used elsewhere
      const keyHash = hashApiKey(args.newApiKey);
      const existingKey = await ctx.db
        .query("providers")
        .withIndex("by_api_key_hash", (q) => q.eq("apiKeyHash", keyHash))
        .first();
      
      if (existingKey && existingKey._id !== provider._id) {
        throw new Error("API key already in use by another provider");
      }
      
      // Update atomically
      await ctx.db.patch(provider._id, {
        veniceApiKey: args.newApiKey,
        apiKeyHash: keyHash,
        keyRotatedAt: Date.now(),
        // Reset health status to give new key a chance
        consecutiveFailures: 0,
        isActive: true,
      });
      
      return {
        success: true,
        message: "API key rotated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Detect potential API key sharing
 */
export const detectKeySharing = internalAction({
  args: {
    apiKey: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // This would typically integrate with request logs
    // For now, we'll implement basic detection logic
    
    const keyData = await ctx.runQuery(api.apiKeys.validateKey, { key: args.apiKey });
    if (!keyData) return;
    
    // In a real implementation, you'd check against request logs
    // Here we'll simulate the detection logic
    
    const mockRecentRequests = [
      { ip: "192.168.1.1", timestamp: Date.now() - 300000 },
      { ip: "10.0.0.1", timestamp: Date.now() - 600000 },
      { ip: "203.0.113.1", timestamp: Date.now() - 900000 },
    ];
    
    const uniqueIPs = new Set(mockRecentRequests.map(r => r.ip));
    
    if (uniqueIPs.size > SECURITY_LIMITS.SUSPICION_THRESHOLD.UNIQUE_IPS_PER_HOUR) {
      await ctx.runMutation(internal.edgeCases.flagApiKey, {
        keyId: keyData._id,
        flagType: "potential_sharing",
        metadata: { ipCount: uniqueIPs.size },
      });
    }
  },
});

/**
 * Flag suspicious API key activity
 */
export const flagApiKey = internalMutation({
  args: {
    keyId: v.id("apiKeys"),
    flagType: v.union(
      v.literal("potential_sharing"),
      v.literal("geographic_anomaly"),
      v.literal("burst_abuse"),
      v.literal("rate_limit_abuse")
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // In a real system, this would log to a security monitoring table
    console.log(`[SECURITY] API Key ${args.keyId} flagged for ${args.flagType}`, args.metadata);
    
    // For now, just log - don't automatically disable keys
    // Manual review would be required for actual action
  },
});

/**
 * Handle mid-conversation limit reaching
 */
export const handleApproachingLimit = query({
  args: {
    address: v.string(),
    currentUsage: v.number(),
    limit: v.number(),
  },
  returns: v.object({
    warning: v.optional(v.string()),
    error: v.optional(v.string()),
    suggestUpgrade: v.optional(v.boolean()),
    upgradeUrl: v.optional(v.string()),
    resetIn: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const remaining = args.limit - args.currentUsage;
    
    if (remaining === 10) {
      return { 
        warning: "10 prompts remaining today",
        suggestUpgrade: true,
        upgradeUrl: "/developers"
      };
    }
    
    if (remaining === 1) {
      return { 
        warning: "Last prompt! Response will complete but no follow-ups.",
        suggestUpgrade: true,
        upgradeUrl: "/developers"
      };
    }
    
    if (remaining <= 0) {
      const nextMidnight = getNextUTCMidnight();
      const resetIn = formatDuration(nextMidnight - Date.now());
      
      return {
        error: "Daily limit reached",
        resetIn,
        suggestUpgrade: true,
        upgradeUrl: "/developers"
      };
    }
    
    return {};
  },
});

/**
 * Enforce global rate limits across sessions
 */
export const enforceGlobalLimits = internalMutation({
  args: {
    address: v.string(),
    increment: v.optional(v.boolean()),
  },
  returns: v.object({
    allowed: v.boolean(),
    currentUsage: v.number(),
    limit: v.number(),
  }),
  handler: async (ctx, args) => {
    const userPoints = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    
    if (!userPoints) {
      return { allowed: true, currentUsage: 0, limit: 100 };
    }
    
    const today = getUTCMidnight();
    const isNewDay = !userPoints.lastReset || userPoints.lastReset < today;
    const currentUsage = isNewDay ? 0 : userPoints.promptsToday;
    const limit = userPoints.dailyLimit || 100;
    
    if (args.increment) {
      if (currentUsage >= limit) {
        return { allowed: false, currentUsage, limit };
      }
      
      // Atomic increment
      await ctx.db.patch(userPoints._id, {
        promptsToday: currentUsage + 1,
        lastReset: isNewDay ? today : userPoints.lastReset,
      });
      
      return { allowed: true, currentUsage: currentUsage + 1, limit };
    }
    
    return { 
      allowed: currentUsage < limit, 
      currentUsage, 
      limit 
    };
  },
});

/**
 * Burst usage protection
 */
export const checkBurstLimit = mutation({
  args: {
    identifier: v.string(), // API key or address
    requestTimestamp: v.optional(v.number()),
  },
  returns: v.object({
    allowed: v.boolean(),
    requestsInWindow: v.number(),
    windowResetTime: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = args.requestTimestamp || Date.now();
    const windowStart = now - SECURITY_LIMITS.BURST_PROTECTION.WINDOW_MS;
    
    // Find or create rate limit record
    let rateLimitRecord = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
      .first();
    
    if (!rateLimitRecord || rateLimitRecord.windowStart < windowStart) {
      // Create new window
      if (rateLimitRecord) {
        await ctx.db.delete(rateLimitRecord._id);
      }
      
      const insertedId = await ctx.db.insert("rateLimits", {
        identifier: args.identifier,
        type: "user", // Default type
        requests: 1,
        windowStart: now,
        lastRequest: now,
      });
      
      rateLimitRecord = {
        _id: insertedId,
        _creationTime: now,
        identifier: args.identifier,
        type: "user" as const,
        requests: 1,
        windowStart: now,
        lastRequest: now,
      };
    } else if (rateLimitRecord) {
      // Update existing window
      await ctx.db.patch(rateLimitRecord._id, {
        requests: rateLimitRecord.requests + 1,
        lastRequest: now,
      });
      rateLimitRecord.requests += 1;
    }
    
    if (!rateLimitRecord) {
      throw new Error("Failed to create or update rate limit record");
    }
    
    const allowed = rateLimitRecord.requests <= SECURITY_LIMITS.BURST_PROTECTION.MAX_REQUESTS;
    
    if (!allowed) {
      // Flag for burst abuse
      await ctx.runMutation(internal.edgeCases.flagApiKey, {
        keyId: args.identifier as any, // This would need proper typing in real implementation
        flagType: "burst_abuse",
        metadata: { requestsInWindow: rateLimitRecord.requests },
      });
    }
    
    return {
      allowed,
      requestsInWindow: rateLimitRecord.requests,
      windowResetTime: rateLimitRecord.windowStart + SECURITY_LIMITS.BURST_PROTECTION.WINDOW_MS,
    };
  },
});

/**
 * Graceful degradation when all providers are offline
 */
export const handleNoProvidersAvailable = internalAction({
  args: {},
  handler: async (ctx) => {
    const activeProviders = await ctx.runQuery(internal.providers.listActiveInternal);
    
    if (activeProviders.length === 0) {
      console.error("[CRITICAL] No active providers available for routing");
      
      // In a real system, this might:
      // 1. Send alerts to administrators
      // 2. Attempt to reactivate recently failed providers
      // 3. Return a service unavailable message to users
      
      return {
        error: "Service temporarily unavailable. All AI providers are currently offline. Please try again in a few minutes.",
        retryAfter: 300, // 5 minutes
      };
    }
    
    return { success: true };
  },
});

/**
 * Cleanup expired security flags and rate limits
 */
export const cleanupSecurityData = internalAction({
  args: {},
  handler: async (ctx): Promise<{ cleaned: number }> => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    
    // Clean up old rate limit records using internal mutation
    const result: { cleaned: number } = await ctx.runMutation(internal.edgeCases.cleanupExpiredRateLimits, { cutoff });
    
    console.log(`[CLEANUP] Removed ${result.cleaned} expired rate limit records`);
    return result;
  },
});

// Internal mutation to handle cleanup
export const cleanupExpiredRateLimits = internalMutation({
  args: { cutoff: v.number() },
  handler: async (ctx, args) => {
    const expiredRateLimits = await ctx.db
      .query("rateLimits")
      .filter((q) => q.lt(q.field("windowStart"), args.cutoff))
      .collect();
    
    let cleaned = 0;
    for (const record of expiredRateLimits) {
      await ctx.db.delete(record._id);
      cleaned++;
    }
    
    return { cleaned };
  },
});

// Helper functions
function getUTCMidnight(): number {
  const now = new Date();
  const utcMidnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));
  return utcMidnight.getTime();
}

function getNextUTCMidnight(): number {
  const now = new Date();
  const nextMidnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return nextMidnight.getTime();
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

/**
 * Comprehensive system health check
 */
export const systemHealthCheck = query({
  args: {},
  returns: v.object({
    status: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("critical")),
    activeProviders: v.number(),
    totalProviders: v.number(),
    avgResponseTime: v.number(),
    systemLoad: v.number(),
    issues: v.array(v.string()),
  }),
  handler: async (ctx) => {
    const allProviders = await ctx.db.query("providers").collect();
    const activeProviders = allProviders.filter(p => p.isActive);
    
    const issues: string[] = [];
    let status: "healthy" | "degraded" | "critical" = "healthy";
    
    // Check provider availability
    if (activeProviders.length === 0) {
      status = "critical";
      issues.push("No active providers available");
    } else if (activeProviders.length < 3) {
      status = "degraded";
      issues.push("Low provider count");
    }
    
    // Check average response time
    const avgResponseTime = activeProviders.reduce((sum, p) => 
      sum + (p.avgResponseTime || 0), 0) / Math.max(activeProviders.length, 1);
    
    if (avgResponseTime > 5000) {
      status = status === "critical" ? "critical" : "degraded";
      issues.push("High response times");
    }
    
    // Mock system load (in real system, this would be actual metrics)
    const systemLoad = Math.random() * 100;
    
    if (systemLoad > 90) {
      status = "critical";
      issues.push("High system load");
    } else if (systemLoad > 70) {
      status = status === "critical" ? "critical" : "degraded";
      issues.push("Elevated system load");
    }
    
    return {
      status,
      activeProviders: activeProviders.length,
      totalProviders: allProviders.length,
      avgResponseTime,
      systemLoad,
      issues,
    };
  },
});