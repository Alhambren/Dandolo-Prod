// Comprehensive Dandolo.ai Function Tests
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient("https://robust-quail-605.convex.cloud");

async function runAllTests() {
  console.log("🚀 Starting Comprehensive Dandolo.ai Tests...\n");

  // Test 1: Network Stats
  await testNetworkStats();
  
  // Test 2: Provider Functions
  await testProviderFunctions();
  
  // Test 3: Points System
  await testPointsSystem();
  
  // Test 4: Rate Limiting
  await testRateLimit();
  
  // Test 5: Model Management
  await testModelManagement();
  
  // Test 6: Inference Routing
  await testInferenceRouting();
  
  // Test 7: Developer APIs
  await testDeveloperAPIs();
  
  // Test 8: HTTP Endpoints
  await testHTTPEndpoints();
  
  // Test 9: Analytics
  await testAnalytics();
  
  // Test 10: Authentication
  await testAuthentication();

  console.log("\n✅ All tests completed!");
}

// Test 1: Network Stats
async function testNetworkStats() {
  console.log("📊 Testing Network Stats...");
  
  try {
    const stats = await convex.query("stats:getNetworkStats");
    console.log("✅ Network Stats:", {
      totalProviders: stats.totalProviders,
      activeProviders: stats.activeProviders,
      totalVCU: stats.totalVCU,
      totalPrompts: stats.totalPrompts,
      promptsToday: stats.promptsToday,
      avgResponseTime: stats.avgResponseTime,
      networkUptime: stats.networkUptime,
      activeUsers: stats.activeUsers
    });
    
    const leaderboard = await convex.query("stats:getProviderLeaderboard");
    console.log("✅ Provider Leaderboard length:", leaderboard.length);
    
  } catch (error) {
    console.error("❌ Network Stats Error:", error.message);
  }
}

// Test 2: Provider Functions
async function testProviderFunctions() {
  console.log("\n🏭 Testing Provider Functions...");
  
  try {
    // List all providers
    const allProviders = await convex.query("providers:list");
    console.log("✅ All Providers count:", allProviders.length);
    
    // List active providers
    const activeProviders = await convex.query("providers:listActive");
    console.log("✅ Active Providers count:", activeProviders.length);
    
    // Test provider leaderboard
    const leaderboard = await convex.query("providers:getLeaderboard");
    console.log("✅ Provider Leaderboard:", leaderboard.slice(0, 3));
    
    // Test sample data initialization (if no providers)
    if (allProviders.length === 0) {
      await convex.mutation("providers:initSampleData");
      console.log("✅ Sample data initialized");
    }
    
  } catch (error) {
    console.error("❌ Provider Functions Error:", error.message);
  }
}

// Test 3: Points System
async function testPointsSystem() {
  console.log("\n💰 Testing Points System...");
  
  const testSessionId = "test-session-" + Date.now();
  
  try {
    // Test getting user points (anonymous)
    const userPoints = await convex.query("points:getUserPoints", {
      sessionId: testSessionId
    });
    console.log("✅ User Points (anonymous):", userPoints);
    
    // Test getting user stats
    const userStats = await convex.query("points:getUserStats", {
      sessionId: testSessionId
    });
    console.log("✅ User Stats:", {
      points: userStats.points,
      promptsToday: userStats.promptsToday,
      promptsRemaining: userStats.promptsRemaining
    });
    
    // Test adding points
    await convex.mutation("points:addUserPoints", {
      sessionId: testSessionId,
      amount: 10,
      spent: 0
    });
    console.log("✅ Added 10 points to test user");
    
    // Verify points were added
    const updatedPoints = await convex.query("points:getUserPoints", {
      sessionId: testSessionId
    });
    console.log("✅ Updated Points:", updatedPoints);
    
  } catch (error) {
    console.error("❌ Points System Error:", error.message);
  }
}

// Test 4: Rate Limiting
async function testRateLimit() {
  console.log("\n⏱️ Testing Rate Limiting...");
  
  const testSessionId = "rate-test-" + Date.now();
  
  try {
    // Check rate limit status
    const rateStatus = await convex.query("rateLimit:getRateLimitStatus", {
      sessionId: testSessionId
    });
    console.log("✅ Rate Limit Status:", {
      current: rateStatus.current,
      remaining: rateStatus.remaining,
      limit: rateStatus.limit
    });
    
    // Test rate limit check
    const limitCheck = await convex.mutation("rateLimit:checkRateLimit", {
      sessionId: testSessionId
    });
    console.log("✅ Rate Limit Check:", {
      allowed: limitCheck.allowed,
      remaining: limitCheck.remaining
    });
    
  } catch (error) {
    console.error("❌ Rate Limiting Error:", error.message);
  }
}

