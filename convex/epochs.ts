import { query } from './_generated/server';
import { v } from 'convex/values';

export const getNextEpoch = query({
  args: {},
  returns: v.object({
    startTime: v.string(),
    endTime: v.string(),
    rewards: v.number(),
  }),
  handler: async (ctx) => {
    // Calculate next Sunday at midnight UTC
    const now = new Date();
    const daysUntilSunday = 7 - now.getUTCDay();
    const nextSunday = new Date(now);
    nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
    nextSunday.setUTCHours(0, 0, 0, 0);

    // If today is Sunday and it's before midnight UTC, use today
    if (now.getUTCDay() === 0 && now.getUTCHours() < 24) {
      nextSunday.setUTCDate(now.getUTCDate());
    }

    // Calculate end time (7 days later)
    const endTime = new Date(nextSunday);
    endTime.setUTCDate(nextSunday.getUTCDate() + 7);

    // Get total rewards for this epoch
    const providers = await ctx.db.query('providers').collect();
    const totalRewards = providers.reduce((sum, p) => sum + (p.vcuEarned7d || 0), 0);

    return {
      startTime: nextSunday.toISOString(),
      endTime: endTime.toISOString(),
      rewards: totalRewards,
    };
  },
}); 