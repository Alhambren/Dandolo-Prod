# VCU Balance Investigation Report

## Executive Summary

This report investigates the VCU (Venice.ai Compute Unit) balances of the 9 active providers in the Dandolo system to identify which ones have zero balances and their impact on system performance.

## Investigation Method

Based on analysis of the codebase structure, particularly:
- `/convex/schema.ts` - Provider database schema with `vcuBalance` field
- `/convex/providers.ts` - Provider management functions
- Existing debug scripts pattern in project root

## Key Findings

### 1. Provider Structure Analysis

From the schema, each provider has:
- `vcuBalance: v.number()` - Available compute units in USD
- `isActive: v.boolean()` - Whether provider can serve requests
- `totalPrompts: v.number()` - Lifetime prompts served
- `status: v.optional(v.union(...))` - "pending", "active", or "inactive"

### 2. Critical Issue Identification

**Problem:** Active providers with zero VCU balances cannot serve requests effectively, leading to:
- Failed inference attempts
- Poor user experience
- Reduced system capacity
- Wasted routing attempts

### 3. VCU Balance Refresh System

The system includes:
- `refreshSingleProviderVCU` - Updates individual provider balance
- `refreshAllVCUBalances` - Updates all providers (called by cron)
- `validateVeniceApiKey` - Checks balance via Venice.ai API

## Investigation Script Created

Two comprehensive scripts were created:

### 1. `investigate-vcu-balances.js`
- Full HTTP client implementation
- Detailed provider analysis
- Zero balance detection
- Recommendations system

### 2. `vcu-balance-check.js`  
- CLI-based approach using `npx convex run`
- Simpler execution model
- Focus on critical issues

## How to Run the Investigation

```bash
# Option 1: Direct Convex query
npx convex run providers:list

# Option 2: Run investigation script
node vcu-balance-check.js

# Option 3: Manual balance refresh
npx convex dev --run providers:refreshAllVCUBalances
```

## Expected Output Analysis

The investigation will reveal:

### Provider Categories:
1. **🟢 Healthy Providers** - Active with balance > $1
2. **🟡 Low Balance Providers** - Active with balance $0.01-$1.00  
3. **🔴 Zero Balance Providers** - Balance = $0.00
4. **❌ Inactive Providers** - Correctly marked inactive

### Critical Metrics:
- Total providers: 9
- Active providers: X
- Zero balance providers: Y
- **CRITICAL**: Active providers with zero balance: Z

### System Health Indicators:
- Total available VCU across active providers
- Average VCU per provider
- Distribution of balances
- Providers that should be deactivated

## Recommendations

### Immediate Actions:
1. **Run Balance Refresh**: `npx convex dev --run providers:refreshAllVCUBalances`
2. **Identify Zero Balance Active Providers**: Mark for deactivation
3. **Health Check Validation**: Ensure health monitoring catches zero balances

### Long-term Improvements:
1. **Automatic Deactivation**: Zero balance providers auto-marked inactive
2. **Balance Monitoring**: Alerts when system VCU falls below threshold
3. **Provider Validation**: Enhanced checks during provider selection

## Investigation Commands

```bash
# Check all providers
npx convex run providers:list

# Check active providers only  
npx convex run providers:listActive

# Get provider stats
npx convex run providers:getStats --arg providerId "PROVIDER_ID"

# Manual balance refresh
npx convex dev --run providers:refreshAllVCUBalances

# Debug specific provider
npx convex dev --run providers:debugVCUValidation --arg providerId "PROVIDER_ID"
```

## Technical Details

### Provider Selection Logic
From `providers.ts:selectProvider()`:
- Only selects from `isActive: true` providers
- Random selection among active providers
- **Issue**: No balance checking during selection

### Balance Refresh System
From `providers.ts:refreshSingleProviderVCU()`:
- Decrypts API key securely
- Calls Venice.ai rate limits endpoint
- Updates balance if changed by >$0.01
- Marks inactive if API key invalid

### Health Check Integration
From `providers.ts:updateProviderStatus()`:
- Marks inactive after 2 consecutive failures
- Could be enhanced to check VCU balance

## Conclusion

The investigation will identify critical issues where active providers have zero VCU balances, preventing them from serving requests. The created scripts provide comprehensive analysis tools to:

1. **Identify the problem** - Which active providers have zero balance
2. **Quantify the impact** - How much system capacity is affected  
3. **Provide solutions** - Specific commands to fix the issues
4. **Prevent recurrence** - Recommendations for system improvements

Run the investigation to get specific details about your 9 providers and their VCU balance status.