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
    veniceApiKey: v.string(),               // Legacy or placeholder for encrypted keys
    encryptedApiKey: v.optional(v.string()), // Encrypted Venice API key (new secure system)
    salt: v.optional(v.string()),           // Salt for encryption (new secure system)
    secureProvider: v.optional(v.boolean()), // Flag for providers using secure registration
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

  // REGISTRATION TOKENS: Secure provider registration
  registrationTokens: defineTable({
    token: v.string(),                      // Unique registration token
    address: v.string(),                    // Wallet address for registration
    name: v.string(),                       // Provider name
    expires: v.number(),                    // Token expiration timestamp
    used: v.boolean(),                      // Whether token has been used
  })
    .index("by_token", ["token"])
    .index("by_address", ["address"]),

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

  // PROVIDER POINTS: Track provider rewards with detailed breakdown
  providerPoints: defineTable({
    providerId: v.id("providers"),
    address: v.string(),                    // Wallet address (persists even if provider removed)
    totalPoints: v.number(),                // All-time total points
    vcuProviderPoints: v.number(),          // Points from providing VCU (daily rewards)
    promptServicePoints: v.number(),        // Points from serving prompts (per request)
    developerApiPoints: v.number(),         // Points from developer API usage
    agentApiPoints: v.number(),             // Points from agent API usage
    totalPrompts: v.number(),
    lastEarned: v.number(),
    lastDailyReward: v.optional(v.number()),
    isProviderActive: v.optional(v.boolean()), // Track if provider is still active
  })
    .index("by_provider", ["providerId"])
    .index("by_address", ["address"]),      // Index by address for persistent tracking

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
    dailyUsage: v.optional(v.number()),        // Resets at midnight
    lastReset: v.optional(v.number()),         // Last daily reset
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

  // POINTS TRANSACTIONS: Detailed transaction log for all point earnings
  pointsTransactions: defineTable({
    address: v.string(),                    // Wallet address earning points
    providerId: v.optional(v.id("providers")), // Provider ID if applicable
    pointsEarned: v.number(),              // Points awarded in this transaction
    transactionType: v.union(
      v.literal("vcu_daily_reward"),       // Daily VCU holding reward
      v.literal("prompt_served"),          // Serving a user prompt
      v.literal("developer_api"),          // Developer API usage
      v.literal("agent_api"),              // Agent API usage
      v.literal("bonus"),                  // Special bonus
      v.literal("adjustment")              // Manual adjustment
    ),
    details: v.optional(v.object({
      tokensProcessed: v.optional(v.number()),
      requestCount: v.optional(v.number()),
      vcuAmount: v.optional(v.number()),
      apiKeyType: v.optional(v.string()),
      description: v.optional(v.string()),
    })),
    timestamp: v.number(),
    isProviderActive: v.optional(v.boolean()), // Was provider active when earned
  })
    .index("by_address", ["address"])
    .index("by_provider", ["providerId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_type", ["transactionType"]),

  // Legacy points history (keeping for backward compatibility)
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

