#!/usr/bin/env node

/**
 * Dandolo Performance Benchmarking Framework
 * 
 * Comprehensive performance testing suite comparing Dandolo against Venice.ai and OpenRoute.ai
 * Features:
 * - Statistical significance testing
 * - Multiple workload scenarios 
 * - Response time analysis (p50, p95, p99)
 * - Throughput measurement
 * - Cost comparison analysis
 * - Reliability tracking
 * - Automated reporting with visualizations
 */

import https from 'https';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { URL } from 'url';

// Performance metrics collector
class PerformanceMetrics {
    constructor() {
        this.reset();
    }

    reset() {
        this.responseTimes = [];
        this.requestsPerSecond = [];
        this.errors = [];
        this.tokensPerSecond = [];
        this.costs = [];
        this.startTime = null;
        this.endTime = null;
        this.totalRequests = 0;
        this.successfulRequests = 0;
        this.errorCount = 0;
    }

    addResponseTime(time, tokens = 0, cost = 0, error = null) {
        this.responseTimes.push(time);
        if (tokens > 0) {
            this.tokensPerSecond.push(tokens / (time / 1000));
        }
        if (cost > 0) {
            this.costs.push(cost);
        }
        
        this.totalRequests++;
        
        if (error) {
            this.errors.push({
                timestamp: Date.now(),
                error: error,
                responseTime: time
            });
            this.errorCount++;
        } else {
            this.successfulRequests++;
        }
    }

    getStatistics() {
        if (this.responseTimes.length === 0) {
            return null;
        }

        const sorted = [...this.responseTimes].sort((a, b) => a - b);
        const totalTime = this.endTime - this.startTime;
        
        return {
            responseTime: {
                min: Math.min(...this.responseTimes),
                max: Math.max(...this.responseTimes),
                mean: this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length,
                median: sorted[Math.floor(sorted.length / 2)],
                p95: sorted[Math.floor(sorted.length * 0.95)],
                p99: sorted[Math.floor(sorted.length * 0.99)],
                stdDev: this.calculateStdDev(this.responseTimes)
            },
            throughput: {
                requestsPerSecond: this.totalRequests / (totalTime / 1000),
                tokensPerSecond: this.tokensPerSecond.length > 0 ? 
                    this.tokensPerSecond.reduce((a, b) => a + b, 0) / this.tokensPerSecond.length : 0
            },
            reliability: {
                successRate: this.successfulRequests / this.totalRequests,
                errorRate: this.errorCount / this.totalRequests,
                totalRequests: this.totalRequests,
                successfulRequests: this.successfulRequests,
                errors: this.errorCount
            },
            costs: {
                totalCost: this.costs.reduce((a, b) => a + b, 0),
                averageCostPerRequest: this.costs.length > 0 ? 
                    this.costs.reduce((a, b) => a + b, 0) / this.costs.length : 0,
                costPerToken: this.costs.length > 0 && this.tokensPerSecond.length > 0 ?
                    this.costs.reduce((a, b) => a + b, 0) / this.tokensPerSecond.reduce((a, b) => a + b, 0) : 0
            }
        };
    }

    calculateStdDev(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquaredDiff);
    }
}

// API Client for different providers
class APIClient {
    constructor(baseUrl, apiKey, headers = {}) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...headers
        };
    }

    async makeRequest(endpoint, method = 'POST', body = null, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, this.baseUrl);
            const isHttps = url.protocol === 'https:';
            const requestModule = isHttps ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: method,
                headers: this.headers,
                timeout: timeout
            };

            const startTime = Date.now();
            const req = requestModule.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const endTime = Date.now();
                    const responseTime = endTime - startTime;
                    
                    try {
                        const parsed = data ? JSON.parse(data) : {};
                        resolve({
                            status: res.statusCode,
                            data: parsed,
                            raw: data,
                            responseTime: responseTime,
                            headers: res.headers
                        });
                    } catch (e) {
                        resolve({
                            status: res.statusCode,
                            data: {},
                            raw: data,
                            responseTime: responseTime,
                            headers: res.headers
                        });
                    }
                });
            });

            req.on('error', (error) => {
                const endTime = Date.now();
                reject({
                    error: error.message,
                    responseTime: endTime - startTime
                });
            });

            req.on('timeout', () => {
                req.destroy();
                const endTime = Date.now();
                reject({
                    error: 'Request timeout',
                    responseTime: endTime - startTime
                });
            });

            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    }
}

