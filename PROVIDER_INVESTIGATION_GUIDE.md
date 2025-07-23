# Provider Database Investigation Guide

## Current Provider State Analysis

Based on analysis of the Dandolo.ai codebase and debug functions, here's a comprehensive guide to investigate the current provider database state.

## Quick Debug Commands

### 1. System Health Check
```bash
npx convex dev --run debug:systemHealth
```
**Purpose:** Shows overview of providers and identifies issues
**Returns:**
- `totalProviders`: Total providers in database
- `activeProviders`: Providers marked as active
- `validProviders`: Providers passing validation filters
- `providerIssues`: Array of problematic providers with specific issues

### 2. List All Providers (Public Info)
```bash
npx convex dev --run debug:listProviders
```
**Purpose:** Lists providers without sensitive data
**Returns:** Array of providers with public information only

### 3. Check Provider Balances
```bash
npx convex dev --run debug:checkProviderBalances
```
**Purpose:** Shows VCU balances and USD values for all providers
**Returns:** Provider balances without exposing API keys

### 4. Debug Provider Filtering (Admin Only)
```bash
npx convex dev --run debug:debugProviderFiltering --arg adminAddress "0xC07481520d98c32987cA83B30EAABdA673cDbe8c"
```
**Purpose:** Analyzes why providers might be excluded from selection
**Returns:** Detailed analysis of provider validation failures

### 5. Debug Providers (Admin Only)
```bash
npx convex dev --run debug:debugProviders --arg adminAddress "0xC07481520d98c32987cA83B30EAABdA673cDbe8c"
```
**Purpose:** Shows provider details without API keys (admin only)
**Returns:** Provider database state with encryption status

## Provider Validation Filters

Providers are excluded from inference routing if they fail these checks:

1. **No API Key**: `!p.veniceApiKey`
2. **Test API Keys**: `p.veniceApiKey.startsWith('test_')`
3. **Short API Keys**: `p.veniceApiKey.length < 30`
4. **Test Names**: `p.name.toLowerCase().includes('test')`

## Common Issues and Solutions

### Issue 1: No Providers Found
**Symptoms:** `totalProviders: 0`
**Solution:** No providers have been registered. Use the provider registration interface.

### Issue 2: Providers Exist But None Are Valid
**Symptoms:** `totalProviders > 0` but `validProviders: 0`
**Causes:**
- Providers have test API keys
- Provider names contain "test"
- API keys are too short
- Missing API keys

**Investigation:** Run `debugProviderFiltering` to see specific failure reasons

### Issue 3: Providers Valid But Inactive
**Symptoms:** `validProviders > 0` but `activeProviders: 0`
**Causes:**
- Health checks failing
- Venice.ai API keys invalid
- Network connectivity issues

**Investigation:** Check provider health status and run health checks

## Manual Provider Checks via UI

If CLI commands aren't available, check these UI locations:

### 1. Providers Page (`/providers`)
- Shows public provider list
- Displays active/inactive status
- Shows provider statistics

### 2. Admin Dashboard (Admin Wallet Only)
- Shows detailed provider information
- Allows manual health checks
- Displays API key status (without exposing keys)

### 3. Developer Portal (`/developers`)
- Shows system health indicators
- May display provider availability status

## Venice.ai API Key Validation

The system validates Venice.ai API keys by:

1. **Format Check**: Must be 16+ characters, not blocked prefixes
2. **API Test**: Calls `https://api.venice.ai/api/v1/models`
3. **Balance Check**: Attempts to fetch VCU balance
4. **Model Verification**: Checks for Venice-specific models

## Provider Registration Process

Providers must be registered through:

1. **Wallet Connection**: Connect Web3 wallet
2. **API Key Input**: Enter Venice.ai API key
3. **Validation**: System validates key and fetches balance
4. **Encryption**: API key encrypted with AES-256-GCM
5. **Activation**: Provider marked active if validation passes

## Database Schema Reference

### providers table:
- `address`: Wallet address (unique)
- `name`: Provider name
- `veniceApiKey`: Encrypted API key
- `encryptionIv`: AES initialization vector
- `authTag`: AES authentication tag
- `encryptionVersion`: 2 for AES-256-GCM
- `apiKeyHash`: For duplicate detection
- `vcuBalance`: Available VCU balance
- `isActive`: Provider status
- `totalPrompts`: Lifetime prompts served

### providerPoints table:
- `providerId`: Link to provider
- `address`: Wallet address (persists after provider deletion)
- `totalPoints`: All-time points earned
- `isProviderActive`: Current provider status

### providerHealth table:
- `providerId`: Link to provider
- `status`: Health check result
- `responseTime`: Response time in ms
- `timestamp`: Check time
- `error`: Error message if failed

## Admin Functions (Admin Wallet Required)

### Cleanup Test Providers
```bash
npx convex dev --run debug:cleanupTestProviders --arg adminAddress "0xC07481520d98c32987cA83B30EAABdA673cDbe8c"
```
Removes providers with test keys or test names.

### Reset Provider Balances (Testing)
```bash
npx convex dev --run debug:resetProviderBalances --arg adminAddress "0xC07481520d98c32987cA83B30EAABdA673cDbe8c"
```
Resets all provider balances to 0 for testing real API calls.

### Force Update Balances
```bash
npx convex dev --run debug:forceUpdateAllBalances
```
Manually refresh VCU balances from Venice.ai API.

## Investigation Steps

1. **Run System Health Check** - Get overview
2. **List Providers** - See what's in database
3. **Check Provider Filtering** - Identify validation failures
4. **Examine Provider Balances** - Verify VCU states
5. **Test API Calls** - Verify Venice.ai connectivity

## Expected Production State

For a healthy production environment:
- `validProviders >= 1`
- `activeProviders >= 1`
- All providers should have `vcuBalance > 0`
- No providers with test names or keys
- Recent health check timestamps
- Valid Venice.ai API keys

## Troubleshooting Providers Not Appearing

If providers exist but don't appear in inference routing:

1. Check `isActive` status
2. Verify API key length > 30 characters
3. Ensure name doesn't contain "test"
4. Check VCU balance > 0
5. Verify recent health check passed
6. Confirm Venice.ai API key is valid

## Environment Notes

- **Admin Address**: `0xC07481520d98c32987cA83B30EAABdA673cDbe8c`
- **Convex URL**: `https://good-monitor-677.convex.cloud`
- **Deployment**: `dev:good-monitor-677`

## Security Notes

- API keys are encrypted with AES-256-GCM
- Debug functions never expose actual API keys
- Only show key existence and validation status
- Admin functions require wallet signature verification