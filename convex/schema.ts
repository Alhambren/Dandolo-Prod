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
    apiKeyHash: v.string(),
    vcuBalance: v.number(),
    isActive: v.boolean(),
    uptime: v.number(),
    totalPrompts: v.number(),
    registrationDate: v.number(),
    avgResponseTime: v.number(),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("inactive")),
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
    address: v.string(),
    providerId: v.optional(v.id("providers")),
    model: v.string(),
    tokens: v.number(),
    latencyMs: v.number(),
    createdAt: v.number(),
  })
    .index("by_provider", ["providerId"])
    .index("by_address", ["address"]),

  points: defineTable({
    address: v.string(),
    points: v.number(),
    promptsToday: v.number(),
    pointsToday: v.number(),
    lastEarned: v.number(),
  }).index("by_address", ["address"]),
});
