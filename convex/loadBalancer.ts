import { v } from "convex/values";
import { query, mutation, internalAction, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * PHASE 2: SESSION REBALANCING SYSTEM
 * 
 * This module implements intelligent session rebalancing to ensure fair distribution
 * of sessions across providers, considering:
 * - Provider capability scores (inference performance)
 * - Current session load per provider
 * - Provider response times and VCU balance
 * - Session idle time (only rebalance idle sessions to preserve context)
 */

// Session rebalancing configuration
const REBALANCING_CONFIG = {
  // Session must be idle for this long before it can be rebalanced (preserve context)
  MIN_IDLE_TIME_MS: 5 * 60 * 1000, // 5 minutes
  
  // Provider is considered overloaded if it has this % of total active sessions
  OVERLOAD_THRESHOLD: 0.4, // 40%
  
  // Provider is considered underutilized if it has less than this % of average load
  UNDERUTILIZED_THRESHOLD: 0.5, // 50% of average
  
  // Maximum sessions to rebalance in one operation
  MAX_REBALANCE_PER_RUN: 10,
  
  // Minimum capability score for a provider to receive rebalanced sessions
  MIN_CAPABILITY_SCORE: 70,
  
  // How often rebalancing should run (via cron)
  REBALANCE_INTERVAL_MS: 15 * 60 * 1000, // 15 minutes
};

/**
 * Calculate provider load balancing score
 * Higher score = better candidate for receiving sessions
 */
function calculateProviderScore(provider: {
  sessionCount: number;
  inferenceCapabilityScore?: number;
  avgResponseTime?: number;
  vcuBalance: number;
  isActive: boolean;
}, averageSessionsPerProvider: number): number {
  if (!provider.isActive) return 0;
  
  // Base capability score (0-100)
  const capabilityScore = provider.inferenceCapabilityScore || 80;
  if (capabilityScore < REBALANCING_CONFIG.MIN_CAPABILITY_SCORE) return 0;
  
  // Load factor: lower current load = higher score
  const loadFactor = Math.max(0, 100 - (provider.sessionCount / Math.max(averageSessionsPerProvider, 1)) * 50);
  
  // Response time factor: faster = higher score (cap at 10s)
  const responseTime = Math.min(provider.avgResponseTime || 2000, 10000);
  const responseTimeFactor = Math.max(0, 100 - (responseTime / 100));
  
  // VCU balance factor: more balance = higher score
  const vcuFactor = Math.min(provider.vcuBalance * 10, 100);
  
  // Weighted composite score
  const score = (
    capabilityScore * 0.4 +      // 40% - inference capability
    loadFactor * 0.3 +           // 30% - current load
    responseTimeFactor * 0.2 +   // 20% - response time
    vcuFactor * 0.1              // 10% - VCU balance
  );
  
  return Math.round(score);
}

/**
 * Simple test function to verify load balancer functionality
 */
export const testLoadBalancer = query({
  args: {},
  returns: v.object({
    message: v.string(),
    timestamp: v.number(),
  }),
  handler: async (ctx) => {
    return {
      message: "Load balancer is working",
      timestamp: Date.now(),
    };
  },
});

/**
 * Analyze current session distribution and identify rebalancing opportunities
 */
export const analyzeSessionDistribution = query({
  args: {},
  returns: v.object({
    totalSessions: v.number(),
    totalProviders: v.number(),
    activeProviders: v.number(),
    averageSessionsPerProvider: v.number(),
    overloadedProviders: v.array(v.object({
      providerId: v.string(),
      providerName: v.string(),
      sessionCount: v.number(),
      loadPercentage: v.number(),
      score: v.number(),
    })),
    underutilizedProviders: v.array(v.object({
      providerId: v.string(),
      providerName: v.string(),
      sessionCount: v.number(),
      loadPercentage: v.number(),
      score: v.number(),
    })),
    rebalancingOpportunities: v.array(v.object({
      fromProviderId: v.string(),
      toProviderId: v.string(),
      sessionsToMove: v.number(),
      expectedImprovement: v.string(),
    })),
    analysis: v.object({
      distributionVariance: v.number(),
      rebalancingRecommended: v.boolean(),
      reason: v.string(),
    }),
  }),
  handler: async (ctx) => {
    try {
      const now = Date.now();
      
      // Get all active sessions
      const allSessions = await ctx.runQuery(api.sessionProviders.getSessionStats);
      const totalSessions = allSessions.totalActiveSessions;
      
      // Get all providers directly from the database
      const allProviders = await ctx.db.query("providers").collect();
      const activeProviders = allProviders.filter(p => p.isActive);
    
    if (activeProviders.length === 0) {
      return {
        totalSessions,
        totalProviders: allProviders.length,
        activeProviders: 0,
        averageSessionsPerProvider: 0,
        overloadedProviders: [],
        underutilizedProviders: [],
        rebalancingOpportunities: [],
        analysis: {
          distributionVariance: 0,
          rebalancingRecommended: false,
          reason: "No active providers available",
        },
      };
    }
    
    // Calculate session counts per provider
    const providerSessionCounts = new Map<string, number>();
    for (const [providerName, count] of Object.entries(allSessions.providerDistribution)) {
      const provider = activeProviders.find(p => p.name === providerName);
      if (provider) {
        providerSessionCounts.set(provider._id, count as number);
      }
    }
    
    // Ensure all active providers are represented
    for (const provider of activeProviders) {
      if (!providerSessionCounts.has(provider._id)) {
        providerSessionCounts.set(provider._id, 0);
      }
    }
    
    const averageSessionsPerProvider = totalSessions / activeProviders.length;
    const overloadThreshold = averageSessionsPerProvider * (1 + REBALANCING_CONFIG.OVERLOAD_THRESHOLD);
    const underutilizedThreshold = averageSessionsPerProvider * REBALANCING_CONFIG.UNDERUTILIZED_THRESHOLD;
    
    // Calculate provider scores and identify overloaded/underutilized providers
    const overloadedProviders: any[] = [];
    const underutilizedProviders: any[] = [];
    const providerScores = new Map<string, number>();
    
    for (const provider of activeProviders) {
      const sessionCount = providerSessionCounts.get(provider._id) || 0;
      const score = calculateProviderScore({
        sessionCount,
        inferenceCapabilityScore: provider.inferenceCapabilityScore,
        avgResponseTime: provider.avgResponseTime,
        vcuBalance: provider.vcuBalance,
        isActive: provider.isActive,
      }, averageSessionsPerProvider);
      
      providerScores.set(provider._id, score);
      
      const loadPercentage = averageSessionsPerProvider > 0 
        ? (sessionCount / averageSessionsPerProvider) * 100 
        : 0;
      
      if (sessionCount > overloadThreshold) {
        overloadedProviders.push({
          providerId: provider._id,
          providerName: provider.name,
          sessionCount,
          loadPercentage: Math.round(loadPercentage),
          score,
        });
      } else if (sessionCount < underutilizedThreshold && score >= REBALANCING_CONFIG.MIN_CAPABILITY_SCORE) {
        underutilizedProviders.push({
          providerId: provider._id,
          providerName: provider.name,
          sessionCount,
          loadPercentage: Math.round(loadPercentage),
          score,
        });
      }
    }
    
    // Sort by load (overloaded: highest first, underutilized: lowest first)
    overloadedProviders.sort((a, b) => b.sessionCount - a.sessionCount);
    underutilizedProviders.sort((a, b) => b.score - a.score); // Best candidates first
    
    // Calculate distribution variance
    const sessionCounts = Array.from(providerSessionCounts.values());
    const variance = sessionCounts.length > 1 
      ? sessionCounts.reduce((sum, count) => sum + Math.pow(count - averageSessionsPerProvider, 2), 0) / sessionCounts.length
      : 0;
    
    // Generate rebalancing opportunities
    const rebalancingOpportunities: any[] = [];
    for (const overloaded of overloadedProviders.slice(0, 3)) { // Top 3 overloaded
      for (const underutilized of underutilizedProviders.slice(0, 2)) { // Top 2 underutilized
        const sessionsToMove = Math.min(
          Math.floor((overloaded.sessionCount - averageSessionsPerProvider) / 2),
          Math.floor(averageSessionsPerProvider - underutilized.sessionCount),
          REBALANCING_CONFIG.MAX_REBALANCE_PER_RUN
        );
        
        if (sessionsToMove > 0) {
          rebalancingOpportunities.push({
            fromProviderId: overloaded.providerId,
            toProviderId: underutilized.providerId,
            sessionsToMove,
            expectedImprovement: `Reduce ${overloaded.providerName} load by ${Math.round((sessionsToMove / overloaded.sessionCount) * 100)}%, increase ${underutilized.providerName} utilization`,
          });
        }
      }
    }
    
    // Determine if rebalancing is recommended
    const rebalancingRecommended = variance > (averageSessionsPerProvider * 0.5) && 
                                  overloadedProviders.length > 0 && 
                                  underutilizedProviders.length > 0;
    
    let reason = "Session distribution is balanced";
    if (overloadedProviders.length === 0) {
      reason = "No overloaded providers detected";
    } else if (underutilizedProviders.length === 0) {
      reason = "No suitable underutilized providers available";
    } else if (variance <= (averageSessionsPerProvider * 0.5)) {
      reason = "Distribution variance is within acceptable range";
    } else if (rebalancingRecommended) {
      reason = `High variance detected (${Math.round(variance)}), rebalancing recommended`;
    }
    
      return {
        totalSessions,
        totalProviders: allProviders.length,
        activeProviders: activeProviders.length,
        averageSessionsPerProvider: Math.round(averageSessionsPerProvider * 100) / 100,
        overloadedProviders,
        underutilizedProviders,
        rebalancingOpportunities,
        analysis: {
          distributionVariance: Math.round(variance * 100) / 100,
          rebalancingRecommended,
          reason,
        },
      };
    } catch (error) {
      console.error("Session distribution analysis failed:", error);
      // Return a safe fallback result
      return {
        totalSessions: 0,
        totalProviders: 0,
        activeProviders: 0,
        averageSessionsPerProvider: 0,
        overloadedProviders: [],
        underutilizedProviders: [],
        rebalancingOpportunities: [],
        analysis: {
          distributionVariance: 0,
          rebalancingRecommended: false,
          reason: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  },
});

/**
 * Execute session rebalancing based on analysis
 */
export const executeSessionRebalancing = internalAction({
  args: {
    dryRun: v.optional(v.boolean()),
    maxSessions: v.optional(v.number()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    rebalancingPerformed: v.boolean(),
    sessionsAnalyzed: v.number(),
    sessionsRebalanced: v.number(),
    operations: v.array(v.object({
      sessionId: v.string(),
      fromProvider: v.string(),
      toProvider: v.string(),
      reason: v.string(),
      success: v.boolean(),
      error: v.optional(v.string()),
    })),
    summary: v.object({
      beforeDistribution: v.record(v.string(), v.number()),
      afterDistribution: v.record(v.string(), v.number()),
      improvementScore: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun || false;
    const maxSessions = args.maxSessions || REBALANCING_CONFIG.MAX_REBALANCE_PER_RUN;
    const now = Date.now();
    
    console.log(`🔄 Starting session rebalancing (${dryRun ? 'DRY RUN' : 'LIVE'})...`);
    
    // Get current distribution analysis
    const analysis = await ctx.runAction(internal.loadBalancer.analyzeSessionDistribution);
    
    if (!analysis.analysis.rebalancingRecommended) {
      console.log(`✅ No rebalancing needed: ${analysis.analysis.reason}`);
      return {
        dryRun,
        rebalancingPerformed: false,
        sessionsAnalyzed: analysis.totalSessions,
        sessionsRebalanced: 0,
        operations: [],
        summary: {
          beforeDistribution: {},
          afterDistribution: {},
          improvementScore: 0,
        },
      };
    }
    
    // Get all sessions with their last used times
    const allSessions = await ctx.runQuery(internal.loadBalancer.getSessionsForRebalancing, {
      minIdleTimeMs: REBALANCING_CONFIG.MIN_IDLE_TIME_MS,
    });
    
    const operations: any[] = [];
    let sessionsRebalanced = 0;
    const beforeDistribution: Record<string, number> = {};
    const afterDistribution: Record<string, number> = {};
    
    // Record initial distribution
    for (const [providerName, count] of Object.entries(analysis.rebalancingOpportunities.length > 0 ? {} : {})) {
      beforeDistribution[providerName] = count;
      afterDistribution[providerName] = count;
    }
    
    // Execute rebalancing opportunities
    for (const opportunity of analysis.rebalancingOpportunities) {
      if (sessionsRebalanced >= maxSessions) break;
      
      // Find idle sessions from the overloaded provider
      const sessionsToMove = allSessions
        .filter(s => s.providerId === opportunity.fromProviderId)
        .slice(0, Math.min(opportunity.sessionsToMove, maxSessions - sessionsRebalanced));
      
      for (const session of sessionsToMove) {
        try {
          const fromProvider = await ctx.runQuery(internal.providers.getProviderById, {
            providerId: session.providerId as Id<"providers">,
          });
          const toProvider = await ctx.runQuery(internal.providers.getProviderById, {
            providerId: opportunity.toProviderId as Id<"providers">,
          });
          
          if (!fromProvider || !toProvider) {
            throw new Error("Provider not found");
          }
          
          if (!dryRun) {
            // Perform the actual rebalancing
            await ctx.runMutation(internal.loadBalancer.rebalanceSession, {
              sessionId: session.sessionId,
              fromProviderId: session.providerId as Id<"providers">,
              toProviderId: opportunity.toProviderId as Id<"providers">,
            });
          }
          
          operations.push({
            sessionId: session.sessionId,
            fromProvider: fromProvider.name,
            toProvider: toProvider.name,
            reason: `Load balancing: ${fromProvider.name} overloaded, ${toProvider.name} underutilized`,
            success: true,
          });
          
          sessionsRebalanced++;
          
          // Update distribution tracking
          afterDistribution[fromProvider.name] = (afterDistribution[fromProvider.name] || 0) - 1;
          afterDistribution[toProvider.name] = (afterDistribution[toProvider.name] || 0) + 1;
          
        } catch (error) {
          operations.push({
            sessionId: session.sessionId,
            fromProvider: "unknown",
            toProvider: "unknown",
            reason: "Rebalancing failed",
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }
    
    // Calculate improvement score (reduction in variance)
    const beforeVariance = analysis.analysis.distributionVariance;
    const afterValues = Object.values(afterDistribution);
    const afterAverage = afterValues.reduce((a, b) => a + b, 0) / afterValues.length;
    const afterVariance = afterValues.length > 1 
      ? afterValues.reduce((sum, count) => sum + Math.pow(count - afterAverage, 2), 0) / afterValues.length
      : 0;
    
    const improvementScore = beforeVariance > 0 
      ? Math.round(((beforeVariance - afterVariance) / beforeVariance) * 100)
      : 0;
    
    console.log(`✅ Session rebalancing completed: ${sessionsRebalanced} sessions rebalanced, ${improvementScore}% improvement`);
    
    return {
      dryRun,
      rebalancingPerformed: sessionsRebalanced > 0,
      sessionsAnalyzed: allSessions.length,
      sessionsRebalanced,
      operations,
      summary: {
        beforeDistribution,
        afterDistribution,
        improvementScore,
      },
    };
  },
});

/**
 * Get sessions eligible for rebalancing (idle sessions only)
 */
export const getSessionsForRebalancing = query({
  args: {
    minIdleTimeMs: v.number(),
  },
  returns: v.array(v.object({
    sessionId: v.string(),
    providerId: v.string(),
    lastUsed: v.number(),
    idleTimeMs: v.number(),
  })),
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoff = now - args.minIdleTimeMs;
    
    const sessions = await ctx.db
      .query("sessionProviders")
      .filter((q) => q.lt(q.field("lastUsed"), cutoff))
      .collect();
    
    return sessions.map(s => ({
      sessionId: s.sessionId,
      providerId: s.providerId,
      lastUsed: s.lastUsed,
      idleTimeMs: now - s.lastUsed,
    }));
  },
});

/**
 * Rebalance a specific session from one provider to another
 */
export const rebalanceSession = internalMutation({
  args: {
    sessionId: v.string(),
    fromProviderId: v.id("providers"),
    toProviderId: v.id("providers"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Verify both providers are still active
    const fromProvider = await ctx.db.get(args.fromProviderId);
    const toProvider = await ctx.db.get(args.toProviderId);
    
    if (!fromProvider || !fromProvider.isActive) {
      throw new Error("Source provider is not active");
    }
    
    if (!toProvider || !toProvider.isActive) {
      throw new Error("Target provider is not active");
    }
    
    // Find the session
    const session = await ctx.db
      .query("sessionProviders")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!session) {
      throw new Error("Session not found");
    }
    
    if (session.providerId !== args.fromProviderId) {
      throw new Error("Session is not assigned to the expected provider");
    }
    
    // Update the session assignment
    await ctx.db.patch(session._id, {
      providerId: args.toProviderId,
      assignedAt: Date.now(),
      lastUsed: Date.now(),
    });
    
    console.log(`🔄 Rebalanced session ${args.sessionId.substring(0, 8)} from ${fromProvider.name} to ${toProvider.name}`);
    return true;
  },
});

/**
 * Get load balancing statistics for monitoring
 */
export const getLoadBalancingStats = query({
  args: {},
  returns: v.object({
    timestamp: v.number(),
    sessionDistribution: v.record(v.string(), v.number()),
    providerScores: v.array(v.object({
      providerId: v.string(),
      providerName: v.string(),
      sessionCount: v.number(),
      score: v.number(),
      status: v.union(v.literal("optimal"), v.literal("overloaded"), v.literal("underutilized")),
    })),
    systemBalance: v.object({
      variance: v.number(),
      balanceScore: v.number(),
      recommendation: v.string(),
    }),
  }),
  handler: async (ctx) => {
    const analysis = await ctx.runAction(internal.loadBalancer.analyzeSessionDistribution);
    
    // Calculate provider scores and statuses
    const providerScores: any[] = [];
    const overloadedIds = new Set(analysis.overloadedProviders.map(p => p.providerId));
    const underutilizedIds = new Set(analysis.underutilizedProviders.map(p => p.providerId));
    
    for (const overloaded of analysis.overloadedProviders) {
      providerScores.push({
        providerId: overloaded.providerId,
        providerName: overloaded.providerName,
        sessionCount: overloaded.sessionCount,
        score: overloaded.score,
        status: "overloaded" as const,
      });
    }
    
    for (const underutilized of analysis.underutilizedProviders) {
      providerScores.push({
        providerId: underutilized.providerId,
        providerName: underutilized.providerName,
        sessionCount: underutilized.sessionCount,
        score: underutilized.score,
        status: "underutilized" as const,
      });
    }
    
    // Add optimal providers
    const allProviders: any[] = await ctx.runQuery(internal.providers.listActiveInternal);
    for (const provider of allProviders) {
      if (!overloadedIds.has(provider._id) && !underutilizedIds.has(provider._id)) {
        const sessionCount = Object.values(analysis.rebalancingOpportunities).length; // Approximation
        providerScores.push({
          providerId: provider._id,
          providerName: provider.name,
          sessionCount: Math.round(analysis.averageSessionsPerProvider),
          score: 85, // Optimal score
          status: "optimal" as const,
        });
      }
    }
    
    // Calculate balance score (100 = perfect balance, 0 = terrible)
    const balanceScore = Math.max(0, 100 - (analysis.analysis.distributionVariance / Math.max(analysis.averageSessionsPerProvider, 1)) * 100);
    
    let recommendation = "System is well balanced";
    if (balanceScore < 60) {
      recommendation = "Immediate rebalancing recommended";
    } else if (balanceScore < 80) {
      recommendation = "Monitor for potential rebalancing";
    }
    
    return {
      timestamp: Date.now(),
      sessionDistribution: Object.fromEntries(
        Object.entries(analysis).filter(([key]) => typeof key === 'string')
      ),
      providerScores,
      systemBalance: {
        variance: analysis.analysis.distributionVariance,
        balanceScore: Math.round(balanceScore),
        recommendation,
      },
    };
  },
});