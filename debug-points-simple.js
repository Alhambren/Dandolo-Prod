// Simple points debugging
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://judicious-hornet-148.convex.cloud");

async function debugPointsSimple() {
    console.log("🔍 Simple Points Debug");
    console.log("=====================");
    
    try {
        // Get providers first
        console.log("📋 Fetching providers...");
        const providers = await client.query("providers:list", {});
        
        console.log(`Found ${providers.length} providers:`);
        
        const dandoloMaster = providers.find(p => p.name === "Dandolo Master");
        if (dandoloMaster) {
            console.log("\n🎯 DANDOLO MASTER PROVIDER DATA:");
            console.log(`  - Name: ${dandoloMaster.name}`);
            console.log(`  - ID: ${dandoloMaster._id}`);
            console.log(`  - VCU Balance: ${dandoloMaster.vcuBalance || 0}`);
            console.log(`  - USD Balance: $${dandoloMaster.balance || 0}`);
            console.log(`  - Active: ${dandoloMaster.isActive}`);
            console.log(`  - Last Health Check: ${new Date(dandoloMaster.lastHealthCheck || 0).toLocaleString()}`);
        }
        
        // Try to get points data with different queries
        console.log("\n💰 Attempting to fetch points data...");
        
        try {
            // Try getting all provider points
            const allProviderPoints = await client.query("points:getAllProviderPoints", {});
            console.log(`✅ Found provider points data: ${allProviderPoints.length} records`);
            
            const dandoloMasterPoints = allProviderPoints.find(p => p.providerId === dandoloMaster?._id);
            if (dandoloMasterPoints) {
                console.log("\n🎯 DANDOLO MASTER POINTS DATA:");
                console.log(`  - Points: ${dandoloMasterPoints.totalPoints || 0}`);
                console.log(`  - Provider ID: ${dandoloMasterPoints.providerId}`);
                console.log(`  - Matches provider: ${dandoloMasterPoints.providerId === dandoloMaster._id ? '✅' : '❌'}`);
            } else {
                console.log("❌ No points data found for Dandolo Master");
            }
            
        } catch (pointsError) {
            console.log(`⚠️  Provider points query failed: ${pointsError.message}`);
            
            // Try alternative approach
            try {
                const stats = await client.query("stats:getNetworkStats", {});
                console.log("✅ Network stats available:");
                console.log(`  - Total providers: ${stats.totalProviders || 0}`);
                console.log(`  - Active providers: ${stats.activeProviders || 0}`);
                
            } catch (statsError) {
                console.log(`⚠️  Stats query also failed: ${statsError.message}`);
            }
        }
        
        // Check what's actually in the database for points
        console.log("\n🔍 ANALYSIS:");
        if (dandoloMaster) {
            const vcuBalance = dandoloMaster.vcuBalance || 0;
            console.log(`- Provider has ${vcuBalance} VCU balance`);
            console.log(`- At 1 point per 100 tokens, expected points: ~${Math.floor(vcuBalance * 10)}`);
            console.log(`- USD balance shows: $${dandoloMaster.balance || 0}`);
            
            if (vcuBalance > 0 && (dandoloMaster.balance || 0) === 0) {
                console.log("⚠️  VCU balance exists but USD balance is 0 - conversion issue?");
            }
        }
        
    } catch (error) {
        console.error("🚨 Error:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

debugPointsSimple().catch(console.error);