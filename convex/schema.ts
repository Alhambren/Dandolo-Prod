import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // PROVIDERS: Venice.ai compute providers
  providers: defineTable({
    address: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    veniceApiKey: v.string(),
    apiKeyHash: v.string(),
    vcuBalance: v.number(),
    isActive: v.boolean(),
    totalPrompts: v.number(),
    avgResponseTime: v.number(),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("inactive")),
    registrationDate: v.number(),
    lastHealthCheck: v.optional(v.number()),
    uptime: v.optional(v.number()),
  })
    .index("by_active", ["isActive"])
    .index("by_address", ["address"])
    .index("by_api_key_hash", ["apiKeyHash"]),

  // USER POINTS: Track user rewards
  userPoints: defineTable({
    address: v.string(),
    points: v.number(),
    promptsToday: v.number(),
    pointsToday: v.number(),
    lastEarned: v.number(),
  }).index("by_address", ["address"]),

  // PROVIDER POINTS: Track provider rewards
  providerPoints: defineTable({
    providerId: v.id("providers"),
    points: v.number(),
    totalPrompts: v.number(),
    lastEarned: v.number(),
    lastDailyReward: v.optional(v.number()),
  }).index("by_provider", ["providerId"]),

  // INFERENCES: Track AI requests
  inferences: defineTable({
    address: v.string(),
    providerId: v.id("providers"),
    model: v.string(),
    intent: v.string(),
    totalTokens: v.number(),
    vcuCost: v.number(),
    timestamp: v.number(),
  })
    .index("by_provider", ["providerId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_address", ["address"]),

  // MODEL CACHE: Venice.ai models
  modelCache: defineTable({
    models: v.object({
      text: v.array(v.object({
        id: v.string(),
        name: v.string(),
        contextLength: v.optional(v.number()),
      })),
      code: v.array(v.object({
        id: v.string(),
        name: v.string(),
        contextLength: v.optional(v.number()),
      })),
      image: v.array(v.object({
        id: v.string(),
        name: v.string(),
      })),
      multimodal: v.array(v.object({
        id: v.string(),
        name: v.string(),
        contextLength: v.optional(v.number()),
      })),
      audio: v.array(v.object({
        id: v.string(),
        name: v.string(),
      })),
    }),
    lastUpdated: v.number(),
  }),

  // API KEYS: Developer access
  apiKeys: defineTable({
    address: v.string(),
    name: v.string(),
    key: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    lastUsed: v.optional(v.number()),
    totalUsage: v.number(),
  })
    .index("by_address", ["address"])
    .index("by_key", ["key"]),

  usageLogs: defineTable({
    address: v.string(),
    providerId: v.optional(v.id("providers")),
    model: v.string(),
    intent: v.optional(v.string()),
    totalTokens: v.optional(v.number()),
    vcuCost: v.optional(v.number()),
    createdAt: v.number(),
    // Legacy fields
    tokens: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
  }).index("by_address", ["address"]),

  embeddings: defineTable({
    text: v.string(),
    embedding: v.array(v.number()),
    createdAt: v.number(),
  }),

  points_history: defineTable({
    address: v.string(),
    points: v.number(),
    change: v.number(),
    reason: v.string(),
    createdAt: v.number(),
  }).index("by_address", ["address"]),
});

