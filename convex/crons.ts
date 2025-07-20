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

export default crons;

