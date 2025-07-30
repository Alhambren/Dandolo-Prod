#!/usr/bin/env node

// Test script to verify session provider distribution and randomness
import { ConvexHttpClient } from "convex/browser";
import { randomBytes } from 'crypto';

async function testSessionProviderDistribution() {
    const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");
    
    console.log("🧪 Testing Session Provider Distribution and Randomness");
    console.log("=" .repeat(60));
    
    try {
        // First, get the list of active providers to know what we're working with
        console.log("1️⃣ Getting active providers...");
        const providers = await client.query("providers:list", {});
        const activeProviders = providers.filter(p => p.isActive);
        
        console.log(`   Found ${activeProviders.length} active providers:`);
        activeProviders.forEach((provider, i) => {
            console.log(`   ${i + 1}. ${provider.name} (ID: ${provider._id})`);
        });
        
        if (activeProviders.length === 0) {
            console.log("❌ No active providers found - cannot test distribution");
            return;
        }
        
        console.log("\n2️⃣ Testing provider assignment with different session IDs...");
        
        // Test with different numbers of sessions to see patterns
        const testCases = [
            { sessions: 10, description: "Small sample" },
            { sessions: 50, description: "Medium sample" },
            { sessions: 100, description: "Large sample" }
        ];
        
        for (const testCase of testCases) {
            console.log(`\n   Testing ${testCase.description} (${testCase.sessions} sessions):`);
            console.log("   " + "-".repeat(50));
            
            const results = [];
            const providerCounts = {};
            const sessionAssignments = [];
            
            // Initialize counts
            activeProviders.forEach(provider => {
                providerCounts[provider.name] = 0;
            });
            
            // Test multiple sessions
            for (let i = 0; i < testCase.sessions; i++) {
                // Generate unique session ID
                const sessionId = `test-session-${Date.now()}-${randomBytes(8).toString('hex')}`;
                
                try {
                    // Call getSessionProvider
                    const assignedProviderId = await client.mutation("sessionProviders:getSessionProvider", {
                        sessionId: sessionId,
                        intent: "chat"
                    });
                    
                    // Find the provider name
                    const assignedProvider = activeProviders.find(p => p._id === assignedProviderId);
                    if (assignedProvider) {
                        providerCounts[assignedProvider.name]++;
                        sessionAssignments.push({
                            sessionId: sessionId.substring(0, 20) + "...",
                            providerId: assignedProviderId,
                            providerName: assignedProvider.name
                        });
                    }
                    
                    // Clean up the session to avoid affecting future tests
                    await client.mutation("sessionProviders:removeSession", {
                        sessionId: sessionId
                    });
                    
                } catch (error) {
                    console.log(`   ❌ Error with session ${i + 1}: ${error.message}`);
                }
            }
            
            // Calculate and display distribution
            console.log(`\n   📊 Distribution Results:`);
            const totalAssigned = Object.values(providerCounts).reduce((sum, count) => sum + count, 0);
            
            Object.entries(providerCounts).forEach(([providerName, count]) => {
                const percentage = totalAssigned > 0 ? ((count / totalAssigned) * 100).toFixed(1) : 0;
                const bar = "█".repeat(Math.floor(percentage / 2)); // Visual bar
                console.log(`   ${providerName.padEnd(20)} : ${count.toString().padStart(3)} (${percentage}%) ${bar}`);
            });
            
            // Calculate expected distribution (should be roughly equal)
            const expectedPerProvider = totalAssigned / activeProviders.length;
            const expectedPercentage = (100 / activeProviders.length).toFixed(1);
            console.log(`\n   Expected per provider: ~${expectedPerProvider.toFixed(1)} (${expectedPercentage}%)`);
            
            // Calculate chi-square test for randomness
            const chiSquare = Object.values(providerCounts).reduce((sum, observed) => {
                const deviation = observed - expectedPerProvider;
                return sum + (deviation * deviation) / expectedPerProvider;
            }, 0);
            
            console.log(`   Chi-square statistic: ${chiSquare.toFixed(3)}`);
            console.log(`   Degrees of freedom: ${activeProviders.length - 1}`);
            
            // Simple interpretation (for df=1, critical value ≈ 3.84 at 95% confidence)
            // For more providers, the critical values are higher
            const criticalValues = { 1: 3.84, 2: 5.99, 3: 7.81, 4: 9.49, 5: 11.07 };
            const df = activeProviders.length - 1;
            const criticalValue = criticalValues[df] || 15.51; // rough estimate for higher df
            
            if (chiSquare < criticalValue) {
                console.log(`   ✅ Distribution appears random (χ² < ${criticalValue})`);
            } else {
                console.log(`   ⚠️  Distribution may not be random (χ² >= ${criticalValue})`);
            }
            
            // Show first few assignments for pattern detection
            if (testCase.sessions <= 20) {
                console.log(`\n   📋 Assignment sequence:`);
                sessionAssignments.slice(0, 10).forEach((assignment, i) => {
                    console.log(`   ${(i + 1).toString().padStart(2)}. ${assignment.sessionId} -> ${assignment.providerName}`);
                });
                if (sessionAssignments.length > 10) {
                    console.log(`   ... and ${sessionAssignments.length - 10} more`);
                }
            }
        }
        
        console.log("\n3️⃣ Testing session persistence...");
        
        // Test that the same session ID gets the same provider
        const persistenceSessionId = `persistence-test-${Date.now()}-${randomBytes(4).toString('hex')}`;
        
        console.log(`   Using session ID: ${persistenceSessionId}`);
        
        const firstAssignment = await client.mutation("sessionProviders:getSessionProvider", {
            sessionId: persistenceSessionId,
            intent: "chat"
        });
        
        const firstProvider = activeProviders.find(p => p._id === firstAssignment);
        console.log(`   First assignment: ${firstProvider.name} (${firstAssignment})`);
        
        // Call again with same session ID
        const secondAssignment = await client.mutation("sessionProviders:getSessionProvider", {
            sessionId: persistenceSessionId,
            intent: "chat"
        });
        
        const secondProvider = activeProviders.find(p => p._id === secondAssignment);
        console.log(`   Second assignment: ${secondProvider.name} (${secondAssignment})`);
        
        if (firstAssignment === secondAssignment) {
            console.log(`   ✅ Session persistence works correctly`);
        } else {
            console.log(`   ❌ Session persistence failed - got different providers!`);
        }
        
        // Clean up
        await client.mutation("sessionProviders:removeSession", {
            sessionId: persistenceSessionId
        });
        
        console.log("\n4️⃣ Getting current session statistics...");
        
        const stats = await client.query("sessionProviders:getSessionStats", {});
        console.log(`   Total active sessions: ${stats.totalActiveSessions}`);
        console.log(`   Provider distribution in active sessions:`);
        
        Object.entries(stats.providerDistribution).forEach(([providerName, count]) => {
            console.log(`     ${providerName}: ${count} sessions`);
        });
        
        console.log("\n✅ Session provider distribution test completed!");
        
    } catch (error) {
        console.error("🚨 Error during testing:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

// Run the test
testSessionProviderDistribution().catch(console.error);