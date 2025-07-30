import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal, api } from "./_generated/api";

// No timeout - sessions persist until explicitly ended by user

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
    
    // Check for existing session (no expiry check)
    const existing = await ctx.db
      .query("sessionProviders")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (existing) {
      // Verify the assigned provider is still active
      const provider = await ctx.db.get(existing.providerId);
      
      if (provider && provider.isActive) {
        // Update last used timestamp (no expiry extension needed)
        await ctx.db.patch(existing._id, {
          lastUsed: now,
        });
        return existing.providerId;
      } else {
        // Provider became inactive, clean up this session
        await ctx.db.delete(existing._id);
      }
    }
    
    // Need to assign a new provider
    // Get all active providers with proper validation
    const providers: Array<{ _id: Id<"providers">; name: string; isActive: boolean }> = await ctx.runQuery(internal.providers.listActiveInternal);
    
    if (providers.length === 0) {
      throw new Error("No active providers available for session assignment");
    }
    
    // Simple load balancing: select provider with least recent assignments
    // For now, use random selection but this can be improved
    const randomValue = Math.random();
    const randomIndex = Math.floor(randomValue * providers.length);
    const selectedProvider: { _id: Id<"providers">; name: string; isActive: boolean } = providers[randomIndex];
    
    // Random provider selection for new session
    console.log(`New session ${args.sessionId.substring(0, 8)}: Selected provider '${selectedProvider.name}' (index ${randomIndex}/${providers.length})`);
    
    // Create new session assignment (no expiry)
    await ctx.db.insert("sessionProviders", {
      sessionId: args.sessionId,
      providerId: selectedProvider._id,
      assignedAt: now,
      lastUsed: now,
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
    const session = await ctx.db
      .query("sessionProviders")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!session) {
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
    const allSessions = await ctx.db.query("sessionProviders").collect();
    
    // All sessions are considered active (no expiry)
    const activeSessions = allSessions;
    
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
      expiredSessions: 0, // No sessions expire anymore
      providerDistribution,
    };
  },
});

/**
 * Cleanup expired sessions (no longer needed - sessions don't expire)
 */
export const cleanupExpiredSessions = internalMutation({
  args: {},
  returns: v.object({
    cleaned: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx) => {
    // No sessions expire anymore, so nothing to clean up
    return { cleaned: 0, errors: 0 };
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
  })),
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessionProviders")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .collect();
    
    return sessions.map(s => ({
      sessionId: s.sessionId,
      assignedAt: s.assignedAt,
      lastUsed: s.lastUsed,
    }));
  },
});