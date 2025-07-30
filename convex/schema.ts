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
    region: v.optional(v.string()),         // Provider region/location
    veniceApiKey: v.string(),               // API key (encrypted with AES-256-GCM for new providers, plaintext for legacy)
    apiKeySalt: v.optional(v.string()),     // DEPRECATED: XOR salt for legacy decryption
    encryptionIv: v.optional(v.string()),   // AES-256-GCM initialization vector (base64)
    authTag: v.optional(v.string()),        // AES-256-GCM authentication tag (base64)
    encryptionVersion: v.optional(v.number()), // Encryption version: 1=XOR (deprecated), 2=AES-256-GCM
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
    // Anti-gaming fingerprinting fields
    fingerprint: v.optional(v.string()),    // Composite fingerprint for gaming detection
    registrationIP: v.optional(v.string()), // Hashed IP for clustering detection
    userAgent: v.optional(v.string()),      // Hashed user agent
    riskScore: v.optional(v.number()),      // Risk score (0-100, higher = more suspicious)
    flaggedReason: v.optional(v.string()),  // Why this provider was flagged
    verificationStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("verified"), 
      v.literal("flagged"),
      v.literal("suspended")
    )),
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
    address: v.optional(v.string()),        // Wallet address (persists even if provider removed)
    totalPoints: v.optional(v.number()),    // All-time total points (legacy: stored as 'points')
    points: v.optional(v.number()),         // Legacy field name for totalPoints
    vcuProviderPoints: v.optional(v.number()), // Points from providing Diem (daily rewards)
    promptServicePoints: v.optional(v.number()), // Points from serving prompts (per request)
    developerApiPoints: v.optional(v.number()), // Points from developer API usage
    agentApiPoints: v.optional(v.number()), // Points from agent API usage
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
    responseTime: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index("by_provider", ["providerId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_address", ["address"]),

  // MODEL CACHE: Venice.ai models
  modelCache: defineTable({
    models: v.object({
      text: v.array(v.object({
        id: v.string(),
        name: v.string(),
        contextLength: v.optional(v.number()),
      })),
      image: v.array(v.object({
        id: v.string(),
        name: v.string(),
        contextLength: v.optional(v.number()),
      })),
      code: v.array(v.object({
        id: v.string(),
        name: v.string(),
        contextLength: v.optional(v.number()),
      })),
      multimodal: v.array(v.object({
        id: v.string(),
        name: v.string(),
        contextLength: v.optional(v.number()),
      })),
      audio: v.array(v.object({
        id: v.string(),
        name: v.string(),
        contextLength: v.optional(v.number()),
      })),
    }),
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
      v.literal("vcu_daily_reward"),       // Daily Diem holding reward
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

  // ADMIN ACTIONS: Audit log for admin operations
  adminActions: defineTable({
    adminAddress: v.string(),              // Admin wallet address
    action: v.string(),                   // Action type (e.g., EMERGENCY_PAUSE)
    timestamp: v.number(),                // When action was performed
    details: v.string(),                  // Description of the action
    signature: v.string(),                // Cryptographic signature
    sessionId: v.optional(v.string()),    // Admin session ID if applicable
  })
    .index("by_admin", ["adminAddress"])
    .index("by_timestamp", ["timestamp"])
    .index("by_action", ["action"]),

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

  // AUTHENTICATION: Wallet-based auth challenges
  authChallenges: defineTable({
    address: v.string(),
    challenge: v.string(),
    expires: v.number(),
    used: v.boolean(),
  })
    .index("by_address", ["address"])
    .index("by_challenge", ["challenge"]),

  // AUTHENTICATION: Active user sessions  
  authSessions: defineTable({
    address: v.string(),
    sessionToken: v.string(),
    expires: v.number(),
    createdAt: v.number(),
  })
    .index("by_address", ["address"])
    .index("by_token", ["sessionToken"]),

  // MONITORING: System metrics for tracking provider health and performance
  monitoringMetrics: defineTable({
    timestamp: v.number(),
    totalProviders: v.number(),
    activeProviders: v.number(),
    inactiveProviders: v.number(),
    healthyProviders: v.number(),
    unhealthyProviders: v.number(),
    averageResponseTime: v.number(),
    totalVCUBalance: v.number(),
    validationSuccessRate: v.number(),
    systemStatus: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("critical")),
    metrics: v.object({
      providersWithVCU: v.number(),
      providersWithoutVCU: v.number(),
      avgHealthCheckTime: v.number(),
      recentValidationErrors: v.number(),
    }),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_status", ["systemStatus"]),

  // MONITORING: Alerts and notifications
  monitoringAlerts: defineTable({
    level: v.union(v.literal("info"), v.literal("warning"), v.literal("error"), v.literal("critical")),
    message: v.string(),
    timestamp: v.number(),
    context: v.optional(v.object({
      providerId: v.optional(v.string()),
      errorType: v.optional(v.string()),
      userAgent: v.optional(v.string()),
      requestSize: v.optional(v.number()),
      // Additional monitoring context fields
      averageResponseTime: v.optional(v.number()),
      healthyProviders: v.optional(v.number()),
      totalProviders: v.optional(v.number()),
      unhealthyProviders: v.optional(v.number()),
    })),
    acknowledged: v.boolean(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_level", ["level"])
    .index("by_acknowledged", ["acknowledged"]),

  // NETWORK STATS CACHE: Cached network statistics for fast dashboard loading
  networkStatsCache: defineTable({
    totalProviders: v.number(),
    activeProviders: v.number(),
    totalDiem: v.number(),
    totalPrompts: v.number(),
    promptsToday: v.number(),
    avgResponseTime: v.number(),
    networkHealth: v.number(),
    activeUsers: v.number(),
    failedPrompts: v.number(),
    currentLoad: v.number(),
    successRate: v.number(),
    totalTokensProcessed: v.number(),
    networkUptime: v.number(),
    lastUpdated: v.number(),
  }),

  // STREAMING CHUNKS: Store streaming response chunks for real-time chat
  streamingChunks: defineTable({
    streamId: v.string(),               // Unique stream identifier
    chunkIndex: v.number(),             // Order of chunk in stream
    content: v.string(),                // Chunk content
    done: v.boolean(),                  // Whether this is the final chunk
    model: v.optional(v.string()),      // Model used for generation
    tokens: v.optional(v.number()),     // Total tokens if final chunk
    timestamp: v.number(),              // When chunk was created
    expiresAt: v.number(),              // Auto-cleanup timestamp
  })
    .index("by_stream_id", ["streamId"])
    .index("by_expires", ["expiresAt"]),

  // SESSION PROVIDERS: Track which provider is assigned to each chat session
  sessionProviders: defineTable({
    sessionId: v.string(),              // Unique session identifier
    providerId: v.id("providers"),      // Assigned provider ID
    assignedAt: v.number(),             // When provider was assigned
    lastUsed: v.number(),               // Last time this session was active
    expiresAt: v.optional(v.number()),  // Legacy field - will be removed after migration
    intent: v.optional(v.string()),     // Chat intent for context
  })
    .index("by_session", ["sessionId"])
    .index("by_provider", ["providerId"]),
});

