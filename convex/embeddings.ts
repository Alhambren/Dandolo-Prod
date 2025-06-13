import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";

/**
 * Generate and store text embeddings using Venice.ai.
 * - `text`: string to embed
 * - `providerId`: ID of provider to bill VCUs
 */
export const embedText = action({
  args: { text: v.string() },
  handler: async (ctx, args: { text: string }) => {
    // Example embedding logic (replace with actual implementation)
    // const provider = await ctx.runQuery(internal.providers.getById, { id: args.providerId });
    // For now, just return a dummy embedding
    return {
      embedding: [0.1, 0.2, 0.3],
      text: args.text,
    };
  },
});

/**
 * Store embedding in database.
 */
export const storeEmbedding = mutation({
  args: {
    text: v.string(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("embeddings", {
      text: args.text,
      embedding: args.embedding,
      createdAt: Date.now(),
    });
    return id;
  },
});

/**
 * Retrieve all embeddings (for demo / debugging only).
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("embeddings").collect();
  },
});

export const searchSimilar = query({
  args: {
    embedding: v.array(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Simple implementation - can be enhanced with vector similarity
    const embeddings = await ctx.db
      .query("embeddings")
      .order("desc")
      .take(args.limit || 10);
    
    return embeddings;
  },
});
