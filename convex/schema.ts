import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  points: defineTable({
    address: v.string(),
    points: v.number(),
    promptsToday: v.number(),
    pointsToday: v.number(),
    lastEarned: v.number(),
  }).index("by_address", ["address"]),

  points_history: defineTable({
    address: v.string(),
    amount: v.number(),
    reason: v.string(),
    ts: v.number(),
  }).index("by_address", ["address"]),

  usageLogs: defineTable({
    address: v.string(),
    providerId: v.optional(v.id("providers")),
    model: v.string(),
    tokens: v.number(),
    latencyMs: v.number(),
    createdAt: v.number(),
  })
    .index("by_provider", ["providerId"])
    .index("by_address", ["address"]),

  providers: defineTable({
    address: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    veniceApiKey: v.string(),
    apiKeyHash: v.string(),
    vcuBalance: v.number(),
    isActive: v.boolean(),
    uptime: v.number(),
    totalPrompts: v.number(),
    registrationDate: v.number(),
    lastHealthCheck: v.optional(v.number()),
    avgResponseTime: v.number(),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("inactive")),
    region: v.optional(v.string()),
    gpuType: v.optional(v.string()),
  })
    .index("by_active", ["isActive"])
    .index("by_status", ["status"])
    .index("by_api_key_hash", ["apiKeyHash"]),

  providerPoints: defineTable({
    providerId: v.id("providers"),
    points: v.number(),
    totalPrompts: v.number(),
    lastEarned: v.number(),
  })
    .index("by_provider", ["providerId"]),

  modelCache: defineTable({
    models: v.array(v.object({
      id: v.string(),
      name: v.string(),
      available: v.boolean(),
      lastUpdated: v.number()
    })),
    lastUpdated: v.number()
  }),

  modelHealth: defineTable({
    modelId: v.string(),
    lastUsed: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
    lastError: v.optional(v.string()),
    isHealthy: v.boolean(),
  }).index("by_model", ["modelId"]),

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

  healthChecks: defineTable({
    providerId: v.id("providers"),
    timestamp: v.number(),
    status: v.union(v.literal("success"), v.literal("failure")),
    responseTime: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_provider", ["providerId"]),

  rateLimits: defineTable({
    address: v.string(),
    current: v.number(),
    limit: v.number(),
    resetTime: v.number(),
  })
    .index("by_address", ["address"]),
});
