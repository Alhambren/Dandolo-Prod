import { internalMutation } from "./_generated/server";

/**
 * Delete un-verified wallet_logins older than 24 h.
 * Used by cron job to clean up stale records.
 */
export const cleanupWalletLogins = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24h
    const stale = await ctx.db.query("wallet_logins")
      .collect();
    await Promise.all(stale
      .filter(l => (l.createdAt ?? 0) < cutoff && l.verified !== true)
      .map(l => ctx.db.delete(l._id)));
  },
}); 