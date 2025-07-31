#!/usr/bin/env node

/**
 * Continuous Performance Benchmarking System
 * 
 * Automated benchmark runner for continuous performance validation and monitoring.
 * Features:
 * - Scheduled benchmark execution
 * - Performance regression detection
 * - Alert system for performance degradation
 * - Historical performance tracking
 * - CI/CD integration support
 */

import { CompetitiveAnalyzer, CompetitiveTestScenarios } from './competitive-analysis.js';
import { ComprehensiveBenchmarkRunner } from './benchmark-runner.js';
import { APIClient, CostModel } from './performance-framework.js';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

// Performance thresholds for alerting
const PERFORMANCE_THRESHOLDS = {
    response_time: {
        chat: {
            p50: 2000,  // 2s
            p95: 5000,  // 5s
            p99: 10000  // 10s
        },
        image: {
            p50: 15000, // 15s
            p95: 30000, // 30s
            p99: 60000  // 60s
        },
        embedding: {
            p50: 1000,  // 1s
            p95: 3000,  // 3s
            p99: 5000   // 5s
        }
    },
    throughput: {
        min_requests_per_second: 1.0,
        burst_requests_per_second: 10.0
    },
    reliability: {
        min_success_rate: 0.95,  // 95%
        max_error_rate: 0.05     // 5%
    },
    cost_efficiency: {
        max_cost_per_1k_tokens: 0.002,  // $0.002
        max_cost_per_image: 0.10         // $0.10
    }
};

// Benchmark scheduling configuration
const BENCHMARK_SCHEDULES = {
    lightweight: {
        interval: 15 * 60 * 1000,  // 15 minutes
        scenarios: ['quick_health_check'],
        providers: ['dandolo']
    },
    standard: {
        interval: 60 * 60 * 1000,  // 1 hour
        scenarios: ['chat', 'latency'],
        providers: ['dandolo', 'venice']
    },
    comprehensive: {
        interval: 6 * 60 * 60 * 1000,  // 6 hours
        scenarios: ['all'],
        providers: ['dandolo', 'venice', 'openroute']
    },
    competitive: {
        interval: 24 * 60 * 60 * 1000,  // 24 hours
        scenarios: ['competitive_analysis'],
        providers: ['dandolo', 'venice', 'openroute']
    }
};

class ContinuousBenchmarkRunner {
    constructor(config = {}) {
        this.config = {
            resultsDir: '/Users/pjkershaw/Dandolo-Prod/benchmarks/results',
            alertsDir: '/Users/pjkershaw/Dandolo-Prod/benchmarks/alerts',
            historicalDataFile: '/Users/pjkershaw/Dandolo-Prod/benchmarks/historical-performance.json',
            enableAlerts: config.enableAlerts !== false,
            alertChannels: config.alertChannels || ['console', 'file'],
            baselineUpdateInterval: config.baselineUpdateInterval || 7 * 24 * 60 * 60 * 1000, // 7 days
            ...config
        };
        
        this.historicalData = new Map();
        this.performanceBaselines = new Map();
        this.activeSchedules = new Map();
        this.alertThresholds = PERFORMANCE_THRESHOLDS;
        
        this.isRunning = false;
        this.currentBenchmarks = new Set();
    }

    async initialize() {
        console.log('🔧 Initializing Continuous Benchmark Runner');
        
        // Create necessary directories
        await fs.mkdir(this.config.resultsDir, { recursive: true });
        await fs.mkdir(this.config.alertsDir, { recursive: true });
        await fs.mkdir(path.dirname(this.config.historicalDataFile), { recursive: true });
        
        // Load historical data
        await this.loadHistoricalData();
        
        // Load performance baselines
        await this.loadPerformanceBaselines();
        
        console.log('✅ Continuous benchmark runner initialized');
    }

    async loadHistoricalData() {
        try {
            const data = await fs.readFile(this.config.historicalDataFile, 'utf8');
            const parsed = JSON.parse(data);
            
            for (const [key, value] of Object.entries(parsed)) {
                this.historicalData.set(key, value);
            }
            
            console.log(`📊 Loaded ${this.historicalData.size} historical performance records`);
        } catch (error) {
            console.log('📊 No historical data found, starting fresh');
            this.historicalData = new Map();
        }
    }

    async saveHistoricalData() {
        const dataObject = Object.fromEntries(this.historicalData);
        await fs.writeFile(
            this.config.historicalDataFile, 
            JSON.stringify(dataObject, null, 2)
        );
    }

