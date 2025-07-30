#!/usr/bin/env node

// Debug script to test streaming functionality
const { ConvexHttpClient } = require("convex/browser");

async function debugStreaming() {
  console.log("🔍 Debugging Dandolo Streaming Pipeline...\n");
  
  try {
    // Initialize Convex client
    const client = new ConvexHttpClient("https://good-monitor-677.convex.cloud");
    
    console.log("1. Testing debug provider status...");
    const debugResult = await client.action("inference:debugProviderStatus", {});
    
    console.log("\n📊 DEBUG RESULTS:");
    console.log("Success:", debugResult.success);
    console.log("Message:", debugResult.message);
    console.log("\n📋 Details:");
    console.log(JSON.stringify(debugResult.details, null, 2));
    
    if (!debugResult.success) {
      console.log("\n❌ CRITICAL ISSUES FOUND:");
      console.log("The streaming system will not work because:");
      console.log("-", debugResult.message);
      
      if (debugResult.details.solution) {
        console.log("\n💡 SOLUTION:");
        console.log(debugResult.details.solution);
      }
      
      if (debugResult.details.allProviders) {
        console.log("\n📝 ALL PROVIDERS:");
        debugResult.details.allProviders.forEach((p, i) => {
          console.log(`${i + 1}. ${p.name} - Active: ${p.isActive}, Has API Key: ${p.hasApiKey}`);
        });
      }
    } else {
      console.log("\n✅ ANALYSIS COMPLETE");
      console.log("Diagnosis:", debugResult.details.diagnosis);
      
      if (debugResult.details.diagnosis.includes("CRITICAL")) {
        console.log("\n❌ CRITICAL ISSUE FOUND - Streaming will fail");
      } else if (debugResult.details.diagnosis.includes("GOOD")) {
        console.log("\n✅ BACKEND SYSTEMS HEALTHY - Issue may be in frontend polling");
      }
    }
    
  } catch (error) {
    console.error("\n💥 DEBUG SCRIPT FAILED:");
    console.error("Error:", error.message);
    console.error("\nThis could indicate:");
    console.error("- Convex backend is not running");
    console.error("- Network connectivity issues");
    console.error("- Authentication problems");
  }
}

// Run the debug
debugStreaming().catch(console.error);