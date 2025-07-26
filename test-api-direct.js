// Direct test of the API endpoint with better error handling
import https from 'https';

const testKey = "ak_a0d32b355660d880da02bcb80d6560320f1b47e84c1808ea";

const requestData = JSON.stringify({
    model: "auto-select",
    messages: [{ role: "user", content: "Hello! This is a connection test." }],
    max_tokens: 50
});

const options = {
    hostname: 'judicious-hornet-148.convex.cloud',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testKey}`,
        'Content-Length': Buffer.byteLength(requestData)
    },
    timeout: 15000 // 15 second timeout
};

console.log('🧪 Testing API endpoint directly...');
console.log(`Endpoint: https://${options.hostname}${options.path}`);
console.log(`Key: ${testKey.substring(0, 10)}...`);

const req = https.request(options, (res) => {
    console.log(`📡 Response status: ${res.statusCode}`);
    console.log(`📋 Response headers:`, res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
        console.log(`📥 Received data chunk: ${chunk.length} bytes`);
    });
    
    res.on('end', () => {
        console.log(`✅ Response complete. Total data: ${data.length} bytes`);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                console.log('📄 Response data:', JSON.stringify(parsed, null, 2));
            } catch (e) {
                console.log('📄 Raw response:', data);
            }
        } else {
            console.log('📄 Empty response body');
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
});

req.on('timeout', () => {
    console.error('⏰ Request timed out after 15 seconds');
    console.log('🔍 This suggests the server is not responding or hanging on Venice.ai calls');
    req.destroy();
});

// Send the request
console.log('📤 Sending request...');
req.write(requestData);
req.end();