    async loadPerformanceBaselines() {
        // Calculate baselines from historical data
        for (const [provider, data] of this.historicalData) {
            if (Array.isArray(data) && data.length > 0) {
                const baseline = this.calculateBaseline(data);
                this.performanceBaselines.set(provider, baseline);
            }
        }
        
        console.log(`📈 Loaded ${this.performanceBaselines.size} performance baselines`);
    }

    calculateBaseline(historicalResults) {
        if (historicalResults.length === 0) return null;
        
        // Take the last 30 days or 100 most recent results
        const recentResults = historicalResults
            .filter(r => Date.now() - new Date(r.timestamp).getTime() < 30 * 24 * 60 * 60 * 1000)
            .slice(-100);
        
        if (recentResults.length === 0) return null;

        const responseTimes = recentResults
            .filter(r => r.performance?.responseTime?.mean)
            .map(r => r.performance.responseTime.mean);
        
        const successRates = recentResults
            .filter(r => r.performance?.reliability?.successRate)
            .map(r => r.performance.reliability.successRate);
        
        const throughputs = recentResults
            .filter(r => r.performance?.throughput?.requestsPerSecond)
            .map(r => r.performance.throughput.requestsPerSecond);

        return {
            response_time: {
                mean: this.calculatePercentile(responseTimes, 0.5),
                p95: this.calculatePercentile(responseTimes, 0.95),
                trend: this.calculateTrend(responseTimes)
            },
            success_rate: {
                mean: responseTimes.length > 0 ? successRates.reduce((a, b) => a + b, 0) / successRates.length : 0,
                trend: this.calculateTrend(successRates)
            },
            throughput: {
                mean: throughputs.length > 0 ? throughputs.reduce((a, b) => a + b, 0) / throughputs.length : 0,
                trend: this.calculateTrend(throughputs)
            },
            last_updated: new Date().toISOString(),
            sample_size: recentResults.length
        };
    }

    calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.floor(sorted.length * percentile);
        return sorted[index] || 0;
    }

    calculateTrend(values) {
        if (values.length < 2) return 'stable';
        
        const recent = values.slice(-Math.min(10, Math.floor(values.length / 2)));
        const earlier = values.slice(0, Math.min(10, Math.floor(values.length / 2)));
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
        
        const change = (recentAvg - earlierAvg) / earlierAvg;
        
        if (change > 0.1) return 'degrading';
        if (change < -0.1) return 'improving';
        return 'stable';
    }

    async startContinuousMonitoring(scheduleType = 'standard') {
        if (this.isRunning) {
            console.log('⚠️  Continuous monitoring is already running');
            return;
        }

        console.log(`🔄 Starting continuous monitoring (${scheduleType} schedule)`);
        this.isRunning = true;

        const schedule = BENCHMARK_SCHEDULES[scheduleType];
        if (!schedule) {
            throw new Error(`Unknown schedule type: ${scheduleType}`);
        }

        // Run initial benchmark
        await this.runScheduledBenchmark(schedule);

        // Set up recurring benchmark
        const intervalId = setInterval(async () => {
            if (!this.isRunning) {
                clearInterval(intervalId);
                return;
            }
            
            try {
                await this.runScheduledBenchmark(schedule);
            } catch (error) {
                console.error('❌ Scheduled benchmark failed:', error);
                await this.sendAlert('benchmark_failure', {
                    error: error.message,
                    schedule: scheduleType,
                    timestamp: new Date().toISOString()
                });
            }
        }, schedule.interval);

        this.activeSchedules.set(scheduleType, intervalId);
        console.log(`✅ Continuous monitoring started with ${schedule.interval / 1000}s interval`);
    }

    async stopContinuousMonitoring() {
        console.log('🛑 Stopping continuous monitoring');
        this.isRunning = false;
        
        for (const [scheduleType, intervalId] of this.activeSchedules) {
            clearInterval(intervalId);
            console.log(`   Stopped ${scheduleType} schedule`);
        }
        
        this.activeSchedules.clear();
        console.log('✅ Continuous monitoring stopped');
    }

    async runScheduledBenchmark(schedule) {
        const benchmarkId = `scheduled-${Date.now()}`;
        this.currentBenchmarks.add(benchmarkId);

        try {
            console.log(`🚀 Running scheduled benchmark: ${JSON.stringify(schedule.scenarios)}`);

            let results;
            
            if (schedule.scenarios.includes('competitive_analysis')) {
                results = await this.runCompetitiveAnalysis(schedule.providers);
            } else if (schedule.scenarios.includes('all')) {
                results = await this.runComprehensiveBenchmark(schedule.providers);
            } else {
                results = await this.runTargetedBenchmark(schedule.scenarios, schedule.providers);
            }

            // Store results
            await this.storeResults(results, benchmarkId);

            // Check for performance regressions
            await this.checkPerformanceRegressions(results);

            // Update historical data
            await this.updateHistoricalData(results);

            console.log(`✅ Scheduled benchmark completed: ${benchmarkId}`);

        } finally {
            this.currentBenchmarks.delete(benchmarkId);
        }
    }

    async runCompetitiveAnalysis(providers) {
        const analyzer = new CompetitiveAnalyzer();
        
        // Set up providers
        for (const providerName of providers) {
            const apiKey = process.env[`${providerName.toUpperCase()}_API_KEY`] || 'test-key';
            const client = new APIClient(
                this.getProviderBaseUrl(providerName),
                apiKey
            );
            analyzer.addProvider(providerName, client, new CostModel(0.001, 0.05, 0.0001));
        }
        
        return await analyzer.runCompetitiveAnalysis();
    }

    async runComprehensiveBenchmark(providers) {
        const runner = new ComprehensiveBenchmarkRunner();
        
        // Set up providers
        for (const providerName of providers) {
            const apiKey = process.env[`${providerName.toUpperCase()}_API_KEY`] || 'test-key';
            const client = new APIClient(
                this.getProviderBaseUrl(providerName),
                apiKey
            );
            runner.addProvider(providerName, client, new CostModel(0.001, 0.05, 0.0001));
        }
        
        return await runner.runComprehensiveBenchmark('light', {
            includeStreaming: false,
            includeAgents: false,
            includeMultiModal: false
        });
    }

    async runTargetedBenchmark(scenarios, providers) {
        const runner = new ComprehensiveBenchmarkRunner();
        
        // Set up providers
        for (const providerName of providers) {
            const apiKey = process.env[`${providerName.toUpperCase()}_API_KEY`] || 'test-key';
            const client = new APIClient(
                this.getProviderBaseUrl(providerName),
                apiKey
            );
            runner.addProvider(providerName, client, new CostModel(0.001, 0.05, 0.0001));
        }

        // Run specific scenarios
        if (scenarios.includes('quick_health_check')) {
            return await this.runHealthCheck(runner);
        } else if (scenarios.includes('latency')) {
            return await this.runLatencyBenchmark(runner);
        } else {
            return await runner.runComprehensiveBenchmark('light');
        }
    }

    async runHealthCheck(runner) {
        // Quick health check with minimal load
        const healthScenarios = [
            {
                name: "Health Check",
                messages: [{ role: "user", content: "Say 'OK' if you're working" }],
                expectedTokens: 10,
                weight: 1.0
            }
        ];

        const results = { providers: {}, timestamp: new Date().toISOString() };
        
        for (const [providerName, provider] of runner.providers) {
            provider.metrics.reset();
            provider.metrics.startTime = Date.now();
            
            try {
                const scenarioResult = await runner.runChatBenchmark(providerName, healthScenarios[0], 1);
                provider.metrics.endTime = Date.now();
                
                const stats = provider.metrics.getStatistics();
                results.providers[providerName] = stats;
                
            } catch (error) {
                results.providers[providerName] = {
                    error: error.message,
                    healthy: false
                };
            }
        }

        return results;
    }

    async runLatencyBenchmark(runner) {
        const latencyScenarios = CompetitiveTestScenarios.getLatencyOptimizedScenarios();
        const results = { providers: {}, timestamp: new Date().toISOString() };
        
        for (const [providerName, provider] of runner.providers) {
            provider.metrics.reset();
            provider.metrics.startTime = Date.now();
            
            for (const scenario of latencyScenarios.slice(0, 3)) { // Run first 3 scenarios
                await runner.runChatBenchmark(providerName, scenario, 1);
            }
            
            provider.metrics.endTime = Date.now();
            const stats = provider.metrics.getStatistics();
            results.providers[providerName] = stats;
        }

        return results;
    }

    getProviderBaseUrl(providerName) {
        const urls = {
            dandolo: 'https://judicious-hornet-148.convex.cloud',
            venice: 'https://api.venice.ai',
            openroute: 'https://openrouter.ai/api'
        };
        return urls[providerName.toLowerCase()] || 'https://localhost:3000';
    }

    async storeResults(results, benchmarkId) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${benchmarkId}-${timestamp}.json`;
        const filepath = path.join(this.config.resultsDir, filename);
        
        await fs.writeFile(filepath, JSON.stringify(results, null, 2));
        console.log(`💾 Results stored: ${filepath}`);
    }

    async checkPerformanceRegressions(results) {
        const regressions = [];
        
        for (const [providerName, performance] of Object.entries(results.providers || {})) {
            const baseline = this.performanceBaselines.get(providerName);
            if (!baseline || !performance.responseTime) continue;

            // Check response time regression
            if (performance.responseTime.mean > baseline.response_time.mean * 1.5) {
                regressions.push({
                    provider: providerName,
                    metric: 'response_time',
                    current: performance.responseTime.mean,
                    baseline: baseline.response_time.mean,
                    severity: 'high',
                    description: `Response time increased by ${((performance.responseTime.mean / baseline.response_time.mean - 1) * 100).toFixed(1)}%`
                });
            }

            // Check success rate regression
            if (performance.reliability?.successRate < baseline.success_rate.mean * 0.95) {
                regressions.push({
                    provider: providerName,
                    metric: 'success_rate',
                    current: performance.reliability.successRate,
                    baseline: baseline.success_rate.mean,
                    severity: 'critical',
                    description: `Success rate dropped to ${(performance.reliability.successRate * 100).toFixed(1)}%`
                });
            }

            // Check throughput regression
            if (performance.throughput?.requestsPerSecond < baseline.throughput.mean * 0.8) {
                regressions.push({
                    provider: providerName,
                    metric: 'throughput',
                    current: performance.throughput.requestsPerSecond,
                    baseline: baseline.throughput.mean,
                    severity: 'medium',
                    description: `Throughput decreased by ${((1 - performance.throughput.requestsPerSecond / baseline.throughput.mean) * 100).toFixed(1)}%`
                });
            }
        }

        if (regressions.length > 0) {
            console.log(`⚠️  Detected ${regressions.length} performance regressions`);
            await this.sendAlert('performance_regression', {
                regressions: regressions,
                timestamp: new Date().toISOString()
            });
        }
    }

    async updateHistoricalData(results) {
        for (const [providerName, performance] of Object.entries(results.providers || {})) {
            const key = providerName;
            
            if (!this.historicalData.has(key)) {
                this.historicalData.set(key, []);
            }
            
            const history = this.historicalData.get(key);
            history.push({
                timestamp: results.timestamp || new Date().toISOString(),
                performance: performance
            });
            
            // Keep only last 1000 entries
            if (history.length > 1000) {
                history.splice(0, history.length - 1000);
            }
        }
        
        await this.saveHistoricalData();
        
        // Update baselines periodically
        const lastBaselineUpdate = this.performanceBaselines.get('last_update') || 0;
        if (Date.now() - lastBaselineUpdate > this.config.baselineUpdateInterval) {
            await this.updatePerformanceBaselines();
        }
    }

    async updatePerformanceBaselines() {
        console.log('📊 Updating performance baselines');
        
        for (const [provider, history] of this.historicalData) {
            if (Array.isArray(history) && history.length > 10) {
                const baseline = this.calculateBaseline(history);
                this.performanceBaselines.set(provider, baseline);
            }
        }
        
        this.performanceBaselines.set('last_update', Date.now());
        console.log('✅ Performance baselines updated');
    }

    async sendAlert(alertType, data) {
        if (!this.config.enableAlerts) return;

        const alert = {
            type: alertType,
            timestamp: new Date().toISOString(),
            data: data,
            severity: this.getAlertSeverity(alertType, data)
        };

        console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alertType}`);
        console.log(JSON.stringify(data, null, 2));

        // Save alert to file
        if (this.config.alertChannels.includes('file')) {
            const alertFilename = `alert-${alertType}-${Date.now()}.json`;
            const alertPath = path.join(this.config.alertsDir, alertFilename);
            await fs.writeFile(alertPath, JSON.stringify(alert, null, 2));
        }

        // Additional alert channels could be implemented here
        // (Slack, email, webhook, etc.)
    }

    getAlertSeverity(alertType, data) {
        switch (alertType) {
            case 'benchmark_failure':
                return 'high';
            case 'performance_regression':
                if (data.regressions?.some(r => r.severity === 'critical')) return 'critical';
                if (data.regressions?.some(r => r.severity === 'high')) return 'high';
                return 'medium';
            default:
                return 'medium';
        }
    }

    async generateStatusReport() {
        const report = {
            timestamp: new Date().toISOString(),
            monitoring_status: {
                is_running: this.isRunning,
                active_schedules: Array.from(this.activeSchedules.keys()),
                current_benchmarks: Array.from(this.currentBenchmarks)
            },
            performance_overview: {},
            recent_alerts: [],
            baseline_status: {}
        };

        // Performance overview
        for (const [provider, baseline] of this.performanceBaselines) {
            if (provider !== 'last_update') {
                report.performance_overview[provider] = {
                    baseline_age_days: baseline?.last_updated ? 
                        Math.floor((Date.now() - new Date(baseline.last_updated).getTime()) / (24 * 60 * 60 * 1000)) : 'unknown',
                    trend: {
                        response_time: baseline?.response_time?.trend || 'unknown',
                        success_rate: baseline?.success_rate?.trend || 'unknown',
                        throughput: baseline?.throughput?.trend || 'unknown'
                    },
                    sample_size: baseline?.sample_size || 0
                };
            }
        }

        // Recent alerts (last 24 hours)
        try {
            const alertFiles = await fs.readdir(this.config.alertsDir);
            const recentAlerts = [];
            
            for (const file of alertFiles.slice(-10)) { // Last 10 alerts
                try {
                    const alertPath = path.join(this.config.alertsDir, file);
                    const alertData = JSON.parse(await fs.readFile(alertPath, 'utf8'));
                    const alertAge = Date.now() - new Date(alertData.timestamp).getTime();
                    
                    if (alertAge < 24 * 60 * 60 * 1000) { // 24 hours
                        recentAlerts.push({
                            type: alertData.type,
                            severity: alertData.severity,
                            timestamp: alertData.timestamp,
                            age_hours: Math.floor(alertAge / (60 * 60 * 1000))
                        });
                    }
                } catch (e) {
                    // Skip invalid alert files
                }
            }
            
            report.recent_alerts = recentAlerts;
        } catch (error) {
            report.recent_alerts = [];
        }

        // Baseline status
        report.baseline_status = {
            providers_with_baselines: this.performanceBaselines.size - 1, // Exclude 'last_update'
            last_baseline_update: this.performanceBaselines.get('last_update') ? 
                new Date(this.performanceBaselines.get('last_update')).toISOString() : 'never',
            historical_data_points: Array.from(this.historicalData.values())
                .reduce((total, history) => total + (Array.isArray(history) ? history.length : 0), 0)
        };

        return report;
    }
}

