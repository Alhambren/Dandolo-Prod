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

// Calculate daily provider points based on VCU contribution
crons.interval(
  "calculate provider points",
  { hours: 24 },
  internal.points.calculateDailyProviderPoints,
  {}
);

// Clean up old usage logs (keep last 30 days)
crons.interval(
  "cleanup old logs",
  { hours: 24 * 7 }, // Weekly cleanup
  internal.analytics.cleanupOldLogs,
  {}
);

export default crons;
