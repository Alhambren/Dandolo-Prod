#!/usr/bin/env node

/**
 * Test script for Venice API endpoints
 */

import https from 'https';

const API_KEY = 'ak_a0d32b355660d880da02bcb80d6560320f1b47e84c1808ea';
const BASE_URL = 'judicious-hornet-148.convex.site';

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    
    const options = {
      hostname: BASE_URL,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
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
        try {
          const response = JSON.parse(data);
          resolve({ 
            success: res.statusCode === 200, 
            status: res.statusCode,
            responseTime, 
            data: response 
          });
        } catch (e) {
          resolve({ 
            success: res.statusCode === 200, 
            status: res.statusCode,
            responseTime, 
            raw: data 
          });
        }
      });
    });

    req.on('error', (err) => {
      const responseTime = Date.now() - startTime;
      reject({ error: err.message, responseTime });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testVeniceEndpoints() {
  console.log('🚀 Testing Venice API endpoints...\n');
  
  const tests = [
    {
      name: 'Characters List',
      path: '/v1/characters',
      method: 'GET'
    },
    {
      name: 'Models List', 
      path: '/v1/models',
      method: 'GET'
    },
    {
      name: 'Chat Completions (comparison)',
      path: '/v1/chat/completions',
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'llama-3.3-70b'
      }
    },
    {
      name: 'Embeddings',
      path: '/v1/embeddings',
      method: 'POST',
      body: {
        input: 'Hello world',
        model: 'text-embedding-3-small'
      }
    }
  ];

  for (const test of tests) {
    console.log(`📤 Testing ${test.name}...`);
    
    try {
      const result = await makeRequest(test.path, test.method, test.body);
      
      if (result.success) {
        console.log(`✅ ${test.name}: SUCCESS (${result.responseTime}ms)`);
        if (result.data) {
          console.log(`   Response keys: ${Object.keys(result.data).join(', ')}`);
        }
      } else {
        console.log(`❌ ${test.name}: FAILED (${result.status}) (${result.responseTime}ms)`);
        if (result.data) {
          console.log(`   Error: ${JSON.stringify(result.data).substring(0, 200)}`);
        }
      }
    } catch (error) {
      console.error(`❌ ${test.name}: ERROR - ${error.error}`);
    }
    
    console.log('');
  }
  
  console.log('🎉 Venice API endpoint testing completed!');
}

// Run the test
testVeniceEndpoints().catch(console.error);