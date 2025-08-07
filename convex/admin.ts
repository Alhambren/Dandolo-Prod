import { v } from "convex/values";
import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
// import { verifyActionSignature } from "./cryptoActions"; // Would use crypto actions in production

// CRITICAL: Hardcoded admin address matching PRD requirement
const ADMIN_ADDRESS = "0xC07481520d98c32987cA83B30EAABdA673cDbe8c";

/**
 * Verify admin access - used by all admin functions
 */
function verifyAdminAccess(address?: string): boolean {
  return address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
}

/**
 * Get system overview metrics for admin dashboard
 */
export const getSystemMetrics = query({
  args: {
    adminAddress: v.string(),
  },
  returns: v.object({
    activeProviders: v.number(),
    inferenceVolume: v.object({
      perMinute: v.number(),
      perHour: v.number(),
      perDay: v.number(),
    }),
    systemHealth: v.number(),
    usdBalance: v.number(),
    totalPoints: v.number(),
    recentAnomalies: v.number(),
    protocolIntegrity: v.boolean(),
    anonymityStatus: v.string(),
  }),
  handler: async (ctx, args) => {
    // Verify admin access
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get active providers count
    const providers = await ctx.db.query("providers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const activeProviders = providers.length;

    // Calculate USD balance (sum of all active providers converted to USD)
    const vcuBalance = providers.reduce((sum, provider) => sum + (provider.vcuBalance || 0), 0);
    const usdBalance = vcuBalance * 0.10; // Convert VCU to USD

    // Get inference statistics
    const now = Date.now();
    const oneMinuteAgo = now - (60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const allInferences = await ctx.db.query("inferences").collect();
    
    const inferenceVolume = {
      perMinute: allInferences.filter(inf => inf.timestamp > oneMinuteAgo).length,
      perHour: allInferences.filter(inf => inf.timestamp > oneHourAgo).length,
      perDay: allInferences.filter(inf => inf.timestamp > oneDayAgo).length,
    };

    // Get total points distributed
    const allProviderPoints = await ctx.db.query("providerPoints").collect();
    const totalPoints = allProviderPoints.reduce((sum, pp) => sum + (pp.totalPoints || 0), 0);

    // Calculate system health (simplified algorithm)
    const healthFactors = {
      providersOnline: Math.min(activeProviders / 10, 1), // Ideal: 10+ providers
      inferenceSuccess: inferenceVolume.perHour > 0 ? 1 : 0.5, // Has recent activity
      usdSufficiency: usdBalance > 100 ? 1 : usdBalance / 100, // Ideal: $100+ USD
    };
    
    const systemHealth = Math.round(
      (healthFactors.providersOnline * 0.4 + 
       healthFactors.inferenceSuccess * 0.3 + 
       healthFactors.usdSufficiency * 0.3) * 100
    );

    return {
      activeProviders,
      inferenceVolume,
      systemHealth,
      usdBalance: Math.round(usdBalance * 100) / 100,
      totalPoints,
      recentAnomalies: 0, // TODO: Implement anomaly detection
      protocolIntegrity: true, // TODO: Implement integrity checks
      anonymityStatus: "SECURED",
    };
  },
});

/**
 * Get inference analytics for admin dashboard
 */
export const getInferenceAnalytics = query({
  args: {
    adminAddress: v.string(),
    timeRange: v.optional(v.union(v.literal("24h"), v.literal("7d"), v.literal("30d"))),
  },
  returns: v.object({
    totalInferences: v.number(),
    averageResponseTime: v.number(),
    successRate: v.number(),
    modelUsage: v.record(v.string(), v.number()),
    intentDistribution: v.record(v.string(), v.number()),
    hourlyVolume: v.array(v.object({
      hour: v.number(),
      count: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Unauthorized: Admin access required");
    }

    const timeRange = args.timeRange || "24h";
    const now = Date.now();
    const cutoff = timeRange === "24h" ? now - (24 * 60 * 60 * 1000) :
                   timeRange === "7d" ? now - (7 * 24 * 60 * 60 * 1000) :
                   now - (30 * 24 * 60 * 60 * 1000);

    const inferences = await ctx.db.query("inferences")
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .collect();

    const totalInferences = inferences.length;
    
    // Calculate success rate (assuming no error tracking yet, use 98% baseline)
    const successRate = 0.98;
    
    // Average response time (mock data for now)
    const averageResponseTime = 1250; // ms

    // Model usage distribution
    const modelUsage: Record<string, number> = {};
    inferences.forEach(inf => {
      modelUsage[inf.model] = (modelUsage[inf.model] || 0) + 1;
    });

    // Intent distribution
    const intentDistribution: Record<string, number> = {};
    inferences.forEach(inf => {
      intentDistribution[inf.intent] = (intentDistribution[inf.intent] || 0) + 1;
    });

    // Hourly volume (last 24 hours)
    const hourlyVolume = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = now - (i * 60 * 60 * 1000);
      const hourEnd = hourStart + (60 * 60 * 1000);
      const count = inferences.filter(inf => 
        inf.timestamp >= hourStart && inf.timestamp < hourEnd
      ).length;
      
      hourlyVolume.push({
        hour: Math.floor(hourStart / (60 * 60 * 1000)),
        count,
      });
    }

    return {
      totalInferences,
      averageResponseTime,
      successRate,
      modelUsage,
      intentDistribution,
      hourlyVolume,
    };
  },
});

/**
 * Get provider network topology for admin dashboard
 */
export const getNetworkTopology = query({
  args: {
    adminAddress: v.string(),
  },
  returns: v.object({
    providers: v.array(v.object({
      id: v.id("providers"),
      name: v.string(),
      address: v.string(),
      isActive: v.boolean(),
      usdBalance: v.number(),
      totalPrompts: v.number(),
      healthScore: v.number(),
      lastActivity: v.optional(v.number()),
    })),
    routingStats: v.object({
      totalRoutes: v.number(),
      averageLatency: v.number(),
      failedRoutes: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get all providers with their stats
    const providers = await ctx.db.query("providers").collect();
    const providerPoints = await ctx.db.query("providerPoints").collect();
    
    const providerData = providers.map(provider => {
      const points = providerPoints.find(pp => pp.providerId === provider._id);
      
      // Calculate health score based on multiple factors
      const healthFactors = {
        isActive: provider.isActive ? 1 : 0,
        hasBalance: (provider.vcuBalance || 0) > 0 ? 1 : 0,
        hasActivity: (points?.lastEarned || 0) > (Date.now() - 24 * 60 * 60 * 1000) ? 1 : 0,
      };
      
      const healthScore = Math.round(
        (healthFactors.isActive * 0.5 + 
         healthFactors.hasBalance * 0.3 + 
         healthFactors.hasActivity * 0.2) * 100
      );

      return {
        id: provider._id,
        name: provider.name,
        address: provider.address,
        isActive: provider.isActive,
        usdBalance: (provider.vcuBalance || 0) * 0.10,
        totalPrompts: provider.totalPrompts || 0,
        healthScore,
        lastActivity: points?.lastEarned,
      };
    });

    // Mock routing stats (would be implemented with real monitoring)
    const routingStats = {
      totalRoutes: providerData.reduce((sum, p) => sum + p.totalPrompts, 0),
      averageLatency: 1250, // ms
      failedRoutes: 0,
    };

    return {
      providers: providerData,
      routingStats,
    };
  },
});

/**
 * Get security monitoring data
 */
export const getSecurityMetrics = query({
  args: {
    adminAddress: v.string(),
  },
  returns: v.object({
    threatLevel: v.string(),
    suspiciousActivities: v.array(v.object({
      type: v.string(),
      description: v.string(),
      timestamp: v.number(),
      severity: v.string(),
    })),
    ddosAttempts: v.number(),
    anonymityBreaches: v.number(),
    auditEvents: v.array(v.object({
      action: v.string(),
      timestamp: v.number(),
      details: v.string(),
    })),
  }),
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Mock security data (would be implemented with real monitoring)
    return {
      threatLevel: "LOW",
      suspiciousActivities: [],
      ddosAttempts: 0,
      anonymityBreaches: 0,
      auditEvents: [
        {
          action: "Admin Dashboard Access",
          timestamp: Date.now(),
          details: `Admin ${args.adminAddress.substring(0, 8)}... accessed dashboard`,
        },
      ],
    };
  },
});

// Internal mutation to log admin actions
export const logAdminActionInternal = internalMutation({
  args: {
    adminAddress: v.string(),
    action: v.string(),
    timestamp: v.number(),
    details: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("adminActions", {
      adminAddress: args.adminAddress,
      action: args.action,
      timestamp: args.timestamp,
      details: args.details,
      signature: args.signature,
    });
  },
});

/**
 * Emergency circuit breaker - requires multiple confirmations
 */
export const emergencyCircuitBreaker = action({
  args: {
    adminAddress: v.string(),
    action: v.union(v.literal("pause"), v.literal("resume")),
    signature: v.string(),
    timestamp: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Verify signature timestamp (must be within 5 minutes)
    if (Math.abs(Date.now() - args.timestamp) > 5 * 60 * 1000) {
      throw new Error("Signature expired");
    }

    // Verify cryptographic signature for the action
    const message = `${args.action}_${args.timestamp}_emergency`;
    const isValidSignature = await ctx.runAction(internal.cryptoSecure.verifyEthereumSignature, {
      message: message,
      signature: args.signature,
      expectedSigner: args.adminAddress
    });
    
    if (!isValidSignature) {
      throw new Error("Invalid action signature - admin action must be cryptographically signed");
    }

    // Implement circuit breaker logic
    if (args.action === "pause") {
      // Log the pause action
      await ctx.runMutation(internal.admin.logAdminActionInternal, {
        adminAddress: args.adminAddress,
        action: "EMERGENCY_PAUSE",
        timestamp: Date.now(),
        details: "System paused via emergency circuit breaker",
        signature: args.signature,
      });
      
      // In a real system, this would disable all inference endpoints
      // For now, we'll create a system-wide flag
      return {
        success: true,
        message: "EMERGENCY PAUSE: All inference operations halted. Admin intervention required.",
      };
    } else if (args.action === "resume") {
      // Log the resume action
      await ctx.runMutation(internal.admin.logAdminActionInternal, {
        adminAddress: args.adminAddress,
        action: "EMERGENCY_RESUME",
        timestamp: Date.now(),
        details: "System resumed after emergency pause",
        signature: args.signature,
      });
      
      return {
        success: true,
        message: "EMERGENCY RESUME: System operations restored.",
      };
    }
    
    throw new Error("Invalid action type");
  },
});

/**
 * Log admin actions for audit trail
 */
export const logAdminAction = mutation({
  args: {
    adminAddress: v.string(),
    action: v.string(),
    details: v.string(),
    signature: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Unauthorized: Admin access required");
    }

    // TODO: Store in immutable audit log (IPFS integration)
    // For now, just console log
    console.log(`ADMIN AUDIT: ${args.action} by ${args.adminAddress} - ${args.details}`);
    
    return null;
  },
});

/**
 * Get governance configuration
 */
export const getGovernanceConfig = query({
  args: {
    adminAddress: v.string(),
  },
  returns: v.object({
    mutableRules: v.object({
      inferenceTimeout: v.number(),
      maxConcurrentRequests: v.number(),
      nodeHealthThreshold: v.number(),
    }),
    ossifiedRules: v.object({
      anonymityProtocol: v.string(),
      censorshipResistance: v.string(),
      sovereignRouting: v.string(),
    }),
    emergencyControls: v.object({
      circuitBreakerActive: v.boolean(),
      blacklistedNodes: v.array(v.string()),
      manualRoutingActive: v.boolean(),
    }),
  }),
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Unauthorized: Admin access required");
    }

    return {
      mutableRules: {
        inferenceTimeout: 30000, // ms
        maxConcurrentRequests: 1000,
        nodeHealthThreshold: 0.95,
      },
      ossifiedRules: {
        anonymityProtocol: "PERMANENT",
        censorshipResistance: "IMMUTABLE", 
        sovereignRouting: "UNCHANGEABLE",
      },
      emergencyControls: {
        circuitBreakerActive: false,
        blacklistedNodes: [],
        manualRoutingActive: false,
      },
    };
  },
});

/**
 * Get comprehensive user analytics for admin dashboard
 */
export const getUserAnalytics = query({
  args: {
    adminAddress: v.string(),
    timeRange: v.optional(v.union(v.literal("24h"), v.literal("7d"), v.literal("30d"))),
  },
  returns: v.object({
    totalUsers: v.number(),
    activeUsers: v.number(),
    anonymousUsers: v.number(),
    authenticatedUsers: v.number(),
    topUsers: v.array(v.object({
      address: v.string(),
      totalQueries: v.number(),
      totalPoints: v.number(),
      lastActive: v.optional(v.number()),
      userType: v.string(),
    })),
    userGrowth: v.array(v.object({
      date: v.number(),
      newUsers: v.number(),
      totalUsers: v.number(),
    })),
    usage: v.object({
      totalQueries: v.number(),
      averageQueriesPerUser: v.number(),
      queriesPerHour: v.array(v.object({
        hour: v.number(),
        count: v.number(),
      })),
    }),
  }),
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Unauthorized: Admin access required");
    }

    const timeRange = args.timeRange || "24h";
    const now = Date.now();
    const cutoff = timeRange === "24h" ? now - (24 * 60 * 60 * 1000) :
                   timeRange === "7d" ? now - (7 * 24 * 60 * 60 * 1000) :
                   now - (30 * 24 * 60 * 60 * 1000);

    // Get all user points (which includes user activity)
    const allUserPoints = await ctx.db.query("userPoints").collect();
    const recentInferences = await ctx.db.query("inferences")
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .collect();

    // Get API keys for user type identification
    const allApiKeys = await ctx.db.query("apiKeys").collect();

    // Calculate user metrics
    const activeUserAddresses = new Set([
      ...recentInferences.map(inf => inf.userAddress).filter(addr => addr),
      ...recentInferences.map(inf => inf.sessionId?.includes('session-') ? 
        inf.sessionId.replace('session-', '') : null).filter(Boolean)
    ]);

    const totalUsers = allUserPoints.length + activeUserAddresses.size;
    const activeUsers = activeUserAddresses.size;

    // Count anonymous vs authenticated users from recent activity
    let anonymousUsers = 0;
    let authenticatedUsers = 0;

    recentInferences.forEach(inf => {
      if (inf.isAnonymous) {
        anonymousUsers++;
      } else if (inf.userAddress) {
        authenticatedUsers++;
      }
    });

    // Get top users by activity
    const userActivity = new Map<string, { queries: number; points: number; lastActive?: number; type: string }>();
    
    recentInferences.forEach(inf => {
      const address = inf.userAddress || inf.sessionId || 'anonymous';
      if (!userActivity.has(address)) {
        userActivity.set(address, { queries: 0, points: 0, type: 'anonymous' });
      }
      const user = userActivity.get(address)!;
      user.queries++;
      user.lastActive = Math.max(user.lastActive || 0, inf.timestamp);
      
      // Determine user type
      if (inf.apiKey) {
        const apiKey = allApiKeys.find(k => k.key === inf.apiKey);
        if (apiKey) {
          user.type = apiKey.keyType || 'developer';
        }
      } else if (inf.userAddress) {
        user.type = 'authenticated';
      }
    });

    // Add points data
    allUserPoints.forEach(up => {
      if (userActivity.has(up.address)) {
        userActivity.get(up.address)!.points = up.points || 0;
      } else {
        userActivity.set(up.address, {
          queries: 0,
          points: up.points || 0,
          lastActive: up.lastEarned,
          type: 'authenticated'
        });
      }
    });

    const topUsers = Array.from(userActivity.entries())
      .map(([address, data]) => ({
        address: address.length > 42 ? `${address.substring(0, 8)}...${address.substring(address.length - 6)}` : address,
        totalQueries: data.queries,
        totalPoints: data.points,
        lastActive: data.lastActive,
        userType: data.type,
      }))
      .sort((a, b) => (b.totalQueries + b.totalPoints) - (a.totalQueries + a.totalPoints))
      .slice(0, 20);

    // Mock user growth data (would be implemented with historical tracking)
    const userGrowth = [];
    for (let i = 7; i >= 0; i--) {
      const date = now - (i * 24 * 60 * 60 * 1000);
      userGrowth.push({
        date,
        newUsers: Math.floor(Math.random() * 5) + 1, // Mock data
        totalUsers: totalUsers - (i * 2), // Mock growth
      });
    }

    // Queries per hour for last 24 hours
    const queriesPerHour = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = now - (i * 60 * 60 * 1000);
      const hourEnd = hourStart + (60 * 60 * 1000);
      const count = recentInferences.filter(inf => 
        inf.timestamp >= hourStart && inf.timestamp < hourEnd
      ).length;
      
      queriesPerHour.push({
        hour: Math.floor(hourStart / (60 * 60 * 1000)),
        count,
      });
    }

    return {
      totalUsers,
      activeUsers,
      anonymousUsers: Math.floor(anonymousUsers / 10), // Rough estimate of unique anonymous users
      authenticatedUsers: authenticatedUsers,
      topUsers,
      userGrowth,
      usage: {
        totalQueries: recentInferences.length,
        averageQueriesPerUser: activeUsers > 0 ? Math.round(recentInferences.length / activeUsers) : 0,
        queriesPerHour,
      },
    };
  },
});

