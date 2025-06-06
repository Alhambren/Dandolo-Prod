import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily health check for all providers
crons.interval(
  "daily health check",
  { hours: 24 },
  internal.providers.runHealthChecks,
  {}
);

// Daily VCU check and point allocation for providers
crons.interval(
  "daily VCU check",
  { hours: 24 },
  internal.points.dailyVCUCheck,
  {}
);

// Clean up old usage logs (keep last 30 days)
crons.interval(
  "cleanup old logs",
  { hours: 24 * 7 }, // Weekly cleanup
  internal.analytics.cleanupOldLogs,
  {}
);

/**
 * Delete un-verified wallet_logins older than 24 h.
 * Runs every 6 hours.
 */
crons.interval(
  "cleanup wallet logins",
  { hours: 6 },
  internal.cleanup.cleanupWalletLogins
);

export default crons;