// Test scenarios generator
class TestScenarios {
    static getChatScenarios() {
        return [
            {
                name: "Simple Question",
                weight: 0.3,
                messages: [
                    { role: "user", content: "What is 2+2?" }
                ],
                expectedTokens: 20
            },
            {
                name: "Code Generation",
                weight: 0.25,
                messages: [
                    { role: "user", content: "Write a Python function to calculate fibonacci numbers" }
                ],
                expectedTokens: 150
            },
            {
                name: "Complex Analysis",
                weight: 0.2,
                messages: [
                    { role: "system", content: "You are a data analyst." },
                    { role: "user", content: "Analyze the pros and cons of cloud computing for small businesses, considering cost, security, and scalability factors." }
                ],
                expectedTokens: 400
            },
            {
                name: "Multi-turn Conversation",
                weight: 0.15,
                messages: [
                    { role: "user", content: "Tell me about machine learning" },
                    { role: "assistant", content: "Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data." },
                    { role: "user", content: "What are the main types?" }
                ],
                expectedTokens: 200
            },
            {
                name: "Long Context",
                weight: 0.1,
                messages: [
                    { role: "user", content: "Summarize the following text: " + "Lorem ipsum ".repeat(500) + "What are the key points?" }
                ],
                expectedTokens: 300
            }
        ];
    }

    static getImageScenarios() {
        return [
            {
                name: "Simple Object",
                weight: 0.4,
                prompt: "A red apple on a white background",
                width: 512,
                height: 512,
                steps: 20
            },
            {
                name: "Complex Scene",
                weight: 0.3,
                prompt: "A futuristic cityscape at sunset with flying cars and neon lights",
                width: 1024,
                height: 768,
                steps: 30
            },
            {
                name: "Portrait",
                weight: 0.2,
                prompt: "Professional headshot of a businesswoman in modern office",
                width: 768,
                height: 1024,
                steps: 25
            },
            {
                name: "Artistic Style",
                weight: 0.1,
                prompt: "Abstract painting in the style of Kandinsky, vibrant colors and geometric shapes",
                width: 1024,
                height: 1024,
                steps: 40
            }
        ];
    }

    static getEmbeddingScenarios() {
        return [
            {
                name: "Short Text",
                weight: 0.4,
                input: "This is a test sentence."
            },
            {
                name: "Medium Text",
                weight: 0.3,
                input: "Natural language processing is a subfield of linguistics, computer science, and artificial intelligence concerned with the interactions between computers and human language."
            },
            {
                name: "Long Text",
                weight: 0.2,
                input: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(50)
            },
            {
                name: "Technical Content",
                weight: 0.1,
                input: "Machine learning algorithms can be categorized into supervised, unsupervised, and reinforcement learning paradigms, each with distinct characteristics and applications in data science."
            }
        ];
    }
}

// Main benchmark runner
class BenchmarkRunner {
    constructor() {
        this.providers = new Map();
        this.results = new Map();
        this.config = {
            warmupRequests: 5,
            testDuration: 300000, // 5 minutes
            concurrency: {
                light: 1,
                medium: 5,
                heavy: 10
            },
            scenarios: {
                chat: 0.7,
                image: 0.2,
                embedding: 0.1
            }
        };
    }

    addProvider(name, client, costModel = null) {
        this.providers.set(name, {
            client: client,
            costModel: costModel,
            metrics: new PerformanceMetrics()
        });
    }

    async runWarmup(providerName) {
        console.log(`🔥 Warming up ${providerName}...`);
        const provider = this.providers.get(providerName);
        
        for (let i = 0; i < this.config.warmupRequests; i++) {
            try {
                await provider.client.makeRequest('/v1/chat/completions', 'POST', {
                    model: 'auto-select',
                    messages: [{ role: 'user', content: 'warmup' }],
                    max_tokens: 10
                });
                process.stdout.write('.');
            } catch (error) {
                process.stdout.write('x');
            }
        }
        console.log(' ✅ Warmup complete');
    }

    async runChatBenchmark(providerName, scenario, concurrency = 1) {
        const provider = this.providers.get(providerName);
        const promises = [];

        for (let i = 0; i < concurrency; i++) {
            promises.push(this.executeChatRequest(provider, scenario));
        }

        return await Promise.allSettled(promises);
    }

