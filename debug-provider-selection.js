#!/usr/bin/env node

/**
 * Debug script to investigate actual provider selection behavior
 * This script simulates the real Convex environment to identify issues
 */

import { ConvexHttpClient } from "convex/browser";

// Create a client to test the actual system
const client = new ConvexHttpClient("https://good-monitor-677.convex.cloud");

async function debugProviderSelection() {
    console.log('🔍 Debugging Provider Selection in Real Environment');
    console.log('================================================\n');

    try {
        // 1. First, check what providers are actually available
        console.log('1. Checking Available Providers');
        console.log('------------------------------');
        
        const activeProviders = await client.query("providers:listActive");
        console.log(`Active providers found: ${activeProviders.length}`);
        
        if (activeProviders.length === 0) {
            console.log('❌ NO ACTIVE PROVIDERS - This explains the non-random behavior!');
            console.log('The application has no providers to select from.');
            return;
        }
        
        activeProviders.forEach((provider, index) => {
            console.log(`  Provider ${index}: ${provider.name} (ID: ${provider._id})`);
            console.log(`    - Active: ${provider.isActive}`);
            console.log(`    - VCU Balance: ${provider.vcuBalance || 'unknown'}`);
            console.log(`    - Total Prompts: ${provider.totalPrompts || 0}`);
        });
        
        console.log();
        
        // 2. Test multiple session assignments to see if randomization works
        console.log('2. Testing Session Provider Assignment');
        console.log('------------------------------------');
        
        const sessionTests = [];
        const providerSelections = {};
        
        // Test 10 different sessions
        for (let i = 0; i < 10; i++) {
            const sessionId = `test-session-${Date.now()}-${i}`;
            
            try {
                const assignedProviderId = await client.mutation("sessionProviders:getSessionProvider", {
                    sessionId: sessionId,
                    intent: "chat"
                });
                
                // Find the provider details
                const assignedProvider = activeProviders.find(p => p._id === assignedProviderId);
                const providerName = assignedProvider ? assignedProvider.name : 'Unknown';
                
                sessionTests.push({
                    sessionId,
                    providerId: assignedProviderId,
                    providerName
                });
                
                // Count selections
                if (!providerSelections[providerName]) {
                    providerSelections[providerName] = 0;
                }
                providerSelections[providerName]++;
                
                console.log(`  Session ${i + 1}: ${sessionId.substring(0, 20)}... → Provider: ${providerName}`);
                
                // Clean up the session
                await client.mutation("sessionProviders:removeSession", { sessionId });
                
            } catch (error) {
                console.error(`  ❌ Session ${i + 1} failed: ${error.message}`);
            }
        }
        
        console.log('\nProvider Selection Summary:');
        Object.entries(providerSelections).forEach(([name, count]) => {
            const percentage = ((count / sessionTests.length) * 100).toFixed(1);
            console.log(`  ${name}: ${count}/${sessionTests.length} selections (${percentage}%)`);
        });
        
        // Check if all selections went to the same provider
        const uniqueProviders = Object.keys(providerSelections).length;
        if (uniqueProviders === 1 && sessionTests.length > 1) {
            console.log('❌ ALL SELECTIONS WENT TO THE SAME PROVIDER - Randomization issue confirmed!');
        } else if (uniqueProviders > 1) {
            console.log('✅ Multiple providers selected - Randomization appears to be working');
        }
        
        console.log();
        
        // 3. Check for session persistence issues
        console.log('3. Testing Session Persistence');
        console.log('-----------------------------');
        
        const persistentSessionId = `persistent-test-${Date.now()}`;
        
        // Make multiple requests with the same session ID
        console.log(`Testing persistence with session: ${persistentSessionId}`);
        
        let firstProvider = null;
        let allSameProvider = true;
        
        for (let i = 0; i < 5; i++) {
            try {
                const providerId = await client.mutation("sessionProviders:getSessionProvider", {
                    sessionId: persistentSessionId,
                    intent: "chat"
                });
                
                const provider = activeProviders.find(p => p._id === providerId);
                const providerName = provider ? provider.name : 'Unknown';
                
                if (i === 0) {
                    firstProvider = providerName;
                } else if (providerName !== firstProvider) {
                    allSameProvider = false;
                }
                
                console.log(`  Request ${i + 1}: → Provider: ${providerName}`);
                
            } catch (error) {
                console.error(`  ❌ Request ${i + 1} failed: ${error.message}`);
            }
        }
        
        if (allSameProvider) {
            console.log('✅ Session persistence working correctly - same provider for same session');
        } else {
            console.log('❌ Session persistence broken - different providers for same session');
        }
        
        // Clean up
        await client.mutation("sessionProviders:removeSession", { sessionId: persistentSessionId });
        
        console.log();
        
        // 4. Test with different intents
        console.log('4. Testing Different Intent Types');
        console.log('--------------------------------');
        
        const intents = ['chat', 'code', 'image', 'analysis'];
        
        for (const intent of intents) {
            const sessionId = `intent-test-${intent}-${Date.now()}`;
            
            try {
                const providerId = await client.mutation("sessionProviders:getSessionProvider", {
                    sessionId: sessionId,
                    intent: intent
                });
                
                const provider = activeProviders.find(p => p._id === providerId);
                const providerName = provider ? provider.name : 'Unknown';
                
                console.log(`  Intent '${intent}': → Provider: ${providerName}`);
                
                // Clean up
                await client.mutation("sessionProviders:removeSession", { sessionId });
                
            } catch (error) {
                console.error(`  ❌ Intent '${intent}' failed: ${error.message}`);
            }
        }
        
        console.log();
        
        // 5. Check session statistics
        console.log('5. Session Statistics');
        console.log('-------------------');
        
        try {
            const sessionStats = await client.query("sessionProviders:getSessionStats");
            console.log(`Total active sessions: ${sessionStats.totalActiveSessions}`);
            console.log(`Expired sessions: ${sessionStats.expiredSessions}`);
            console.log('Provider distribution:');
            
            Object.entries(sessionStats.providerDistribution).forEach(([providerName, count]) => {
                console.log(`  ${providerName}: ${count} sessions`);
            });
            
        } catch (error) {
            console.error(`❌ Failed to get session stats: ${error.message}`);
        }
        
    } catch (error) {
        console.error('❌ Error during debugging:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Additional function to test the internal provider selection
async function testInternalProviderSelection() {
    console.log('\n6. Advanced Debugging - Provider Array Analysis');
    console.log('==============================================');
    
    try {
        // We can't directly call internal functions, but we can infer behavior
        console.log('Creating multiple rapid sessions to test randomization under load...');
        
        const rapidSelections = [];
        const selectionCounts = {};
        
        // Create 50 sessions rapidly to test for patterns
        const promises = [];
        for (let i = 0; i < 50; i++) {
            const sessionId = `rapid-test-${Date.now()}-${Math.random()}-${i}`;
            promises.push(
                client.mutation("sessionProviders:getSessionProvider", {
                    sessionId: sessionId,
                    intent: "chat"
                }).then(providerId => ({ sessionId, providerId }))
            );
        }
        
        console.log('Waiting for all 50 sessions to be assigned...');
        const results = await Promise.all(promises);
        
        // Get active providers to map IDs to names
        const activeProviders = await client.query("providers:listActive");
        
        results.forEach((result, index) => {
            const provider = activeProviders.find(p => p._id === result.providerId);
            const providerName = provider ? provider.name : 'Unknown';
            
            rapidSelections.push(providerName);
            selectionCounts[providerName] = (selectionCounts[providerName] || 0) + 1;
            
            if (index < 10) { // Show first 10 for brevity
                console.log(`  Rapid ${index + 1}: ${providerName}`);
            }
        });
        
        console.log('\nRapid Selection Distribution:');
        Object.entries(selectionCounts).forEach(([name, count]) => {
            const percentage = ((count / results.length) * 100).toFixed(1);
            console.log(`  ${name}: ${count}/${results.length} (${percentage}%)`);
        });
        
        // Check for clustering or patterns
        console.log('\nPattern Analysis:');
        const uniqueProviders = Object.keys(selectionCounts).length;
        const expectedPerProvider = results.length / Math.max(activeProviders.length, 1);
        
        console.log(`Unique providers selected: ${uniqueProviders}/${activeProviders.length}`);
        console.log(`Expected selections per provider: ~${expectedPerProvider.toFixed(1)}`);
        
        // Check for severe bias
        const maxSelections = Math.max(...Object.values(selectionCounts));
        const minSelections = Math.min(...Object.values(selectionCounts));
        const bias = maxSelections / minSelections;
        
        console.log(`Selection bias ratio: ${bias.toFixed(2)} (${bias > 3 ? 'HIGH' : bias > 2 ? 'MODERATE' : 'LOW'})`);
        
        if (uniqueProviders === 1) {
            console.log('❌ CRITICAL: All selections went to same provider');
        } else if (bias > 3) {
            console.log('⚠️  WARNING: High selection bias detected');
        } else {
            console.log('✅ Randomization appears to be working within reasonable bounds');
        }
        
        // Clean up all sessions
        console.log('\nCleaning up test sessions...');
        const cleanupPromises = results.map(result => 
            client.mutation("sessionProviders:removeSession", { sessionId: result.sessionId })
        );
        await Promise.all(cleanupPromises);
        console.log('✅ Cleanup completed');
        
    } catch (error) {
        console.error('❌ Error in advanced debugging:', error.message);
    }
}

// Run the debugging
async function main() {
    await debugProviderSelection();
    await testInternalProviderSelection();
    
    console.log('\n🎯 DEBUGGING COMPLETE');
    console.log('==================');
    console.log('Check the output above for:');
    console.log('1. Number of active providers available');
    console.log('2. Distribution of provider selections');
    console.log('3. Session persistence behavior');
    console.log('4. Any error messages or patterns');
    console.log('\nIf all selections go to the same provider, the issue is likely:');
    console.log('- Only one active provider in the database');
    console.log('- Provider filtering excluding most providers');
    console.log('- Database query issues in listActiveInternal');
    console.log('- Caching issues in Convex functions');
}

main().catch(console.error);