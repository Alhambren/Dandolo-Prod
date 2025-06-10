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
    apiKeyHash: v.optional(v.string()), // Made optional for legacy data
    vcuBalance: v.number(),
    isActive: v.boolean(),
    uptime: v.number(),
    totalPrompts: v.number(),
    registrationDate: v.number(),
    avgResponseTime: v.optional(v.number()), // Made optional for legacy data
    status: v.optional(v.union(v.literal("pending"), v.literal("active"), v.literal("inactive"))), // Made optional
    lastHealthCheck: v.optional(v.number()),
    region: v.optional(v.string()),
    gpuType: v.optional(v.string()),
  })
    .index("by_active", ["isActive"])
    .index("by_address", ["address"])
    .index("by_api_key_hash", ["apiKeyHash"]),

  // USER POINTS: What the code expects
  userPoints: defineTable({
    address: v.string(),
    points: v.number(),
    promptsToday: v.number(),
    pointsToday: v.number(),
    lastEarned: v.number(),
  }).index("by_address", ["address"]),

  // LEGACY POINTS: Keep for compatibility
  points: defineTable({
    userId: v.optional(v.id("users")),
    points: v.optional(v.number()),
    promptsToday: v.optional(v.number()),
    pointsToday: v.optional(v.number()),
    lastActivity: v.optional(v.number()),
    total: v.optional(v.number()),
    totalSpent: v.optional(v.number()),
    address: v.optional(v.string()),
    lastEarned: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_address", ["address"]),

  // PROVIDER POINTS: Points earned by providers
  providerPoints: defineTable({
    providerId: v.id("providers"),
    points: v.number(),
    totalPrompts: v.number(),
    lastEarned: v.number(),
    lastDailyReward: v.optional(v.number()),
  }).index("by_provider", ["providerId"]),

  // USAGE LOGS: Anonymous metrics
  usageLogs: defineTable({
    address: v.string(),
    providerId: v.optional(v.id("providers")),
    model: v.string(),
    tokens: v.number(),
    latencyMs: v.number(),
    createdAt: v.number(),
  })
    .index("by_provider", ["providerId"])
    .index("by_address", ["address"])
    .index("by_created", ["createdAt"]),

  // POINTS HISTORY: Track point awards
  points_history: defineTable({
    address: v.string(),
    amount: v.number(),
    reason: v.string(),
    ts: v.number(),
  }).index("by_address", ["address"]),

  // HEALTH CHECKS: Provider monitoring
  healthChecks: defineTable({
    providerId: v.id("providers"),
    timestamp: v.number(),
    status: v.union(v.literal("success"), v.literal("failure")),
    responseTime: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  }).index("by_provider", ["providerId"]),

  // API KEYS: Developer access tokens
  apiKeys: defineTable({
    address: v.optional(v.string()), // Made optional for legacy data
    name: v.string(),
    key: v.string(),
    isActive: v.boolean(),
    usageCount: v.optional(v.number()), // Made optional for legacy data
    sessionId: v.optional(v.string()), // Made optional for legacy data
    createdAt: v.number(),
    lastUsed: v.optional(v.number()),
    totalUsage: v.optional(v.number()), // Made optional for legacy data
  })
    .index("by_address", ["address"])
    .index("by_key", ["key"]),
  // EMBEDDINGS: Stored text embeddings
  embeddings: defineTable({
    text: v.string(),
    embedding: v.array(v.number()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),



  // MODEL CACHE: Venice.ai model availability
  modelCache: defineTable({
    models: v.array(v.object({
      id: v.string(),
      name: v.string(),
      available: v.boolean(),
      lastUpdated: v.number(),
    })),
    lastUpdated: v.number(),
  }),

  // MODEL HEALTH: Track model performance
  modelHealth: defineTable({
    modelId: v.string(),
    successCount: v.number(),
    failureCount: v.number(),
    lastUsed: v.number(),
    isHealthy: v.boolean(),
    lastError: v.optional(v.string()),
  }).index("by_model", ["modelId"]),
});

