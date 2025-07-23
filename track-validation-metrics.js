#!/usr/bin/env node

/**
 * Provider Validation Metrics Tracker
 * 
 * Tracks key metrics to measure the success of provider validation fixes:
 * - Provider activation rates before/after deployment
 * - Validation success rates by filter type
 * - Error message improvements
 * - Debug function usage patterns
 * 
 * Usage: 
 *   node track-validation-metrics.js
 *   node track-validation-metrics.js --baseline  # Record baseline metrics
 *   node track-validation-metrics.js --compare   # Compare with baseline
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";
import fs from 'fs';
import path from 'path';

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL || "https://deep-reindeer-817.convex.cloud");

// Metrics storage
const METRICS_DIR = './metrics';
const BASELINE_FILE = path.join(METRICS_DIR, 'baseline-metrics.json');
const CURRENT_FILE = path.join(METRICS_DIR, 'current-metrics.json');

// Ensure metrics directory exists
if (!fs.existsSync(METRICS_DIR)) {
  fs.mkdirSync(METRICS_DIR);
}

class ValidationMetrics {
  constructor() {
    this.metrics = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      providers: {},
      validation: {},
      health: {},
      performance: {},
      errors: {}
    };
  }

  async collectProviderMetrics() {
    console.log('📊 Collecting provider metrics...');
    
    try {
      const providers = await client.query(api.providers.list);
      
      this.metrics.providers = {
        total: providers.length,
        active: providers.filter(p => p.isActive).length,
        inactive: providers.filter(p => !p.isActive).length,
        activationRate: providers.length > 0 ? 
          (providers.filter(p => p.isActive).length / providers.length * 100).toFixed(1) : 0,
        
        // Provider status breakdown
        statusBreakdown: {
          active: providers.filter(p => p.status === 'active' || p.isActive).length,
          pending: providers.filter(p => p.status === 'pending').length,
          inactive: providers.filter(p => p.status === 'inactive').length
        },

        // VCU balance analysis
        vcuAnalysis: this.analyzeVCUBalances(providers),
        
        // Registration timeline
        registrationTimeline: this.analyzeRegistrations(providers),
        
        // Health status
        healthStatus: this.analyzeHealthStatus(providers)
      };

      console.log(`   ✅ Total providers: ${this.metrics.providers.total}`);
      console.log(`   ✅ Active providers: ${this.metrics.providers.active}`);
      console.log(`   ✅ Activation rate: ${this.metrics.providers.activationRate}%`);
      
    } catch (error) {
      console.error('❌ Error collecting provider metrics:', error.message);
      this.metrics.errors.providerCollection = error.message;
    }
  }

  analyzeVCUBalances(providers) {
    const balances = providers.map(p => p.vcuBalance || 0);
    const activeBalances = providers.filter(p => p.isActive).map(p => p.vcuBalance || 0);
    const inactiveBalances = providers.filter(p => !p.isActive).map(p => p.vcuBalance || 0);

    return {
      totalProviders: balances.length,
      providersWithVCU: balances.filter(b => b > 0).length,
      averageVCU: balances.length > 0 ? (balances.reduce((a, b) => a + b, 0) / balances.length).toFixed(2) : 0,
      activeProvidersVCU: {
        count: activeBalances.filter(b => b > 0).length,
        average: activeBalances.length > 0 ? (activeBalances.reduce((a, b) => a + b, 0) / activeBalances.length).toFixed(2) : 0
      },
      inactiveProvidersVCU: {
        count: inactiveBalances.filter(b => b > 0).length,
        average: inactiveBalances.length > 0 ? (inactiveBalances.reduce((a, b) => a + b, 0) / inactiveBalances.length).toFixed(2) : 0
      },
      // This is critical: inactive providers with VCU indicate validation issues
      inactiveWithVCU: providers.filter(p => !p.isActive && p.vcuBalance > 0).length
    };
  }

  analyzeRegistrations(providers) {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    return {
      last24h: providers.filter(p => p.registrationDate && (now - p.registrationDate) < oneDay).length,
      lastWeek: providers.filter(p => p.registrationDate && (now - p.registrationDate) < oneWeek).length,
      lastMonth: providers.filter(p => p.registrationDate && (now - p.registrationDate) < oneMonth).length,
      averageAge: providers.length > 0 ? 
        Math.round((now - (providers.reduce((sum, p) => sum + (p.registrationDate || now), 0) / providers.length)) / oneDay) : 0
    };
  }

  analyzeHealthStatus(providers) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    return {
      recentHealthChecks: providers.filter(p => 
        p.lastHealthCheck && (now - p.lastHealthCheck) < oneHour
      ).length,
      consecutiveFailures: {
        zero: providers.filter(p => (p.consecutiveFailures || 0) === 0).length,
        one: providers.filter(p => (p.consecutiveFailures || 0) === 1).length,
        twoOrMore: providers.filter(p => (p.consecutiveFailures || 0) >= 2).length
      },
      markedInactive: providers.filter(p => p.markedInactiveAt).length
    };
  }

  async collectValidationMetrics() {
    console.log('🔍 Analyzing validation patterns...');
    
    try {
      // Test various API key formats to measure validation success
      const testKeys = [
        { key: 'vn_1234567890abcdef1234567890abcdef', expected: true, type: 'venice_valid' },
        { key: 'sk-1234567890abcdef1234567890abcdef', expected: false, type: 'openai_blocked' },
        { key: 'test1234567890abcdef1234567890abcdef', expected: true, type: 'long_unprefixed' },
        { key: 'short123', expected: false, type: 'too_short' },
        { key: 'claude-abcdef1234567890', expected: false, type: 'anthropic_blocked' },
        { key: 'api_key_1234567890abcdef1234567890', expected: true, type: 'api_prefixed' }
      ];

      const validationResults = [];
      
      for (const test of testKeys) {
        try {
          // Test format validation
          const formatResult = this.testApiKeyFormat(test.key);
          
          validationResults.push({
            ...test,
            formatValid: formatResult,
            correctValidation: formatResult === test.expected
          });
        } catch (error) {
          validationResults.push({
            ...test,
            error: error.message,
            correctValidation: false
          });
        }
      }

      this.metrics.validation = {
        testResults: validationResults,
        correctValidations: validationResults.filter(r => r.correctValidation).length,
        totalTests: validationResults.length,
        validationAccuracy: (validationResults.filter(r => r.correctValidation).length / validationResults.length * 100).toFixed(1),
        
        // Breakdown by type
        byType: {
          veniceValid: validationResults.filter(r => r.type === 'venice_valid' && r.correctValidation).length > 0,
          openaiBlocked: validationResults.filter(r => r.type === 'openai_blocked' && r.correctValidation).length > 0,
          longUnprefixed: validationResults.filter(r => r.type === 'long_unprefixed' && r.correctValidation).length > 0,
          tooShortBlocked: validationResults.filter(r => r.type === 'too_short' && r.correctValidation).length > 0
        }
      };

      console.log(`   ✅ Validation accuracy: ${this.metrics.validation.validationAccuracy}%`);
      
    } catch (error) {
      console.error('❌ Error collecting validation metrics:', error.message);
      this.metrics.errors.validationCollection = error.message;
    }
  }

  testApiKeyFormat(apiKey) {
    // Replicate the validation logic from crypto.ts
    if (!apiKey || typeof apiKey !== 'string') return false;
    
    const cleanKey = apiKey.trim();
    if (cleanKey.length < 20) return false;
    
    const validCharacters = /^[a-zA-Z0-9_-]+$/;
    if (!validCharacters.test(cleanKey)) return false;
    
    const validPrefixes = ['vn_', 'sk-', 'pk-', 'ak-', 'api_', 'key_'];
    const hasValidPrefix = validPrefixes.some(prefix => cleanKey.startsWith(prefix));
    
    return hasValidPrefix || cleanKey.length >= 32;
  }

  async collectHealthMetrics() {
    console.log('💗 Collecting health check metrics...');
    
    try {
      const providers = await client.query(api.providers.list);
      const activeProviders = providers.filter(p => p.isActive);
      
      // Analyze health check patterns
      const now = Date.now();
      const recentChecks = providers.filter(p => 
        p.lastHealthCheck && (now - p.lastHealthCheck) < (60 * 60 * 1000) // 1 hour
      );
      
      this.metrics.health = {
        providersWithRecentChecks: recentChecks.length,
        healthCheckCoverage: providers.length > 0 ? 
          (recentChecks.length / providers.length * 100).toFixed(1) : 0,
        
        // Failure analysis
        failureAnalysis: {
          noFailures: providers.filter(p => (p.consecutiveFailures || 0) === 0).length,
          singleFailure: providers.filter(p => (p.consecutiveFailures || 0) === 1).length,
          multipleFailures: providers.filter(p => (p.consecutiveFailures || 0) >= 2).length
        },

        // Recovery analysis
        recoveryMetrics: {
          markedInactiveCount: providers.filter(p => p.markedInactiveAt).length,
          potentialRecoveries: providers.filter(p => 
            !p.isActive && 
            p.vcuBalance > 0 && 
            (!p.consecutiveFailures || p.consecutiveFailures < 2)
          ).length
        }
      };

      console.log(`   ✅ Health check coverage: ${this.metrics.health.healthCheckCoverage}%`);
      
    } catch (error) {
      console.error('❌ Error collecting health metrics:', error.message);
      this.metrics.errors.healthCollection = error.message;
    }
  }

  async collectPerformanceMetrics() {
    console.log('⚡ Collecting performance metrics...');
    
    try {
      const startTime = Date.now();
      
      // Test basic API responses
      const providers = await client.query(api.providers.list);
      const queryTime = Date.now() - startTime;
      
      // Test provider selection performance
      const selectionStart = Date.now();
      const activeProviders = await client.query(api.providers.listActive);
      const selectionTime = Date.now() - selectionStart;

      this.metrics.performance = {
        queryResponseTime: queryTime,
        selectionResponseTime: selectionTime,
        activeProviderQueryTime: selectionTime,
        
        // Provider distribution metrics
        distribution: {
          providersPerStatus: {
            active: activeProviders.length,
            total: providers.length,
            ratio: providers.length > 0 ? (activeProviders.length / providers.length).toFixed(2) : 0
          }
        },

        // System health indicators
        systemHealth: {
          hasActiveProviders: activeProviders.length > 0,
          sufficientProviders: activeProviders.length >= 2,
          goodDistribution: activeProviders.length >= 3
        }
      };

      console.log(`   ✅ Query response time: ${queryTime}ms`);
      console.log(`   ✅ System health: ${this.metrics.performance.systemHealth.hasActiveProviders ? 'OK' : 'CRITICAL'}`);
      
    } catch (error) {
      console.error('❌ Error collecting performance metrics:', error.message);
      this.metrics.errors.performanceCollection = error.message;
    }
  }

  async collectAllMetrics() {
    console.log('🔄 Starting comprehensive metrics collection...\n');
    
    await this.collectProviderMetrics();
    await this.collectValidationMetrics();
    await this.collectHealthMetrics();
    await this.collectPerformanceMetrics();
    
    console.log('\n✅ Metrics collection completed\n');
  }

  saveMetrics(filename) {
    try {
      fs.writeFileSync(filename, JSON.stringify(this.metrics, null, 2));
      console.log(`💾 Metrics saved to ${filename}`);
    } catch (error) {
      console.error(`❌ Error saving metrics: ${error.message}`);
    }
  }

  static loadMetrics(filename) {
    try {
      if (fs.existsSync(filename)) {
        const data = fs.readFileSync(filename, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`❌ Error loading metrics: ${error.message}`);
    }
    return null;
  }

  static compareMetrics(baseline, current) {
    console.log('📈 METRICS COMPARISON REPORT');
    console.log('============================\n');

    if (!baseline || !current) {
      console.log('❌ Cannot compare - missing baseline or current metrics\n');
      return;
    }

    console.log(`📅 Baseline: ${new Date(baseline.timestamp).toLocaleString()}`);
    console.log(`📅 Current:  ${new Date(current.timestamp).toLocaleString()}\n`);

    // Provider metrics comparison
    console.log('🔍 PROVIDER METRICS:');
    console.log(`   Total Providers: ${baseline.providers.total} → ${current.providers.total} (${current.providers.total - baseline.providers.total >= 0 ? '+' : ''}${current.providers.total - baseline.providers.total})`);
    console.log(`   Active Providers: ${baseline.providers.active} → ${current.providers.active} (${current.providers.active - baseline.providers.active >= 0 ? '+' : ''}${current.providers.active - baseline.providers.active})`);
    console.log(`   Activation Rate: ${baseline.providers.activationRate}% → ${current.providers.activationRate}% (${(parseFloat(current.providers.activationRate) - parseFloat(baseline.providers.activationRate)).toFixed(1)}%)`);
    
    // Critical metric: Inactive providers with VCU
    const baselineInactiveVCU = baseline.providers.vcuAnalysis?.inactiveWithVCU || 0;
    const currentInactiveVCU = current.providers.vcuAnalysis?.inactiveWithVCU || 0;
    console.log(`   🚨 Inactive with VCU: ${baselineInactiveVCU} → ${currentInactiveVCU} (${currentInactiveVCU - baselineInactiveVCU >= 0 ? '+' : ''}${currentInactiveVCU - baselineInactiveVCU})`);

    // Validation metrics comparison
    console.log('\n🔍 VALIDATION METRICS:');
    if (baseline.validation && current.validation) {
      console.log(`   Validation Accuracy: ${baseline.validation.validationAccuracy}% → ${current.validation.validationAccuracy}% (${(parseFloat(current.validation.validationAccuracy) - parseFloat(baseline.validation.validationAccuracy)).toFixed(1)}%)`);
    }

    // Health metrics comparison
    console.log('\n💗 HEALTH METRICS:');
    if (baseline.health && current.health) {
      console.log(`   Health Check Coverage: ${baseline.health.healthCheckCoverage}% → ${current.health.healthCheckCoverage}% (${(parseFloat(current.health.healthCheckCoverage) - parseFloat(baseline.health.healthCheckCoverage)).toFixed(1)}%)`);
      console.log(`   Providers with Failures: ${baseline.health.failureAnalysis?.multipleFailures || 0} → ${current.health.failureAnalysis?.multipleFailures || 0}`);
    }

    // Performance comparison
    console.log('\n⚡ PERFORMANCE METRICS:');
    if (baseline.performance && current.performance) {
      console.log(`   Query Response Time: ${baseline.performance.queryResponseTime}ms → ${current.performance.queryResponseTime}ms`);
      console.log(`   System Health: ${baseline.performance.systemHealth?.hasActiveProviders ? 'OK' : 'FAIL'} → ${current.performance.systemHealth?.hasActiveProviders ? 'OK' : 'FAIL'}`);
    }

    // Success assessment
    console.log('\n📊 SUCCESS ASSESSMENT:');
    const improvements = [];
    const regressions = [];

    if (current.providers.active > baseline.providers.active) {
      improvements.push(`✅ Active providers increased by ${current.providers.active - baseline.providers.active}`);
    }
    
    if (parseFloat(current.providers.activationRate) > parseFloat(baseline.providers.activationRate)) {
      improvements.push(`✅ Activation rate improved by ${(parseFloat(current.providers.activationRate) - parseFloat(baseline.providers.activationRate)).toFixed(1)}%`);
    }

    if (currentInactiveVCU < baselineInactiveVCU) {
      improvements.push(`✅ Inactive providers with VCU reduced by ${baselineInactiveVCU - currentInactiveVCU}`);
    }

    if (current.providers.active < baseline.providers.active) {
      regressions.push(`❌ Active providers decreased by ${baseline.providers.active - current.providers.active}`);
    }

    if (parseFloat(current.providers.activationRate) < parseFloat(baseline.providers.activationRate)) {
      regressions.push(`❌ Activation rate decreased by ${(parseFloat(baseline.providers.activationRate) - parseFloat(current.providers.activationRate)).toFixed(1)}%`);
    }

    improvements.forEach(msg => console.log(msg));
    regressions.forEach(msg => console.log(msg));

    if (improvements.length > regressions.length) {
      console.log('\n🎉 Overall: SUCCESSFUL IMPROVEMENT');
    } else if (regressions.length > improvements.length) {
      console.log('\n⚠️  Overall: NEEDS ATTENTION');
    } else {
      console.log('\n📊 Overall: MIXED RESULTS');
    }
  }

  displaySummary() {
    console.log('📋 METRICS SUMMARY');
    console.log('==================\n');

    // Provider summary
    console.log('🔍 PROVIDER STATUS:');
    console.log(`   Total: ${this.metrics.providers.total} providers`);
    console.log(`   Active: ${this.metrics.providers.active} (${this.metrics.providers.activationRate}%)`);
    console.log(`   Inactive: ${this.metrics.providers.inactive}`);
    
    if (this.metrics.providers.vcuAnalysis) {
      console.log(`   Inactive with VCU: ${this.metrics.providers.vcuAnalysis.inactiveWithVCU} ⚠️`);
      console.log(`   Average VCU: $${this.metrics.providers.vcuAnalysis.averageVCU}`);
    }

    // Validation summary
    if (this.metrics.validation) {
      console.log('\n🔍 VALIDATION STATUS:');
      console.log(`   Accuracy: ${this.metrics.validation.validationAccuracy}%`);
      console.log(`   Test Results: ${this.metrics.validation.correctValidations}/${this.metrics.validation.totalTests}`);
    }

    // Health summary
    if (this.metrics.health) {
      console.log('\n💗 HEALTH STATUS:');
      console.log(`   Coverage: ${this.metrics.health.healthCheckCoverage}%`);
      console.log(`   Providers with failures: ${this.metrics.health.failureAnalysis?.multipleFailures || 0}`);
    }

    // Performance summary
    if (this.metrics.performance) {
      console.log('\n⚡ PERFORMANCE:');
      console.log(`   Query time: ${this.metrics.performance.queryResponseTime}ms`);
      console.log(`   System health: ${this.metrics.performance.systemHealth?.hasActiveProviders ? '✅ OK' : '❌ CRITICAL'}`);
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (this.metrics.providers.vcuAnalysis?.inactiveWithVCU > 0) {
      console.log(`   🔧 Consider manual activation of ${this.metrics.providers.vcuAnalysis.inactiveWithVCU} providers with VCU`);
    }
    
    if (parseFloat(this.metrics.providers.activationRate) < 80) {
      console.log(`   ⚠️  Activation rate is below 80% - investigate validation issues`);
    }

    if (this.metrics.providers.active < 2) {
      console.log(`   🚨 CRITICAL: Less than 2 active providers - system at risk`);
    }

    console.log('');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isBaseline = args.includes('--baseline');
  const isCompare = args.includes('--compare');

  try {
    const metrics = new ValidationMetrics();
    await metrics.collectAllMetrics();
    
    if (isBaseline) {
      metrics.saveMetrics(BASELINE_FILE);
      console.log('📊 Baseline metrics recorded');
    } else {
      metrics.saveMetrics(CURRENT_FILE);
      console.log('📊 Current metrics recorded');
    }

    metrics.displaySummary();

    if (isCompare) {
      const baseline = ValidationMetrics.loadMetrics(BASELINE_FILE);
      const current = ValidationMetrics.loadMetrics(CURRENT_FILE);
      ValidationMetrics.compareMetrics(baseline, current);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ValidationMetrics };