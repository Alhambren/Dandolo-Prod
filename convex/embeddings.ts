import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Generate and store text embeddings using Venice.ai.
 * - `text`: string to embed
 * - `providerId`: ID of provider to bill VCUs
 */
export const embedText = action({
  args: {
    text: v.string(),
    providerId: v.id("providers"),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.runQuery(internal.providers.getById, {
      id: args.providerId,
    });
    if (!provider?.veniceApiKey) {
      throw new Error("Provider missing Venice API key");
    }

    const response = await fetch("https://api.venice.ai/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.veniceApiKey}`,
      },
      body: JSON.stringify({
        model: "bge-large-en-v1.5",
        input: args.text,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Embedding error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding as number[] | undefined;
    if (!embedding) {
      throw new Error("Embedding response missing data");
    }

    // Persist embedding
    await ctx.runMutation(internal.embeddings.store, {
      text: args.text,
      embedding,
    });

    return embedding;
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