// Test 5: Model Management
async function testModelManagement() {
  console.log("\n🤖 Testing Model Management...");
  
  try {
    // Get available models
    const models = await convex.query("models:getAvailableModels");
    console.log("✅ Available Models count:", models.length);
    console.log("✅ Sample Models:", models.slice(0, 3));
    
    // Test model cache refresh
    await convex.action("models:refreshModelCache");
    console.log("✅ Model cache refreshed");
    
  } catch (error) {
    console.error("❌ Model Management Error:", error.message);
  }
}

// Test 6: Inference Routing
async function testInferenceRouting() {
  console.log("\n🧠 Testing Inference Routing...");
  
  const testSessionId = "inference-test-" + Date.now();
  
  try {
    // Test inference routing (might fail without active providers)
    const result = await convex.action("inference:route", {
      prompt: "Hello, this is a test prompt",
      sessionId: testSessionId,
      model: "gpt-3.5-turbo"
    });
    console.log("✅ Inference Result:", {
      provider: result.provider,
      tokens: result.tokens,
      responseTime: result.responseTime
    });
    
  } catch (error) {
    console.log("⚠️ Inference Routing (expected to fail without providers):", error.message);
  }
}

// Test 7: Developer APIs
async function testDeveloperAPIs() {
  console.log("\n👨‍💻 Testing Developer APIs...");
  
  const testSessionId = "dev-test-" + Date.now();
  
  try {
    // Generate API key
    const apiKey = await convex.mutation("developers:generateApiKey", {
      sessionId: testSessionId,
      name: "Test API Key"
    });
    console.log("✅ Generated API Key:", apiKey.substring(0, 10) + "...");
    
    // Get user API keys
    const userKeys = await convex.query("developers:getUserApiKeys", {
      sessionId: testSessionId
    });
    console.log("✅ User API Keys count:", userKeys.length);
    
    // Validate API key
    const validation = await convex.query("developers:validateApiKey", {
      apiKey: apiKey
    });
    console.log("✅ API Key Validation:", validation ? "Valid" : "Invalid");
    
  } catch (error) {
    console.error("❌ Developer APIs Error:", error.message);
  }
}

// Test 8: HTTP Endpoints
async function testHTTPEndpoints() {
  console.log("\n🌐 Testing HTTP Endpoints...");
  
  try {
    // Test prompt endpoint (without valid API key - should fail)
    const promptResponse = await fetch("https://robust-quail-605.convex.cloud/api/v1/prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer invalid-key"
      },
      body: JSON.stringify({
        message: "Test prompt",
        model: "gpt-3.5-turbo"
      })
    });
    
    if (promptResponse.status === 401) {
      console.log("✅ Prompt endpoint correctly rejects invalid API key");
    } else {
      console.log("⚠️ Unexpected prompt endpoint response:", promptResponse.status);
    }
    
    // Test balance endpoint (without valid API key - should fail)
    const balanceResponse = await fetch("https://robust-quail-605.convex.cloud/api/v1/balance", {
      headers: {
        "Authorization": "Bearer invalid-key"
      }
    });
    
    if (balanceResponse.status === 401) {
      console.log("✅ Balance endpoint correctly rejects invalid API key");
    } else {
      console.log("⚠️ Unexpected balance endpoint response:", balanceResponse.status);
    }
    
  } catch (error) {
    console.error("❌ HTTP Endpoints Error:", error.message);
  }
}

// Test 9: Analytics
async function testAnalytics() {
  console.log("\n📈 Testing Analytics...");
  
  try {
    // Get system stats
    const systemStats = await convex.query("analytics:getSystemStats");
    console.log("✅ System Stats:", {
      totalProviders: systemStats.totalProviders,
      activeProviders: systemStats.activeProviders,
      totalPrompts: systemStats.totalPrompts,
      activeUsers: systemStats.activeUsers
    });
    
  } catch (error) {
    console.error("❌ Analytics Error:", error.message);
  }
}

// Test 10: Authentication
async function testAuthentication() {
  console.log("\n🔐 Testing Authentication...");
  
  try {
    // Test logged in user (should be null for this test)
    const user = await convex.query("auth:loggedInUser");
    console.log("✅ Logged in user:", user ? "Authenticated" : "Anonymous");
    
  } catch (error) {
    console.error("❌ Authentication Error:", error.message);
  }
}

// Run all tests
runAllTests().catch(console.error); 