// CLI interface for continuous monitoring
async function main() {
    const args = process.argv.slice(2);
    let command = 'start';
    let scheduleType = 'standard';
    let configFile = null;

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case 'start':
            case 'stop':
            case 'status':
            case 'init':
                command = args[i];
                break;
            case '--schedule':
            case '-s':
                scheduleType = args[i + 1] || 'standard';
                i++;
                break;
            case '--config':
            case '-c':
                configFile = args[i + 1];
                i++;
                break;
            case '--help':
            case '-h':
                console.log(`
Continuous Performance Benchmarking System

Commands:
  init                 Initialize the continuous monitoring system
  start                Start continuous monitoring (default)
  stop                 Stop continuous monitoring
  status               Show monitoring status

Options:
  --schedule, -s       Schedule type: lightweight, standard, comprehensive, competitive
  --config, -c         Configuration file path
  --help, -h           Show this help

Schedule Types:
  lightweight          Every 15 minutes - quick health checks
  standard             Every hour - chat and latency tests (default)
  comprehensive        Every 6 hours - full benchmark suite
  competitive          Every 24 hours - competitive analysis

Examples:
  node continuous-benchmarking.js init
  node continuous-benchmarking.js start --schedule comprehensive
  node continuous-benchmarking.js status
                `);
                process.exit(0);
        }
    }

    // Load configuration
    let config = {};
    if (configFile) {
        try {
            const configData = await fs.readFile(configFile, 'utf8');
            config = JSON.parse(configData);
        } catch (error) {
            console.error(`❌ Failed to load config file: ${error.message}`);
            process.exit(1);
        }
    }

    const runner = new ContinuousBenchmarkRunner(config);

    try {
        switch (command) {
            case 'init':
                await runner.initialize();
                console.log('✅ Continuous monitoring system initialized');
                break;

            case 'start':
                await runner.initialize();
                await runner.startContinuousMonitoring(scheduleType);
                
                // Keep process running
                process.on('SIGINT', async () => {
                    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
                    await runner.stopContinuousMonitoring();
                    process.exit(0);
                });
                
                // Keep alive
                setInterval(() => {}, 1000);
                break;

            case 'stop':
                await runner.initialize();
                await runner.stopContinuousMonitoring();
                break;

            case 'status':
                await runner.initialize();
                const status = await runner.generateStatusReport();
                console.log('📊 Monitoring Status Report');
                console.log('='.repeat(50));
                console.log(JSON.stringify(status, null, 2));
                break;

            default:
                console.error(`❌ Unknown command: ${command}`);
                process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Command failed: ${error.message}`);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}

export { ContinuousBenchmarkRunner, PERFORMANCE_THRESHOLDS, BENCHMARK_SCHEDULES };