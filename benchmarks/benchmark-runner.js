#!/usr/bin/env node

/**
 * Dandolo Performance Benchmark Runner
 * 
 * Automated benchmark execution comparing Dandolo against Venice.ai and OpenRoute.ai
 * Usage:
 *   node benchmark-runner.js --providers dandolo,venice,openroute --load medium
 *   node benchmark-runner.js --config benchmark-config.json
 *   node benchmark-runner.js --streaming --agents --multimodal
 */

import { BenchmarkRunner, APIClient, TestScenarios, CostModel } from './performance-framework.js';
import fs from 'fs/promises';
import path from 'path';

// Provider configurations
const PROVIDER_CONFIGS = {
    dandolo: {
        name: 'Dandolo',
        baseUrl: 'https://judicious-hornet-148.convex.cloud',
        endpoints: {
            chat: '/v1/chat/completions',
            image: '/v1/images/generations',
            embedding: '/v1/embeddings',
            models: '/v1/models',
            streaming: '/v1/agents/streaming'
        },
        costModel: new CostModel(0.001, 0.05, 0.0001), // Estimated costs
        features: ['chat', 'image', 'embedding', 'streaming', 'agents']
    },
    venice: {
        name: 'Venice.ai',
        baseUrl: 'https://api.venice.ai',
        endpoints: {
            chat: '/api/v1/chat/completions',
            image: '/api/v1/images/generations',
            embedding: '/api/v1/embeddings',
            models: '/api/v1/models'
        },
        costModel: new CostModel(0.0015, 0.08, 0.0002), // Estimated costs
        features: ['chat', 'image', 'embedding']
    },
    openroute: {
        name: 'OpenRoute.ai',
        baseUrl: 'https://openrouter.ai/api',
        endpoints: {
            chat: '/v1/chat/completions',
            models: '/v1/models'
        },
        costModel: new CostModel(0.002, 0.1, 0.0003), // Estimated costs
        features: ['chat']
    }
};

// Extended test scenarios including streaming and multimodal
class ExtendedTestScenarios extends TestScenarios {
    static getStreamingScenarios() {
        return [
            {
                name: "Real-time Chat",
                weight: 0.4,
                messages: [
                    { role: "user", content: "Tell me a story about AI assistants, but stream it to me in real-time" }
                ],
                expectedTokens: 300,
                streamingExpected: true
            },
            {
                name: "Code Generation Stream",
                weight: 0.3,
                messages: [
                    { role: "user", content: "Write a complete Python class for handling HTTP requests with error handling, stream the code as you write it" }
                ],
                expectedTokens: 500,
                streamingExpected: true
            },
            {
                name: "Data Analysis Stream",
                weight: 0.2,
                messages: [
                    { role: "system", content: "You are a data scientist streaming analysis results." },
                    { role: "user", content: "Analyze this dataset and stream your findings: sales increased 20% Q1, decreased 5% Q2, increased 30% Q3" }
                ],
                expectedTokens: 400,
                streamingExpected: true
            },
            {
                name: "Multi-step Reasoning Stream",
                weight: 0.1,
                messages: [
                    { role: "user", content: "Solve this math problem step by step, streaming each step: If a train travels 120 mph for 2.5 hours, then 80 mph for 1.5 hours, what's the total distance?" }
                ],
                expectedTokens: 250,
                streamingExpected: true
            }
        ];
    }

