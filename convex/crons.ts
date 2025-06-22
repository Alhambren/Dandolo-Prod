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

// Update VCU balances every hour using Venice.ai rate limits endpoint
crons.interval(
  "update-vcu-balances",
  { hours: 1 },
  internal.providers.refreshAllVCUBalances,
  {}
);

// Daily VCU rewards at midnight UTC (after VCU balance refresh)
crons.interval(
  "daily-vcu-distribution",
  { hours: 24 },
  internal.points.distributeDailyVCURewards,
  {}
);

// Refresh model cache every hour
crons.interval(
  "refresh-model-cache",
  { hours: 1 },
  internal.models.refreshModelCacheInternal,
  {}
);

export default crons;

