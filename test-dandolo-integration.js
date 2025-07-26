#!/usr/bin/env node
/**
 * Dandolo API Integration Test Suite (Node.js)
 * Complete testing script for JavaScript/Node.js agents integrating with Dandolo
 * 
 * Usage:
 *   node test-dandolo-integration.js
 *   node test-dandolo-integration.js --api-key dk_your_key --advanced
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

class DandoloTester {
    constructor(apiKey, baseUrl = 'https://judicious-hornet-148.convex.cloud') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    printStatus(message, status = 'info') {
        const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
        console.log(`${icons[status] || 'ℹ️'} ${message}`);
    }

    async makeRequest(path, method = 'GET', body = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const isHttps = url.protocol === 'https:';
            const requestModule = isHttps ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: method,
                headers: this.headers,
                timeout: 30000
            };

            const req = requestModule.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = data ? JSON.parse(data) : {};
                        resolve({ status: res.statusCode, data: parsed, raw: data });
                    } catch (e) {
                        resolve({ status: res.statusCode, data: {}, raw: data });
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    }

    async testConnection() {
        this.printStatus('Testing API connection...');

        try {
            const response = await this.makeRequest('/v1/chat/completions', 'POST', {
                model: 'auto-select',
                messages: [{ role: 'user', content: 'Say "Connection successful!"' }],
                max_tokens: 20
            });

            if (response.status === 200) {
                const content = response.data.choices[0].message.content;
                this.printStatus(`Connection test passed: ${content}`, 'success');
                return true;
            } else {
                this.printStatus(`Connection failed: ${response.status} - ${response.raw}`, 'error');
                return false;
            }
        } catch (error) {
            this.printStatus(`Connection error: ${error.message}`, 'error');
            return false;
        }
    }

    async checkBalance() {
        this.printStatus('Checking API balance...');

        try {
            const response = await this.makeRequest('/api/v1/balance');

            if (response.status === 200) {
                const balance = response.data.balance;
                const usagePct = (balance.used / balance.limit) * 100;

                this.printStatus(
                    `Usage: ${balance.used}/${balance.limit} (${usagePct.toFixed(1)}%) - ${balance.remaining} remaining`,
                    usagePct < 80 ? 'success' : 'warning'
                );
                return balance;
            } else {
                this.printStatus(`Balance check failed: ${response.status}`, 'warning');
                return null;
            }
        } catch (error) {
            this.printStatus(`Balance check error: ${error.message}`, 'warning');
            return null;
        }
    }

    async listModels() {
        this.printStatus('Fetching available models...');

        try {
            const response = await this.makeRequest('/v1/models');

            if (response.status === 200) {
                const models = response.data.data || [];
                const modelNames = models.map(m => m.id);
                const displayNames = modelNames.slice(0, 5).join(', ') + (modelNames.length > 5 ? '...' : '');
                
                this.printStatus(`Found ${modelNames.length} models: ${displayNames}`, 'success');
                return modelNames;
            } else {
                this.printStatus(`Models fetch failed: ${response.status}`, 'warning');
                return [];
            }
        } catch (error) {
            this.printStatus(`Models fetch error: ${error.message}`, 'warning');
            return [];
        }
    }

    async testChatCompletion(model = 'auto-select') {
        this.printStatus(`Testing chat completion with ${model}...`);

        const testMessages = [
            { role: 'system', content: 'You are a helpful assistant. Be concise.' },
            { role: 'user', content: 'What is 2+2? Answer in one sentence.' }
        ];

        try {
            const startTime = Date.now();
            const response = await this.makeRequest('/v1/chat/completions', 'POST', {
                model: model,
                messages: testMessages,
                max_tokens: 50,
                temperature: 0.7
            });
            const endTime = Date.now();

            if (response.status === 200) {
                const content = response.data.choices[0].message.content;
                const tokens = response.data.usage?.total_tokens || 'unknown';
                const responseTime = ((endTime - startTime) / 1000).toFixed(2);

                const displayContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
                this.printStatus(
                    `Chat test passed (${responseTime}s, ${tokens} tokens): ${displayContent}`,
                    'success'
                );
                return true;
            } else {
                this.printStatus(`Chat test failed: ${response.status} - ${response.raw}`, 'error');
                return false;
            }
        } catch (error) {
            this.printStatus(`Chat test error: ${error.message}`, 'error');
            return false;
        }
    }

    async testImageGeneration() {
        this.printStatus('Testing image generation...');

        try {
            const response = await this.makeRequest('/v1/images/generations', 'POST', {
                model: 'flux-schnell',
                prompt: 'A simple test image of a red apple',
                width: 512,
                height: 512,
                steps: 4
            });

            if (response.status === 200) {
                if (response.data.data && response.data.data.length > 0) {
                    this.printStatus('Image generation test passed', 'success');
                    return true;
                } else {
                    this.printStatus('Image generation returned no data', 'warning');
                    return false;
                }
            } else {
                this.printStatus(`Image generation failed: ${response.status}`, 'warning');
                return false;
            }
        } catch (error) {
            this.printStatus(`Image generation error: ${error.message}`, 'warning');
            return false;
        }
    }

    async testEmbeddings() {
        this.printStatus('Testing embeddings...');

        try {
            const response = await this.makeRequest('/v1/embeddings', 'POST', {
                model: 'text-embedding-ada-002',
                input: 'This is a test sentence for embeddings.'
            });

            if (response.status === 200) {
                if (response.data.data && response.data.data.length > 0) {
                    const embeddingLength = response.data.data[0].embedding.length;
                    this.printStatus(`Embeddings test passed (vector length: ${embeddingLength})`, 'success');
                    return true;
                } else {
                    this.printStatus('Embeddings returned no data', 'warning');
                    return false;
                }
            } else {
                this.printStatus(`Embeddings failed: ${response.status}`, 'warning');
                return false;
            }
        } catch (error) {
            this.printStatus(`Embeddings error: ${error.message}`, 'warning');
            return false;
        }
    }

    async performanceTest(numRequests = 5) {
        this.printStatus(`Running performance test (${numRequests} requests)...`);

        const times = [];
        let successful = 0;

        for (let i = 0; i < numRequests; i++) {
            try {
                const start = Date.now();
                const response = await this.makeRequest('/v1/chat/completions', 'POST', {
                    model: 'auto-select',
                    messages: [{ role: 'user', content: `Count from 1 to ${i + 1}` }],
                    max_tokens: 30
                });
                const end = Date.now();

                if (response.status === 200) {
                    const time = (end - start) / 1000;
                    times.push(time);
                    successful++;
                    console.log(`  Request ${i + 1}: ${time.toFixed(2)}s ✅`);
                } else {
                    console.log(`  Request ${i + 1}: FAILED (${response.status}) ❌`);
                }
            } catch (error) {
                console.log(`  Request ${i + 1}: ERROR (${error.message}) ❌`);
            }
        }

        if (times.length > 0) {
            const stats = {
                average: times.reduce((a, b) => a + b, 0) / times.length,
                median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
                min: Math.min(...times),
                max: Math.max(...times),
                successRate: successful / numRequests
            };

            this.printStatus('Performance Results:', 'info');
            console.log(`   Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
            console.log(`   Average: ${stats.average.toFixed(2)}s`);
            console.log(`   Median: ${stats.median.toFixed(2)}s`);
            console.log(`   Range: ${stats.min.toFixed(2)}s - ${stats.max.toFixed(2)}s`);

            return stats;
        } else {
            this.printStatus('No successful requests in performance test', 'error');
            return null;
        }
    }

    async testErrorHandling() {
        this.printStatus('Testing error handling...');

        try {
            const response = await this.makeRequest('/v1/chat/completions', 'POST', {
                model: 'invalid-model-name',
                messages: [{ role: 'user', content: 'test' }]
            });

            if (response.status !== 200) {
                const errorMsg = response.data.error || 'No error message';
                this.printStatus(`Error handling test passed: ${response.status} - ${errorMsg}`, 'success');
                return true;
            } else {
                this.printStatus('Error handling test failed: should have returned error for invalid model', 'warning');
                return false;
            }
        } catch (error) {
            this.printStatus(`Error handling test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async runComprehensiveTest(includeAdvanced = false) {
        this.printStatus('🚀 Starting Dandolo API Integration Test Suite', 'info');
        console.log('='.repeat(60));

        const results = {};

        // Basic tests
        results.connection = await this.testConnection();
        results.balance = !!(await this.checkBalance());
        results.models = !!(await this.listModels()).length;
        results.chat = await this.testChatCompletion();
        results.errorHandling = await this.testErrorHandling();

        // Advanced tests
        if (includeAdvanced) {
            console.log('\n' + '='.repeat(60));
            this.printStatus('Running advanced tests...', 'info');
            results.imageGeneration = await this.testImageGeneration();
            results.embeddings = await this.testEmbeddings();
            results.performance = !!(await this.performanceTest());
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        this.printStatus('Test Summary:', 'info');

        const passed = Object.values(results).filter(Boolean).length;
        const total = Object.keys(results).length;

        for (const [testName, testPassed] of Object.entries(results)) {
            const status = testPassed ? 'success' : 'error';
            const displayName = testName.replace(/([A-Z])/g, ' $1').toLowerCase();
            this.printStatus(`${displayName}: ${testPassed ? 'PASS' : 'FAIL'}`, status);
        }

        console.log(`\n🎯 Overall: ${passed}/${total} tests passed (${(passed / total * 100).toFixed(1)}%)`);

        if (passed === total) {
            this.printStatus('🎉 All tests passed! Your integration is ready.', 'success');
        } else if (passed >= total * 0.8) {
            this.printStatus('⚠️  Most tests passed. Check failed tests above.', 'warning');
        } else {
            this.printStatus('❌ Multiple tests failed. Check your API key and connection.', 'error');
        }

        return results;
    }
}

function validateApiKey(apiKey) {
    if (!apiKey) return false;

    const validPrefixes = ['dk_', 'ak_'];
    const hasValidPrefix = validPrefixes.some(prefix => apiKey.startsWith(prefix));
    const minLength = 20;

    return hasValidPrefix && apiKey.length >= minLength;
}

async function main() {
    const args = process.argv.slice(2);
    let apiKey = null;
    let includeAdvanced = false;
    let baseUrl = 'https://judicious-hornet-148.convex.cloud';

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--api-key' || args[i] === '-k') {
            apiKey = args[i + 1];
            i++;
        } else if (args[i] === '--advanced' || args[i] === '-a') {
            includeAdvanced = true;
        } else if (args[i] === '--base-url' || args[i] === '-u') {
            baseUrl = args[i + 1];
            i++;
        }
    }

    // Get API key from user if not provided
    if (!apiKey) {
        const { createInterface } = await import('readline');
        const readline = createInterface({
            input: process.stdin,
            output: process.stdout
        });

        apiKey = await new Promise(resolve => {
            readline.question('Enter your Dandolo API key (dk_ or ak_): ', answer => {
                readline.close();
                resolve(answer.trim());
            });
        });
    }

    // Validate API key
    if (!validateApiKey(apiKey)) {
        console.log('❌ Invalid API key format. Expected format: dk_xxx or ak_xxx (minimum 20 characters)');
        process.exit(1);
    }

    // Run tests
    const tester = new DandoloTester(apiKey, baseUrl);
    const results = await tester.runComprehensiveTest(includeAdvanced);

    // Exit with appropriate code
    if (Object.values(results).every(Boolean)) {
        console.log('\n✅ Ready for production integration!');
        process.exit(0);
    } else {
        console.log('\n❌ Integration issues detected. Check the failed tests above.');
        process.exit(1);
    }
}

// Check if this is the main module (ES module equivalent)
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}

export { DandoloTester };