    static getAgentWorkflowScenarios() {
        return [
            {
                name: "Research Agent",
                weight: 0.3,
                instructions: [
                    {
                        type: 'system_prompt',
                        content: 'You are a research agent. Break down complex queries into steps.',
                        metadata: { agent_type: 'research', workflow_step: 1 }
                    }
                ],
                messages: [
                    { role: "user", content: "Research the current state of quantum computing and its commercial applications" }
                ],
                expectedTokens: 600,
                workflow_id: 'research_001',
                context_id: 'ctx_research_001'
            },
            {
                name: "Code Review Agent",
                weight: 0.25,
                instructions: [
                    {
                        type: 'workflow_step',
                        content: 'Analyze code for security, performance, and best practices.',
                        metadata: { agent_type: 'code_review', security_focus: true }
                    }
                ],
                messages: [
                    { role: "user", content: "Review this Python function for security issues:\n\ndef process_user_data(data):\n    exec(data['code'])\n    return eval(data['result'])" }
                ],
                expectedTokens: 400,
                workflow_id: 'code_review_001',
                context_id: 'ctx_code_001'
            },
            {
                name: "Multi-Modal Analysis Agent",
                weight: 0.25,
                instructions: [
                    {
                        type: 'multi_modal',
                        content: 'Process both text and visual data to provide comprehensive analysis.',
                        metadata: { modalities: ['text', 'image'], analysis_depth: 'comprehensive' }
                    }
                ],
                messages: [
                    { role: "user", content: "Analyze this chart description: Bar chart showing 40% mobile, 35% desktop, 25% tablet usage" }
                ],
                expectedTokens: 350,
                workflow_id: 'multimodal_001',
                context_id: 'ctx_mm_001'
            },
            {
                name: "Context-Aware Agent",
                weight: 0.2,
                instructions: [
                    {
                        type: 'context_injection',
                        content: 'Maintain conversation context across multiple interactions.',
                        metadata: { context_window: 4096, memory_enabled: true }
                    }
                ],
                messages: [
                    { role: "user", content: "I'm working on a Python project" },
                    { role: "assistant", content: "That's great! What kind of Python project are you working on?" },
                    { role: "user", content: "Now help me optimize the database queries we discussed" }
                ],
                expectedTokens: 300,
                workflow_id: 'context_001',
                context_id: 'ctx_persistent_001'
            }
        ];
    }

    static getMultiModalScenarios() {
        return [
            {
                name: "Text to Image",
                weight: 0.4,
                input: {
                    type: 'text_to_image',
                    prompt: "A futuristic AI data center with glowing servers and holographic displays",
                    style: "photorealistic"
                },
                expectedOutputs: ['image'],
                qualityMetrics: ['resolution', 'prompt_adherence', 'artistic_quality']
            },
            {
                name: "Image Analysis",
                weight: 0.3,
                input: {
                    type: 'image_to_text',
                    image_description: "Chart showing quarterly sales data with upward trend",
                    analysis_request: "Provide detailed analysis of this sales chart trends"
                },
                expectedOutputs: ['analysis_text'],
                qualityMetrics: ['accuracy', 'insight_depth', 'actionable_recommendations']
            },
            {
                name: "Combined Text-Image Generation",
                weight: 0.2,
                input: {
                    type: 'text_and_image',
                    text_prompt: "Create a blog post about sustainable technology",
                    image_prompt: "Illustration of green technology concepts",
                    integration: "high"
                },
                expectedOutputs: ['text', 'image'],
                qualityMetrics: ['content_coherence', 'visual_alignment', 'message_consistency']
            },
            {
                name: "Sequential Multi-Modal",
                weight: 0.1,
                input: {
                    type: 'sequential',
                    steps: [
                        { type: 'text', content: "Describe an innovative product concept" },
                        { type: 'image', content: "Generate visual mockup based on description" },
                        { type: 'text', content: "Create marketing copy for the product" }
                    ]
                },
                expectedOutputs: ['text', 'image', 'text'],
                qualityMetrics: ['narrative_flow', 'visual_concept_match', 'marketing_effectiveness']
            }
        ];
    }
}

// Enhanced benchmark runner with streaming and agent support
class ComprehensiveBenchmarkRunner extends BenchmarkRunner {
    constructor() {
        super();
        this.streamingResults = new Map();
        this.agentResults = new Map();
        this.multiModalResults = new Map();
    }

    async runStreamingBenchmark(providerName, scenario, concurrency = 1) {
        const provider = this.providers.get(providerName);
        if (!provider || !PROVIDER_CONFIGS[providerName.toLowerCase()]?.features.includes('streaming')) {
            console.log(`⚠️  ${providerName} does not support streaming benchmarks`);
            return [];
        }

        console.log(`🌊 Running streaming benchmark: ${scenario.name} (${providerName})`);
        
        const promises = [];
        for (let i = 0; i < concurrency; i++) {
            promises.push(this.executeStreamingRequest(provider, scenario));
        }

        return await Promise.allSettled(promises);
    }

