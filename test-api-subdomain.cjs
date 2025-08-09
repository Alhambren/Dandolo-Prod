#!/usr/bin/env node

/**
 * Comprehensive test script for the new api.dandolo.ai subdomain
 * Tests both new and legacy endpoints with fallback behavior
 */

const https = require('https');
const http = require('http');

// Test configuration
const TEST_CONFIG = {
  PRIMARY_API: 'https://api.dandolo.ai/v1/chat/completions',
  FALLBACK_API: 'https://dandolo-prod.vercel.app/api/v1/chat/completions',
  DNS_CHECK: 'api.dandolo.ai',
  TIMEOUT: 10000,
  TEST_API_KEY: process.env.TEST_API_KEY || 'dk_test_key_for_validation_only'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(testName) {
  log(`\n${colors.bold}${colors.blue}🧪 Testing: ${testName}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// DNS resolution test
function testDNSResolution() {
  return new Promise((resolve) => {
    logTest('DNS Resolution for api.dandolo.ai');
    
    const dns = require('dns');
    dns.resolve4(TEST_CONFIG.DNS_CHECK, (err, addresses) => {
      if (err) {
        logError(`DNS resolution failed: ${err.message}`);
        logWarning('You may need to configure DNS records first');
        resolve({ success: false, error: err.message });
      } else {
        logSuccess(`DNS resolved to: ${addresses.join(', ')}`);
        resolve({ success: true, addresses });
      }
    });
  });
}

// HTTP(S) request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Dandolo-Test/1.0.0',
        ...options.headers
      },
      timeout: TEST_CONFIG.TIMEOUT
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            rawData: data,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test endpoint connectivity
async function testEndpointConnectivity(endpoint, label) {
  logTest(`${label} Connectivity`);
  
  try {
    const response = await makeRequest(endpoint, {
      method: 'OPTIONS'
    });
    
    if (response.statusCode === 200) {
      logSuccess(`${label} is accessible (${response.statusCode})`);
      
      // Check CORS headers
      const corsHeaders = ['access-control-allow-origin', 'access-control-allow-methods'];
      corsHeaders.forEach(header => {
        if (response.headers[header]) {
          logInfo(`CORS ${header}: ${response.headers[header]}`);
        }
      });
      
      return { success: true, response };
    } else {
      logWarning(`${label} returned ${response.statusCode}`);
      return { success: false, statusCode: response.statusCode };
    }
  } catch (error) {
    logError(`${label} connection failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test API authentication
async function testAPIAuthentication(endpoint, label) {
  logTest(`${label} Authentication`);
  
  const testPayload = {
    messages: [{ role: 'user', content: 'Hello! This is a connection test.' }],
    model: 'auto-select',
    max_tokens: 10
  };

  // Test without API key (should fail)
  try {
    const response = await makeRequest(endpoint, {
      method: 'POST',
      body: testPayload
    });
    
    if (response.statusCode === 401) {
      logSuccess(`${label} properly rejects requests without API key`);
    } else {
      logWarning(`${label} unexpected response without API key: ${response.statusCode}`);
    }
  } catch (error) {
    logError(`${label} auth test failed: ${error.message}`);
  }

  // Test with invalid API key (should fail)
  try {
    const response = await makeRequest(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid_key_12345'
      },
      body: testPayload
    });
    
    if (response.statusCode === 401) {
      logSuccess(`${label} properly rejects invalid API keys`);
    } else {
      logWarning(`${label} unexpected response with invalid API key: ${response.statusCode}`);
    }
  } catch (error) {
    logError(`${label} invalid key test failed: ${error.message}`);
  }
}

// Test API functionality
async function testAPIFunctionality(endpoint, label) {
  logTest(`${label} Functionality`);
  
  if (!TEST_CONFIG.TEST_API_KEY || TEST_CONFIG.TEST_API_KEY === 'dk_test_key_for_validation_only') {
    logWarning(`${label} skipped - no valid test API key provided`);
    logInfo('Set TEST_API_KEY environment variable to test with a real key');
    return { success: false, reason: 'No test key' };
  }
  
  const testPayload = {
    messages: [{ role: 'user', content: 'Say "API test successful" if you can read this.' }],
    model: 'auto-select',
    max_tokens: 50
  };

  try {
    const startTime = Date.now();
    const response = await makeRequest(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.TEST_API_KEY}`
      },
      body: testPayload
    });
    const responseTime = Date.now() - startTime;
    
    if (response.statusCode === 200) {
      logSuccess(`${label} API call successful (${responseTime}ms)`);
      
      // Check response headers
      if (response.headers['x-dandolo-version']) {
        logInfo(`Dandolo Version: ${response.headers['x-dandolo-version']}`);
      }
      if (response.headers['x-dandolo-endpoint']) {
        logInfo(`Endpoint Used: ${response.headers['x-dandolo-endpoint']}`);
      }
      if (response.headers['x-response-time']) {
        logInfo(`Server Response Time: ${response.headers['x-response-time']}ms`);
      }
      
      return { success: true, response, responseTime };
    } else {
      logError(`${label} API call failed: ${response.statusCode}`);
      if (response.data && response.data.error) {
        logError(`Error: ${response.data.error.message || response.data.error}`);
      }
      return { success: false, statusCode: response.statusCode, error: response.data };
    }
  } catch (error) {
    logError(`${label} API test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test fallback behavior
async function testFallbackBehavior() {
  logTest('Fallback Behavior Simulation');
  
  // This test simulates what would happen if the primary endpoint fails
  logInfo('Testing fallback logic (simulated - primary endpoint failure)');
  
  // Test fallback endpoint directly
  const fallbackResult = await testEndpointConnectivity(TEST_CONFIG.FALLBACK_API, 'Fallback Endpoint');
  
  if (fallbackResult.success) {
    logSuccess('Fallback endpoint is available for failover');
  } else {
    logError('Fallback endpoint is not available - this could cause issues');
  }
  
  return fallbackResult;
}

// Test SSL certificate
async function testSSLCertificate() {
  logTest('SSL Certificate Validation');
  
  try {
    const urlObj = new URL(TEST_CONFIG.PRIMARY_API);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: '/',
      method: 'HEAD',
      timeout: 5000
    };
    
    const req = https.request(options, (res) => {
      const cert = res.socket.getPeerCertificate();
      if (cert && Object.keys(cert).length > 0) {
        logSuccess('SSL certificate is valid');
        logInfo(`Issuer: ${cert.issuer?.CN || 'Unknown'}`);
        logInfo(`Valid until: ${cert.valid_to || 'Unknown'}`);
        logInfo(`Subject: ${cert.subject?.CN || 'Unknown'}`);
      } else {
        logWarning('Could not retrieve certificate information');
      }
    });
    
    req.on('error', (error) => {
      if (error.code === 'CERT_HAS_EXPIRED') {
        logError('SSL certificate has expired');
      } else if (error.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
        logError('SSL certificate hostname mismatch');
      } else {
        logError(`SSL error: ${error.message}`);
      }
    });
    
    req.end();
    
  } catch (error) {
    logError(`SSL test failed: ${error.message}`);
  }
}

// Main test runner
async function runTests() {
  log(`${colors.bold}${colors.blue}🚀 Dandolo API Subdomain Test Suite${colors.reset}\n`);
  logInfo('Testing new api.dandolo.ai subdomain setup');
  logInfo(`Primary API: ${TEST_CONFIG.PRIMARY_API}`);
  logInfo(`Fallback API: ${TEST_CONFIG.FALLBACK_API}`);
  logInfo(`Timeout: ${TEST_CONFIG.TIMEOUT}ms`);
  
  const results = {
    dns: await testDNSResolution(),
    ssl: await testSSLCertificate(),
    primaryConnectivity: await testEndpointConnectivity(TEST_CONFIG.PRIMARY_API, 'Primary API'),
    fallbackConnectivity: await testEndpointConnectivity(TEST_CONFIG.FALLBACK_API, 'Fallback API'),
    primaryAuth: await testAPIAuthentication(TEST_CONFIG.PRIMARY_API, 'Primary API'),
    fallbackAuth: await testAPIAuthentication(TEST_CONFIG.FALLBACK_API, 'Fallback API'),
    primaryFunction: await testAPIFunctionality(TEST_CONFIG.PRIMARY_API, 'Primary API'),
    fallbackFunction: await testAPIFunctionality(TEST_CONFIG.FALLBACK_API, 'Fallback API'),
    fallbackBehavior: await testFallbackBehavior()
  };
  
  // Summary
  log(`\n${colors.bold}${colors.blue}📊 Test Results Summary${colors.reset}`);
  
  const allTests = Object.keys(results);
  const passedTests = allTests.filter(test => results[test].success);
  const failedTests = allTests.filter(test => !results[test].success);
  
  logInfo(`Total Tests: ${allTests.length}`);
  logSuccess(`Passed: ${passedTests.length}`);
  
  if (failedTests.length > 0) {
    logError(`Failed: ${failedTests.length}`);
    logWarning(`Failed tests: ${failedTests.join(', ')}`);
  } else {
    logSuccess('All tests passed! 🎉');
  }
  
  // Recommendations
  log(`\n${colors.bold}${colors.blue}💡 Recommendations${colors.reset}`);
  
  if (!results.dns.success) {
    logWarning('1. Configure DNS records for api.dandolo.ai pointing to your Vercel deployment');
    logWarning('   - Add CNAME record: api → dandolo-prod.vercel.app');
    logWarning('   - Or A record: api → 76.76.21.21 (Vercel IP)');
  }
  
  if (!results.primaryConnectivity.success) {
    logWarning('2. Add api.dandolo.ai as a custom domain in Vercel dashboard');
    logWarning('3. Wait for SSL certificate provisioning (can take up to 24 hours)');
  }
  
  if (results.primaryConnectivity.success && results.fallbackConnectivity.success) {
    logSuccess('✅ Both primary and fallback endpoints are working');
    logSuccess('✅ API subdomain setup is ready for production');
  }
  
  process.exit(failedTests.length > 0 ? 1 : 0);
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Dandolo API Subdomain Test Suite

Usage: node test-api-subdomain.js [options]

Options:
  --help, -h          Show this help message
  
Environment Variables:
  TEST_API_KEY        Valid Dandolo API key for functionality testing
  
Examples:
  # Basic connectivity test
  node test-api-subdomain.js
  
  # Test with API key for full functionality
  TEST_API_KEY=dk_your_key node test-api-subdomain.js
  `);
  process.exit(0);
}

// Run the tests
runTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  process.exit(1);
});