# Dandolo Provider Monitoring System

This document describes the comprehensive monitoring system implemented for Dandolo's provider validation fixes and system health tracking.

## Overview

The monitoring system provides real-time tracking of:
- Provider validation success rates
- Venice.ai API connectivity and response times
- Critical system failures and alerting
- System health improvements over time
- Automated health checks every 15 minutes

## Components

### 1. Backend Monitoring (`convex/monitoring.ts`)

**Key Functions:**
- `collectProviderMetrics()` - Collects comprehensive system metrics
- `runEnhancedHealthChecks()` - Performs detailed health checks on all providers
- `getDashboardData()` - Provides dashboard data with time-based queries
- `getValidationReport()` - Generates provider validation reports
- `getHealthTrends()` - Tracks performance trends over time

**Automated Monitoring:**
- Health checks every 15 minutes (via cron)
- Metrics collection every hour
- Critical issue alerting
- Automatic data retention (7 days for metrics, 30 days for alerts)

### 2. Database Schema Updates (`convex/schema.ts`)

**New Tables:**
- `monitoringMetrics` - System performance metrics over time
- `monitoringAlerts` - System alerts and notifications

**Tracking:**
- Provider health status and response times
- Validation success/failure patterns  
- System-wide performance indicators
- Alert levels (info, warning, error, critical)

### 3. Frontend Dashboard (`src/components/MonitoringDashboard.tsx`)

**Features:**
- Real-time system status overview
- Provider health visualization
- Alert management interface
- Time-based metric filtering (1h, 6h, 24h, 7d)
- Before/after improvement tracking
- Automatic refresh every 2 minutes

**Integration:**
- Added to provider dashboard as a new tab
- Accessible from the main dashboard interface

### 4. Command-Line Monitoring Tool (`scripts/monitor-system.js`)

**Commands:**
```bash
# System status overview
node scripts/monitor-system.js status

# Detailed metrics and trends
node scripts/monitor-system.js metrics

# Run health checks manually
node scripts/monitor-system.js health

# View recent alerts
node scripts/monitor-system.js alerts

# Show performance trends
node scripts/monitor-system.js trends

# Test provider validation
node scripts/monitor-system.js validate
```

**Features:**
- Real-time system status
- Provider-by-provider health reports
- Alert notifications with severity levels
- Performance trend analysis
- Validation success rate tracking

### 5. Automated Scheduling (`convex/crons.ts`)

**Enhanced Cron Jobs:**
- `enhanced-monitoring` - Every 15 minutes
- `collect-metrics` - Every hour
- Existing health checks - Every 4 hours
- Balance updates - Every hour

## Key Metrics Tracked

### System Health Indicators
- **System Status**: `healthy`, `degraded`, `critical`
- **Provider Count**: Total, active, inactive, healthy, unhealthy
- **Response Times**: Average provider response times
- **Success Rates**: Validation success percentage
- **VCU Balances**: Total and per-provider VCU tracking

### Provider-Specific Metrics
- **Health Status**: Online/offline status per provider
- **Response Time**: Individual provider performance
- **Validation Success Rate**: Success rate per provider
- **Uptime Percentage**: 24-hour uptime tracking
- **Error Patterns**: Consecutive failure tracking

### Alerting System
- **Critical**: All providers offline, system completely down
- **Error**: Individual provider failures, API key issues
- **Warning**: Degraded performance, low success rates
- **Info**: System state changes, routine notifications

## Alert Thresholds

### Critical Alerts
- All providers offline (0 active providers)
- System-wide failure (all validations failing)
- Network completely unreachable

### Warning Alerts
- Less than 30% of providers healthy
- Validation success rate below 80%
- Average response time above 10 seconds
- Significant provider count drop

### Automated Responses
- **Provider Deactivation**: After 2 consecutive health check failures
- **Auto-Recovery**: Providers reactivated when health checks pass
- **Balance Updates**: VCU balances refreshed on successful validation

## Usage Examples

### Real-Time Monitoring
```bash
# Continuous monitoring (updates every 30 seconds)
watch -n 30 'node scripts/monitor-system.js status'

# Check for critical issues
node scripts/monitor-system.js alerts | grep -i critical

# Monitor provider validation specifically
node scripts/monitor-system.js validate
```

### Dashboard Access
1. Login as a provider
2. Navigate to Dashboard
3. Click "System Monitoring" tab
4. View real-time metrics and alerts

### API Integration
```typescript
// Get current system status
const metrics = await convex.action("monitoring:collectProviderMetrics");

// Get dashboard data
const dashboard = await convex.query("monitoring:getDashboardData", { 
  timeRange: "24h" 
});

// Run manual health checks
const results = await convex.action("monitoring:runEnhancedHealthChecks");
```

## Monitoring Benefits

### Before Implementation
- Manual provider validation
- No visibility into system health
- Reactive issue discovery
- No performance tracking
- Manual troubleshooting

### After Implementation
- Automated validation monitoring every 15 minutes
- Real-time system health visibility
- Proactive issue detection and alerting
- Performance trend tracking and analysis
- Automated troubleshooting with detailed logs

### Improvement Tracking
The system provides clear before/after metrics:
- **Provider Availability**: Track improvements in provider uptime
- **Error Rate Reduction**: Monitor validation success rate improvements  
- **User Success Rates**: Track user experience improvements
- **Response Time Optimization**: Monitor performance improvements
- **System Reliability**: Track overall system stability

## Troubleshooting

### Common Issues

**No Metrics Data**
- Check cron job execution
- Verify Convex deployment
- Run manual metrics collection

**High Alert Volume**
- Review alert thresholds
- Check provider API key validity
- Monitor Venice.ai service status

**Dashboard Not Loading**
- Verify React component integration
- Check Convex query permissions
- Review browser console for errors

### Debug Commands
```bash
# Test monitoring system
node scripts/monitor-system.js status

# Check recent alerts
node scripts/monitor-system.js alerts

# Manual health check
node scripts/monitor-system.js health

# View trends
node scripts/monitor-system.js trends
```

## Configuration

### Environment Variables
- `CONVEX_URL` - Required for CLI tool
- Monitoring runs automatically via Convex crons

### Customization
- Alert thresholds in `monitoring.ts`
- Cron schedules in `crons.ts`
- Dashboard refresh rate in React component
- Data retention periods in monitoring functions

## Future Enhancements

### Planned Features
- Email/SMS alert notifications
- Provider performance scoring
- Predictive health analysis
- Custom alert rules
- Historical data export
- Integration with external monitoring tools

### Metrics Expansion
- User-facing error rates
- Request success rates by model type
- Geographic provider distribution
- Cost optimization metrics
- Performance benchmarking

This monitoring system provides comprehensive visibility into the Dandolo provider network, enabling proactive maintenance, performance optimization, and rapid issue resolution.