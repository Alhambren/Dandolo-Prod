import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Health checks every 4 hours (as per specification)
crons.interval(
  "provider-health-checks",
  { hours: 4 },
  internal.providers.runHealthChecks,
  {}
);

// Enhanced monitoring and health checks every 15 minutes
crons.interval(
  "enhanced-monitoring",
  { minutes: 15 },
  internal.monitoring.runEnhancedHealthChecks,
  {}
);

// Collect detailed metrics every hour for dashboard
crons.interval(
  "collect-metrics",
  { hours: 1 },
  internal.monitoring.collectProviderMetrics,
  {}
);

// Update balances every hour using Venice.ai rate limits endpoint
crons.interval(
  "update-balances",
  { hours: 1 },
  internal.providers.refreshAllVCUBalances,
  {}
);

// Daily rewards at midnight UTC (after balance refresh)
crons.interval(
  "daily-rewards-distribution",
  { hours: 24 },
  internal.points.distributeDailyRewards,
  {}
);

// Refresh model cache every 30 minutes to ensure it's always fresh
crons.interval(
  "refresh-model-cache",
  { minutes: 30 },
  internal.models.refreshModelCacheInternal,
  {}
);

// Backup model cache refresh every 15 minutes as safety net
crons.interval(
  "backup-refresh-model-cache",
  { minutes: 15 },
  internal.models.refreshModelCacheInternal,
  {}
);

// Refresh network stats cache every 5 minutes for fast dashboard loading
crons.interval(
  "refresh-network-stats",
  { minutes: 5 },
  internal.stats.refreshNetworkStatsCache,
  {}
);

// More frequent stats refresh during peak hours (1 PM UTC)
crons.daily(
  "peak-hours-stats-refresh",
  { hourUTC: 13, minuteUTC: 0 },
  internal.stats.refreshNetworkStatsCache,
  {}
);

// Clean up expired session provider assignments every 30 minutes
crons.interval(
  "cleanup-expired-sessions",
  { minutes: 30 },
  internal.sessionProviders.cleanupExpiredSessions,
  {}
);

// Clean up expired auth sessions and challenges every hour
crons.interval(
  "cleanup-auth-sessions",
  { hours: 1 },
  internal.auth.cleanupExpiredSessionsInternal,
  {}
);

export default crons;

