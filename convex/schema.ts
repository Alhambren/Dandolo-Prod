import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  providers: defineTable({
    address: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    veniceApiKey: v.string(),
    apiKeyHash: v.optional(v.string()),
    vcuBalance: v.number(),
    isActive: v.boolean(),
    uptime: v.number(),
    totalPrompts: v.number(),
    registrationDate: v.number(),
    avgResponseTime: v.optional(v.number()),
    status: v.optional(v.union(v.literal("pending"), v.literal("active"), v.literal("inactive"))),
    lastHealthCheck: v.optional(v.number()),
  })
    .index("by_active", ["isActive"])
    .index("by_api_key_hash", ["apiKeyHash"]),

  providerPoints: defineTable({
    providerId: v.id("providers"),
    points: v.number(),
    totalPrompts: v.number(),
    lastEarned: v.number(),
  }).index("by_provider", ["providerId"]),

  usageLogs: defineTable({
    providerId: v.id("providers"),
    userId: v.id("users"),
    modelId: v.string(),
    prompt: v.string(),
    response: v.string(),
    tokens: v.number(),
    cost: v.number(),
    timestamp: v.number(),
  }).index("by_provider", ["providerId"]),

  points: defineTable({
    userId: v.optional(v.id("users")),
    points: v.optional(v.number()),
    promptsToday: v.optional(v.number()),
    pointsToday: v.optional(v.number()),
    lastActivity: v.optional(v.number()),
    total: v.optional(v.number()),
    totalSpent: v.optional(v.number()),
    address: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  models: defineTable({
    name: v.string(),
    description: v.string(),
    provider: v.string(),
    costPerToken: v.number(),
    maxTokens: v.number(),
    isActive: v.boolean(),
  }).index("by_provider", ["provider"]),

  analytics: defineTable({
    date: v.string(),
    totalPrompts: v.number(),
    totalTokens: v.number(),
    totalCost: v.number(),
    activeUsers: v.number(),
    activeProviders: v.number(),
  }).index("by_date", ["date"]),

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
});
