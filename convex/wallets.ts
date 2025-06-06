import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { ethers } from "ethers";

export const verifyWallet = mutation({
  args: { 
    address: v.string(), 
    msg: v.string(), 
    signature: v.string() 
  },
  handler: async (ctx, { address, msg, signature }) => {
    // Verify signature matches message and address
    const recovered = ethers.verifyMessage(msg, signature);
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      throw new Error('Invalid signature');
    }

    // Parse message and check nonce expiration
    const parsed = Object.fromEntries(
      msg.split('\n').map(line => line.split(': '))
    );

    const issuedAt = Date.parse(parsed.issuedAt);
    if (Date.now() - issuedAt > 15 * 60_000) {
      throw new Error('Signature expired');
    }

    // Insert wallet login record
    const login = await ctx.db.insert('wallet_logins', { 
      address, 
      msg, 
      signature, 
      verified: false,
      createdAt: Date.now()
    });

    // Clear sensitive data after verification
    await ctx.db.patch(login, {
      verified: true,
      msg: undefined,
      signature: undefined,
    });

    // Ensure points record exists
    const existingPoints = await ctx.db
      .query('points')
      .withIndex('by_address', q => q.eq('address', address))
      .unique();

    if (!existingPoints) {
      await ctx.db.insert('points', { 
        address, 
        total: 0,
        totalSpent: 0,
        lastActivity: Date.now()
      });
    }

    return { ok: true, address };
  },
});

export const addAddressPoints = mutation({
  args: { 
    address: v.string(), 
    amount: v.number(), 
    reason: v.string() 
  },
  handler: async (ctx, { address, amount, reason }) => {
    // Update total points
    const pointsRecord = await ctx.db
      .query('points')
      .withIndex('by_address', q => q.eq('address', address))
      .unique();

    if (!pointsRecord) {
      // Create new points record for anonymous users
      if (address === 'anonymous') {
        const newRecord = await ctx.db.insert('points', { 
          address, 
          total: amount,
          totalSpent: 0,
          lastActivity: Date.now()
        });
        return amount;
      }
      throw new Error('No points record found for address');
    }

    await ctx.db.patch(pointsRecord._id, { 
      total: (pointsRecord.total || 0) + amount,
      lastActivity: Date.now()
    });

    // Log points history
    await ctx.db.insert('points_history', { 
      address, 
      amount, 
      reason, 
      ts: Date.now() 
    });

    return pointsRecord.total + amount;
  },
});

/**
 * Delete un-verified wallet_logins older than 24 h.
 * Used by cron job to clean up stale records.
 */
export const cleanupWalletLogins = mutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1_000; // 24 h
    const stale = await ctx.db.query("wallet_logins")
      .collect();
    await Promise.all(stale
      .filter(l => (l.createdAt ?? 0) < cutoff && l.verified !== true)
      .map(l => ctx.db.delete(l._id)));
  },
});
