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

// Update Diem balances every hour using Venice.ai rate limits endpoint
crons.interval(
  "update-diem-balances",
  { hours: 1 },
  internal.providers.refreshAllVCUBalances,
  {}
);

// Daily Diem rewards at midnight UTC (after Diem balance refresh)
crons.interval(
  "daily-diem-distribution",
  { hours: 24 },
  internal.points.distributeDailyDiemRewards,
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

