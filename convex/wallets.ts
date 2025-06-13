import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ethers } from "ethers";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

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
  _id: Id<"userPoints">;
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
      .query('userPoints')
      .withIndex('by_address', q => q.eq('address', address))
      .unique();

    if (!existingPoints) {
      await ctx.db.insert('userPoints', { 
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
      .query('userPoints')
      .withIndex('by_address', q => q.eq('address', address))
      .unique();

    if (!pointsRecord) {
      // Create new points record for anonymous users
      if (address === 'anonymous') {
        const newRecord = await ctx.db.insert('userPoints', { 
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
      points: (pointsRecord.points ?? 0) + amount,
      lastEarned: Date.now()
    });

    // Log points history
    await ctx.db.insert('points_history', {
      address,
      points: (pointsRecord.points ?? 0) + amount,
      change: amount,
      reason,
      createdAt: Date.now()
    });

    return (pointsRecord.points ?? 0) + amount;
  },
});

// Get user's total points
export const getUserPoints = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const points = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    return points?.points ?? 0;
  },
});

// Get user's stats including points history
export const getUserStats = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const points = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (!points) {
      return {
        points: 0,
        promptsToday: 0,
        pointsToday: 0,
        promptsRemaining: 50,
        canMakePrompt: true,
      };
    }

    // Check if it's a new day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastEarnedDate = new Date(points.lastEarned);
    lastEarnedDate.setHours(0, 0, 0, 0);
    
    const isNewDay = lastEarnedDate.getTime() < today.getTime();
    const promptsToday = isNewDay ? 0 : points.promptsToday;
    const pointsToday = isNewDay ? 0 : points.pointsToday;

    return {
      points: points.points,
      promptsToday,
      pointsToday,
      promptsRemaining: Math.max(0, 50 - promptsToday),
      canMakePrompt: promptsToday < 50,
    };
  },
});

// Add points to a user
export const addUserPoints = internalMutation({
  args: {
    address: v.string(),
    amount: v.number(),
    source: v.union(v.literal("prompt"), v.literal("referral"), v.literal("other")),
  },
  handler: async (ctx, args) => {
    const points = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    if (points) {
      const lastEarnedDate = new Date(points.lastEarned);
      lastEarnedDate.setHours(0, 0, 0, 0);
      const isNewDay = lastEarnedDate.getTime() < todayTimestamp;

      await ctx.db.patch(points._id, {
        points: points.points + args.amount,
        promptsToday: isNewDay ? (args.source === "prompt" ? 1 : 0) : 
                      points.promptsToday + (args.source === "prompt" ? 1 : 0),
        pointsToday: isNewDay ? args.amount : points.pointsToday + args.amount,
        lastEarned: Date.now(),
      });
    } else {
      await ctx.db.insert("userPoints", {
        address: args.address,
        points: args.amount,
        promptsToday: args.source === "prompt" ? 1 : 0,
        pointsToday: args.amount,
        lastEarned: Date.now(),
      });
    }
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
      .query("userPoints")
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
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first() as Points | null;

    if (!points) {
      // Create new points record
      await ctx.db.insert("userPoints", {
        address: args.address,
        points: args.points,
        promptsToday: 0,
        pointsToday: args.points,
        lastEarned: Date.now(),
      });
    } else {
      // Update existing points record
      await ctx.db.patch(points._id, {
        points: (points.points ?? 0) + args.points,
        pointsToday: (points.pointsToday ?? 0) + args.points,
        lastEarned: Date.now(),
      });
    }

    // Add to history
  await ctx.db.insert("points_history", {
      address: args.address,
      points: (points?.points ?? 0) + args.points,
      change: args.points,
      reason: "Manual addition",
      createdAt: Date.now(),
  });
  },
});

export const getWalletStats = query({
  args: { address: v.string() },
  returns: v.object({
    points: v.number(),
    promptsToday: v.number(),
    pointsToday: v.number(),
    pointsThisWeek: v.number(),
  }),
  handler: async (ctx, args) => {
    const points = await ctx.db
      .query("userPoints")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    return {
      points: points?.points ?? 0,
      promptsToday: points?.promptsToday ?? 0,
      pointsToday: points?.pointsToday ?? 0,
      pointsThisWeek: points?.points ?? 0,
    };
  },
});

// Get provider points
export const getProviderPoints = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const points = await ctx.db
      .query("providerPoints")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .first();
    
    return points ? {
      points: points.points,
      totalPrompts: points.totalPrompts,
      lastEarned: points.lastEarned
    } : null;
  },
});

// Get points leaderboard
export const getPointsLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const points = await ctx.db
      .query("providerPoints")
      .order("desc")
      .take(10);
    
    return points.map(p => ({
      providerId: p.providerId,
      points: p.points,
      totalPrompts: p.totalPrompts
    }));
  },
});
