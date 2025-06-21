import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // PROVIDERS: Venice.ai compute providers
  providers: defineTable({
    address: v.string(),                    // Wallet address (unique)
    name: v.string(),
    description: v.optional(v.string()),
    veniceApiKey: v.string(),               // Encrypted Venice API key
    apiKeyHash: v.string(),                 // For duplicate detection
    vcuBalance: v.number(),                 // Available compute units
    isActive: v.boolean(),
    totalPrompts: v.number(),               // Lifetime prompts served
    avgResponseTime: v.optional(v.number()), // Rolling average
    status: v.optional(v.union(v.literal("pending"), v.literal("active"), v.literal("inactive"))),
    registrationDate: v.number(),
    lastHealthCheck: v.optional(v.number()), // Timestamp
    consecutiveFailures: v.optional(v.number()), // For health tracking
    uptime: v.optional(v.number()),
    markedInactiveAt: v.optional(v.number()),
    keyRotatedAt: v.optional(v.number()),
  })
    .index("by_active", ["isActive"])
    .index("by_address", ["address"])
    .index("by_api_key_hash", ["apiKeyHash"]),

  // USER POINTS: Track user rewards
  userPoints: defineTable({
    address: v.string(),            // Wallet address
    points: v.number(),             // Total lifetime points
    promptsToday: v.number(),       // Resets daily at UTC midnight
    pointsToday: v.number(),        // Points earned today
    lastEarned: v.number(),         // Last activity timestamp
    lastReset: v.optional(v.number()), // Last daily reset timestamp
    dailyLimit: v.optional(v.number()), // Current daily limit (100 or 1000)
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
    models: v.any(), // Temporarily accept any format to allow deployment
    lastUpdated: v.number(),
  }),

  // API KEYS: Developer access
  apiKeys: defineTable({
    address: v.string(),            // Owner wallet
    name: v.string(),              // User-friendly name
    key: v.string(),               // dk_ or ak_ prefixed
    keyType: v.optional(v.union(v.literal("developer"), v.literal("agent"))),
    isActive: v.boolean(),
    createdAt: v.number(),
    lastUsed: v.optional(v.number()),
    totalUsage: v.number(),        // Lifetime request count
    dailyUsage: v.optional(v.number()), // Resets at midnight
    lastReset: v.optional(v.number()),  // Last daily reset
  })
    .index("by_address", ["address"])
    .index("by_key", ["key"]),

  // RATE LIMITING: Track rate limits per user/key
  rateLimits: defineTable({
    identifier: v.string(),         // address or api key
    type: v.union(v.literal("user"), v.literal("developer"), v.literal("agent")),
    requests: v.number(),           // Current request count
    windowStart: v.number(),        // Window start timestamp
    lastRequest: v.number(),        // Last request timestamp
  })
    .index("by_identifier", ["identifier"])
    .index("by_window", ["windowStart"]),

  // PROVIDER HEALTH: Track health check results
  providerHealth: defineTable({
    providerId: v.id("providers"),
    status: v.boolean(),            // true = healthy, false = unhealthy
    responseTime: v.number(),       // Response time in ms
    timestamp: v.number(),          // Check timestamp
    error: v.optional(v.string()),  // Error message if failed
  })
    .index("by_provider", ["providerId"])
    .index("by_timestamp", ["timestamp"]),

  usageLogs: defineTable({
    address: v.string(),
    providerId: v.optional(v.id("providers")),
    model: v.string(),
    intent: v.optional(v.string()),
    totalTokens: v.optional(v.float64()),
    vcuCost: v.optional(v.float64()),
    createdAt: v.optional(v.float64()),
    // Legacy fields
    tokens: v.optional(v.float64()),
    latencyMs: v.optional(v.float64()),
  }).index("by_address", ["address"]),

  embeddings: defineTable({
    text: v.string(),
    embedding: v.array(v.number()),
    createdAt: v.number(),
  }),

  points_history: defineTable({
    address: v.string(),
    points: v.optional(v.number()),
    change: v.optional(v.number()),
    reason: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    ts: v.optional(v.number()),
    amount: v.optional(v.number()),
  }).index("by_address", ["address"]),
});

