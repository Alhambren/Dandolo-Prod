import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  providers: defineTable({
    address: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    veniceApiKey: v.optional(v.string()),
    apiKeyHash: v.optional(v.string()),
    vcuBalance: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    uptime: v.optional(v.number()),
    totalPrompts: v.optional(v.number()),
    registrationDate: v.optional(v.number()),
    avgResponseTime: v.optional(v.number()),
    status: v.optional(v.union(v.literal("pending"), v.literal("active"), v.literal("inactive"))),
    lastHealthCheck: v.optional(v.number()),
  })
    .index("by_active", ["isActive"]),

  providerPoints: defineTable({
    providerId: v.id("providers"),
    points: v.number(),
    totalPrompts: v.number(),
    lastEarned: v.number(),
  }).index("by_provider", ["providerId"]),

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

  userPoints: defineTable({
    address: v.string(),
    lastEarned: v.float64(),
    points: v.float64(),
    pointsToday: v.float64(),
    promptsToday: v.float64(),
  })
    .index("by_address", ["address"]),

  healthChecks: defineTable({
    providerId: v.id("providers"),
    timestamp: v.number(),
    status: v.union(v.literal("success"), v.literal("failure")),
    responseTime: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  }).index("by_provider", ["providerId"]),

  apiKeys: defineTable({
    address: v.optional(v.string()),
    name: v.string(),
    key: v.string(),
    isActive: v.boolean(),
    usageCount: v.number(),
    sessionId: v.string(),
    createdAt: v.number(),
    lastUsed: v.optional(v.number()),
  })
    .index("by_address", ["address"])
    .index("by_key", ["key"]),

  modelCache: defineTable({
    models: v.array(v.object({
      id: v.string(),
      name: v.string(),
      available: v.boolean(),
      lastUpdated: v.number(),
    })),
    lastUpdated: v.number(),
  }),

  modelHealth: defineTable({
    modelId: v.string(),
    successCount: v.number(),
    failureCount: v.number(),
    lastUsed: v.number(),
    isHealthy: v.boolean(),
    lastError: v.optional(v.string()),
  }).index("by_model", ["modelId"]),

  points_history: defineTable({
    address: v.string(),
    amount: v.number(),
    reason: v.string(),
    ts: v.number(),
  }).index("by_address", ["address"]),
});