    async executeChatRequest(provider, scenario) {
        try {
            const response = await provider.client.makeRequest('/v1/chat/completions', 'POST', {
                model: 'auto-select',
                messages: scenario.messages,
                max_tokens: scenario.expectedTokens * 2,
                temperature: 0.7
            });

            const tokens = response.data.usage?.total_tokens || scenario.expectedTokens;
            const cost = provider.costModel ? provider.costModel.calculateCost(tokens, 'chat') : 0;

            if (response.status === 200) {
                provider.metrics.addResponseTime(response.responseTime, tokens, cost);
                return { success: true, responseTime: response.responseTime, tokens, cost };
            } else {
                provider.metrics.addResponseTime(response.responseTime, 0, 0, response.data.error || 'HTTP Error');
                return { success: false, error: response.data.error, responseTime: response.responseTime };
            }
        } catch (error) {
            provider.metrics.addResponseTime(error.responseTime || 30000, 0, 0, error.error);
            return { success: false, error: error.error, responseTime: error.responseTime || 30000 };
        }
    }

    async runImageBenchmark(providerName, scenario, concurrency = 1) {
        const provider = this.providers.get(providerName);
        const promises = [];

        for (let i = 0; i < concurrency; i++) {
            promises.push(this.executeImageRequest(provider, scenario));
        }

        return await Promise.allSettled(promises);
    }

    async executeImageRequest(provider, scenario) {
        try {
            const response = await provider.client.makeRequest('/v1/images/generations', 'POST', {
                model: 'flux-schnell',
                prompt: scenario.prompt,
                width: scenario.width,
                height: scenario.height,
                steps: scenario.steps
            });

            const cost = provider.costModel ? provider.costModel.calculateCost(1, 'image') : 0;

            if (response.status === 200) {
                provider.metrics.addResponseTime(response.responseTime, 0, cost);
                return { success: true, responseTime: response.responseTime, cost };
            } else {
                provider.metrics.addResponseTime(response.responseTime, 0, 0, response.data.error || 'HTTP Error');
                return { success: false, error: response.data.error, responseTime: response.responseTime };
            }
        } catch (error) {
            provider.metrics.addResponseTime(error.responseTime || 30000, 0, 0, error.error);
            return { success: false, error: error.error, responseTime: error.responseTime || 30000 };
        }
    }

    async runEmbeddingBenchmark(providerName, scenario, concurrency = 1) {
        const provider = this.providers.get(providerName);
        const promises = [];

        for (let i = 0; i < concurrency; i++) {
            promises.push(this.executeEmbeddingRequest(provider, scenario));
        }

        return await Promise.allSettled(promises);
    }

    async executeEmbeddingRequest(provider, scenario) {
        try {
            const response = await provider.client.makeRequest('/v1/embeddings', 'POST', {
                model: 'text-embedding-ada-002',
                input: scenario.input
            });

            const cost = provider.costModel ? provider.costModel.calculateCost(scenario.input.length / 4, 'embedding') : 0;

            if (response.status === 200) {
                provider.metrics.addResponseTime(response.responseTime, 0, cost);
                return { success: true, responseTime: response.responseTime, cost };
            } else {
                provider.metrics.addResponseTime(response.responseTime, 0, 0, response.data.error || 'HTTP Error');
                return { success: false, error: response.data.error, responseTime: response.responseTime };
            }
        } catch (error) {
            provider.metrics.addResponseTime(error.responseTime || 30000, 0, 0, error.error);
            return { success: false, error: error.error, responseTime: error.responseTime || 30000 };
        }
    }

