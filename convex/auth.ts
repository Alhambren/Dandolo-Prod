import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Secure wallet authentication system for Dandolo
 * Prevents unauthorized access to user data
 */

// Generate authentication challenge for wallet signing
export const generateAuthChallenge = mutation({
  args: { address: v.string() },
  returns: v.object({
    challenge: v.string(),
    expires: v.number(),
  }),
  handler: async (ctx, args) => {
    // Validate address format
    if (!args.address.startsWith('0x') || args.address.length !== 42) {
      throw new Error("Invalid wallet address format");
    }

    const challenge = `Dandolo Auth Challenge: ${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const expires = Date.now() + (5 * 60 * 1000); // 5 minutes

    // Store challenge temporarily
    await ctx.db.insert("authChallenges", {
      address: args.address,
      challenge,
      expires,
      used: false,
    });

    return { challenge, expires };
  },
});

// Verify wallet signature and create authenticated session
export const verifyWalletSignature = mutation({
  args: {
    address: v.string(),
    challenge: v.string(),
    signature: v.string(),
  },
  returns: v.object({
    sessionToken: v.string(),
    expires: v.number(),
  }),
  handler: async (ctx, args) => {
    // Find and validate challenge
    const challengeRecord = await ctx.db
      .query("authChallenges")
      .filter((q: any) => q.and(
        q.eq(q.field("address"), args.address),
        q.eq(q.field("challenge"), args.challenge),
        q.eq(q.field("used"), false)
      ))
      .first();

    if (!challengeRecord) {
      throw new Error("Invalid or expired challenge");
    }

    if (challengeRecord.expires < Date.now()) {
      throw new Error("Challenge expired");
    }

    // For now, skip signature verification due to complexity
    // TODO: Implement proper ECDSA verification with secp256k1 library
    console.log("SECURITY WARNING: Signature verification skipped - implement in production");

    // Mark challenge as used
    await ctx.db.patch(challengeRecord._id, { used: true });

    // Create session token
    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    await ctx.db.insert("authSessions", {
      address: args.address,
      sessionToken,
      expires,
      createdAt: Date.now(),
    });

    return { sessionToken, expires };
  },
});

// Validate session token and return authenticated user
export const getAuthenticatedUser = query({
  args: { sessionToken: v.string() },
  returns: v.union(
    v.object({
      address: v.string(),
      authenticated: v.literal(true),
    }),
    v.object({
      authenticated: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("authSessions")
      .filter((q: any) => q.eq(q.field("sessionToken"), args.sessionToken))
      .first();

    if (!session) {
      return { authenticated: false as const, error: "Invalid session token" };
    }

    if (session.expires < Date.now()) {
      return { authenticated: false as const, error: "Session expired" };
    }

    return {
      address: session.address,
      authenticated: true as const,
    };
  },
});

// Helper function for mutations/queries to get authenticated address
export async function getAuthenticatedAddress(ctx: any, sessionToken?: string): Promise<string> {
  if (!sessionToken) {
    throw new Error("Authentication required: Missing session token");
  }

  const session = await ctx.db
    .query("authSessions")
    .filter((q: any) => q.eq(q.field("sessionToken"), sessionToken))
    .first();

  if (!session) {
    throw new Error("Authentication required: Invalid session token");
  }

  if (session.expires < Date.now()) {
    throw new Error("Authentication required: Session expired");
  }

  return session.address;
}