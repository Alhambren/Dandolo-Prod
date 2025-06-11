import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily VCU rewards check every 24 hours
crons.interval(
  "daily VCU rewards check",
  { hours: 24 },
  internal.points.distributeDailyVCURewards,
  {}
);

// Refresh model cache every hour
crons.interval(
  "refresh model cache",
  { hours: 1 },
  internal.models.refreshModelCacheInternal,
  {}
);

export default crons;

