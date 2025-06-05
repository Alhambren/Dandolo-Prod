import type { FunctionReference } from "convex/server";
import type { Id } from "./_generated/dataModel";

export type API = {
  providers: {
    incrementPromptCount: FunctionReference<"mutation", "public", { providerId: Id<"providers"> }, null, string | undefined>;
    validateVeniceApiKey: FunctionReference<"mutation", "public", { apiKey: string }, null, boolean>;
    // ... other provider methods ...
  };
  inference: {
    route: FunctionReference<"action", "public", { prompt: string; model?: string; walletAddress?: string; sessionId: string }, null, any>;
    logUsage: FunctionReference<"mutation", "public", { address?: string; sessionId: string; model: string; tokens: number; cost: number; timestamp: number; responseTime: number }, null, void>;
    // ... other inference methods ...
  };
  wallets: {
    addAddressPoints: FunctionReference<"mutation", "public", { address: string; amount: number; reason: string }, null, number>;
    // ... other wallet methods ...
  };
  models: {
    getAvailableModels: FunctionReference<"query", "public", {}, null, { id: string; name: string }[]>;
    trackModelHealth: FunctionReference<"mutation", "public", { modelId: string; success: boolean; error?: string }, null, void>;
    updateModelCache: FunctionReference<"mutation", "public", { models: { id: string; name: string }[]; timestamp: number }, null, void>;
  };
  analytics: {
    getSystemStats: FunctionReference<"query", "public", {}, null, { totalProviders: number; activeProviders: number; totalVCU: number; totalPrompts: number; promptsToday: number; avgResponseTime: number; networkUptime: number; activeUsers: number; }>;
    // ... other analytics methods ...
  };
  rateLimit: {
    getRateLimitStatus: FunctionReference<"query", "public", { sessionId: string }, null, { current: number; remaining: number; resetTime: number; limit?: number; }>;
    // ... other rate limit methods ...
  };
}; 