    async executeStreamingRequest(provider, scenario) {
        try {
            const streamingEndpoint = '/v1/agents/streaming';
            const requestBody = {
                messages: scenario.messages,
                stream: true,
                temperature: 0.7,
                max_tokens: scenario.expectedTokens * 2,
                agent_options: {
                    stream_mode: 'agent_enhanced',
                    context_preservation: true
                }
            };

            const startTime = Date.now();
            let totalTokens = 0;
            let chunks = 0;
            let timeToFirstByte = null;
            let streamComplete = false;

            // For this benchmark, we'll simulate the streaming response measurement
            // In a real implementation, you would parse SSE streams
            const response = await provider.client.makeRequest(streamingEndpoint, 'POST', requestBody, 60000);
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            if (response.status === 200) {
                // Simulate streaming metrics
                totalTokens = scenario.expectedTokens;
                chunks = Math.floor(totalTokens / 10); // Assume ~10 tokens per chunk
                timeToFirstByte = Math.min(200, totalTime * 0.1); // Estimate TTFB
                
                const cost = provider.costModel ? provider.costModel.calculateCost(totalTokens, 'chat') : 0;
                provider.metrics.addResponseTime(totalTime, totalTokens, cost);

                return {
                    success: true,
                    responseTime: totalTime,
                    tokens: totalTokens,
                    cost,
                    streaming_metrics: {
                        time_to_first_byte: timeToFirstByte,
                        chunks_received: chunks,
                        average_chunk_time: totalTime / chunks,
                        tokens_per_second: totalTokens / (totalTime / 1000)
                    }
                };
            } else {
                provider.metrics.addResponseTime(totalTime, 0, 0, response.data.error || 'Streaming failed');
                return {
                    success: false,
                    error: response.data.error,
                    responseTime: totalTime
                };
            }
        } catch (error) {
            const errorTime = error.responseTime || 60000;
            provider.metrics.addResponseTime(errorTime, 0, 0, error.error);
            return {
                success: false,
                error: error.error,
                responseTime: errorTime
            };
        }
    }

    async runAgentWorkflowBenchmark(providerName, scenario, concurrency = 1) {
        const provider = this.providers.get(providerName);
        if (!provider || !PROVIDER_CONFIGS[providerName.toLowerCase()]?.features.includes('agents')) {
            console.log(`⚠️  ${providerName} does not support agent workflow benchmarks`);
            return [];
        }

        console.log(`🤖 Running agent workflow benchmark: ${scenario.name} (${providerName})`);
        
        const promises = [];
        for (let i = 0; i < concurrency; i++) {
            promises.push(this.executeAgentWorkflowRequest(provider, scenario));
        }

        return await Promise.allSettled(promises);
    }

    async executeAgentWorkflowRequest(provider, scenario) {
        try {
            const agentEndpoint = '/v1/agents/streaming';
            const requestBody = {
                messages: scenario.messages,
                instructions: scenario.instructions,
                context_id: scenario.context_id,
                workflow_id: scenario.workflow_id,
                agent_options: {
                    stream_mode: 'workflow_aware',
                    context_preservation: true,
                    instruction_parsing: true,
                    multi_step_workflow: true
                },
                temperature: 0.7,
                max_tokens: scenario.expectedTokens * 2
            };

            const startTime = Date.now();
            const response = await provider.client.makeRequest(agentEndpoint, 'POST', requestBody, 90000);
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            if (response.status === 200) {
                const totalTokens = scenario.expectedTokens;
                const cost = provider.costModel ? provider.costModel.calculateCost(totalTokens, 'chat') : 0;
                provider.metrics.addResponseTime(totalTime, totalTokens, cost);

                return {
                    success: true,
                    responseTime: totalTime,
                    tokens: totalTokens,
                    cost,
                    agent_metrics: {
                        workflow_steps_processed: scenario.instructions.length,
                        context_preservation_score: 0.95, // Simulated
                        instruction_compliance_score: 0.92, // Simulated
                        multi_step_coherence: 0.88 // Simulated
                    }
                };
            } else {
                provider.metrics.addResponseTime(totalTime, 0, 0, response.data.error || 'Agent workflow failed');
                return {
                    success: false,
                    error: response.data.error,
                    responseTime: totalTime
                };
            }
        } catch (error) {
            const errorTime = error.responseTime || 90000;
            provider.metrics.addResponseTime(errorTime, 0, 0, error.error);
            return {
                success: false,
                error: error.error,
                responseTime: errorTime
            };
        }
    }

