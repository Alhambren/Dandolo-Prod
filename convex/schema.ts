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
    // Enhanced inference capability tracking
    inferenceCapabilityScore: v.optional(v.number()), // 0-100 based on actual inference performance
    lastInferenceTest: v.optional(v.number()), // When last inference test was performed
    inferenceFailureStreak: v.optional(v.number()), // Consecutive inference failures
    lastInferenceSuccess: v.optional(v.number()), // Last successful inference timestamp
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
    // Enhanced inference testing
    inferenceTestPassed: v.optional(v.boolean()), // Did actual inference test pass
    inferenceResponseTime: v.optional(v.number()), // Inference response time
    inferenceTokens: v.optional(v.number()), // Tokens returned in test
    testPrompt: v.optional(v.string()), // Test prompt used
    testResponse: v.optional(v.string()), // Test response received
    healthCheckType: v.optional(v.union(v.literal("connectivity"), v.literal("inference"))), // Type of check performed
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

  // AGENT PROFILES: Agent registration and capabilities
  agentProfiles: defineTable({
    address: v.string(),                // Owner wallet address
    agentId: v.string(),               // Unique agent identifier (ag_xxxxx)
    name: v.string(),                  // Agent display name
    description: v.optional(v.string()), // Agent description/purpose
    capabilities: v.array(v.union(      // What the agent can do
      v.literal("text_generation"),
      v.literal("code_generation"),
      v.literal("data_analysis"), 
      v.literal("image_analysis"),
      v.literal("workflow_orchestration"),
      v.literal("api_integration"),
      v.literal("file_processing")
    )),
    preferredModels: v.optional(v.object({ // Model preferences by task type
      text: v.optional(v.string()),
      code: v.optional(v.string()),
      analysis: v.optional(v.string()),
      multimodal: v.optional(v.string()),
    })),
    systemPrompt: v.optional(v.string()), // Default system instructions
    maxTokens: v.optional(v.number()),   // Token limit per request
    temperature: v.optional(v.number()), // Default creativity setting
    isActive: v.boolean(),              // Agent availability status
    createdAt: v.number(),              // Registration timestamp
    lastUsed: v.optional(v.number()),   // Last activity timestamp
    totalSessions: v.number(),          // Lifetime session count
    totalTokensProcessed: v.number(),   // Lifetime token usage
    avgResponseTime: v.optional(v.number()), // Performance metric
    // Security and audit fields
    lastModified: v.number(),           // Configuration change timestamp
    version: v.number(),                // Agent version for updates
    securityLevel: v.union(             // Access control level
      v.literal("standard"),
      v.literal("restricted"), 
      v.literal("privileged")
    ),
  })
    .index("by_address", ["address"])
    .index("by_agent_id", ["agentId"])
    .index("by_active", ["isActive"])
    .index("by_last_used", ["lastUsed"]),

  // WORKFLOW STATES: Multi-step workflow execution tracking
  workflowStates: defineTable({
    workflowId: v.string(),             // Unique workflow identifier
    agentId: v.string(),               // Agent executing workflow
    sessionId: v.optional(v.string()), // Associated session if applicable
    address: v.string(),               // User/owner address
    name: v.string(),                  // Workflow name/type
    status: v.union(                   // Current execution status
      v.literal("pending"),
      v.literal("running"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    currentStep: v.number(),           // Current step index
    totalSteps: v.number(),            // Total workflow steps
    steps: v.array(v.object({          // Workflow step definitions
      stepId: v.string(),
      name: v.string(),
      type: v.union(
        v.literal("llm_call"),
        v.literal("api_request"),
        v.literal("data_processing"),
        v.literal("user_input"),
        v.literal("condition"),
        v.literal("loop")
      ),
      config: v.any(),                 // Step-specific configuration
      status: v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("skipped")
      ),
      result: v.optional(v.any()),     // Step execution result
      error: v.optional(v.string()),   // Error message if failed
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      tokensUsed: v.optional(v.number()),
    })),
    metadata: v.optional(v.object({    // Workflow metadata
      priority: v.optional(v.number()),
      tags: v.optional(v.array(v.string())),
      parentWorkflowId: v.optional(v.string()),
      triggerEvent: v.optional(v.string()),
      estimatedDuration: v.optional(v.number()),
    })),
    variables: v.optional(v.any()),    // Workflow state variables
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    totalTokensUsed: v.number(),
    totalCost: v.number(),             // VCU cost
    expiresAt: v.number(),             // Auto-cleanup timestamp
  })
    .index("by_workflow_id", ["workflowId"])
    .index("by_agent", ["agentId"])
    .index("by_session", ["sessionId"])
    .index("by_address", ["address"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_expires", ["expiresAt"]),

  // SECURITY EVENTS: Comprehensive security audit trail
  securityEvents: defineTable({
    eventId: v.string(),              // Unique event identifier
    eventType: v.union(
      v.literal("agent_registration"),
      v.literal("agent_authentication"),
      v.literal("api_key_generation"),
      v.literal("api_key_rotation"),
      v.literal("api_key_revocation"),
      v.literal("security_violation"),
      v.literal("prompt_injection_detected"),
      v.literal("rate_limit_exceeded"),
      v.literal("suspicious_activity"),
      v.literal("wallet_verification"),
      v.literal("permission_escalation"),
      v.literal("unauthorized_access_attempt"),
      v.literal("agent_config_change"),
      v.literal("workflow_execution"),
      v.literal("admin_override")
    ),
    address: v.string(),              // Address involved in the event
    agentId: v.optional(v.string()),  // Agent ID if applicable
    riskLevel: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    description: v.string(),          // Human-readable description
    metadata: v.any(),                // Additional event data
    sessionId: v.optional(v.string()), // Session context
    signature: v.string(),            // Tamper-proof signature
    timestamp: v.number(),            // Event timestamp
    acknowledged: v.boolean(),        // Admin acknowledgment
  })
    .index("by_event_id", ["eventId"])
    .index("by_address", ["address"])
    .index("by_agent", ["agentId"])
    .index("by_risk_level", ["riskLevel"])
    .index("by_event_type", ["eventType"])
    .index("by_timestamp", ["timestamp"])
    .index("by_acknowledged", ["acknowledged"]),

  // AGENT SESSIONS: Enhanced session management with agent context
  agentSessions: defineTable({
    sessionId: v.string(),             // Unique session identifier
    agentId: v.string(),              // Associated agent
    address: v.string(),              // User/owner address
    apiKeyId: v.optional(v.id("apiKeys")), // API key if used
    providerId: v.optional(v.id("providers")), // Currently assigned provider
    sessionType: v.union(             // Session interaction type
      v.literal("interactive_chat"),
      v.literal("workflow_execution"),
      v.literal("api_automation"),
      v.literal("batch_processing")
    ),
    context: v.optional(v.object({    // Session context and history
      conversationHistory: v.optional(v.array(v.object({
        role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
        content: v.string(),
        timestamp: v.number(),
        tokenCount: v.optional(v.number()),
      }))),
      workflowId: v.optional(v.string()),
      customInstructions: v.optional(v.string()),
      activeTools: v.optional(v.array(v.string())),
    })),
    settings: v.optional(v.object({   // Session-specific settings
      maxTokens: v.optional(v.number()),
      temperature: v.optional(v.number()),
      streamResponse: v.optional(v.boolean()),
      saveHistory: v.optional(v.boolean()),
    })),
    metrics: v.object({               // Session performance metrics
      totalMessages: v.number(),
      totalTokens: v.number(),
      totalCost: v.number(),
      avgResponseTime: v.optional(v.number()),
      errorCount: v.number(),
    }),
    status: v.union(                  // Session status
      v.literal("active"),
      v.literal("idle"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("expired")
    ),
    createdAt: v.number(),
    lastActivity: v.number(),
    expiresAt: v.number(),            // Session expiration
  })
    .index("by_session_id", ["sessionId"])
    .index("by_agent", ["agentId"])
    .index("by_address", ["address"])
    .index("by_status", ["status"])
    .index("by_last_activity", ["lastActivity"])
    .index("by_expires", ["expiresAt"]),

  // INSTRUCTION TEMPLATES: Reusable agent instructions and prompts
  instructionTemplates: defineTable({
    templateId: v.string(),           // Unique template identifier
    address: v.string(),             // Owner address
    name: v.string(),                // Template name
    description: v.optional(v.string()), // Template description
    category: v.union(               // Template category
      v.literal("system_prompt"),
      v.literal("user_prompt"),
      v.literal("workflow_step"),
      v.literal("error_handling"),
      v.literal("output_format")
    ),
    content: v.string(),             // Template content with variables
    variables: v.optional(v.array(v.object({ // Template variables
      name: v.string(),
      type: v.union(v.literal("string"), v.literal("number"), v.literal("boolean"), v.literal("array")),
      required: v.boolean(),
      defaultValue: v.optional(v.any()),
      description: v.optional(v.string()),
    }))),
    tags: v.optional(v.array(v.string())), // Searchable tags
    isPublic: v.boolean(),           // Available to other users
    isSystem: v.boolean(),           // System/built-in template
    usageCount: v.number(),          // Times template has been used
    rating: v.optional(v.number()),  // User rating (1-5)
    createdAt: v.number(),
    lastModified: v.number(),
    lastUsed: v.optional(v.number()),
  })
    .index("by_template_id", ["templateId"])
    .index("by_address", ["address"])
    .index("by_category", ["category"])
    .index("by_public", ["isPublic"])
    .index("by_system", ["isSystem"])
    .index("by_usage", ["usageCount"]),

  // AGENT METRICS: Performance tracking and analytics
  agentMetrics: defineTable({
    agentId: v.string(),             // Agent identifier
    address: v.string(),             // Owner address
    period: v.union(                 // Metrics time period
      v.literal("hourly"),
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly")
    ),
    periodStart: v.number(),         // Period start timestamp
    periodEnd: v.number(),           // Period end timestamp
    metrics: v.object({              // Detailed metrics
      totalSessions: v.number(),
      activeSessions: v.number(),
      completedSessions: v.number(),
      failedSessions: v.number(),
      totalMessages: v.number(),
      totalTokensUsed: v.number(),
      totalCost: v.number(),
      avgResponseTime: v.number(),
      maxResponseTime: v.number(),
      minResponseTime: v.number(),
      successRate: v.number(),
      errorRate: v.number(),
      popularModels: v.array(v.object({
        model: v.string(),
        usage: v.number(),
      })),
      topIntents: v.array(v.object({
        intent: v.string(),
        count: v.number(),
      })),
      workflowExecutions: v.number(),
      completedWorkflows: v.number(),
      failedWorkflows: v.number(),
    }),
    computedAt: v.number(),          // When metrics were calculated
  })
    .index("by_agent", ["agentId"])
    .index("by_address", ["address"])
    .index("by_period", ["period", "periodStart"])
    .index("by_computed", ["computedAt"]),

  // AGENT TOOLS: External tools and integrations available to agents
  agentTools: defineTable({
    toolId: v.string(),              // Unique tool identifier
    address: v.string(),             // Owner address
    name: v.string(),                // Tool name
    description: v.string(),         // Tool description
    category: v.union(               // Tool category
      v.literal("api_integration"),
      v.literal("data_processing"),
      v.literal("file_operations"),
      v.literal("web_scraping"),
      v.literal("database_query"),
      v.literal("notification"),
      v.literal("custom")
    ),
    config: v.object({               // Tool configuration
      endpoint: v.optional(v.string()),
      apiKey: v.optional(v.string()), // Encrypted API key
      headers: v.optional(v.any()),
      method: v.optional(v.string()),
      parameters: v.optional(v.any()),
      authentication: v.optional(v.object({
        type: v.union(v.literal("none"), v.literal("api_key"), v.literal("oauth"), v.literal("basic")),
        config: v.any(),
      })),
    }),
    schema: v.optional(v.object({     // Input/output schema
      input: v.any(),
      output: v.any(),
    })),
    isActive: v.boolean(),
    isPublic: v.boolean(),           // Available to other users
    usageCount: v.number(),
    successRate: v.number(),
    avgExecutionTime: v.optional(v.number()),
    createdAt: v.number(),
    lastModified: v.number(),
    lastUsed: v.optional(v.number()),
  })
    .index("by_tool_id", ["toolId"])
    .index("by_address", ["address"])
    .index("by_category", ["category"])
    .index("by_public", ["isPublic"])
    .index("by_active", ["isActive"]),

  // AGENT EXECUTIONS: Detailed log of agent task executions
  agentExecutions: defineTable({
    executionId: v.string(),         // Unique execution identifier
    agentId: v.string(),            // Executing agent
    sessionId: v.optional(v.string()), // Associated session
    workflowId: v.optional(v.string()), // Associated workflow
    address: v.string(),            // User address
    taskType: v.union(              // Type of task executed
      v.literal("chat_completion"),
      v.literal("workflow_step"),
      v.literal("tool_execution"),
      v.literal("data_analysis"),
      v.literal("batch_processing")
    ),
    input: v.object({               // Execution input
      prompt: v.optional(v.string()),
      parameters: v.optional(v.any()),
      context: v.optional(v.any()),
    }),
    output: v.optional(v.object({   // Execution output
      result: v.any(),
      metadata: v.optional(v.any()),
      warnings: v.optional(v.array(v.string())),
    })),
    status: v.union(                // Execution status
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("timeout")
    ),
    providerId: v.optional(v.id("providers")), // Provider used
    model: v.optional(v.string()),   // Model used
    tokensUsed: v.number(),         // Tokens consumed
    cost: v.number(),               // VCU cost
    executionTime: v.optional(v.number()), // Execution duration (ms)
    error: v.optional(v.string()),   // Error message if failed
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    expiresAt: v.number(),          // Auto-cleanup timestamp
  })
    .index("by_execution_id", ["executionId"])
    .index("by_agent", ["agentId"])
    .index("by_session", ["sessionId"])
    .index("by_workflow", ["workflowId"])
    .index("by_address", ["address"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_expires", ["expiresAt"]),
});

