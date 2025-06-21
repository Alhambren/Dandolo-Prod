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

// Daily VCU rewards at midnight UTC (as per specification)
crons.interval(
  "daily-vcu-distribution",
  { hours: 24 },
  internal.points.distributeDailyVCURewards,
  {}
);

// Clean up expired rate limit records every hour
// crons.interval(
//   "cleanup-rate-limits",
//   { hours: 1 },
//   internal.rateLimit.cleanupExpiredRateLimits,
//   {}
// );

// Clean up security data and expired records every 6 hours
// crons.interval(
//   "cleanup-security-data",
//   { hours: 6 },
//   internal.edgeCases.cleanupSecurityData,
//   {}
// );

// Refresh model cache every hour
crons.interval(
  "refresh-model-cache",
  { hours: 1 },
  internal.models.refreshModelCacheInternal,
  {}
);

export default crons;

