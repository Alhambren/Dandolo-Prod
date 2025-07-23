#!/usr/bin/env node

/**
 * DANDOLO SYSTEM MONITORING TOOL
 * 
 * Command-line tool for monitoring provider health, validation rates,
 * and system performance. Useful for admins and debugging.
 * 
 * Usage:
 *   node scripts/monitor-system.js [command] [options]
 * 
 * Commands:
 *   status         - Show current system status
 *   metrics        - Display detailed metrics
 *   health         - Run health checks on all providers
 *   alerts         - Show recent alerts
 *   trends         - Show performance trends
 *   validate       - Test provider validation
 *   help          - Show help
 */

const { ConvexHttpClient } = require("convex/browser");

// Initialize Convex client
const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL environment variable not set");
  console.error("Please set CONVEX_URL or NEXT_PUBLIC_CONVEX_URL to your Convex deployment URL");
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

// Utility functions
function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

function getStatusEmoji(status) {
  switch (status) {
    case 'healthy': return '✅';
    case 'degraded': return '⚠️';
    case 'critical': return '🚨';
    default: return '❓';
  }
}

function getAlertEmoji(level) {
  switch (level) {
    case 'critical': return '🚨';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'info': return 'ℹ️';
    default: return '📄';
  }
}

// Commands
async function showStatus() {
  try {
    console.log("📊 DANDOLO SYSTEM STATUS\n");
    console.log("Fetching current system metrics...\n");
    
    const metrics = await convex.action("monitoring:triggerMetricsCollection", {});
    
    console.log(`${getStatusEmoji(metrics.systemStatus)} System Status: ${metrics.systemStatus.toUpperCase()}`);
    console.log(`🕒 Last Updated: ${formatTimestamp(metrics.timestamp)}`);
    console.log();
    
    // Provider Statistics
    console.log("👥 PROVIDER STATISTICS");
    console.log(`   Total Providers: ${metrics.totalProviders}`);
    console.log(`   Active Providers: ${metrics.activeProviders} (${((metrics.activeProviders / metrics.totalProviders) * 100).toFixed(1)}%)`);
    console.log(`   Healthy Providers: ${metrics.healthyProviders}`);
    console.log(`   Unhealthy Providers: ${metrics.unhealthyProviders}`);
    console.log();
    
    // Performance Metrics
    console.log("🚀 PERFORMANCE METRICS");
    console.log(`   Average Response Time: ${metrics.averageResponseTime}ms`);
    console.log(`   Validation Success Rate: ${metrics.validationSuccessRate}%`);
    console.log(`   Total VCU Balance: $${metrics.totalVCUBalance.toFixed(2)}`);
    console.log();
    
    // Detailed Metrics
    console.log("📈 DETAILED METRICS");
    console.log(`   Providers with VCU: ${metrics.metrics.providersWithVCU}`);
    console.log(`   Providers without VCU: ${metrics.metrics.providersWithoutVCU}`);
    console.log(`   Avg Health Check Time: ${metrics.metrics.avgHealthCheckTime}ms`);
    console.log(`   Recent Validation Errors: ${metrics.metrics.recentValidationErrors}`);
    console.log();
    
    // Status interpretation
    if (metrics.systemStatus === 'critical') {
      console.log("🚨 CRITICAL ISSUES DETECTED:");
      if (metrics.activeProviders === 0) {
        console.log("   • All providers are offline - immediate attention required!");
      }
      if (metrics.validationSuccessRate < 50) {
        console.log("   • Validation success rate is critically low");
      }
    } else if (metrics.systemStatus === 'degraded') {
      console.log("⚠️ SYSTEM DEGRADED:");
      if (metrics.activeProviders < metrics.totalProviders * 0.5) {
        console.log("   • Less than 50% of providers are active");
      }
      if (metrics.validationSuccessRate < 80) {
        console.log("   • Validation success rate is below optimal");
      }
    } else {
      console.log("✅ System is operating normally");
    }
    
  } catch (error) {
    console.error("❌ Error fetching system status:", error.message);
  }
}

