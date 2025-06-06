import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  wallet_logins: defineTable({
    address: v.string(),
    msg: v.optional(v.string()),
    signature: v.optional(v.string()),
    verified: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
    issuedAt: v.optional(v.string()),
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
    userId: v.id("users"),
    providerId: v.id("providers"),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    latencyMs: v.number(),
    createdAt: v.number(),
    sessionId: v.optional(v.string()),
  })
    .index("by_provider", ["providerId"])
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),

  providers: defineTable({
    address: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    veniceApiKey: v.string(),
    vcuBalance: v.number(),
    totalPrompts: v.number(),
    uptime: v.number(),
    isActive: v.boolean(),
    userId: v.optional(v.id("users")),
    registrationDate: v.optional(v.number()),
    lastHealthCheck: v.optional(v.number()),
    avgResponseTime: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("pending"))),
    vcuEarned7d: v.optional(v.number()),
    region: v.optional(v.string()),
    gpuType: v.optional(v.string()),
  })
    .index("by_address", ["address"])
    .index("by_active", ["isActive"])
    .index("by_status", ["status"])
    .index("by_user", ["userId"]),

  providerPoints: defineTable({
    providerId: v.id("providers"),
    points: v.number(),
    totalPrompts: v.number(),
    lastEarned: v.number(),
  }).index("by_provider", ["providerId"]),

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
    timestamp: v.number(),
    status: v.union(v.literal("success"), v.literal("failure")),
    responseTime: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  }).index("by_provider", ["providerId"]),

  prompts: defineTable({
    providerId: v.id("providers"),
    userId: v.optional(v.id("users")),
    content: v.string(),
    response: v.string(),
    responseTime: v.number(),
    vcuCost: v.number(),
  }).index("by_provider", ["providerId"]),

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    points: v.optional(v.number()),
  }),

  pointTransactions: defineTable({
    userId: v.optional(v.id("users")),
    sessionId: v.optional(v.string()),
    amount: v.number(),
    source: v.string(),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