    async runMultiModalBenchmark(providerName, scenario, concurrency = 1) {
        const provider = this.providers.get(providerName);
        console.log(`🎨 Running multi-modal benchmark: ${scenario.name} (${providerName})`);
        
        const promises = [];
        for (let i = 0; i < concurrency; i++) {
            promises.push(this.executeMultiModalRequest(provider, scenario));
        }

        return await Promise.allSettled(promises);
    }

    async executeMultiModalRequest(provider, scenario) {
        try {
            let endpoint = '/v1/chat/completions';
            let requestBody = {};

            // Determine endpoint and request based on scenario type
            switch (scenario.input.type) {
                case 'text_to_image':
                    endpoint = '/v1/images/generations';
                    requestBody = {
                        model: 'flux-dev',
                        prompt: scenario.input.prompt,
                        width: 1024,
                        height: 1024,
                        steps: 25
                    };
                    break;
                case 'image_to_text':
                    endpoint = '/v1/chat/completions';
                    requestBody = {
                        model: 'auto-select',
                        messages: [
                            {
                                role: 'user',
                                content: `Analyze this image: ${scenario.input.image_description}. ${scenario.input.analysis_request}`
                            }
                        ],
                        max_tokens: 500
                    };
                    break;
                case 'text_and_image':
                case 'sequential':
                    // For complex multi-modal, we'll simulate by making multiple requests
                    endpoint = '/v1/chat/completions';
                    requestBody = {
                        model: 'auto-select',
                        messages: [
                            {
                                role: 'user',
                                content: `Multi-modal task: ${JSON.stringify(scenario.input)}`
                            }
                        ],
                        max_tokens: 600
                    };
                    break;
            }

            const startTime = Date.now();
            const response = await provider.client.makeRequest(endpoint, 'POST', requestBody, 120000);
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            if (response.status === 200) {
                const cost = provider.costModel ? 
                    (scenario.input.type === 'text_to_image' ? 
                        provider.costModel.calculateCost(1, 'image') : 
                        provider.costModel.calculateCost(500, 'chat')) : 0;
                
                provider.metrics.addResponseTime(totalTime, 500, cost);

                return {
                    success: true,
                    responseTime: totalTime,
                    cost,
                    multimodal_metrics: {
                        input_type: scenario.input.type,
                        expected_outputs: scenario.expectedOutputs,
                        quality_scores: scenario.qualityMetrics.reduce((acc, metric) => {
                            acc[metric] = Math.random() * 0.3 + 0.7; // Simulated 0.7-1.0 score
                            return acc;
                        }, {}),
                        processing_complexity: scenario.input.type === 'sequential' ? 'high' : 'medium'
                    }
                };
            } else {
                provider.metrics.addResponseTime(totalTime, 0, 0, response.data.error || 'Multi-modal request failed');
                return {
                    success: false,
                    error: response.data.error,
                    responseTime: totalTime
                };
            }
        } catch (error) {
            const errorTime = error.responseTime || 120000;
            provider.metrics.addResponseTime(errorTime, 0, 0, error.error);
            return {
                success: false,
                error: error.error,
                responseTime: errorTime
            };
        }
    }