async function showMetrics() {
  try {
    console.log("📊 DETAILED SYSTEM METRICS\n");
    
    const dashboard = await convex.query("monitoring:getDashboardData", { timeRange: "24h" });
    
    if (!dashboard.currentStatus) {
      console.log("⏳ No recent metrics available. System may still be initializing.");
      return;
    }
    
    const { currentStatus, trends, metrics, alerts, summary } = dashboard;
    
    // Current Status
    console.log("📈 CURRENT STATUS (Last 24 Hours)");
    console.log(`   System Status: ${getStatusEmoji(currentStatus.systemStatus)} ${currentStatus.systemStatus.toUpperCase()}`);
    console.log(`   Total Providers: ${currentStatus.totalProviders}`);
    console.log(`   Active Providers: ${currentStatus.activeProviders}`);
    console.log(`   Healthy Providers: ${currentStatus.healthyProviders}`);
    console.log(`   Success Rate: ${currentStatus.validationSuccessRate}%`);
    console.log(`   Avg Response Time: ${currentStatus.averageResponseTime}ms`);
    console.log(`   Total VCU Balance: $${currentStatus.totalVCUBalance.toFixed(2)}`);
    console.log(`   Last Update: ${formatTimestamp(currentStatus.timestamp)}`);
    console.log();
    
    // Trends
    if (trends) {
      console.log("📊 TRENDS (vs Previous Period)");
      const activeChange = trends.activeProvidersTrend;
      const successChange = trends.validationSuccessRateTrend;
      const responseChange = trends.responseTimeTrend;
      
      console.log(`   Active Providers: ${activeChange >= 0 ? '+' : ''}${activeChange} ${activeChange > 0 ? '📈' : activeChange < 0 ? '📉' : '➡️'}`);
      console.log(`   Success Rate: ${successChange >= 0 ? '+' : ''}${successChange.toFixed(1)}% ${successChange > 0 ? '📈' : successChange < 0 ? '📉' : '➡️'}`);
      console.log(`   Response Time: ${responseChange >= 0 ? '+' : ''}${responseChange}ms ${responseChange <= 0 ? '📈' : '📉'}`);
      console.log();
    }
    
    // Summary Stats
    if (summary) {
      console.log("📋 SUMMARY STATISTICS");
      console.log(`   Total Metric Points: ${summary.totalMetricPoints}`);
      console.log(`   Critical Alerts: ${summary.criticalAlerts} 🚨`);
      console.log(`   Warning Alerts: ${summary.warningAlerts} ⚠️`);
      console.log();
    }
    
    // Recent Alerts (top 5)
    if (alerts && alerts.length > 0) {
      console.log("🚨 RECENT ALERTS (Last 5)");
      alerts.slice(0, 5).forEach((alert, i) => {
        console.log(`   ${getAlertEmoji(alert.level)} [${alert.level.toUpperCase()}] ${alert.message}`);
        console.log(`     ${formatTimestamp(alert.timestamp)}`);
      });
      console.log();
    }
    
    // Metrics history summary
    if (metrics && metrics.length > 0) {
      console.log("📊 METRICS HISTORY");
      console.log(`   Data Points: ${metrics.length}`);
      console.log(`   Time Range: 24 hours`);
      
      // Simple trend analysis
      const firstMetric = metrics[0];
      const lastMetric = metrics[metrics.length - 1];
      
      if (firstMetric && lastMetric) {
        console.log("   24h Change:");
        console.log(`     Active Providers: ${lastMetric.activeProviders - firstMetric.activeProviders}`);
        console.log(`     Success Rate: ${(lastMetric.validationSuccessRate - firstMetric.validationSuccessRate).toFixed(1)}%`);
        console.log(`     Response Time: ${lastMetric.averageResponseTime - firstMetric.averageResponseTime}ms`);
      }
      console.log();
    }
    
  } catch (error) {
    console.error("❌ Error fetching detailed metrics:", error.message);
  }
}

