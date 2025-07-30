import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Get or assign a provider for a session.
 * This ensures streaming consistency by maintaining the same provider across a chat session.
 */
export const getSessionProvider = mutation({
  args: { 
    sessionId: v.string(),
    intent: v.optional(v.string()),
  },
  returns: v.id("providers"),
  handler: async (ctx, args): Promise<Id<"providers">> => {
    const now = Date.now();
    
    // Check for existing active session
    const existing = await ctx.db
      .query("sessionProviders")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (existing && existing.expiresAt > now) {
      // Verify the assigned provider is still active
      const provider = await ctx.db.get(existing.providerId);
      
      if (provider && provider.isActive) {
        // Update last used timestamp and extend expiry
        await ctx.db.patch(existing._id, {
          lastUsed: now,
          expiresAt: now + SESSION_TIMEOUT,
        });
        return existing.providerId;
      } else {
        // Provider became inactive, clean up this session
        await ctx.db.delete(existing._id);
      }
    } else if (existing) {
      // Session expired, clean it up
      await ctx.db.delete(existing._id);
    }
    
    // Need to assign a new provider
    // Get all active providers with proper validation
    const providers: Array<{ _id: Id<"providers">; name: string; isActive: boolean }> = await ctx.runQuery(internal.providers.listActiveInternal);
    
    if (providers.length === 0) {
      throw new Error("No active providers available for session assignment");
    }
    
    // Simple load balancing: select provider with least recent assignments
    // For now, use random selection but this can be improved
    const selectedProvider: { _id: Id<"providers">; name: string; isActive: boolean } = providers[Math.floor(Math.random() * providers.length)];
    
    // Create new session assignment
    await ctx.db.insert("sessionProviders", {
      sessionId: args.sessionId,
      providerId: selectedProvider._id,
      assignedAt: now,
      lastUsed: now,
      expiresAt: now + SESSION_TIMEOUT,
      intent: args.intent,
    });
    
    return selectedProvider._id;
  },
});

/**
 * Get current session provider without creating new assignment
 */
export const getCurrentSessionProvider = query({
  args: { sessionId: v.string() },
  returns: v.union(v.id("providers"), v.null()),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const session = await ctx.db
      .query("sessionProviders")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!session || session.expiresAt <= now) {
      return null;
    }
    
    // Verify provider is still active
    const provider = await ctx.db.get(session.providerId);
    if (!provider || !provider.isActive) {
      return null;
    }
    
    return session.providerId;
  },
});

/**
 * Remove a session assignment (used when switching to new chat)
 */
export const removeSession = mutation({
  args: { sessionId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessionProviders")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (session) {
      await ctx.db.delete(session._id);
      console.log(`Removed session ${args.sessionId.substring(0, 8)}...`);
      return true;
    }
    
    return false;
  },
});

/**
 * Get session statistics for monitoring
 */
export const getSessionStats = query({
  args: {},
  returns: v.object({
    totalActiveSessions: v.number(),
    expiredSessions: v.number(),
    providerDistribution: v.record(v.string(), v.number()),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const allSessions = await ctx.db.query("sessionProviders").collect();
    
    const activeSessions = allSessions.filter(s => s.expiresAt > now);
    const expiredSessions = allSessions.filter(s => s.expiresAt <= now);
    
    // Count sessions per provider
    const providerDistribution: Record<string, number> = {};
    for (const session of activeSessions) {
      const provider = await ctx.db.get(session.providerId);
      if (provider) {
        const key = provider.name;
        providerDistribution[key] = (providerDistribution[key] || 0) + 1;
      }
    }
    
    return {
      totalActiveSessions: activeSessions.length,
      expiredSessions: expiredSessions.length,
      providerDistribution,
    };
  },
});

/**
 * Cleanup expired sessions (called by cron job)
 */
export const cleanupExpiredSessions = internalMutation({
  args: {},
  returns: v.object({
    cleaned: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    let cleaned = 0;
    let errors = 0;
    
    try {
      const expiredSessions = await ctx.db
        .query("sessionProviders")
        .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
        .collect();
      
      for (const session of expiredSessions) {
        try {
          await ctx.db.delete(session._id);
          cleaned++;
        } catch (error) {
          console.error(`Failed to delete session ${session.sessionId}:`, error);
          errors++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired sessions`);
      }
      
    } catch (error) {
      console.error("Failed to cleanup expired sessions:", error);
      errors++;
    }
    
    return { cleaned, errors };
  },
});

/**
 * Force reassign a session to a different provider (for testing/maintenance)
 */
export const reassignSession = mutation({
  args: { 
    sessionId: v.string(),
    forceProviderId: v.optional(v.id("providers")),
  },
  returns: v.id("providers"),
  handler: async (ctx, args): Promise<Id<"providers">> => {
    // Remove existing session
    await ctx.runMutation(api.sessionProviders.removeSession, {
      sessionId: args.sessionId,
    });
    
    // Create new assignment
    return await ctx.runMutation(api.sessionProviders.getSessionProvider, {
      sessionId: args.sessionId,
      intent: "chat",
    });
  },
});

/**
 * Get sessions for a specific provider (for load balancing analysis)
 */
export const getProviderSessions = query({
  args: { providerId: v.id("providers") },
  returns: v.array(v.object({
    sessionId: v.string(),
    assignedAt: v.number(),
    lastUsed: v.number(),
    expiresAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessions = await ctx.db
      .query("sessionProviders")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();
    
    return sessions.map(s => ({
      sessionId: s.sessionId,
      assignedAt: s.assignedAt,
      lastUsed: s.lastUsed,
      expiresAt: s.expiresAt,
    }));
  },
});