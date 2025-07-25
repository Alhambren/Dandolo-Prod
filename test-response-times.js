#!/usr/bin/env node

/**
 * Simple test script to generate some inference requests 
 * and populate response time data in the system
 */

import https from 'https';

async function makeRequest(message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      message: message,
      sessionId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    const options = {
      hostname: 'judicious-hornet-148.convex.site',
      port: 443,
      path: '/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const startTime = Date.now();
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        console.log(`✅ Request completed in ${responseTime}ms - Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            resolve({ success: true, responseTime, data: response });
          } catch (e) {
            console.log(`📝 Response preview: ${data.substring(0, 100)}...`);
            resolve({ success: true, responseTime, raw: true });
          }
        } else {
          console.log(`❌ Error response: ${data.substring(0, 200)}`);
          resolve({ success: false, responseTime, error: data });
        }
      });
    });

    req.on('error', (err) => {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Request failed after ${responseTime}ms:`, err.message);
      reject({ error: err.message, responseTime });
    });

    req.write(postData);
    req.end();
  });
}

async function testResponseTimes() {
  console.log('🚀 Testing response times and generating inference data...\n');
  
  const testMessages = [
    "Hello, testing response times",
    "What is 2+2?",
    "Tell me a short joke",
  ];

  for (let i = 0; i < testMessages.length; i++) {
    console.log(`📤 Test ${i + 1}/${testMessages.length}: "${testMessages[i]}"`);
    
    try {
      const result = await makeRequest(testMessages[i]);
      
      if (result.success) {
        console.log(`✅ Success! Response time: ${result.responseTime}ms`);
      } else {
        console.log(`⚠️  Request completed but may have issues`);
      }
    } catch (error) {
      console.error(`❌ Request failed:`, error);
    }
    
    // Wait 2 seconds between requests
    if (i < testMessages.length - 1) {
      console.log('⏳ Waiting 2 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n🎉 Response time testing completed!');
  console.log('💡 Check the site now - response times should be populated.');
}

// Run the test
testResponseTimes().catch(console.error);