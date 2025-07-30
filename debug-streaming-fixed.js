// Debug script to test streaming functionality
// Run with: node debug-streaming-fixed.js

const CONVEX_URL = 'https://good-monitor-677.convex.cloud';

async function testStreaming() {
  try {
    console.log('🔍 Testing streaming functionality...');
    console.log('Using Convex URL:', CONVEX_URL);
    
    // Test 1: Check if providers are available
    console.log('\n1️⃣ Checking available providers...');
    const providersResponse = await fetch(`${CONVEX_URL}/api/providers/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (!providersResponse.ok) {
      console.error('❌ Failed to fetch providers:', providersResponse.status, providersResponse.statusText);
      return;
    }
    
    const providers = await providersResponse.json();
    console.log('Available providers:', providers?.length || 0);
    
    if (!providers || providers.length === 0) {
      console.error('❌ No providers available - this will cause streaming to fail');
      return;
    }
    
    const activeProviders = providers.filter(p => p.isActive);
    console.log(`✅ Found ${activeProviders.length} active providers out of ${providers.length} total`);
    
    // Test 2: Try to start a streaming request
    console.log('\n2️⃣ Starting streaming request...');
    const sessionId = `test_session_${Date.now()}`;
    const streamingRequest = {
      messages: [{ role: 'user', content: 'Hello, can you respond with a simple greeting? Just say "Hello back!" and nothing more.' }],
      model: 'venice-uncensored',
      sessionId: sessionId,
      allowAdultContent: false
    };
    
    const streamResponse = await fetch(`${CONVEX_URL}/api/inference/sendMessageStreaming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(streamingRequest)
    });
    
    if (!streamResponse.ok) {
      console.error('❌ Streaming request failed:', streamResponse.status, streamResponse.statusText);
      const errorText = await streamResponse.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const streamResult = await streamResponse.json();
    console.log('Streaming response:', streamResult);
    
    if (streamResult.success && streamResult.streamId) {
      console.log('✅ Streaming request started successfully');
      console.log('Stream ID:', streamResult.streamId);
      
      // Test 3: Poll for streaming chunks
      console.log('\n3️⃣ Polling for streaming chunks...');
      let attempts = 0;
      const maxAttempts = 15; // Increased timeout
      let totalContent = '';
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const chunksResponse = await fetch(`${CONVEX_URL}/api/inference/getStreamingChunks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streamId: streamResult.streamId })
        });
        
        if (!chunksResponse.ok) {
          console.error(`❌ Failed to fetch chunks (attempt ${attempts + 1}):`, chunksResponse.status);
          attempts++;
          continue;
        }
        
        const chunks = await chunksResponse.json();
        console.log(`📥 Attempt ${attempts + 1}: Found ${chunks.length} chunks`);
        
        if (chunks.length > 0) {
          // Process new chunks
          for (const chunk of chunks) {
            if (chunk.content) {
              totalContent += chunk.content;
            }
            
            if (chunk.done) {
              console.log('✅ Streaming completed successfully!');
              console.log('📄 Final response:', totalContent);
              console.log('🔢 Total tokens:', chunk.tokens || 'Unknown');
              console.log('🤖 Model used:', chunk.model || 'Unknown');
              return;
            }
          }
          
          if (totalContent) {
            console.log('📝 Current content so far:', totalContent.substring(0, 100) + (totalContent.length > 100 ? '...' : ''));
          }
        }
        
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.log('⚠️ Streaming did not complete within expected time');
        console.log('📄 Partial content received:', totalContent);
      }
      
    } else {
      console.error('❌ Streaming request failed:', streamResult.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testStreaming();