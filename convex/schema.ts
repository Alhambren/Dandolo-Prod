import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  wallet_logins: defineTable({
    address: v.string(),
    msg: v.string(),
    signature: v.string(),
    issuedAt: v.string(),
  }).index("by_address", ["address"]),

  points: defineTable({
    address: v.string(),
    total: v.number(),
    totalSpent: v.optional(v.number()),
    lastActivity: v.optional(v.number()),
  }).index("by_address", ["address"]),

  points_history: defineTable({
    address: v.string(),
    amount: v.number(),
    reason: v.string(),
    ts: v.number(),
  }).index("by_address", ["address"]),

  usageLogs: defineTable({
    userId: v.optional(v.id("users")),
    address: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    providerId: v.optional(v.id("providers")),
    model: v.string(),
    tokens: v.number(),
    cost: v.number(),
    timestamp: v.number(),
    responseTime: v.number(),
  })
    .index("by_address", ["address"])
    .index("by_user", ["userId"])
    .index("by_provider", ["providerId"]),

  providers: defineTable({
    address: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    veniceApiKey: v.string(),
    vcuBalance: v.number(),
    totalPrompts: v.number(),
    uptime: v.number(),
    isActive: v.boolean(),
    registrationDate: v.optional(v.number()),
    lastHealthCheck: v.optional(v.number()),
  })
    .index("by_address", ["address"])
    .index("by_active", ["isActive"]),

  providerPoints: defineTable({
    providerId: v.id("providers"),
    points: v.number(),
    totalPrompts: v.number(),
    lastEarned: v.optional(v.number()),
  }).index("by_provider", ["providerId"]),

  modelCache: defineTable({
    models: v.array(v.object({
      id: v.string(),
      name: v.string(),
    })),
    timestamp: v.number(),
  }),

  modelHealth: defineTable({
    modelId: v.string(),
    lastUsed: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
    lastError: v.optional(v.string()),
    isHealthy: v.boolean(),
  }).index("by_model", ["modelId"]),

  userPoints: defineTable({
    userId: v.optional(v.id("users")),
    sessionId: v.optional(v.string()),
    points: v.number(),
    totalSpent: v.number(),
    lastActivity: v.number(),
    isActive: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_active", ["isActive"]),

  apiKeys: defineTable({
    userId: v.optional(v.id("users")),
    sessionId: v.optional(v.string()),
    key: v.string(),
    name: v.optional(v.string()),
    usageCount: v.number(),
    lastUsed: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_active", ["isActive"])
    .index("by_key", ["key"]),

  healthChecks: defineTable({
    providerId: v.id("providers"),
    status: v.string(),
    responseTime: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    timestamp: v.number(),
    createdAt: v.optional(v.number()),
  })
    .index("by_provider", ["providerId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
