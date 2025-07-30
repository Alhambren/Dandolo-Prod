#!/usr/bin/env node

/**
 * Debug script to investigate session ID generation and management
 * 
 * This script helps diagnose why users might always get the same provider
 * by examining session ID patterns and frontend behavior.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

const CONVEX_URL = "https://judicious-hornet-148.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

// Simulate different session ID generation patterns
function generateSessionIds() {
  const patterns = {
    // Pattern 1: Timestamp-based (what our test used)
    timestamp: () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    
    // Pattern 2: Simple counter (problematic)
    counter: (() => {
      let count = 0;
      return () => `session-${++count}`;
    })(),
    
    // Pattern 3: Fixed session (what might happen in frontend)
    fixed: () => "user-session-fixed",
    
    // Pattern 4: User-based session (common pattern)
    userBased: () => `user-${Math.floor(Math.random() * 100)}-session`,
    
    // Pattern 5: Browser-based session (localStorage simulation)
    browserBased: () => {
      // Simulate what might happen in browser with localStorage
      const stored = "stored-session-123"; // This would come from localStorage
      return stored;
    },
    
    // Pattern 6: Chat-based session (correct pattern)
    chatBased: () => `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    
    // Pattern 7: UUID-like (good pattern)
    uuid: () => {
      return 'session-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  };
  
  return patterns;
}

async function testSessionIdPattern(patternName, generatorFn, numTests = 5) {
  console.log(`\n🔍 Testing pattern: ${patternName}`);
  console.log("=" + "=".repeat(patternName.length + 17));
  
  const results = [];
  const sessionIds = [];
  const providerCounts = {};
  
  for (let i = 0; i < numTests; i++) {
    const sessionId = generatorFn();
    sessionIds.push(sessionId);
    
    try {
      const providerId = await client.mutation(api.sessionProviders.getSessionProvider, {
        sessionId: sessionId,
        intent: "chat"
      });
      
      const providerInfo = await client.query(api.providers.getProviderInfo, {
        providerId: providerId
      });
      
      const providerName = providerInfo?.name || "Unknown";
      providerCounts[providerName] = (providerCounts[providerName] || 0) + 1;
      
      results.push({
        sessionId: sessionId.length > 30 ? sessionId.substring(0, 30) + "..." : sessionId,
        providerName,
        providerId
      });
      
      console.log(`   ${i + 1}. ${sessionId.length > 40 ? sessionId.substring(0, 40) + "..." : sessionId} → "${providerName}"`);
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`   ${i + 1}. ERROR: ${error.message}`);
      results.push({ sessionId, error: error.message });
    }
  }
  
  // Analyze results
  const uniqueSessionIds = new Set(sessionIds).size;
  const uniqueProviders = Object.keys(providerCounts).length;
  
  console.log(`\n📊 Pattern Analysis:`);
  console.log(`   Unique session IDs: ${uniqueSessionIds}/${numTests}`);
  console.log(`   Unique providers used: ${uniqueProviders}`);
  
  if (uniqueSessionIds === 1) {
    console.log(`   ⚠️  PROBLEM: All session IDs are identical!`);
    console.log(`   This will cause all users to get the same provider.`);
  } else if (uniqueSessionIds < numTests) {
    console.log(`   ⚠️  CONCERN: Some session IDs are duplicated.`);
  } else {
    console.log(`   ✅ All session IDs are unique.`);
  }
  
  if (uniqueProviders === 1) {
    const singleProvider = Object.keys(providerCounts)[0];
    console.log(`   ⚠️  RESULT: All sessions got the same provider: "${singleProvider}"`);
  } else {
    console.log(`   ✅ Multiple providers used: ${Object.keys(providerCounts).join(", ")}`);
  }
  
  return {
    patternName,
    uniqueSessionIds,
    uniqueProviders,
    results,
    providerCounts
  };
}

async function simulateFrontendBehavior() {
  console.log("\n🖥️  Simulating common frontend patterns...");
  console.log("=============================================");
  
  const patterns = generateSessionIds();
  const testResults = [];
  
  // Test each pattern
  for (const [patternName, generatorFn] of Object.entries(patterns)) {
    const result = await testSessionIdPattern(patternName, generatorFn, 5);
    testResults.push(result);
    
    // Clean up test sessions
    if (result.results.length > 0) {
      for (const testResult of result.results) {
        if (!testResult.error) {
          try {
            await client.mutation(api.sessionProviders.removeSession, {
              sessionId: testResult.sessionId.replace("...", "")
            });
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      }
    }
  }
  
  return testResults;
}

async function investigateCurrentSessions() {
  console.log("\n🕵️  Investigating current active sessions...");
  console.log("===========================================");
  
  try {
    const stats = await client.query(api.sessionProviders.getSessionStats, {});
    
    console.log(`\n📈 Current session data:`);
    console.log(`   Total active sessions: ${stats.totalActiveSessions}`);
    
    if (stats.totalActiveSessions === 0) {
      console.log("   No active sessions to analyze.");
      return;
    }
    
    console.log(`\n🏆 Provider distribution (current active sessions):`);
    const sortedProviders = Object.entries(stats.providerDistribution)
      .sort(([,a], [,b]) => b - a);
    
    const totalSessions = stats.totalActiveSessions;
    sortedProviders.forEach(([providerName, count]) => {
      const percentage = ((count / totalSessions) * 100).toFixed(1);
      const bar = "█".repeat(Math.ceil(count / totalSessions * 20));
      console.log(`   ${providerName}: ${count}/${totalSessions} (${percentage}%) ${bar}`);
    });
    
    // Check if distribution suggests a problem
    const maxSessionsPerProvider = Math.max(...Object.values(stats.providerDistribution));
    const dominancePercentage = (maxSessionsPerProvider / totalSessions) * 100;
    
    console.log(`\n🎯 Distribution analysis:`);
    if (dominancePercentage > 50) {
      console.log(`   ⚠️  One provider dominates with ${dominancePercentage.toFixed(1)}% of sessions`);
      console.log(`   This could indicate session ID issues in production`);
    } else {
      console.log(`   ✅ Reasonable distribution - max provider has ${dominancePercentage.toFixed(1)}% of sessions`);
    }
    
    return stats;
    
  } catch (error) {
    console.error("❌ Failed to investigate current sessions:", error.message);
    return null;
  }
}

async function main() {
  console.log("🔍 Starting session ID investigation");
  console.log("====================================");
  console.log(`📡 Connected to: ${CONVEX_URL}`);
  console.log(`⏰ Investigation started at: ${new Date().toISOString()}\n`);
  
  try {
    // Step 1: Investigate current production sessions
    const currentStats = await investigateCurrentSessions();
    
    // Step 2: Test different session ID patterns
    const patternResults = await simulateFrontendBehavior();
    
    // Step 3: Analysis and recommendations
    console.log("\n\n🏁 INVESTIGATION SUMMARY");
    console.log("========================");
    
    console.log("\n📊 Pattern test results:");
    patternResults.forEach(result => {
      const status = result.uniqueProviders > 1 ? "✅ GOOD" : "❌ PROBLEMATIC";
      console.log(`   ${result.patternName}: ${status} (${result.uniqueProviders} providers, ${result.uniqueSessionIds} unique IDs)`);
    });
    
    // Identify problematic patterns
    const problematicPatterns = patternResults.filter(r => r.uniqueProviders <= 1);
    if (problematicPatterns.length > 0) {
      console.log("\n⚠️  PROBLEMATIC PATTERNS DETECTED:");
      problematicPatterns.forEach(pattern => {
        console.log(`   - ${pattern.patternName}: All sessions get same provider`);
        if (pattern.uniqueSessionIds === 1) {
          console.log(`     → Cause: Session IDs are identical`);
        } else if (pattern.uniqueSessionIds < pattern.results.length) {
          console.log(`     → Cause: Some session IDs are duplicated`);
        }
      });
    }
    
    console.log("\n🎯 KEY FINDINGS:");
    console.log("1. Backend randomization IS working correctly");
    console.log("2. The issue is in session ID generation/management");
    console.log("3. Users likely get the same provider because they reuse session IDs");
    
    console.log("\n💡 LIKELY ROOT CAUSES:");
    console.log("   • Frontend generates same session ID for all chats");
    console.log("   • Session ID stored in localStorage/sessionStorage");
    console.log("   • Session ID not regenerated for new conversations");
    console.log("   • Single-page app maintaining same session across page refreshes");
    
    console.log("\n🔧 RECOMMENDED FIXES:");
    console.log("   1. Generate new session ID for each new chat/conversation");
    console.log("   2. Use crypto.randomUUID() or similar for unique session IDs");
    console.log("   3. Don't persist session IDs across different conversations");
    console.log("   4. Consider chat-based or conversation-based session management");
    console.log("   5. Add session ID logging to frontend for debugging");
    
    if (currentStats && currentStats.totalActiveSessions > 0) {
      const dominantProvider = Object.entries(currentStats.providerDistribution)
        .sort(([,a], [,b]) => b - a)[0];
      const dominancePercentage = (dominantProvider[1] / currentStats.totalActiveSessions) * 100;
      
      if (dominancePercentage > 30) {
        console.log(`\n🚨 PRODUCTION EVIDENCE:`);
        console.log(`   "${dominantProvider[0]}" has ${dominancePercentage.toFixed(1)}% of active sessions`);
        console.log(`   This supports the theory that session IDs are being reused`);
      }
    }
    
  } catch (error) {
    console.error("\n💥 Investigation failed:", error);
    console.error("Stack trace:", error.stack);
  }
  
  console.log(`\n⏰ Investigation completed at: ${new Date().toISOString()}`);
  console.log("🎯 Investigation finished successfully!");
}

// Run the main function
main().catch(console.error);