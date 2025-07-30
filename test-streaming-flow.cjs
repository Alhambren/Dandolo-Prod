#!/usr/bin/env node

// Test the actual streaming flow to find where it breaks
const { ConvexHttpClient } = require("convex/browser");

async function testStreamingFlow() {
  console.log("🧪 Testing Streaming Flow...\n");
  
  try {
    const client = new ConvexHttpClient("https://good-monitor-677.convex.cloud");
    
    console.log("1. Testing streaming chunk storage/retrieval...");
    const chunkTest = await client.action("debug:testStreamingChunks", {});
    console.log("Chunk test result:", chunkTest);
    
    if (chunkTest.success) {
      console.log("✅ Streaming chunks can be stored and retrieved");
      
      console.log("\n2. Testing a simple sendMessageStreaming...");
      
      // Simulate what the frontend does
      const streamingResult = await client.action("inference:sendMessageStreaming", {
        messages: [
          { role: "user", content: "Hello, this is a test message" }
        ],
        model: "venice-uncensored",
        sessionId: "test_session_" + Date.now(),
        address: undefined, // Anonymous
        allowAdultContent: false
      });
      
      console.log("Streaming result:", streamingResult);
      
      if (streamingResult.success && streamingResult.streamId) {
        console.log("✅ Streaming initiated successfully");
        console.log("Stream ID:", streamingResult.streamId);
        
        // Wait a moment and poll for chunks
        console.log("\n3. Polling for streaming chunks...");
        let attempts = 0;
        const maxAttempts = 10;
        let foundChunks = false;
        
        while (attempts < maxAttempts && !foundChunks) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          attempts++;
          
          try {
            const chunks = await client.query("inference:getStreamingChunks", {
              streamId: streamingResult.streamId
            });
            
            console.log(`Attempt ${attempts}: Found ${chunks.length} chunks`);
            
            if (chunks.length > 0) {
              foundChunks = true;
              console.log("✅ Found streaming chunks:");
              chunks.forEach((chunk, i) => {
                console.log(`  Chunk ${i}: Index=${chunk.chunkIndex}, Done=${chunk.done}, Content="${chunk.content.substring(0, 50)}..."`);
              });
              
              const doneChunk = chunks.find(c => c.done);
              if (doneChunk) {
                console.log("✅ Found completion chunk - streaming completed successfully");
                console.log("Total tokens:", doneChunk.tokens);
                break;
              }
            }
          } catch (error) {
            console.log(`Attempt ${attempts}: Error polling chunks -`, error.message);
          }
        }
        
        if (!foundChunks) {
          console.log("❌ PROBLEM: No streaming chunks found after 10 seconds");
          console.log("This suggests the streaming action started but failed to produce chunks");
        }
        
      } else {
        console.log("❌ PROBLEM: Streaming failed to initiate");
        console.log("Error:", streamingResult.error);
      }
      
    } else {
      console.log("❌ PROBLEM: Basic chunk storage/retrieval failed");
      console.log("Error:", chunkTest.error);
    }
    
  } catch (error) {
    console.error("💥 STREAMING TEST FAILED:");
    console.error("Error:", error.message);
  }
}

testStreamingFlow().catch(console.error);