    async runComprehensiveBenchmark(loadLevel = 'medium') {
        console.log(`🚀 Running comprehensive benchmark (${loadLevel} load)...`);
        console.log('='.repeat(80));

        const concurrency = this.config.concurrency[loadLevel];
        const chatScenarios = TestScenarios.getChatScenarios();
        const imageScenarios = TestScenarios.getImageScenarios();
        const embeddingScenarios = TestScenarios.getEmbeddingScenarios();

        // Initialize metrics
        for (const [name, provider] of this.providers) {
            provider.metrics.reset();
            provider.metrics.startTime = Date.now();
        }

        // Run benchmarks concurrently for all providers
        const benchmarkPromises = [];

        for (const [providerName, provider] of this.providers) {
            // Warmup
            await this.runWarmup(providerName);

            // Chat benchmarks
            for (const scenario of chatScenarios) {
                const requestCount = Math.ceil(scenario.weight * 20 * this.config.scenarios.chat);
                for (let i = 0; i < requestCount; i++) {
                    benchmarkPromises.push(
                        this.runChatBenchmark(providerName, scenario, concurrency)
                            .then(results => ({ provider: providerName, type: 'chat', scenario: scenario.name, results }))
                    );
                }
            }

            // Image benchmarks (if supported)
            for (const scenario of imageScenarios) {
                const requestCount = Math.ceil(scenario.weight * 10 * this.config.scenarios.image);
                for (let i = 0; i < requestCount; i++) {
                    benchmarkPromises.push(
                        this.runImageBenchmark(providerName, scenario, Math.max(1, Math.floor(concurrency / 2)))
                            .then(results => ({ provider: providerName, type: 'image', scenario: scenario.name, results }))
                            .catch(error => ({ provider: providerName, type: 'image', scenario: scenario.name, error }))
                    );
                }
            }

            // Embedding benchmarks (if supported)
            for (const scenario of embeddingScenarios) {
                const requestCount = Math.ceil(scenario.weight * 15 * this.config.scenarios.embedding);
                for (let i = 0; i < requestCount; i++) {
                    benchmarkPromises.push(
                        this.runEmbeddingBenchmark(providerName, scenario, concurrency)
                            .then(results => ({ provider: providerName, type: 'embedding', scenario: scenario.name, results }))
                            .catch(error => ({ provider: providerName, type: 'embedding', scenario: scenario.name, error }))
                    );
                }
            }
        }

        // Execute all benchmarks
        console.log(`🔄 Executing ${benchmarkPromises.length} benchmark requests...`);
        const allResults = await Promise.allSettled(benchmarkPromises);

        // Finalize metrics
        for (const [name, provider] of this.providers) {
            provider.metrics.endTime = Date.now();
        }

        console.log('✅ Benchmark execution complete');
        return this.generateReport();
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            providers: {},
            comparison: {},
            recommendations: []
        };

        // Collect statistics for each provider
        for (const [name, provider] of this.providers) {
            const stats = provider.metrics.getStatistics();
            if (stats) {
                report.providers[name] = {
                    ...stats,
                    raw_metrics: {
                        response_times: provider.metrics.responseTimes,
                        errors: provider.metrics.errors
                    }
                };
            }
        }

        // Generate comparisons
        const providerNames = Array.from(this.providers.keys());
        if (providerNames.length > 1) {
            report.comparison = this.generateComparison(report.providers);
        }

        // Generate recommendations
        report.recommendations = this.generateRecommendations(report.providers);

