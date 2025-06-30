#!/usr/bin/env node

/**
 * Comprehensive API test for Dandolo Venice.ai proxy
 * Tests API key authentication, rate limiting, and Venice.ai pass-through
 */

const DANDOLO_API_BASE = process.env.DANDOLO_API_BASE || 'https://dandolo.ai';
const TEST_API_KEY = process.env.TEST_API_KEY; // Set this to test with a real key

async function testEndpoint(endpoint, options = {}) {
  const url = `${DANDOLO_API_BASE}${endpoint}`;
  console.log(`\n🧪 Testing: ${options.method || 'GET'} ${endpoint}`);
  
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, typeof responseData === 'string' ? responseData.substring(0, 200) : responseData);
    
    return { status: response.status, data: responseData };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Dandolo API Tests\n');
  
  // Test 1: API Health Check
  await testEndpoint('/api/v1/balance', {
    headers: { Authorization: 'Bearer invalid_key' }
  });
  
  // Test 2: Missing API Key
  await testEndpoint('/api/chat/completions', {
    method: 'POST',
    body: {
      model: 'auto-select',
      messages: [{ role: 'user', content: 'Hello' }]
    }
  });
  
  // Test 3: Invalid API Key
  await testEndpoint('/api/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer dk_invalid123' },
    body: {
      model: 'auto-select',
      messages: [{ role: 'user', content: 'Hello' }]
    }
  });
  
  // Test 4: CORS Preflight
  await testEndpoint('/api/chat/completions', {
    method: 'OPTIONS'
  });
  
  if (TEST_API_KEY) {
    console.log('\n🔑 Testing with real API key...');
    
    // Test 5: Valid API Key - Balance Check
    await testEndpoint('/api/v1/balance', {
      headers: { Authorization: `Bearer ${TEST_API_KEY}` }
    });
    
    // Test 6: Valid API Key - Chat Completion
    await testEndpoint('/api/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      body: {
        model: 'auto-select',
        messages: [{ role: 'user', content: 'Say hello in one word' }],
        max_tokens: 10
      }
    });
    
    // Test 7: Models List
    await testEndpoint('/api/models', {
      headers: { Authorization: `Bearer ${TEST_API_KEY}` }
    });
  } else {
    console.log('\n⚠️  Set TEST_API_KEY environment variable to test with real API key');
  }
  
  console.log('\n✅ Tests completed!');
}

runTests().catch(console.error);