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
    address: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    model: v.string(),
    tokens: v.number(),
    cost: v.number(),
    timestamp: v.number(),
    responseTime: v.number(),
  }).index("by_address", ["address"]),

  providers: defineTable({
    address: v.string(),
    name: v.string(),
    veniceApiKey: v.string(),
    vcuBalance: v.number(),
    totalPrompts: v.number(),
    uptime: v.number(),
    isActive: v.boolean(),
    lastHealthCheck: v.optional(v.number()),
  }).index("by_address", ["address"]),

  providerPoints: defineTable({
    providerId: v.id("providers"),
    points: v.number(),
    totalPrompts: v.number(),
    lastEarned: v.optional(v.number()),
  }).index("by_provider", ["providerId"]),

  userPoints: defineTable({
    userId: v.optional(v.id("users")),
    sessionId: v.optional(v.string()),
    points: v.number(),
    totalSpent: v.number(),
    lastActivity: v.number(),
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_active", ["isActive"]),

  apiKeys: defineTable({
    userId: v.optional(v.id("users")),
    sessionId: v.optional(v.string()),
    key: v.string(),
    usageCount: v.number(),
    lastUsed: v.number(),
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
    responseTime: v.number(),
    createdAt: v.number(),
  })
    .index("by_provider", ["providerId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