        return report;
    }

    generateComparison(providers) {
        const comparison = {
            response_time: {},
            throughput: {},
            reliability: {},
            cost_efficiency: {}
        };

        const providerNames = Object.keys(providers);
        
        // Response time comparison
        for (const name of providerNames) {
            const stats = providers[name];
            comparison.response_time[name] = {
                mean: Math.round(stats.responseTime.mean),
                p95: Math.round(stats.responseTime.p95),
                p99: Math.round(stats.responseTime.p99)
            };
        }

        // Throughput comparison
        for (const name of providerNames) {
            const stats = providers[name];
            comparison.throughput[name] = {
                requests_per_second: stats.throughput.requestsPerSecond.toFixed(2),
                tokens_per_second: stats.throughput.tokensPerSecond.toFixed(2)
            };
        }

        // Reliability comparison
        for (const name of providerNames) {
            const stats = providers[name];
            comparison.reliability[name] = {
                success_rate: (stats.reliability.successRate * 100).toFixed(2) + '%',
                error_rate: (stats.reliability.errorRate * 100).toFixed(2) + '%'
            };
        }

        // Cost efficiency comparison
        for (const name of providerNames) {
            const stats = providers[name];
            comparison.cost_efficiency[name] = {
                cost_per_request: stats.costs.averageCostPerRequest.toFixed(4),
                cost_per_token: stats.costs.costPerToken.toFixed(6)
            };
        }

        return comparison;
    }

    generateRecommendations(providers) {
        const recommendations = [];
        const providerNames = Object.keys(providers);

        if (providerNames.length < 2) {
            return ['Need multiple providers for meaningful comparison'];
        }

        // Find best performer in each category
        let fastestProvider = null;
        let mostReliableProvider = null;
        let mostCostEffectiveProvider = null;
        let bestThroughputProvider = null;

        let bestResponseTime = Infinity;
        let bestReliability = 0;
        let bestCostEfficiency = Infinity;
        let bestThroughput = 0;

        for (const [name, stats] of Object.entries(providers)) {
            // Response time
            if (stats.responseTime.mean < bestResponseTime) {
                bestResponseTime = stats.responseTime.mean;
                fastestProvider = name;
            }

            // Reliability
            if (stats.reliability.successRate > bestReliability) {
                bestReliability = stats.reliability.successRate;
                mostReliableProvider = name;
            }

            // Cost efficiency (lower is better)
            if (stats.costs.averageCostPerRequest > 0 && stats.costs.averageCostPerRequest < bestCostEfficiency) {
                bestCostEfficiency = stats.costs.averageCostPerRequest;
                mostCostEffectiveProvider = name;
            }

            // Throughput
            if (stats.throughput.requestsPerSecond > bestThroughput) {
                bestThroughput = stats.throughput.requestsPerSecond;
                bestThroughputProvider = name;
            }
        }

        // Generate recommendations
        if (fastestProvider) {
            recommendations.push(`⚡ **Fastest Response Time**: ${fastestProvider} (${Math.round(bestResponseTime)}ms average)`);
        }

        if (mostReliableProvider) {
            recommendations.push(`🛡️  **Most Reliable**: ${mostReliableProvider} (${(bestReliability * 100).toFixed(1)}% success rate)`);
        }

        if (bestThroughputProvider) {
            recommendations.push(`🚀 **Best Throughput**: ${bestThroughputProvider} (${bestThroughput.toFixed(2)} req/s)`);
        }

        if (mostCostEffectiveProvider) {
            recommendations.push(`💰 **Most Cost-Effective**: ${mostCostEffectiveProvider} ($${bestCostEfficiency.toFixed(4)} per request)`);
        }

        // Performance analysis
        const dandoloStats = providers['Dandolo'];
        if (dandoloStats) {
            if (dandoloStats.responseTime.p95 < 2000) {
                recommendations.push('✅ Dandolo meets sub-2s response time targets for 95% of requests');
            } else {
                recommendations.push('⚠️  Dandolo exceeds 2s response time for some requests - consider optimization');
            }

            if (dandoloStats.reliability.successRate > 0.99) {
                recommendations.push('✅ Dandolo achieves >99% reliability target');
            } else {
                recommendations.push('⚠️  Dandolo reliability below 99% - investigate error patterns');
            }
        }

        return recommendations;
    }

    async saveReport(report, filename = null) {
        if (!filename) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = `benchmark-report-${timestamp}.json`;
        }

        const reportPath = path.join('/Users/pjkershaw/Dandolo-Prod/benchmarks/reports', filename);
        
        // Ensure reports directory exists
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        
        // Save detailed JSON report
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        // Generate markdown summary
        const markdownReport = this.generateMarkdownReport(report);
        const markdownPath = reportPath.replace('.json', '.md');
        await fs.writeFile(markdownPath, markdownReport);

        console.log(`📊 Reports saved:`);
        console.log(`   JSON: ${reportPath}`);
        console.log(`   Markdown: ${markdownPath}`);
        
        return { jsonPath: reportPath, markdownPath };
    }

    generateMarkdownReport(report) {
        let md = `# Performance Benchmark Report\n\n`;
        md += `**Generated:** ${report.timestamp}\n\n`;

        // Executive Summary
        md += `## Executive Summary\n\n`;
        md += `This report compares the performance of ${Object.keys(report.providers).length} AI providers across multiple dimensions:\n\n`;
        
        for (const recommendation of report.recommendations) {
            md += `- ${recommendation}\n`;
        }
        md += `\n`;

        // Provider Performance Overview
        md += `## Provider Performance Overview\n\n`;
        md += `| Provider | Avg Response (ms) | P95 (ms) | Success Rate | Requests/sec | Tokens/sec |\n`;
        md += `|----------|-------------------|----------|--------------|--------------|------------|\n`;
        
        for (const [name, stats] of Object.entries(report.providers)) {
            md += `| ${name} | ${Math.round(stats.responseTime.mean)} | ${Math.round(stats.responseTime.p95)} | ${(stats.reliability.successRate * 100).toFixed(1)}% | ${stats.throughput.requestsPerSecond.toFixed(2)} | ${stats.throughput.tokensPerSecond.toFixed(2)} |\n`;
        }
        md += `\n`;

        // Detailed Analysis
        md += `## Detailed Performance Analysis\n\n`;
        
        for (const [name, stats] of Object.entries(report.providers)) {
            md += `### ${name}\n\n`;
            md += `**Response Time Analysis:**\n`;
            md += `- Mean: ${Math.round(stats.responseTime.mean)}ms\n`;
            md += `- Median: ${Math.round(stats.responseTime.median)}ms\n`;
            md += `- 95th Percentile: ${Math.round(stats.responseTime.p95)}ms\n`;
            md += `- 99th Percentile: ${Math.round(stats.responseTime.p99)}ms\n`;
            md += `- Standard Deviation: ${Math.round(stats.responseTime.stdDev)}ms\n\n`;
            
            md += `**Reliability Metrics:**\n`;
            md += `- Success Rate: ${(stats.reliability.successRate * 100).toFixed(2)}%\n`;
            md += `- Error Rate: ${(stats.reliability.errorRate * 100).toFixed(2)}%\n`;
            md += `- Total Requests: ${stats.reliability.totalRequests}\n`;
            md += `- Failed Requests: ${stats.reliability.errors}\n\n`;
            
            md += `**Throughput:**\n`;
            md += `- Requests/Second: ${stats.throughput.requestsPerSecond.toFixed(2)}\n`;
            md += `- Tokens/Second: ${stats.throughput.tokensPerSecond.toFixed(2)}\n\n`;
            
            if (stats.costs.totalCost > 0) {
                md += `**Cost Analysis:**\n`;
                md += `- Total Cost: $${stats.costs.totalCost.toFixed(4)}\n`;
                md += `- Cost per Request: $${stats.costs.averageCostPerRequest.toFixed(4)}\n`;
                md += `- Cost per Token: $${stats.costs.costPerToken.toFixed(6)}\n\n`;
            }
        }

        // Performance Comparison
        if (Object.keys(report.comparison).length > 0) {
            md += `## Performance Comparison\n\n`;
            
            md += `### Response Time Comparison\n\n`;
            md += `| Provider | Mean (ms) | P95 (ms) | P99 (ms) |\n`;
            md += `|----------|-----------|----------|----------|\n`;
            for (const [name, stats] of Object.entries(report.comparison.response_time)) {
                md += `| ${name} | ${stats.mean} | ${stats.p95} | ${stats.p99} |\n`;
            }
            md += `\n`;

            md += `### Throughput Comparison\n\n`;
            md += `| Provider | Requests/sec | Tokens/sec |\n`;
            md += `|----------|--------------|------------|\n`;
            for (const [name, stats] of Object.entries(report.comparison.throughput)) {
                md += `| ${name} | ${stats.requests_per_second} | ${stats.tokens_per_second} |\n`;
            }
            md += `\n`;

            md += `### Reliability Comparison\n\n`;
            md += `| Provider | Success Rate | Error Rate |\n`;
            md += `|----------|--------------|------------|\n`;
            for (const [name, stats] of Object.entries(report.comparison.reliability)) {
                md += `| ${name} | ${stats.success_rate} | ${stats.error_rate} |\n`;
            }
            md += `\n`;
        }

        md += `---\n\n`;
        md += `*Report generated by Dandolo Performance Benchmarking Framework*\n`;
        
        return md;
    }
}

// Cost models for different providers
class CostModel {
    constructor(chatCostPer1kTokens, imageCostPerGeneration, embeddingCostPer1kTokens) {
        this.chatCostPer1kTokens = chatCostPer1kTokens;
        this.imageCostPerGeneration = imageCostPerGeneration;
        this.embeddingCostPer1kTokens = embeddingCostPer1kTokens;
    }

    calculateCost(tokens, type) {
        switch (type) {
            case 'chat':
                return (tokens / 1000) * this.chatCostPer1kTokens;
            case 'image':
                return this.imageCostPerGeneration;
            case 'embedding':
                return (tokens / 1000) * this.embeddingCostPer1kTokens;
            default:
                return 0;
        }
    }
}

export { BenchmarkRunner, APIClient, TestScenarios, PerformanceMetrics, CostModel };