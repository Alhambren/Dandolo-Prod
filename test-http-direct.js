// Test HTTP endpoint with different approaches
import https from 'https';

async function testHttpWithDetails(path) {
    return new Promise((resolve) => {
        console.log(`\n🧪 Testing: https://judicious-hornet-148.convex.cloud${path}`);
        
        const options = {
            hostname: 'judicious-hornet-148.convex.cloud',
            port: 443,
            path: path,
            method: 'GET',
            timeout: 5000,
            headers: {
                'User-Agent': 'Dandolo-Test/1.0'
            }
        };

        const req = https.request(options, (res) => {
            console.log(`   Status: ${res.statusCode}`);
            console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
            
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`   Body: ${data || '(empty)'}`);
                resolve({ status: res.statusCode, body: data, headers: res.headers });
            });
        });

        req.on('error', (error) => {
            console.log(`   Error: ${error.message}`);
            resolve({ error: error.message });
        });

        req.on('timeout', () => {
            console.log(`   Timeout: No response in 5 seconds`);
            req.destroy();
            resolve({ timeout: true });
        });

        req.end();
    });
}

async function comprehensiveHttpTest() {
    console.log('🔍 Comprehensive HTTP Endpoint Test');
    console.log('=====================================');
    
    const testPaths = [
        '/test',
        '/health', 
        '/ping',
        '/v1/chat/completions',
        '/',
        '/nonexistent'
    ];
    
    for (const path of testPaths) {
        await testHttpWithDetails(path);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    }
    
    console.log('\n🎯 Test Summary:');
    console.log('If all endpoints return timeout or connection issues,');
    console.log('the problem is likely with Convex HTTP router configuration.');
    console.log('If some endpoints work, the issue is with specific route definitions.');
}

comprehensiveHttpTest().catch(console.error);