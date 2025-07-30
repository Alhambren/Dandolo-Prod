#!/usr/bin/env node

/**
 * Test script for sessionProviders functionality in production Convex backend
 * 
 * This script tests:
 * 1. Provider randomization with multiple session IDs
 * 2. Session persistence (same provider for same session)
 * 3. Session cleanup functionality
 * 4. Session statistics and distribution
 * 
 * Usage: node test-session-providers.js
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

// Production Convex deployment URL
const CONVEX_URL = "https://judicious-hornet-148.convex.cloud";

const client = new ConvexHttpClient(CONVEX_URL);

// Helper function to generate unique session IDs
function generateSessionId() {
  return `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to wait
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testProviderRandomization() {
  console.log("🎲 Testing provider randomization...");
  console.log("==========================================");
  
  const testResults = [];
  const numTests = 20; // Test with 20 different sessions
  
  // Generate unique session IDs for testing
  const sessionIds = Array.from({ length: numTests }, () => generateSessionId());
  
  console.log(`\n📋 Testing with ${numTests} unique session IDs:`);
  
  for (let i = 0; i < sessionIds.length; i++) {
    const sessionId = sessionIds[i];
    
    try {
      console.log(`\n🔍 Test ${i + 1}/${numTests} - Session: ${sessionId.substring(0, 20)}...`);
      
      // Call getSessionProvider to get a provider assignment
      const providerId = await client.mutation(api.sessionProviders.getSessionProvider, {
        sessionId: sessionId,
        intent: "chat"
      });
      
      // Get provider info to see which provider was selected
      const providerInfo = await client.query(api.providers.getProviderInfo, {
        providerId: providerId
      });
      
      const result = {
        sessionId: sessionId.substring(0, 20) + "...",
        providerId: providerId,
        providerName: providerInfo?.name || "Unknown",
        timestamp: new Date().toISOString()
      };
      
      testResults.push(result);
      console.log(`   ✅ Assigned to provider: "${result.providerName}" (${providerId})`);
      
      // Small delay to avoid rate limiting
      await wait(100);
      
    } catch (error) {
      console.error(`   ❌ Error for session ${sessionId}:`, error.message);
      testResults.push({
        sessionId: sessionId.substring(0, 20) + "...",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return testResults;
}

async function testSessionPersistence() {
  console.log("\n\n🔒 Testing session persistence...");
  console.log("=====================================");
  
  const testSessionId = generateSessionId();
  console.log(`\nTesting persistence with session: ${testSessionId.substring(0, 20)}...`);
  
  try {
    // First call - should assign a provider
    console.log("\n1️⃣ First call - expecting provider assignment:");
    const firstProviderId = await client.mutation(api.sessionProviders.getSessionProvider, {
      sessionId: testSessionId,
      intent: "chat"
    });
    
    const firstProviderInfo = await client.query(api.providers.getProviderInfo, {
      providerId: firstProviderId
    });
    
    console.log(`   ✅ First call assigned: "${firstProviderInfo?.name}" (${firstProviderId})`);
    
    await wait(500); // Wait a bit
    
    // Second call - should return the same provider
    console.log("\n2️⃣ Second call - expecting same provider:");
    const secondProviderId = await client.mutation(api.sessionProviders.getSessionProvider, {
      sessionId: testSessionId,
      intent: "chat"
    });
    
    const secondProviderInfo = await client.query(api.providers.getProviderInfo, {
      providerId: secondProviderId
    });
    
    console.log(`   ✅ Second call returned: "${secondProviderInfo?.name}" (${secondProviderId})`);
    
    // Check if they match
    const persistent = firstProviderId === secondProviderId;
    console.log(`\n🎯 Session persistence result: ${persistent ? "✅ PASSED" : "❌ FAILED"}`);
    
    if (persistent) {
      console.log(`   Same provider maintained across calls: "${firstProviderInfo?.name}"`);
    } else {
      console.log(`   ⚠️  Different providers returned: "${firstProviderInfo?.name}" vs "${secondProviderInfo?.name}"`);
    }
    
    return {
      persistent,
      firstProvider: firstProviderInfo?.name,
      secondProvider: secondProviderInfo?.name,
      firstProviderId,
      secondProviderId,
      testSessionId
    };
    
  } catch (error) {
    console.error("❌ Session persistence test failed:", error.message);
    return { error: error.message };
  }
}

async function testSessionCleanup(testSessionId) {
  console.log("\n\n🧹 Testing session cleanup...");
  console.log("================================");
  
  if (!testSessionId) {
    testSessionId = generateSessionId();
    console.log("No test session provided, creating new one for cleanup test");
    
    // Create a session first
    await client.mutation(api.sessionProviders.getSessionProvider, {
      sessionId: testSessionId,
      intent: "chat"
    });
  }
  
  console.log(`\nTesting cleanup for session: ${testSessionId.substring(0, 20)}...`);
  
  try {
    // Try to get current session provider before cleanup
    console.log("\n1️⃣ Checking session exists before cleanup:");
    const beforeCleanup = await client.query(api.sessionProviders.getCurrentSessionProvider, {
      sessionId: testSessionId
    });
    
    console.log(`   Session provider before cleanup: ${beforeCleanup ? "✅ EXISTS" : "❌ NONE"}`);
    
    // Remove the session
    console.log("\n2️⃣ Removing session:");
    const removed = await client.mutation(api.sessionProviders.removeSession, {
      sessionId: testSessionId
    });
    
    console.log(`   Remove session result: ${removed ? "✅ SUCCESS" : "❌ FAILED"}`);
    
    await wait(100); // Brief wait
    
    // Check if session was actually removed
    console.log("\n3️⃣ Verifying session removal:");
    const afterCleanup = await client.query(api.sessionProviders.getCurrentSessionProvider, {
      sessionId: testSessionId
    });
    
    console.log(`   Session provider after cleanup: ${afterCleanup ? "❌ STILL EXISTS" : "✅ REMOVED"}`);
    
    const cleanupSuccessful = removed && !afterCleanup;
    console.log(`\n🎯 Session cleanup result: ${cleanupSuccessful ? "✅ PASSED" : "❌ FAILED"}`);
    
    return {
      cleanupSuccessful,
      beforeCleanup: !!beforeCleanup,
      removed,
      afterCleanup: !!afterCleanup
    };
    
  } catch (error) {
    console.error("❌ Session cleanup test failed:", error.message);
    return { error: error.message };
  }
}

async function getSessionStats() {
  console.log("\n\n📊 Getting session statistics...");
  console.log("==================================");
  
  try {
    const stats = await client.query(api.sessionProviders.getSessionStats, {});
    
    console.log("\n📈 Current session statistics:");
    console.log(`   Total active sessions: ${stats.totalActiveSessions}`);
    console.log(`   Expired sessions: ${stats.expiredSessions}`);
    
    console.log("\n🏆 Provider distribution:");
    const sortedProviders = Object.entries(stats.providerDistribution)
      .sort(([,a], [,b]) => b - a);
    
    if (sortedProviders.length === 0) {
      console.log("   No active sessions found");
    } else {
      sortedProviders.forEach(([providerName, count]) => {
        const percentage = ((count / stats.totalActiveSessions) * 100).toFixed(1);
        console.log(`   ${providerName}: ${count} sessions (${percentage}%)`);
      });
    }
    
    return stats;
    
  } catch (error) {
    console.error("❌ Failed to get session stats:", error.message);
    return { error: error.message };
  }
}

async function analyzeRandomizationResults(testResults) {
  console.log("\n\n🔍 Analyzing randomization results...");
  console.log("======================================");
  
  const validResults = testResults.filter(result => !result.error);
  const errorResults = testResults.filter(result => result.error);
  
  console.log(`\n📊 Test summary:`);
  console.log(`   Total tests: ${testResults.length}`);
  console.log(`   Successful: ${validResults.length}`);
  console.log(`   Failed: ${errorResults.length}`);
  
  if (errorResults.length > 0) {
    console.log("\n❌ Errors encountered:");
    errorResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.sessionId}: ${result.error}`);
    });
  }
  
  if (validResults.length === 0) {
    console.log("\n⚠️ No successful tests to analyze randomization");
    return;
  }
  
  // Analyze provider distribution
  const providerCounts = {};
  validResults.forEach(result => {
    const key = result.providerName || "Unknown";
    providerCounts[key] = (providerCounts[key] || 0) + 1;
  });
  
  console.log("\n🎲 Provider assignment distribution:");
  const sortedCounts = Object.entries(providerCounts)
    .sort(([,a], [,b]) => b - a);
    
  sortedCounts.forEach(([providerName, count]) => {
    const percentage = ((count / validResults.length) * 100).toFixed(1);
    const bar = "█".repeat(Math.ceil(count / validResults.length * 20));
    console.log(`   ${providerName}: ${count}/${validResults.length} (${percentage}%) ${bar}`);
  });
  
  // Check if randomization is working
  const uniqueProviders = Object.keys(providerCounts).length;
  const totalAssignments = validResults.length;
  
  console.log(`\n🎯 Randomization analysis:`);
  console.log(`   Unique providers used: ${uniqueProviders}`);
  console.log(`   Total assignments: ${totalAssignments}`);
  
  if (uniqueProviders <= 1) {
    console.log("   ⚠️ WARNING: Only one provider used - randomization may not be working!");
    if (uniqueProviders === 1) {
      const singleProvider = Object.keys(providerCounts)[0];
      console.log(`   All sessions assigned to: "${singleProvider}"`);
      console.log("   🔍 This suggests the backend randomization is NOT working properly");
    }
  } else {
    console.log("   ✅ Multiple providers used - randomization appears to be working");
    
    // Check for reasonable distribution (no single provider should dominate too much)
    const maxPercentage = Math.max(...Object.values(providerCounts)) / totalAssignments * 100;
    if (maxPercentage > 80) {
      console.log(`   ⚠️ WARNING: One provider dominates with ${maxPercentage.toFixed(1)}% of assignments`);
    } else {
      console.log(`   ✅ Reasonable distribution - max provider has ${maxPercentage.toFixed(1)}% of assignments`);
    }
  }
  
  return {
    uniqueProviders,
    totalAssignments,
    providerCounts,
    maxPercentage: Math.max(...Object.values(providerCounts)) / totalAssignments * 100
  };
}

async function main() {
  console.log("🚀 Starting Dandolo sessionProviders backend test");
  console.log("==================================================");
  console.log(`📡 Connecting to: ${CONVEX_URL}`);
  console.log(`⏰ Test started at: ${new Date().toISOString()}\n`);
  
  try {
    // Test 1: Provider randomization
    const randomizationResults = await testProviderRandomization();
    
    // Test 2: Session persistence
    const persistenceResult = await testSessionPersistence();
    
    // Test 3: Session cleanup (using the session from persistence test if available)
    const cleanupResult = await testSessionCleanup(persistenceResult.testSessionId);
    
    // Test 4: Get session statistics
    const sessionStats = await getSessionStats();
    
    // Test 5: Analyze randomization results
    const analysis = await analyzeRandomizationResults(randomizationResults);
    
    // Final summary
    console.log("\n\n🏁 FINAL TEST SUMMARY");
    console.log("=====================");
    
    console.log("\n✅ Test Results:");
    console.log(`   Provider Randomization: ${analysis && analysis.uniqueProviders > 1 ? "✅ WORKING" : "❌ NOT WORKING"}`);
    console.log(`   Session Persistence: ${persistenceResult.persistent ? "✅ WORKING" : "❌ NOT WORKING"}`);
    console.log(`   Session Cleanup: ${cleanupResult.cleanupSuccessful ? "✅ WORKING" : "❌ NOT WORKING"}`);
    console.log(`   Session Statistics: ${sessionStats && !sessionStats.error ? "✅ AVAILABLE" : "❌ ERROR"}`);
    
    if (analysis && analysis.uniqueProviders <= 1) {
      console.log("\n🚨 CRITICAL FINDING:");
      console.log("   The backend randomization is NOT working properly!");
      console.log("   All sessions are being assigned to the same provider.");
      console.log("   This confirms the issue is in the backend logic, not frontend session management.");
    } else if (analysis && analysis.uniqueProviders > 1) {
      console.log("\n✅ GOOD NEWS:");
      console.log("   Backend randomization appears to be working correctly!");
      console.log("   Multiple providers are being used for different sessions.");
      console.log("   The issue may be in frontend session management or caching.");
    }
    
    console.log("\n📋 Recommendations:");
    if (analysis && analysis.uniqueProviders <= 1) {
      console.log("   1. Check the Math.random() implementation in sessionProviders.ts");
      console.log("   2. Verify that listActiveInternal is returning multiple providers");
      console.log("   3. Add more logging to the getSessionProvider function");
      console.log("   4. Consider using a different randomization algorithm");
    } else {
      console.log("   1. Check frontend session ID generation and management"); 
      console.log("   2. Verify session IDs are unique across different chats");
      console.log("   3. Check browser localStorage/sessionStorage for session persistence");
      console.log("   4. Review frontend provider caching logic");
    }
    
  } catch (error) {
    console.error("\n💥 Test script failed:", error);
    console.error("Stack trace:", error.stack);
  }
  
  console.log(`\n⏰ Test completed at: ${new Date().toISOString()}`);
  console.log("🎯 Test script finished successfully!");
}

// Run the main function
main().catch(console.error);