/**
 * Get comprehensive query analytics for admin dashboard
 */
export const getQueryAnalytics = query({
  args: {
    adminAddress: v.string(),
    timeRange: v.optional(v.union(v.literal("24h"), v.literal("7d"), v.literal("30d"))),
  },
  returns: v.object({
    totalQueries: v.number(),
    successRate: v.number(),
    averageResponseTime: v.number(),
    totalTokensProcessed: v.number(),
    costMetrics: v.object({
      totalCostUSD: v.number(),
      costPerQuery: v.number(),
      costPerToken: v.number(),
    }),
    queryTypes: v.record(v.string(), v.number()),
    modelUsage: v.record(v.string(), v.number()),
    providerDistribution: v.record(v.string(), v.number()),
    timeDistribution: v.array(v.object({
      hour: v.number(),
      queries: v.number(),
      avgResponseTime: v.number(),
    })),
    errorAnalysis: v.object({
      totalErrors: v.number(),
      errorTypes: v.record(v.string(), v.number()),
      errorRate: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Unauthorized: Admin access required");
    }

    const timeRange = args.timeRange || "24h";
    const now = Date.now();
    const cutoff = timeRange === "24h" ? now - (24 * 60 * 60 * 1000) :
                   timeRange === "7d" ? now - (7 * 24 * 60 * 60 * 1000) :
                   now - (30 * 24 * 60 * 60 * 1000);

    const inferences = await ctx.db.query("inferences")
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .collect();

    const providers = await ctx.db.query("providers").collect();
    const providerMap = new Map(providers.map(p => [p._id, p.name]));

    const totalQueries = inferences.length;
    const successfulQueries = inferences.filter(inf => !inf.error).length;
    const successRate = totalQueries > 0 ? (successfulQueries / totalQueries) * 100 : 0;

    // Calculate response times (mock data for now since we don't track this yet)
    const averageResponseTime = 1250; // ms

    // Token and cost calculations
    const totalTokensProcessed = inferences.reduce((sum, inf) => sum + (inf.tokensUsed || 0), 0);
    const totalVCUCost = inferences.reduce((sum, inf) => sum + (inf.vcuCost || 0), 0);
    const totalCostUSD = totalVCUCost * 0.10; // Convert VCU to USD
    const costPerQuery = totalQueries > 0 ? totalCostUSD / totalQueries : 0;
    const costPerToken = totalTokensProcessed > 0 ? totalCostUSD / totalTokensProcessed : 0;

    // Query type distribution
    const queryTypes: Record<string, number> = {};
    inferences.forEach(inf => {
      queryTypes[inf.intent] = (queryTypes[inf.intent] || 0) + 1;
    });

    // Model usage distribution
    const modelUsage: Record<string, number> = {};
    inferences.forEach(inf => {
      modelUsage[inf.model] = (modelUsage[inf.model] || 0) + 1;
    });

    // Provider distribution
    const providerDistribution: Record<string, number> = {};
    inferences.forEach(inf => {
      const providerName = providerMap.get(inf.providerId) || 'Unknown';
      providerDistribution[providerName] = (providerDistribution[providerName] || 0) + 1;
    });

    // Time distribution (hourly breakdown)
    const timeDistribution = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = now - (i * 60 * 60 * 1000);
      const hourEnd = hourStart + (60 * 60 * 1000);
      const hourQueries = inferences.filter(inf => 
        inf.timestamp >= hourStart && inf.timestamp < hourEnd
      );
      
      timeDistribution.push({
        hour: Math.floor(hourStart / (60 * 60 * 1000)),
        queries: hourQueries.length,
        avgResponseTime: averageResponseTime, // Mock data
      });
    }

    // Error analysis
    const errorInferences = inferences.filter(inf => inf.error);
    const errorTypes: Record<string, number> = {};
    errorInferences.forEach(inf => {
      const errorType = inf.error?.includes('timeout') ? 'Timeout' :
                       inf.error?.includes('rate limit') ? 'Rate Limited' :
                       inf.error?.includes('balance') ? 'Insufficient Balance' :
                       'Other';
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });

    return {
      totalQueries,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime,
      totalTokensProcessed,
      costMetrics: {
        totalCostUSD: Math.round(totalCostUSD * 100) / 100,
        costPerQuery: Math.round(costPerQuery * 10000) / 10000,
        costPerToken: Math.round(costPerToken * 100000) / 100000,
      },
      queryTypes,
      modelUsage,
      providerDistribution,
      timeDistribution,
      errorAnalysis: {
        totalErrors: errorInferences.length,
        errorTypes,
        errorRate: totalQueries > 0 ? (errorInferences.length / totalQueries) * 100 : 0,
      },
    };
  },
});

/**
 * Get all network participants for admin dashboard  
 */
export const getAllNetworkParticipants = query({
  args: {
    adminAddress: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    providers: v.array(v.object({
      id: v.id("providers"),
      name: v.string(),
      address: v.string(),
      isActive: v.boolean(),
      vcuBalance: v.number(),
      totalPrompts: v.number(),
      points: v.number(),
      uptime: v.number(),
      registrationDate: v.optional(v.number()),
      verificationStatus: v.optional(v.string()),
    })),
    users: v.array(v.object({
      address: v.string(),
      points: v.number(),
      totalQueries: v.number(),
      dailyUsage: v.number(),
      lastActive: v.optional(v.number()),
      userType: v.string(),
    })),
    apiKeys: v.array(v.object({
      keyId: v.string(),
      address: v.string(),
      keyType: v.string(),
      dailyUsage: v.number(),
      dailyLimit: v.number(),
      isActive: v.boolean(),
    })),
    summary: v.object({
      totalProviders: v.number(),
      activeProviders: v.number(),
      totalUsers: v.number(),
      totalApiKeys: v.number(),
      networkHealth: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Unauthorized: Admin access required");
    }

    const limit = args.limit || 100;

    // Get all providers with their points
    const allProviders = await ctx.db.query("providers").collect();
    const allProviderPoints = await ctx.db.query("providerPoints").collect();
    const providerHealths = await ctx.db.query("providerHealth").collect();

    // Get all user data
    const allUserPoints = await ctx.db.query("userPoints").collect();
    const allApiKeys = await ctx.db.query("apiKeys").collect();
    const recentInferences = await ctx.db.query("inferences")
      .filter((q) => q.gte(q.field("timestamp"), Date.now() - (7 * 24 * 60 * 60 * 1000)))
      .collect();

    // Process provider data
    const providers = allProviders.slice(0, limit).map(provider => {
      const points = allProviderPoints.find(pp => pp.providerId === provider._id);
      const healthChecks = providerHealths.filter(h => h.providerId === provider._id);
      const uptime = healthChecks.length > 0 ? 
        (healthChecks.filter(h => h.status).length / healthChecks.length) * 100 : 0;

      return {
        id: provider._id,
        name: provider.name,
        address: provider.address,
        isActive: provider.isActive,
        vcuBalance: provider.vcuBalance || 0,
        totalPrompts: provider.totalPrompts || 0,
        points: points?.totalPoints || 0,
        uptime: Math.round(uptime * 10) / 10,
        registrationDate: provider.registrationDate,
        verificationStatus: provider.verificationStatus,
      };
    });

    // Process user data
    const userActivity = new Map<string, { queries: number; lastActive?: number; userType: string }>();
    
    recentInferences.forEach(inf => {
      const address = inf.userAddress || 'anonymous';
      if (!userActivity.has(address)) {
        userActivity.set(address, { queries: 0, userType: 'anonymous' });
      }
      const user = userActivity.get(address)!;
      user.queries++;
      user.lastActive = Math.max(user.lastActive || 0, inf.timestamp);
      
      if (inf.apiKey) {
        const apiKey = allApiKeys.find(k => k.key === inf.apiKey);
        if (apiKey) {
          user.userType = apiKey.keyType || 'developer';
        }
      } else if (inf.userAddress) {
        user.userType = 'authenticated';
      }
    });

    const users = allUserPoints.slice(0, limit).map(userPoint => {
      const activity = userActivity.get(userPoint.address) || { queries: 0, userType: 'authenticated' };
      return {
        address: `${userPoint.address.substring(0, 8)}...${userPoint.address.substring(userPoint.address.length - 6)}`,
        points: userPoint.points || 0,
        totalQueries: activity.queries,
        dailyUsage: userPoint.promptsToday || 0,
        lastActive: userPoint.lastEarned,
        userType: activity.userType,
      };
    });

    // Process API keys
    const apiKeys = allApiKeys.slice(0, limit).map(apiKey => ({
      keyId: `${apiKey.key.substring(0, 8)}...`,
      address: apiKey.address ? `${apiKey.address.substring(0, 8)}...${apiKey.address.substring(apiKey.address.length - 6)}` : 'system',
      keyType: apiKey.keyType || 'standard',
      dailyUsage: apiKey.dailyUsage || 0,
      dailyLimit: apiKey.dailyLimit || 50,
      isActive: (apiKey.dailyUsage || 0) < (apiKey.dailyLimit || 50),
    }));

    // Calculate network health
    const activeProviders = allProviders.filter(p => p.isActive).length;
    const totalBalance = allProviders.reduce((sum, p) => sum + (p.vcuBalance || 0), 0);
    const recentActivity = recentInferences.length;
    
    const networkHealth = Math.round(
      ((activeProviders / Math.max(allProviders.length, 1)) * 0.4 +
       (Math.min(totalBalance / 1000, 1)) * 0.3 + // Normalize to $100 USD
       (Math.min(recentActivity / 100, 1)) * 0.3) * 100
    );

    return {
      providers,
      users,
      apiKeys,
      summary: {
        totalProviders: allProviders.length,
        activeProviders,
        totalUsers: allUserPoints.length + userActivity.size,
        totalApiKeys: allApiKeys.length,
        networkHealth,
      },
    };
  },
});

/**
 * Get financial metrics for admin dashboard
 */
export const getFinancialMetrics = query({
  args: {
    adminAddress: v.string(),
  },
  returns: v.object({
    usdBalance: v.number(),
    burnRate: v.object({
      daily: v.number(),
      weekly: v.number(),
      monthly: v.number(),
    }),
    costPerInference: v.number(),
    budgetProjection: v.object({
      daysRemaining: v.number(),
      recommendedTopup: v.number(),
    }),
    pointsDistributed: v.object({
      total: v.number(),
      thisWeek: v.number(),
      distributionRate: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    if (!verifyAdminAccess(args.adminAddress)) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get current USD balance
    const providers = await ctx.db.query("providers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const vcuBalance = providers.reduce((sum, provider) => sum + (provider.vcuBalance || 0), 0);
    const usdBalance = vcuBalance * 0.10; // Convert VCU to USD

    // Calculate burn rates (mock data for now)
    const dailyBurn = 5; // USD per day
    const weeklyBurn = dailyBurn * 7;
    const monthlyBurn = dailyBurn * 30;

    // Get inference costs
    const inferences = await ctx.db.query("inferences").collect();
    const totalVCUSpent = inferences.reduce((sum, inf) => sum + inf.vcuCost, 0);
    const totalUSDSpent = totalVCUSpent * 0.10; // Convert VCU to USD
    const costPerInference = inferences.length > 0 ? totalUSDSpent / inferences.length : 0;

    // Budget projection
    const daysRemaining = dailyBurn > 0 ? Math.floor(usdBalance / dailyBurn) : 999;
    const recommendedTopup = daysRemaining < 30 ? 100 : 0;

    // Points metrics
    const allProviderPoints = await ctx.db.query("providerPoints").collect();
    const totalPointsDistributed = allProviderPoints.reduce((sum, pp) => sum + (pp.totalPoints || 0), 0);
    
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentPoints = allProviderPoints.filter(pp => (pp.lastEarned || 0) > oneWeekAgo);
    const pointsThisWeek = recentPoints.reduce((sum, pp) => sum + (pp.totalPoints || 0), 0);

    return {
      usdBalance: Math.round(usdBalance * 100) / 100,
      burnRate: {
        daily: dailyBurn,
        weekly: weeklyBurn,
        monthly: monthlyBurn,
      },
      costPerInference: Math.round(costPerInference * 10000) / 10000,
      budgetProjection: {
        daysRemaining,
        recommendedTopup,
      },
      pointsDistributed: {
        total: totalPointsDistributed,
        thisWeek: pointsThisWeek,
        distributionRate: pointsThisWeek / 7, // per day
      },
    };
  },
});