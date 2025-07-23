import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";

// MONITORING METRICS COLLECTION
export const collectProviderMetrics = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    timestamp: number;
    totalProviders: number;
    activeProviders: number;
    inactiveProviders: number;
    healthyProviders: number;
    unhealthyProviders: number;
    averageResponseTime: number;
    totalVCUBalance: number;
    validationSuccessRate: number;
    systemStatus: "healthy" | "degraded" | "critical";
    metrics: {
      providersWithVCU: number;
      providersWithoutVCU: number;
      avgHealthCheckTime: number;
      recentValidationErrors: number;
    };
  }> => {
    const timestamp = Date.now();
    
    // Get all providers
    const allProviders: any[] = await ctx.runQuery(internal.providers.getAllProviders);
    const activeProviders: any[] = allProviders.filter((p: any) => p.isActive);
    
    // Calculate basic metrics
    const totalProviders = allProviders.length;
    const activeCount = activeProviders.length;
    const inactiveCount = totalProviders - activeCount;
    
    // Get recent health checks (last hour)
    const oneHourAgo = timestamp - (60 * 60 * 1000);
    let healthyCount = 0;
    let unhealthyCount = 0;
    let totalResponseTime = 0;
    let healthCheckCount = 0;
    
    for (const provider of allProviders) {
      // Get recent health check data
      const recentHealthChecks: any[] = await ctx.runQuery(api.providers.getHealthHistory, {
        providerId: provider._id,
        limit: 10
      });
      
      if (recentHealthChecks.length > 0) {
        const latestCheck = recentHealthChecks[0];
        if (latestCheck.status) {
          healthyCount++;
        } else {
          unhealthyCount++;
        }
        totalResponseTime += latestCheck.responseTime;
        healthCheckCount++;
      }
    }
    
    const averageResponseTime = healthCheckCount > 0 ? totalResponseTime / healthCheckCount : 0;
    
    // Calculate VCU metrics
    const totalVCUBalance = allProviders.reduce((sum: number, p: any) => sum + (p.vcuBalance || 0), 0);
    const providersWithVCU = allProviders.filter((p: any) => (p.vcuBalance || 0) > 0).length;
    const providersWithoutVCU = totalProviders - providersWithVCU;
    
    // Calculate validation success rate based on recent provider status changes
    const recentValidationErrors = allProviders.filter((p: any) => 
      p.markedInactiveAt && p.markedInactiveAt > oneHourAgo
    ).length;
    
    const validationSuccessRate = totalProviders > 0 
      ? ((totalProviders - recentValidationErrors) / totalProviders) * 100 
      : 100;
    
    // Determine system status
    let systemStatus: "healthy" | "degraded" | "critical" = "healthy";
    if (activeCount === 0) {
      systemStatus = "critical";
    } else if (activeCount < totalProviders * 0.5 || validationSuccessRate < 80) {
      systemStatus = "degraded";
    }
    
    const metrics = {
      timestamp,
      totalProviders,
      activeProviders: activeCount,
      inactiveProviders: inactiveCount,
      healthyProviders: healthyCount,
      unhealthyProviders: unhealthyCount,
      averageResponseTime: Math.round(averageResponseTime),
      totalVCUBalance: Math.round(totalVCUBalance * 100) / 100,
      validationSuccessRate: Math.round(validationSuccessRate * 100) / 100,
      systemStatus,
      metrics: {
        providersWithVCU,
        providersWithoutVCU,
        avgHealthCheckTime: Math.round(averageResponseTime),
        recentValidationErrors,
      }
    };
    
    // Store metrics for historical tracking
    await ctx.runMutation(internal.monitoring.storeMetrics, metrics);
    
    return metrics;
  },
});