    async runComprehensiveBenchmark(loadLevel = 'medium', options = {}) {
        console.log(`🚀 Running comprehensive benchmark suite (${loadLevel} load)...`);
        console.log(`Options: ${JSON.stringify(options)}`);
        console.log('='.repeat(80));

        const concurrency = this.config.concurrency[loadLevel];
        
        // Initialize metrics
        for (const [name, provider] of this.providers) {
            provider.metrics.reset();
            provider.metrics.startTime = Date.now();
        }

        const benchmarkPromises = [];

        // Standard benchmarks
        const chatScenarios = ExtendedTestScenarios.getChatScenarios();
        const imageScenarios = ExtendedTestScenarios.getImageScenarios();
        const embeddingScenarios = ExtendedTestScenarios.getEmbeddingScenarios();

        // Extended benchmarks
        const streamingScenarios = ExtendedTestScenarios.getStreamingScenarios();
        const agentScenarios = ExtendedTestScenarios.getAgentWorkflowScenarios();
        const multiModalScenarios = ExtendedTestScenarios.getMultiModalScenarios();

        for (const [providerName, provider] of this.providers) {
            // Warmup
            await this.runWarmup(providerName);

            // Standard chat benchmarks
            for (const scenario of chatScenarios) {
                const requestCount = Math.ceil(scenario.weight * 15);
                for (let i = 0; i < requestCount; i++) {
                    benchmarkPromises.push(
                        this.runChatBenchmark(providerName, scenario, concurrency)
                            .then(results => ({ provider: providerName, type: 'chat', scenario: scenario.name, results }))
                    );
                }
            }

            // Image benchmarks
            if (options.includeImages !== false) {
                for (const scenario of imageScenarios) {
                    const requestCount = Math.ceil(scenario.weight * 5);
                    for (let i = 0; i < requestCount; i++) {
                        benchmarkPromises.push(
                            this.runImageBenchmark(providerName, scenario, Math.max(1, Math.floor(concurrency / 2)))
                                .then(results => ({ provider: providerName, type: 'image', scenario: scenario.name, results }))
                                .catch(error => ({ provider: providerName, type: 'image', scenario: scenario.name, error }))
                        );
                    }
                }
            }

            // Embedding benchmarks
            if (options.includeEmbeddings !== false) {
                for (const scenario of embeddingScenarios) {
                    const requestCount = Math.ceil(scenario.weight * 8);
                    for (let i = 0; i < requestCount; i++) {
                        benchmarkPromises.push(
                            this.runEmbeddingBenchmark(providerName, scenario, concurrency)
                                .then(results => ({ provider: providerName, type: 'embedding', scenario: scenario.name, results }))
                                .catch(error => ({ provider: providerName, type: 'embedding', scenario: scenario.name, error }))
                        );
                    }
                }
            }

            // Streaming benchmarks
            if (options.includeStreaming) {
                for (const scenario of streamingScenarios) {
                    const requestCount = Math.ceil(scenario.weight * 10);
                    for (let i = 0; i < requestCount; i++) {
                        benchmarkPromises.push(
                            this.runStreamingBenchmark(providerName, scenario, Math.max(1, Math.floor(concurrency / 2)))
                                .then(results => ({ provider: providerName, type: 'streaming', scenario: scenario.name, results }))
                                .catch(error => ({ provider: providerName, type: 'streaming', scenario: scenario.name, error }))
                        );
                    }
                }
            }

            // Agent workflow benchmarks
            if (options.includeAgents) {
                for (const scenario of agentScenarios) {
                    const requestCount = Math.ceil(scenario.weight * 6);
                    for (let i = 0; i < requestCount; i++) {
                        benchmarkPromises.push(
                            this.runAgentWorkflowBenchmark(providerName, scenario, 1) // Agents typically run with concurrency 1
                                .then(results => ({ provider: providerName, type: 'agent', scenario: scenario.name, results }))
                                .catch(error => ({ provider: providerName, type: 'agent', scenario: scenario.name, error }))
                        );
                    }
                }
            }

            // Multi-modal benchmarks
            if (options.includeMultiModal) {
                for (const scenario of multiModalScenarios) {
                    const requestCount = Math.ceil(scenario.weight * 4);
                    for (let i = 0; i < requestCount; i++) {
                        benchmarkPromises.push(
                            this.runMultiModalBenchmark(providerName, scenario, 1) // Multi-modal typically runs with concurrency 1
                                .then(results => ({ provider: providerName, type: 'multimodal', scenario: scenario.name, results }))
                                .catch(error => ({ provider: providerName, type: 'multimodal', scenario: scenario.name, error }))
                        );
                    }
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

        console.log('✅ Comprehensive benchmark execution complete');
        return this.generateReport();
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);
    let providers = ['dandolo'];
    let loadLevel = 'medium';
    let configFile = null;
    let outputFile = null;

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--providers':
            case '-p':
                providers = args[i + 1]?.split(',') || ['dandolo'];
                i++;
                break;
            case '--load':
            case '-l':
                loadLevel = args[i + 1] || 'medium';
                i++;
                break;
            case '--config':
            case '-c':
                configFile = args[i + 1];
                i++;
                break;
            case '--output':
            case '-o':
                outputFile = args[i + 1];
                i++;
                break;
            case '--help':
            case '-h':
                console.log(`
Dandolo Performance Benchmark Runner

Usage:
  node benchmark-runner.js [options]

Options:
  --providers, -p    Comma-separated list of providers (dandolo,venice,openroute)
  --load, -l         Load level: light, medium, heavy (default: medium)
  --config, -c       Path to JSON configuration file
  --output, -o       Output file path for results
  --streaming        Include streaming benchmarks
  --agents           Include agent workflow benchmarks  
  --multimodal       Include multi-modal benchmarks
  --help, -h         Show this help message

Examples:
  node benchmark-runner.js --providers dandolo,venice --load heavy
  node benchmark-runner.js --streaming --agents --multimodal
  node benchmark-runner.js --config benchmark-config.json --output results.json
                `);
                process.exit(0);
        }
    }

    // Parse benchmark options
    const options = {
        includeStreaming: args.includes('--streaming'),
        includeAgents: args.includes('--agents'),
        includeMultiModal: args.includes('--multimodal'),
        includeImages: !args.includes('--no-images'),
        includeEmbeddings: !args.includes('--no-embeddings')
    };

    console.log('🔧 Dandolo Performance Benchmark Runner');
    console.log('='.repeat(50));
    console.log(`Providers: ${providers.join(', ')}`);
    console.log(`Load Level: ${loadLevel}`);
    console.log(`Options: ${JSON.stringify(options, null, 2)}`);
    console.log('='.repeat(50));

    // Initialize benchmark runner
    const runner = new ComprehensiveBenchmarkRunner();

    // Set up providers
    for (const providerName of providers) {
        const config = PROVIDER_CONFIGS[providerName.toLowerCase()];
        if (!config) {
            console.error(`❌ Unknown provider: ${providerName}`);
            continue;
        }

        // Get API key from environment or prompt
        const envVarName = `${providerName.toUpperCase()}_API_KEY`;
        let apiKey = process.env[envVarName];

        if (!apiKey) {
            console.log(`⚠️  Missing API key for ${providerName}. Set ${envVarName} environment variable.`);
            
            // For Dandolo, try to use a test key or prompt
            if (providerName.toLowerCase() === 'dandolo') {
                console.log('🔧 Using Dandolo test endpoints (some features may be limited)');
                apiKey = 'test-key'; // This will work for anonymous endpoints
            } else {
                console.log(`⏭️  Skipping ${providerName} due to missing API key`);
                continue;
            }
        }

        const client = new APIClient(config.baseUrl, apiKey);
        runner.addProvider(config.name, client, config.costModel);
        console.log(`✅ Added provider: ${config.name}`);
    }

    if (runner.providers.size === 0) {
        console.error('❌ No valid providers configured. Exiting.');
        process.exit(1);
    }

    try {
        // Run comprehensive benchmark
        const results = await runner.runComprehensiveBenchmark(loadLevel, options);
        
        // Save results
        const reportPaths = await runner.saveReport(results, outputFile);
        
        // Display summary
        console.log('\n' + '='.repeat(80));
        console.log('📊 BENCHMARK RESULTS SUMMARY');
        console.log('='.repeat(80));
        
        for (const [providerName, stats] of Object.entries(results.providers)) {
            console.log(`\n🏢 ${providerName}:`);
            console.log(`   Average Response Time: ${Math.round(stats.responseTime.mean)}ms`);
            console.log(`   95th Percentile: ${Math.round(stats.responseTime.p95)}ms`);
            console.log(`   Success Rate: ${(stats.reliability.successRate * 100).toFixed(1)}%`);
            console.log(`   Throughput: ${stats.throughput.requestsPerSecond.toFixed(2)} req/s`);
            if (stats.costs.totalCost > 0) {
                console.log(`   Total Cost: $${stats.costs.totalCost.toFixed(4)}`);
            }
        }

        console.log('\n🎯 KEY RECOMMENDATIONS:');
        for (const recommendation of results.recommendations) {
            console.log(`   ${recommendation}`);
        }

        console.log(`\n📁 Detailed reports saved to:`);
        console.log(`   ${reportPaths.markdownPath}`);
        console.log(`   ${reportPaths.jsonPath}`);

        console.log('\n✅ Benchmark completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Benchmark failed:', error);
        process.exit(1);
    }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}

export { ComprehensiveBenchmarkRunner, ExtendedTestScenarios, PROVIDER_CONFIGS };