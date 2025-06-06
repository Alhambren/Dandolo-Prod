import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ethers } from "ethers";
import { Id } from "./_generated/dataModel";

interface Provider {
  _id: Id<"providers">;
  address: string;
  name: string;
  description?: string;
  veniceApiKey: string;
  vcuBalance: number;
  isActive: boolean;
  uptime: number;
  totalPrompts: number;
  registrationDate: number;
  lastHealthCheck?: number;
  avgResponseTime: number;
  status: "pending" | "active" | "inactive";
  region?: string;
  gpuType?: string;
}

interface Points {
  _id: Id<"points">;
  address: string;
  points: number;
  promptsToday: number;
  pointsToday: number;
  lastEarned: number;
}

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

    // Ensure points record exists
    const existingPoints = await ctx.db
      .query('points')
      .withIndex('by_address', q => q.eq('address', address))
      .unique();

    if (!existingPoints) {
      await ctx.db.insert('points', { 
        address, 
        points: 0,
        promptsToday: 0,
        pointsToday: 0,
        lastEarned: Date.now()
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
          points: amount,
          promptsToday: 0,
          pointsToday: amount,
          lastEarned: Date.now()
        });
        return amount;
      }
      throw new Error('No points record found for address');
    }

    await ctx.db.patch(pointsRecord._id, { 
      points: pointsRecord.points + amount,
      lastEarned: Date.now()
    });

    // Log points history
    await ctx.db.insert('points_history', { 
      address, 
      amount, 
      reason, 
      ts: Date.now() 
    });

    return pointsRecord.points + amount;
  },
});

// Get points for a wallet address
export const getPoints = query({
  args: { address: v.string() },
  returns: v.object({
    points: v.number(),
    promptsToday: v.number(),
    pointsToday: v.number(),
    lastEarned: v.number(),
  }),
  handler: async (ctx, args) => {
    const pointsRecord = await ctx.db
      .query("points")
      .withIndex("by_address", q => q.eq("address", args.address))
      .first();

    if (!pointsRecord) {
      return {
        points: 0,
        promptsToday: 0,
        pointsToday: 0,
        lastEarned: 0,
      };
    }

    return {
      points: pointsRecord.points,
      promptsToday: pointsRecord.promptsToday,
      pointsToday: pointsRecord.pointsToday,
      lastEarned: pointsRecord.lastEarned,
    };
  },
});

// Get wallet balance
export const getWalletBalance = query({
  args: { address: v.string() },
  returns: v.object({
    balance: v.number(),
    prompts_today: v.number(),
    points_today: v.number(),
  }),
  handler: async (ctx, args) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usageLogs = await ctx.db
      .query("usageLogs")
      .filter((q) => q.eq(q.field("address"), args.address))
      .collect();

    const pointsRecord = await ctx.db
      .query("points")
      .withIndex("by_address", q => q.eq("address", args.address))
      .first();

    return {
      balance: pointsRecord?.points ?? 0,
      prompts_today: usageLogs.filter(log => log.createdAt >= today.getTime()).length,
      points_today: pointsRecord?.pointsToday ?? 0,
    };
  },
});

// Add points to wallet
export const addPoints = mutation({
  args: {
    address: v.string(),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    const points = await ctx.db
      .query("points")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first() as Points | null;

    if (!points) {
      // Create new points record
      await ctx.db.insert("points", {
        address: args.address,
        points: args.points,
        promptsToday: 0,
        pointsToday: args.points,
        lastEarned: Date.now(),
      });
    } else {
      // Update existing points record
      await ctx.db.patch(points._id, {
        points: (points.points || 0) + args.points,
        pointsToday: points.pointsToday + args.points,
        lastEarned: Date.now(),
      });
    }

    // Add to history
    await ctx.db.insert("points_history", {
      address: args.address,
      amount: args.points,
      reason: "Manual addition",
      ts: Date.now(),
    });
  },
});

// Clean up old points history
export const cleanupPointsHistory = internalMutation({
  args: {},
  returns: v.object({
    deleted: v.number(),
  }),
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    const oldRecords = await ctx.db
      .query("points_history")
      .filter((q) => q.lt(q.field("ts"), thirtyDaysAgo))
      .collect();

    // Delete old records in batches
    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    return { deleted: oldRecords.length };
  },
});
