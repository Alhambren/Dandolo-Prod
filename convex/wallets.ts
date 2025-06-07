import { mutation, query, internalMutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
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
    signature: v.string(),
    nonce: v.string(),
  },
  handler: async (ctx, args) => {
    const recovered = ethers.verifyMessage(args.nonce, args.signature);
    const isValid = recovered.toLowerCase() === args.address.toLowerCase();

    if (!isValid) {
      throw new Error("Invalid signature");
    }

    // Check if nonce is expired (5 minutes)
    const nonceTime = parseInt(args.nonce.split(":")[1]);
    if (Date.now() - nonceTime > 5 * 60 * 1000) {
      throw new Error("Nonce expired");
    }

    return { success: true };
  },
});

export const addAddressPoints = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const pointsRecord = await ctx.db
      .query("points")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (pointsRecord) {
      await ctx.db.patch(pointsRecord._id, {
        points: (pointsRecord.points || 0) + args.amount,
        lastEarned: Date.now(),
      });
    } else {
      await ctx.db.insert("points", {
        address: args.address,
        points: args.amount,
        promptsToday: 0,
        pointsToday: 0,
        lastEarned: Date.now(),
      });
    }

    // Log history
    await ctx.db.insert("points_history", {
      address: args.address,
      amount: args.amount,
      reason: args.reason,
      ts: Date.now(),
    });

    return { success: true };
  },
});

export const getPoints = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const pointsRecord = await ctx.db
      .query("points")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    return {
      points: pointsRecord?.points ?? 0,
      promptsToday: pointsRecord?.promptsToday ?? 0,
      pointsToday: pointsRecord?.pointsToday ?? 0,
      lastEarned: pointsRecord?.lastEarned ?? 0,
    };
  },
});

export const getWalletBalance = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const pointsRecord = await ctx.db
      .query("points")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    return {
      balance: pointsRecord?.points ?? 0,
      promptsToday: pointsRecord?.promptsToday ?? 0,
      pointsToday: pointsRecord?.pointsToday ?? 0,
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