// Store monitoring metrics
export const storeMetrics = internalMutation({
  args: {
    timestamp: v.number(),
    totalProviders: v.number(),
    activeProviders: v.number(),
    inactiveProviders: v.number(),
    healthyProviders: v.number(),
    unhealthyProviders: v.number(),
    averageResponseTime: v.number(),
    totalVCUBalance: v.number(),
    validationSuccessRate: v.number(),
    systemStatus: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("critical")),
    metrics: v.object({
      providersWithVCU: v.number(),
      providersWithoutVCU: v.number(),
      avgHealthCheckTime: v.number(),
      recentValidationErrors: v.number(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.insert("monitoringMetrics", args);
    
    // Keep only last 7 days of metrics to prevent database bloat
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const oldMetrics = await ctx.db
      .query("monitoringMetrics")
      .filter((q) => q.lt(q.field("timestamp"), sevenDaysAgo))
      .collect();
    
    for (const oldMetric of oldMetrics) {
      await ctx.db.delete(oldMetric._id);
    }
  },
});

// Enhanced health checks with detailed monitoring
export const runEnhancedHealthChecks = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    checkTimestamp: number;
    totalProviders: number;
    checksPerformed: number;
    healthyProviders: number;
    unhealthyProviders: number;
    averageResponseTime: number;
    errors: string[];
    criticalIssues: string[];
  }> => {
    const checkTimestamp = Date.now();
    const allProviders: any[] = await ctx.runQuery(internal.providers.getAllProviders);
    
    let checksPerformed = 0;
    let healthyCount = 0;
    let unhealthyCount = 0;
    let totalResponseTime = 0;
    const errors: string[] = [];
    const criticalIssues: string[] = [];
    
    console.log(`🔍 Starting enhanced health checks for ${allProviders.length} providers`);
    
    for (const provider of allProviders) {
      try {
        // Get decrypted API key
        const decryptedApiKey: string = await ctx.runAction(internal.providers.getDecryptedApiKey, {
          providerId: provider._id
        });
        
        const startTime = Date.now();
        
        // Test Venice.ai connectivity
        const response = await fetch('https://api.venice.ai/api/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${decryptedApiKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(30000)
        });
        
        const responseTime = Date.now() - startTime;
        totalResponseTime += responseTime;
        checksPerformed++;
        
        const isHealthy = response.ok;
        
        // Record detailed health check result
        await ctx.runMutation(internal.providers.recordHealthCheckResult, {
          providerId: provider._id,
          status: isHealthy,
          responseTime,
          error: isHealthy ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        });
        
        // Update provider status
        await ctx.runMutation(internal.providers.updateProviderStatus, {
          providerId: provider._id,
          healthCheckPassed: isHealthy,
        });
        
        if (isHealthy) {
          healthyCount++;
          
          // Optionally validate VCU balance for healthy providers
          try {
            const validation: any = await ctx.runAction(api.providers.validateVeniceApiKey, {
              apiKey: decryptedApiKey
            });
            
            if (validation.isValid && validation.balance !== undefined) {
              // Update VCU balance if significantly changed
              const balanceDiff = Math.abs((validation.balance || 0) - (provider.vcuBalance || 0));
              if (balanceDiff > 0.01) {
                await ctx.runMutation(internal.providers.updateVCUBalance, {
                  providerId: provider._id,
                  vcuBalance: validation.balance || 0,
                });
              }
            }
          } catch (vcuError) {
            // VCU validation error is not critical for health check
            console.warn(`VCU validation failed for ${provider.name}:`, vcuError);
          }
          
        } else {
          unhealthyCount++;
          const errorMsg = `Provider ${provider.name} (${provider.address}) failed health check: HTTP ${response.status}`;
          errors.push(errorMsg);
          console.warn(errorMsg);
        }
        
      } catch (error) {
        unhealthyCount++;
        checksPerformed++;
        
        const errorMsg = `Provider ${provider.name} (${provider.address}) health check error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        
        // Record failed health check
        await ctx.runMutation(internal.providers.recordHealthCheckResult, {
          providerId: provider._id,
          status: false,
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        // Update provider status
        await ctx.runMutation(internal.providers.updateProviderStatus, {
          providerId: provider._id,
          healthCheckPassed: false,
        });
        
        console.error(errorMsg);
      }
    }
    
    const averageResponseTime = checksPerformed > 0 ? totalResponseTime / checksPerformed : 0;
    
    // Check for critical issues
    if (healthyCount === 0 && allProviders.length > 0) {
      criticalIssues.push("🚨 CRITICAL: All providers are offline!");
    }
    
    if (healthyCount < allProviders.length * 0.3) {
      criticalIssues.push("⚠️ WARNING: Less than 30% of providers are healthy");
    }
    
    if (averageResponseTime > 10000) {
      criticalIssues.push("⚠️ WARNING: Average response time exceeds 10 seconds");
    }
    
    // Log critical issues
    for (const issue of criticalIssues) {
      console.error(issue);
      await ctx.runMutation(internal.monitoring.logAlert, {
        level: "critical",
        message: issue,
        timestamp: checkTimestamp,
        context: {
          totalProviders: allProviders.length,
          healthyProviders: healthyCount,
          unhealthyProviders: unhealthyCount,
          averageResponseTime,
        },
      });
    }
    
    const result = {
      checkTimestamp,
      totalProviders: allProviders.length,
      checksPerformed,
      healthyProviders: healthyCount,
      unhealthyProviders: unhealthyCount,
      averageResponseTime: Math.round(averageResponseTime),
      errors: errors.slice(0, 10), // Limit to first 10 errors
      criticalIssues,
    };
    
    console.log(`✅ Enhanced health checks completed:`, result);
    return result;
  },
});

// Log monitoring alerts
export const logAlert = internalMutation({
  args: {
    level: v.union(v.literal("info"), v.literal("warning"), v.literal("error"), v.literal("critical")),
    message: v.string(),
    timestamp: v.number(),
    context: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.insert("monitoringAlerts", {
      level: args.level,
      message: args.message,
      timestamp: args.timestamp,
      context: args.context,
      acknowledged: false,
    });
    
    // Clean up old alerts (keep last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const oldAlerts = await ctx.db
      .query("monitoringAlerts")
      .filter((q) => q.lt(q.field("timestamp"), thirtyDaysAgo))
      .collect();
    
    for (const oldAlert of oldAlerts) {
      await ctx.db.delete(oldAlert._id);
    }
  },
});

// Get monitoring dashboard data
export const getDashboardData = query({
  args: {
    timeRange: v.optional(v.union(
      v.literal("1h"),
      v.literal("6h"), 
      v.literal("24h"),
      v.literal("7d")
    )),
  },
  returns: v.object({
    timeRange: v.string(),
    currentStatus: v.optional(v.any()),
    trends: v.optional(v.any()),
    metrics: v.array(v.any()),
    alerts: v.array(v.any()),
    summary: v.object({
      totalMetricPoints: v.number(),
      criticalAlerts: v.number(),
      warningAlerts: v.number(),
      lastUpdate: v.optional(v.number())
    })
  }),
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || "24h";
    const now = Date.now();
    
    let cutoff: number;
    switch (timeRange) {
      case "1h": cutoff = now - (60 * 60 * 1000); break;
      case "6h": cutoff = now - (6 * 60 * 60 * 1000); break;
      case "24h": cutoff = now - (24 * 60 * 60 * 1000); break;
      case "7d": cutoff = now - (7 * 24 * 60 * 60 * 1000); break;
    }
    
    // Get recent metrics
    const recentMetrics = await ctx.db
      .query("monitoringMetrics")
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .order("desc")
      .take(100);
    
    // Get recent alerts
    const recentAlerts = await ctx.db
      .query("monitoringAlerts")
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .order("desc")
      .take(50);
    
    // Calculate current status
    const latestMetric = recentMetrics[0];
    const currentStatus = latestMetric ? {
      totalProviders: latestMetric.totalProviders,
      activeProviders: latestMetric.activeProviders,
      healthyProviders: latestMetric.healthyProviders,
      systemStatus: latestMetric.systemStatus,
      validationSuccessRate: latestMetric.validationSuccessRate,
      averageResponseTime: latestMetric.averageResponseTime,
      totalVCUBalance: latestMetric.totalVCUBalance,
      timestamp: latestMetric.timestamp,
    } : null;
    
    // Calculate trends
    const trends = recentMetrics.length >= 2 ? {
      activeProvidersTrend: latestMetric.activeProviders - recentMetrics[recentMetrics.length - 1].activeProviders,
      validationSuccessRateTrend: latestMetric.validationSuccessRate - recentMetrics[recentMetrics.length - 1].validationSuccessRate,
      responseTimeTrend: latestMetric.averageResponseTime - recentMetrics[recentMetrics.length - 1].averageResponseTime,
    } : null;
    
    return {
      timeRange,
      currentStatus,
      trends,
      metrics: recentMetrics.reverse(), // Show oldest first for charts
      alerts: recentAlerts.map(alert => ({
        level: alert.level,
        message: alert.message,
        timestamp: alert.timestamp,
        acknowledged: alert.acknowledged,
      })),
      summary: {
        totalMetricPoints: recentMetrics.length,
        criticalAlerts: recentAlerts.filter(a => a.level === "critical").length,
        warningAlerts: recentAlerts.filter(a => a.level === "warning").length,
        lastUpdate: latestMetric?.timestamp,
      },
    };
  },
});

// Get provider validation report
export const getValidationReport = query({
  args: {
    hours: v.optional(v.number()),
  },
  returns: v.object({
    timeRange: v.string(),
    summary: v.any(),
    providers: v.array(v.any()),
    timestamp: v.number()
  }),
  handler: async (ctx, args) => {
    const hours = args.hours || 24;
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    
    // Get all providers
    const allProviders = await ctx.db.query("providers").collect();
    
    // Get recent health checks
    const recentHealthChecks = await ctx.db
      .query("providerHealth")
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .collect();
    
    // Calculate validation statistics
    const totalValidationAttempts = recentHealthChecks.length;
    const successfulValidations = recentHealthChecks.filter(check => check.status).length;
    const failedValidations = totalValidationAttempts - successfulValidations;
    const successRate = totalValidationAttempts > 0 
      ? (successfulValidations / totalValidationAttempts) * 100 
      : 0;
    
    // Group by provider
    const providerStats = new Map<string, {
      total: number;
      successful: number;
      failed: number;
      avgResponseTime: number;
      totalResponseTime: number;
    }>();
    for (const check of recentHealthChecks) {
      if (!providerStats.has(check.providerId)) {
        providerStats.set(check.providerId, {
          total: 0,
          successful: 0,
          failed: 0,
          avgResponseTime: 0,
          totalResponseTime: 0,
        });
      }
      
      const stats = providerStats.get(check.providerId)!;
      stats.total++;
      stats.totalResponseTime += check.responseTime;
      
      if (check.status) {
        stats.successful++;
      } else {
        stats.failed++;
      }
    }
    
    // Calculate averages and build provider report
    const providerReports: any[] = [];
    for (const [providerId, stats] of providerStats) {
      const provider = allProviders.find((p: any) => p._id === providerId);
      if (provider) {
        providerReports.push({
          providerId,
          providerName: provider.name,
          isActive: provider.isActive,
          totalChecks: stats.total,
          successfulChecks: stats.successful,
          failedChecks: stats.failed,
          successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
          averageResponseTime: stats.total > 0 ? stats.totalResponseTime / stats.total : 0,
          vcuBalance: provider.vcuBalance || 0,
        });
      }
    }
    
    // Sort by success rate (worst first for attention)
    providerReports.sort((a, b) => a.successRate - b.successRate);
    
    return {
      timeRange: `${hours} hours`,
      summary: {
        totalProviders: allProviders.length,
        activeProviders: allProviders.filter(p => p.isActive).length,
        totalValidationAttempts,
        successfulValidations,
        failedValidations,
        overallSuccessRate: Math.round(successRate * 100) / 100,
      },
      providers: providerReports,
      timestamp: Date.now(),
    };
  },
});

// Get system health trends
export const getHealthTrends = query({
  args: {
    days: v.optional(v.number()),
  },
  returns: v.object({
    days: v.optional(v.number()),
    dataPoints: v.number(),
    trends: v.optional(v.array(v.any())),
    summary: v.optional(v.any()),
    message: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    const days = args.days || 7;
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const metrics = await ctx.db
      .query("monitoringMetrics")
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .order("asc")
      .collect();
    
    if (metrics.length === 0) {
      return {
        message: "No metrics data available for the requested time period",
        days,
        dataPoints: 0,
      };
    }
    
    // Group by day for daily trends
    const dailyTrends = new Map<string, {
      date: string;
      activeProviders: number[];
      validationSuccessRates: number[];
      responseTimes: number[];
      vcuBalances: number[];
    }>();
    for (const metric of metrics) {
      const day = new Date(metric.timestamp).toISOString().split('T')[0];
      if (!dailyTrends.has(day)) {
        dailyTrends.set(day, {
          date: day,
          activeProviders: [],
          validationSuccessRates: [],
          responseTimes: [],
          vcuBalances: [],
        });
      }
      
      const trend = dailyTrends.get(day)!;
      trend.activeProviders.push(metric.activeProviders);
      trend.validationSuccessRates.push(metric.validationSuccessRate);
      trend.responseTimes.push(metric.averageResponseTime);
      trend.vcuBalances.push(metric.totalVCUBalance);
    }
    
    // Calculate daily averages
    const trendData = Array.from(dailyTrends.values()).map(trend => ({
      date: trend.date,
      avgActiveProviders: trend.activeProviders.reduce((a, b) => a + b, 0) / trend.activeProviders.length,
      avgValidationSuccessRate: trend.validationSuccessRates.reduce((a, b) => a + b, 0) / trend.validationSuccessRates.length,
      avgResponseTime: trend.responseTimes.reduce((a, b) => a + b, 0) / trend.responseTimes.length,
      avgVCUBalance: trend.vcuBalances.reduce((a, b) => a + b, 0) / trend.vcuBalances.length,
      dataPoints: trend.activeProviders.length,
    }));
    
    return {
      days,
      dataPoints: metrics.length,
      trends: trendData,
      summary: {
        firstDate: metrics[0]._creationTime,
        lastDate: metrics[metrics.length - 1]._creationTime,
        totalMetrics: metrics.length,
      },
    };
  },
});


