// Test the fixed HTTP routing
const API_KEY = 'ak_a0d32b355660d880da02bcb80d6560320f1b47e84c1808ea';
const BASE_URL = 'https://judicious-hornet-148.convex.site';

console.log('🧪 Testing Fixed HTTP Routing');
console.log('==============================');
console.log(`API Key: ${API_KEY.substring(0, 15)}...`);
console.log(`Base URL: ${BASE_URL}`);
console.log('');

// Test 1: Health Check
async function testHealth() {
    console.log('1. Testing health endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/health`);
        const data = await response.json();
        console.log(`✅ Health check: ${data.message}`);
        return true;
    } catch (error) {
        console.log(`❌ Health check failed: ${error.message}`);
        return false;
    }
}

// Test 2: Models Endpoint
async function testModels() {
    console.log('\n2. Testing models endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/v1/models`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log(`✅ Models endpoint: Found ${data.data?.length || 0} models`);
            console.log(`📋 Sample models: ${data.data?.slice(0, 3).map(m => m.id).join(', ')}...`);
            return true;
        } else {
            console.log(`❌ Models endpoint failed: ${data.error?.message || 'Unknown error'}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Models endpoint error: ${error.message}`);
        return false;
    }
}

// Test 3: Chat Completions
async function testChatCompletions() {
    console.log('\n3. Testing chat completions endpoint...');
    try {
        const startTime = Date.now();
        const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'auto-select',
                messages: [
                    { role: 'user', content: 'Hello! This is a test of the fixed HTTP routing.' }
                ],
                max_tokens: 100
            })
        });
        
        const responseTime = Date.now() - startTime;
        const data = await response.json();
        
        if (response.ok) {
            console.log(`✅ Chat completions: Success (${responseTime}ms)`);
            console.log(`📊 Rate limits: ${response.headers.get('X-RateLimit-Remaining')}/${response.headers.get('X-RateLimit-Limit')}`);
            console.log(`💬 Response: ${data.choices?.[0]?.message?.content?.substring(0, 100)}...`);
            console.log(`🎯 Model used: ${data.model}`);
            console.log(`📈 Tokens: ${data.usage?.total_tokens || 'N/A'}`);
            return true;
        } else {
            console.log(`❌ Chat completions failed: ${data.error?.message || 'Unknown error'}`);
            console.log(`🔍 Error details:`, JSON.stringify(data, null, 2));
            return false;
        }
    } catch (error) {
        console.log(`❌ Chat completions error: ${error.message}`);
        return false;
    }
}

// Test 4: Error Handling
async function testErrorHandling() {
    console.log('\n4. Testing error handling...');
    
    // Test invalid API key
    try {
        const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ak_invalid_key_test',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'auto-select',
                messages: [{ role: 'user', content: 'test' }]
            })
        });
        
        const data = await response.json();
        
        if (response.status === 401 && data.error?.code === 'invalid_api_key') {
            console.log('✅ Invalid API key error handling: Correct');
        } else {
            console.log('⚠️ Invalid API key error handling: Unexpected response');
        }
    } catch (error) {
        console.log(`❌ Error handling test failed: ${error.message}`);
    }
    
    // Test empty messages
    try {
        const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'auto-select',
                messages: []
            })
        });
        
        const data = await response.json();
        
        if (response.status === 400 && data.error?.code === 'invalid_messages') {
            console.log('✅ Empty messages error handling: Correct');
        } else {
            console.log('⚠️ Empty messages error handling: Unexpected response');
        }
    } catch (error) {
        console.log(`❌ Empty messages test failed: ${error.message}`);
    }
}

// Test 5: OpenAI Compatibility
async function testOpenAICompatibility() {
    console.log('\n5. Testing OpenAI compatibility...');
    try {
        const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'auto-select',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'What is 2+2?' }
                ],
                temperature: 0.7,
                max_tokens: 50
            })
        });
        
        const data = await response.json();
        
        if (response.ok && 
            data.id && 
            data.object === 'chat.completion' &&
            data.choices && 
            data.choices[0]?.message?.content &&
            data.usage?.total_tokens) {
            console.log('✅ OpenAI compatibility: Perfect format');
            console.log(`📋 Response structure: id, object, choices, usage all present`);
            return true;
        } else {
            console.log('⚠️ OpenAI compatibility: Missing fields');
            console.log('🔍 Response structure:', Object.keys(data));
            return false;
        }
    } catch (error) {
        console.log(`❌ OpenAI compatibility test failed: ${error.message}`);
        return false;
    }
}

// Main test runner
async function runAllTests() {
    const startTime = Date.now();
    
    const results = {
        health: await testHealth(),
        models: await testModels(),
        chatCompletions: await testChatCompletions(),
        errorHandling: await testErrorHandling(),
        openAICompatibility: await testOpenAICompatibility()
    };
    
    const totalTime = Date.now() - startTime;
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    console.log('\n' + '='.repeat(50));
    console.log('🏁 HTTP ROUTING TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total time: ${(totalTime / 1000).toFixed(1)} seconds`);
    console.log(`Tests passed: ${passed}/${total}`);
    console.log(`Success rate: ${(passed/total*100).toFixed(1)}%`);
    
    if (passed === total) {
        console.log('\n🎉 ALL TESTS PASSED! HTTP routing is working perfectly.');
        console.log('✅ Standard REST API access is now functional');
        console.log('✅ OpenAI-compatible responses');
        console.log('✅ Proper error handling');
        console.log('✅ Rate limit headers included');
    } else {
        console.log('\n⚠️ Some tests failed. See details above.');
    }
    
    console.log('\n📋 Next steps:');
    console.log('1. Update documentation with working endpoints');
    console.log('2. Deploy Python SDK to PyPI');
    console.log('3. Create integration examples');
    console.log('4. Add streaming support');
    
    return passed === total;
}

runAllTests().catch(console.error);