async function runHealthChecks() {
  try {
    console.log("🏥 RUNNING HEALTH CHECKS\n");
    console.log("Triggering comprehensive health checks for all providers...\n");
    
    const results = await convex.action("monitoring:triggerHealthChecks", {});
    
    console.log("📊 HEALTH CHECK RESULTS");
    console.log(`   Check Timestamp: ${formatTimestamp(results.checkTimestamp)}`);
    console.log(`   Total Providers: ${results.totalProviders}`);
    console.log(`   Checks Performed: ${results.checksPerformed}`);
    console.log(`   Healthy Providers: ${results.healthyProviders} ✅`);
    console.log(`   Unhealthy Providers: ${results.unhealthyProviders} ❌`);
    console.log(`   Average Response Time: ${results.averageResponseTime}ms`);
    console.log();
    
    // Critical Issues
    if (results.criticalIssues && results.criticalIssues.length > 0) {
      console.log("🚨 CRITICAL ISSUES DETECTED:");
      results.criticalIssues.forEach(issue => {
        console.log(`   ${issue}`);
      });
      console.log();
    }
    
    // Errors (first 5)
    if (results.errors && results.errors.length > 0) {
      console.log("❌ PROVIDER ERRORS:");
      results.errors.slice(0, 5).forEach(error => {
        console.log(`   • ${error}`);
      });
      if (results.errors.length > 5) {
        console.log(`   ... and ${results.errors.length - 5} more errors`);
      }
      console.log();
    }
    
    // Health summary
    const healthPercentage = results.checksPerformed > 0 
      ? (results.healthyProviders / results.checksPerformed) * 100 
      : 0;
    
    console.log(`📈 OVERALL HEALTH: ${healthPercentage.toFixed(1)}%`);
    
    if (healthPercentage >= 95) {
      console.log("✅ System health is excellent");
    } else if (healthPercentage >= 80) {
      console.log("⚠️ System health is acceptable but could be improved");
    } else {
      console.log("🚨 System health requires immediate attention");
    }
    
  } catch (error) {
    console.error("❌ Error running health checks:", error.message);
  }
}

async function showAlerts() {
  try {
    console.log("🚨 SYSTEM ALERTS\n");
    
    const dashboard = await convex.query("monitoring:getDashboardData", { timeRange: "24h" });
    
    if (!dashboard.alerts || dashboard.alerts.length === 0) {
      console.log("✅ No alerts in the last 24 hours - system is running smoothly!");
      return;
    }
    
    console.log(`Found ${dashboard.alerts.length} alerts in the last 24 hours:\n`);
    
    // Group alerts by level
    const alertsByLevel = dashboard.alerts.reduce((acc, alert) => {
      if (!acc[alert.level]) acc[alert.level] = [];
      acc[alert.level].push(alert);
      return acc;
    }, {});
    
    // Show critical alerts first
    for (const level of ['critical', 'error', 'warning', 'info']) {
      if (alertsByLevel[level]) {
        console.log(`${getAlertEmoji(level)} ${level.toUpperCase()} ALERTS (${alertsByLevel[level].length}):`);
        alertsByLevel[level].forEach(alert => {
          console.log(`   [${formatTimestamp(alert.timestamp)}] ${alert.message}`);
        });
        console.log();
      }
    }
    
  } catch (error) {
    console.error("❌ Error fetching alerts:", error.message);
  }
}

async function showTrends() {
  try {
    console.log("📈 SYSTEM TRENDS\n");
    
    const trends = await convex.query("monitoring:getHealthTrends", { days: 7 });
    
    if (!trends.trends || trends.trends.length === 0) {
      console.log("⏳ No trend data available yet. System may still be collecting metrics.");
      return;
    }
    
    console.log(`📊 HEALTH TRENDS (Last ${trends.days} days, ${trends.dataPoints} total data points)\n`);
    
    // Show daily trends
    console.log("📅 DAILY AVERAGES:");
    trends.trends.forEach(trend => {
      console.log(`   ${trend.date}:`);
      console.log(`     Active Providers: ${trend.avgActiveProviders.toFixed(1)}`);
      console.log(`     Success Rate: ${trend.avgValidationSuccessRate.toFixed(1)}%`);
      console.log(`     Response Time: ${trend.avgResponseTime.toFixed(0)}ms`);
      console.log(`     VCU Balance: $${trend.avgVCUBalance.toFixed(2)}`);
      console.log(`     Data Points: ${trend.dataPoints}`);
      console.log();
    });
    
    // Calculate overall trends
    if (trends.trends.length >= 2) {
      const first = trends.trends[0];
      const last = trends.trends[trends.trends.length - 1];
      
      console.log("🔄 OVERALL TRENDS (First vs Last Day):");
      const providerChange = last.avgActiveProviders - first.avgActiveProviders;
      const successChange = last.avgValidationSuccessRate - first.avgValidationSuccessRate;
      const responseChange = last.avgResponseTime - first.avgResponseTime;
      const vcuChange = last.avgVCUBalance - first.avgVCUBalance;
      
      console.log(`   Active Providers: ${providerChange >= 0 ? '+' : ''}${providerChange.toFixed(1)} ${providerChange > 0 ? '📈' : providerChange < 0 ? '📉' : '➡️'}`);
      console.log(`   Success Rate: ${successChange >= 0 ? '+' : ''}${successChange.toFixed(1)}% ${successChange > 0 ? '📈' : successChange < 0 ? '📉' : '➡️'}`);
      console.log(`   Response Time: ${responseChange >= 0 ? '+' : ''}${responseChange.toFixed(0)}ms ${responseChange <= 0 ? '📈' : '📉'}`);
      console.log(`   VCU Balance: ${vcuChange >= 0 ? '+' : ''}$${vcuChange.toFixed(2)} ${vcuChange > 0 ? '📈' : vcuChange < 0 ? '📉' : '➡️'}`);
    }
    
  } catch (error) {
    console.error("❌ Error fetching trends:", error.message);
  }
}

