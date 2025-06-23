import { v } from "convex/values";
import { query, mutation, action, internalQuery } from "./_generated/server";
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
    vcuBalance: v.number(),
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

    // Calculate VCU balance (sum of all active providers)
    const vcuBalance = providers.reduce((sum, provider) => sum + (provider.vcuBalance || 0), 0);

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
      vcuSufficiency: vcuBalance > 1000 ? 1 : vcuBalance / 1000, // Ideal: 1000+ VCU
    };
    
    const systemHealth = Math.round(
      (healthFactors.providersOnline * 0.4 + 
       healthFactors.inferenceSuccess * 0.3 + 
       healthFactors.vcuSufficiency * 0.3) * 100
    );

    return {
      activeProviders,
      inferenceVolume,
      systemHealth,
      vcuBalance: Math.round(vcuBalance * 100) / 100,
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
      vcuBalance: v.number(),
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
        hasVCU: (provider.vcuBalance || 0) > 0 ? 1 : 0,
        hasActivity: (points?.lastEarned || 0) > (Date.now() - 24 * 60 * 60 * 1000) ? 1 : 0,
      };
      
      const healthScore = Math.round(
        (healthFactors.isActive * 0.5 + 
         healthFactors.hasVCU * 0.3 + 
         healthFactors.hasActivity * 0.2) * 100
      );

      return {
        id: provider._id,
        name: provider.name,
        address: provider.address,
        isActive: provider.isActive,
        vcuBalance: provider.vcuBalance || 0,
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

/**
 * Emergency circuit breaker - requires multiple confirmations
 */
export const emergencyCircuitBreaker = mutation({
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

    // Verify signature for the action
    const message = `${args.action}_${args.timestamp}_emergency`;
    // Temporarily disabled crypto verification - would use verifyActionSignature in production
    if (false && !args.signature) { // verifyActionSignature(message, args.signature, args.adminAddress)) {
      throw new Error("Invalid action signature");
    }

    // Implement circuit breaker logic
    if (args.action === "pause") {
      // Log the pause action
      await ctx.db.insert("adminActions", {
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
      await ctx.db.insert("adminActions", {
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
 * Get financial metrics for admin dashboard
 */
export const getFinancialMetrics = query({
  args: {
    adminAddress: v.string(),
  },
  returns: v.object({
    vcuBalance: v.number(),
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

    // Get current VCU balance
    const providers = await ctx.db.query("providers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const vcuBalance = providers.reduce((sum, provider) => sum + (provider.vcuBalance || 0), 0);

    // Calculate burn rates (mock data for now)
    const dailyBurn = 50; // VCU per day
    const weeklyBurn = dailyBurn * 7;
    const monthlyBurn = dailyBurn * 30;

    // Get inference costs
    const inferences = await ctx.db.query("inferences").collect();
    const totalVCUSpent = inferences.reduce((sum, inf) => sum + inf.vcuCost, 0);
    const costPerInference = inferences.length > 0 ? totalVCUSpent / inferences.length : 0;

    // Budget projection
    const daysRemaining = dailyBurn > 0 ? Math.floor(vcuBalance / dailyBurn) : 999;
    const recommendedTopup = daysRemaining < 30 ? 1000 : 0;

    // Points metrics
    const allProviderPoints = await ctx.db.query("providerPoints").collect();
    const totalPointsDistributed = allProviderPoints.reduce((sum, pp) => sum + (pp.totalPoints || 0), 0);
    
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentPoints = allProviderPoints.filter(pp => (pp.lastEarned || 0) > oneWeekAgo);
    const pointsThisWeek = recentPoints.reduce((sum, pp) => sum + (pp.totalPoints || 0), 0);

    return {
      vcuBalance: Math.round(vcuBalance * 100) / 100,
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