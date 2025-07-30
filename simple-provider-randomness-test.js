#!/usr/bin/env node

// Simple test to verify getSessionProvider returns different providers for different sessions
import { ConvexHttpClient } from "convex/browser";
import { randomBytes } from 'crypto';

async function simpleRandomnessTest() {
    const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");
    
    console.log("🎯 Simple Provider Randomness Test");
    console.log("Testing if getSessionProvider returns different providers for different session IDs\n");
    
    try {
        // Get active providers first
        const providers = await client.query("providers:list", {});
        const activeProviders = providers.filter(p => p.isActive);
        
        console.log(`📋 Found ${activeProviders.length} active providers`);
        
        if (activeProviders.length < 2) {
            console.log("❌ Need at least 2 active providers to test randomness");
            return;
        }
        
        console.log("\n🧪 Testing 10 different session IDs:");
        console.log("Session ID".padEnd(25) + " | Provider Name");
        console.log("-".repeat(50));
        
        const results = [];
        const uniqueProviders = new Set();
        
        for (let i = 1; i <= 10; i++) {
            // Generate unique session ID
            const sessionId = `test-${i}-${Date.now()}-${randomBytes(4).toString('hex')}`;
            
            try {
                // Get provider assignment
                const assignedProviderId = await client.mutation("sessionProviders:getSessionProvider", {
                    sessionId: sessionId,
                    intent: "chat"
                });
                
                // Find the provider name
                const assignedProvider = activeProviders.find(p => p._id === assignedProviderId);
                const providerName = assignedProvider ? assignedProvider.name : "Unknown";
                
                // Store result
                results.push({
                    sessionId: sessionId.substring(0, 24),
                    providerName: providerName,
                    providerId: assignedProviderId
                });
                
                uniqueProviders.add(assignedProviderId);
                
                console.log(`${sessionId.substring(0, 24)} | ${providerName}`);
                
                // Clean up the session
                await client.mutation("sessionProviders:removeSession", {
                    sessionId: sessionId
                });
                
            } catch (error) {
                console.log(`${sessionId.substring(0, 24)} | ERROR: ${error.message}`);
            }
        }
        
        console.log("\n📊 Analysis:");
        console.log(`• Total sessions tested: ${results.length}`);
        console.log(`• Unique providers used: ${uniqueProviders.size}`);
        console.log(`• Available providers: ${activeProviders.length}`);
        
        if (uniqueProviders.size === 1) {
            console.log("❌ PROBLEM: All sessions got the same provider!");
            console.log("   This suggests the randomization is not working properly.");
        } else if (uniqueProviders.size === results.length && results.length <= activeProviders.length) {
            console.log("✅ EXCELLENT: All sessions got different providers!");
            console.log("   The randomization is working very well.");
        } else {
            console.log("✅ GOOD: Multiple different providers were assigned.");
            console.log("   This indicates the randomization is working as expected.");
        }
        
        // Show provider frequency
        const providerCounts = {};
        results.forEach(result => {
            providerCounts[result.providerName] = (providerCounts[result.providerName] || 0) + 1;
        });
        
        console.log("\n📈 Provider distribution:");
        Object.entries(providerCounts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([provider, count]) => {
                const percentage = ((count / results.length) * 100).toFixed(1);
                console.log(`   ${provider}: ${count} times (${percentage}%)`);
            });
        
        // Quick statistical check
        const expectedFreq = results.length / activeProviders.length;
        const isReasonablyDistributed = Object.values(providerCounts).every(count => 
            count <= expectedFreq * 3 // No provider should get more than 3x the expected frequency
        );
        
        if (isReasonablyDistributed) {
            console.log("✅ Distribution looks reasonable for a random assignment");
        } else {
            console.log("⚠️  Some providers are being selected much more frequently than others");
        }
        
    } catch (error) {
        console.error("🚨 Test failed:", error.message);
    }
}

// Run the test
simpleRandomnessTest().catch(console.error);