async function testValidation() {
  try {
    console.log("🧪 TESTING PROVIDER VALIDATION\n");
    
    const report = await convex.query("monitoring:getValidationReport", { hours: 1 });
    
    console.log("📊 VALIDATION REPORT (Last Hour)");
    console.log(`   Total Providers: ${report.summary.totalProviders}`);
    console.log(`   Active Providers: ${report.summary.activeProviders}`);
    console.log(`   Total Validation Attempts: ${report.summary.totalValidationAttempts}`);
    console.log(`   Successful Validations: ${report.summary.successfulValidations} ✅`);
    console.log(`   Failed Validations: ${report.summary.failedValidations} ❌`);
    console.log(`   Overall Success Rate: ${report.summary.overallSuccessRate}%`);
    console.log();
    
    if (report.providers && report.providers.length > 0) {
      console.log("👥 PROVIDER VALIDATION RESULTS:");
      report.providers.forEach(provider => {
        const status = provider.isActive ? '✅' : '❌';
        const successRate = provider.successRate.toFixed(1);
        console.log(`   ${status} ${provider.providerName} (${successRate}%)`);
        console.log(`     Checks: ${provider.totalChecks} | Success: ${provider.successfulChecks} | Failed: ${provider.failedChecks}`);
        console.log(`     Avg Response: ${provider.averageResponseTime.toFixed(0)}ms | VCU: $${provider.vcuBalance.toFixed(2)}`);
        console.log();
      });
    }
    
    // Recommendations
    if (report.summary.overallSuccessRate < 90) {
      console.log("💡 RECOMMENDATIONS:");
      console.log("   • Monitor provider API key validity");
      console.log("   • Check Venice.ai service availability");
      console.log("   • Review network connectivity");
      console.log("   • Consider provider key rotation");
    }
    
  } catch (error) {
    console.error("❌ Error testing validation:", error.message);
  }
}

function showHelp() {
  console.log(`
🔍 DANDOLO SYSTEM MONITORING TOOL

Usage: node scripts/monitor-system.js [command]

Commands:
  status      Show current system status overview
  metrics     Display detailed system metrics and trends
  health      Run comprehensive health checks on all providers
  alerts      Show recent system alerts and notifications
  trends      Display performance trends over time
  validate    Test provider validation and show results
  help        Show this help message

Environment:
  CONVEX_URL  Your Convex deployment URL (required)

Examples:
  node scripts/monitor-system.js status
  node scripts/monitor-system.js health
  node scripts/monitor-system.js metrics
  node scripts/monitor-system.js alerts
  node scripts/monitor-system.js trends
  node scripts/monitor-system.js validate

For real-time monitoring, you can run these commands in a loop:
  watch -n 30 'node scripts/monitor-system.js status'
  
The monitoring system runs automated checks every 15 minutes and
collects metrics every hour. This tool provides on-demand access
to the same monitoring data.
`);
}

// Main command handler
async function main() {
  const command = process.argv[2] || 'status';
  
  console.log(`🚀 Connecting to Convex: ${CONVEX_URL}\n`);
  
  switch (command.toLowerCase()) {
    case 'status':
      await showStatus();
      break;
    case 'metrics':
      await showMetrics();
      break;
    case 'health':
      await runHealthChecks();
      break;
    case 'alerts':
      await showAlerts();
      break;
    case 'trends':
      await showTrends();
      break;
    case 'validate':
      await testValidation();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log("Run 'node scripts/monitor-system.js help' for usage information");
      process.exit(1);
  }
}

// Run the tool
if (require.main === module) {
  main().catch(error => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}

module.exports = {
  showStatus,
  showMetrics,
  runHealthChecks,
  showAlerts,
  showTrends,
  testValidation
};