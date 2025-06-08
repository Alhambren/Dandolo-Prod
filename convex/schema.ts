import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Database schema defining all data collections used by the application.
// Each table uses strict typing to ensure data integrity.
export default defineSchema({
  ...authTables,

  // PROVIDERS: Venice.ai compute providers (one per wallet)
  providers: defineTable({
    address: v.string(),              // Wallet address (REQUIRED)
    name: v.string(),                 // Provider display name (REQUIRED)
    description: v.optional(v.string()), // Optional description
    veniceApiKey: v.string(),         // Venice.ai API key (REQUIRED)
    apiKeyHash: v.string(),           // Hash for duplicate detection (REQUIRED)
    vcuBalance: v.number(),           // Available VCU from Venice (REQUIRED)
    isActive: v.boolean(),            // Currently serving requests (REQUIRED)
    uptime: v.number(),               // Success rate percentage (REQUIRED)
    totalPrompts: v.number(),         // Total prompts served (REQUIRED)
    registrationDate: v.number(),     // Registration timestamp (REQUIRED)
    avgResponseTime: v.number(),      // Average response time (REQUIRED)
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("inactive")
    ),                                // Status (REQUIRED)
    lastHealthCheck: v.optional(v.number()), // Last health check time
    region: v.optional(v.string()),   // Geographic region
    gpuType: v.optional(v.string()),  // GPU type for performance
  })
    .index("by_active", ["isActive"])
    .index("by_address", ["address"])
    .index("by_api_key_hash", ["apiKeyHash"]),

  // USER POINTS: Wallet-based user points and limits
  points: defineTable({
    address: v.string(),              // Wallet address (REQUIRED)
    points: v.number(),               // Total points balance (REQUIRED)
    promptsToday: v.number(),         // Daily usage count (REQUIRED)
    pointsToday: v.number(),          // Points earned today (REQUIRED)
    lastEarned: v.number(),           // Last activity timestamp (REQUIRED)
  }).index("by_address", ["address"]),

  // POINTS HISTORY: Transparent point tracking
  points_history: defineTable({
    address: v.string(),              // Wallet address (REQUIRED)
    amount: v.number(),               // Points awarded (REQUIRED)
    reason: v.string(),               // "prompt", "referral", etc. (REQUIRED)
    ts: v.number(),                   // Timestamp (REQUIRED)
  }).index("by_address", ["address"]),

  // PROVIDER POINTS: Points earned by providers
  providerPoints: defineTable({
    providerId: v.id("providers"),    // Provider ID (REQUIRED)
    points: v.number(),               // Total points earned (REQUIRED)
    totalPrompts: v.number(),         // Total prompts served (REQUIRED)
    lastEarned: v.number(),           // Last earning timestamp (REQUIRED)
    lastDailyReward: v.optional(v.number()), // Last daily VCU reward
  }).index("by_provider", ["providerId"]),

  // USAGE LOGS: Anonymous metrics ONLY
  usageLogs: defineTable({
    address: v.string(),              // Wallet or 'anonymous' (REQUIRED)
    providerId: v.optional(v.id("providers")), // Which provider served
    model: v.string(),                // Model used (REQUIRED)
    tokens: v.number(),               // Token count (REQUIRED)
    latencyMs: v.number(),            // Response time (REQUIRED)
    createdAt: v.number(),            // Timestamp (REQUIRED)
  })
    .index("by_provider", ["providerId"])
    .index("by_address", ["address"])
    .index("by_created", ["createdAt"]),

  // HEALTH CHECKS: Provider monitoring
  healthChecks: defineTable({
    providerId: v.id("providers"),    // Provider ID (REQUIRED)
    timestamp: v.number(),            // Timestamp (REQUIRED)
    status: v.union(v.literal("success"), v.literal("failure")), // Status (REQUIRED)
    responseTime: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  }).index("by_provider", ["providerId"]),

  // API KEYS: Developer access tokens
  apiKeys: defineTable({
    address: v.string(),              // Developer wallet (REQUIRED)
    name: v.string(),                 // Key name (REQUIRED)
    key: v.string(),                  // API key (REQUIRED)
    isActive: v.boolean(),            // Key status (REQUIRED)
    usageCount: v.number(),           // Times used (REQUIRED)
    sessionId: v.string(),            // Session tracking (REQUIRED)
    createdAt: v.number(),            // Creation timestamp (REQUIRED)
    lastUsed: v.optional(v.number()), // Last usage
  })
    .index("by_address", ["address"])
    .index("by_key", ["key"]),

  // MODEL CACHE: Venice.ai model availability
  modelCache: defineTable({
    models: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        available: v.boolean(),
        lastUpdated: v.number(),
      })
    ),
    lastUpdated: v.number(),
  }),

  // MODEL HEALTH: Track model performance
  modelHealth: defineTable({
    modelId: v.string(),              // Model ID (REQUIRED)
    successCount: v.number(),         // Success count (REQUIRED)
    failureCount: v.number(),         // Failure count (REQUIRED)
    lastUsed: v.number(),             // Last used timestamp (REQUIRED)
    isHealthy: v.boolean(),           // Health status (REQUIRED)
    lastError: v.optional(v.string()),
  }).index("by_model", ["modelId"]),
});
