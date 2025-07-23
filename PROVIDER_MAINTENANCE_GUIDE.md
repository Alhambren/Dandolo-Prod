# Provider Maintenance and Troubleshooting Guide

## Overview

This guide provides practical commands and procedures for ongoing maintenance and troubleshooting of the provider validation system in Dandolo.ai.

## Quick Reference Commands

### System Health Check

```bash
# 1. Run comprehensive provider analysis
node debug-provider-validation.js

# 2. Check Convex deployment status
npx convex logs --tail

# 3. Test API endpoints
curl -X POST "https://dandolo-prod.vercel.app/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```

### Provider Status Commands

```javascript
// Run these in Convex dashboard console or via client

// Get all providers with detailed status
const providers = await api.providers.list();
console.log(`Total providers: ${providers.length}`);
console.log(`Active: ${providers.filter(p => p.isActive).length}`);
console.log(`Inactive: ${providers.filter(p => !p.isActive).length}`);

// Get provider health statistics
providers.forEach(p => {
  console.log(`${p.name}: ${p.isActive ? '✅' : '❌'} - VCU: $${p.vcuBalance || 0}`);
});
```

## Common Maintenance Tasks

### 1. Manual Provider Activation

**When to use:** Provider has valid API key but is marked inactive due to validation issues.

```javascript
// Get provider details first
const provider = await api.providers.adminDebugProvider({
  providerId: "j57abc123def456"  // Replace with actual ID
});

console.log("Provider Status:", provider);

// Activate provider manually
const result = await api.providers.adminActivateProviderAction({
  providerId: "j57abc123def456",  // Replace with actual ID
  reason: "Manual activation after validation fix",
  overrideValidation: false  // Set to true only if absolutely necessary
});

console.log("Activation Result:", result);
```

**Safe Activation Checklist:**
- [ ] Provider has legitimate Venice.ai API key
- [ ] API key is >20 characters long
- [ ] Provider name is not placeholder (dummy/test/fake)
- [ ] Wallet address is valid
- [ ] No duplicate API keys in system

### 2. Provider Health Monitoring

**Check individual provider health:**

```javascript
// Get detailed provider status
const status = await api.providers.adminDebugProvider({
  providerId: "j57abc123def456"
});

console.log("Provider Details:", {
  name: status.provider.name,
  active: status.provider.isActive,
  balance: status.provider.vcuBalance,
  failures: status.provider.consecutiveFailures,
  lastCheck: new Date(status.provider.lastHealthCheck).toLocaleString()
});

console.log("Recent Health Checks:", status.recentHealthChecks);
```

**Batch health check:**

```bash
# Run comprehensive health analysis
node debug-provider-validation.js > health-report-$(date +%Y%m%d).log

# View the report
cat health-report-*.log
```

### 3. API Key Validation Testing

**Test API key format validation:**

```javascript
// Test various API key formats (run in Convex console)
const testKeys = [
  "vn_1234567890abcdef1234567890abcdef",
  "sk-1234567890abcdef1234567890abcdef", 
  "test1234567890abcdef1234567890abcdef",  // Should work (32+ chars)
  "short123"  // Should fail (<20 chars)
];

for (const key of testKeys) {
  const result = await api.providers.validateVeniceApiKey({ apiKey: key });
  console.log(`Key: ${key.substring(0,10)}... → ${result.isValid ? '✅' : '❌'} ${result.error || ''}`);
}
```

**Test Venice.ai API connectivity:**

```bash
# Direct API test (replace YOUR_KEY with actual Venice.ai key)
curl -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     https://api.venice.ai/api/v1/models

# Test balance endpoint
curl -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     https://api.venice.ai/api/v1/api_keys/rate_limits
```

### 4. Provider Registration Debugging

**Debug failed registration:**

```javascript
// Check for common registration issues
const address = "0x1234..."; // Wallet address

// 1. Check if address already has provider
const existingProvider = await api.providers.checkExistingProvider({ address });
if (existingProvider) {
  console.log("Error: Address already has provider:", existingProvider.name);
}

// 2. Check API key format
const apiKey = "user_provided_key";
const formatValid = await api.crypto.validateApiKeyFormat({ apiKey });
console.log("API key format valid:", formatValid);

// 3. Test API key with Venice.ai
const validation = await api.providers.validateVeniceApiKey({ apiKey });
console.log("Venice.ai validation:", validation);
```

### 5. System Performance Monitoring

**Check provider distribution:**

```javascript
// Get provider usage statistics
const activeProviders = await api.providers.listActive();
const providerStats = await Promise.all(
  activeProviders.map(async p => {
    const stats = await api.providers.getStats({ providerId: p._id });
    return {
      name: p.name,
      prompts: stats.totalPrompts || 0,
      balance: p.vcuBalance || 0,
      points: stats.points || 0
    };
  })
);

// Sort by usage
providerStats.sort((a, b) => b.prompts - a.prompts);
console.table(providerStats);
```

**Monitor inference distribution:**

```javascript
// Check recent inferences
const recentInferences = await api.inference.getRecentInferences({ limit: 10 });
const providerUsage = {};

recentInferences.forEach(inf => {
  providerUsage[inf.providerId] = (providerUsage[inf.providerId] || 0) + 1;
});

console.log("Provider Usage Distribution:", providerUsage);
```

## Troubleshooting Common Issues

### Issue: No Active Providers

**Symptoms:**
- API requests failing with "No providers available"
- Debug script shows 0 active providers

**Diagnosis:**
```bash
node debug-provider-validation.js
```

**Solutions:**

1. **Identify inactive providers with VCU:**
```javascript
const providers = await api.providers.list();
const inactiveWithBalance = providers.filter(p => !p.isActive && p.vcuBalance > 0);

console.log("Inactive providers with VCU:", inactiveWithBalance);
```

2. **Manual activation:**
```javascript
// For each inactive provider with balance
for (const provider of inactiveWithBalance) {
  const result = await api.providers.adminActivateProviderAction({
    providerId: provider._id,
    reason: "Emergency activation - system has no active providers"
  });
  console.log(`Activated ${provider.name}:`, result);
}
```

### Issue: High Validation Error Rate

**Symptoms:**
- Many provider registrations failing
- Users reporting "Invalid API key" errors for valid keys

**Diagnosis:**
```bash
# Check recent logs for validation patterns
npx convex logs --tail | grep -i "validation"
```

**Solutions:**

1. **Check Venice.ai API status:**
```bash
curl -I https://api.venice.ai/api/v1/models
# Should return 200 OK or 401 (but not 500/503)
```

2. **Test validation with known good key:**
```javascript
const testResult = await api.providers.validateVeniceApiKey({
  apiKey: "known_working_key_here"
});
console.log("Test validation result:", testResult);
```

3. **Temporarily lower validation thresholds** (emergency only):
```javascript
// This would require code change in crypto.ts
// Consider if validation is too strict
```

### Issue: Provider Health Checks Failing

**Symptoms:**
- Providers being marked inactive frequently
- Good providers showing as unhealthy

**Diagnosis:**
```javascript
// Check health check history
const healthHistory = await api.providers.getHealthHistory({
  providerId: "provider_id_here",
  limit: 20
});

console.log("Recent health checks:", healthHistory);
```

**Solutions:**

1. **Manual health check:**
```bash
# Test Venice.ai API directly with provider key
curl -H "Authorization: Bearer PROVIDER_API_KEY" \
     https://api.venice.ai/api/v1/models
```

2. **Reset provider status:**
```javascript
await api.providers.adminActivateProviderAction({
  providerId: "provider_id_here",
  reason: "Reset after health check investigation"
});
```

### Issue: Balance Detection Problems

**Symptoms:**
- Provider balances showing as $0.00
- "Balance detection failed" warnings

**Diagnosis:**
```javascript
const provider = await api.providers.adminDebugProvider({
  providerId: "provider_id_here"
});

// Test balance detection manually
const validation = await api.providers.validateVeniceApiKey({
  apiKey: "decrypted_api_key_here"
});

console.log("Balance detection result:", validation);
```

**Solutions:**

1. **Test Venice.ai balance endpoint:**
```bash
curl -H "Authorization: Bearer API_KEY" \
     https://api.venice.ai/api/v1/api_keys/rate_limits
```

2. **Manual balance update:**
```javascript
// If balance is known from external source
await api.providers.updateVCUBalance({
  providerId: "provider_id_here",
  vcuBalance: 25.00  // Known balance
});
```

## Emergency Procedures

### Complete System Recovery

If the entire provider system is down:

1. **Assess damage:**
```bash
node debug-provider-validation.js
```

2. **Identify recovery candidates:**
```javascript
const providers = await api.providers.list();
const recoveryCandidates = providers.filter(p => 
  !p.isActive && 
  p.vcuBalance > 0 && 
  !p.name.toLowerCase().includes('test')
);
```

3. **Mass activation (use with caution):**
```javascript
for (const provider of recoveryCandidates.slice(0, 5)) { // Limit to 5
  try {
    const result = await api.providers.adminActivateProviderAction({
      providerId: provider._id,
      reason: "Emergency system recovery",
      overrideValidation: true  // Only if necessary
    });
    console.log(`Activated ${provider.name}`);
  } catch (error) {
    console.error(`Failed to activate ${provider.name}:`, error);
  }
}
```

### Rollback Procedure

If new validation changes cause issues:

1. **Immediate mitigation:**
```bash
# Use admin functions to activate known good providers
# While preparing code rollback
```

2. **Code rollback:**
```bash
# Revert to previous validation logic
git revert HEAD  # If last commit was the problem
# Or restore specific files from git history
```

3. **Verify recovery:**
```bash
node debug-provider-validation.js
# Should show restored provider functionality
```

## Maintenance Schedule

### Daily (Development Phase)
- [ ] Run `debug-provider-validation.js`
- [ ] Check active provider count
- [ ] Monitor error logs

### Weekly (Production)
- [ ] Comprehensive provider health review
- [ ] Performance metrics analysis
- [ ] User feedback evaluation

### Monthly (Ongoing)
- [ ] System optimization review
- [ ] Validation threshold tuning
- [ ] Provider ecosystem health assessment

## Automation Scripts

### Health Check Automation

Save as `scripts/provider-health.js`:
```javascript
#!/usr/bin/env node
const { ConvexHttpClient } = require("convex/browser");
const { api } = require("../convex/_generated/api.js");

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

async function healthCheck() {
  const providers = await client.query(api.providers.list);
  const active = providers.filter(p => p.isActive).length;
  
  if (active < 2) {
    console.error("ALERT: Only", active, "active providers!");
    // Could send notification here
  } else {
    console.log("OK:", active, "active providers");
  }
}

healthCheck().catch(console.error);
```

### Usage Monitoring Script

Save as `scripts/monitor-usage.js`:
```javascript
#!/usr/bin/env node
// Monitor provider usage distribution and alert if unbalanced
// Implementation similar to health check script
```

## Contact and Escalation

### When to Escalate
- **System down >15 minutes:** No active providers
- **Validation failure rate >50%:** Major system issue
- **Data corruption detected:** Provider data inconsistencies
- **Security concerns:** Potential API key exposure

### Emergency Contacts
- **Primary Developer:** [Contact Info]
- **System Administrator:** [Contact Info] 
- **Venice.ai Support:** [API Support Channel]

---

**Remember:** Always test changes in development environment first
**Document:** Log all manual interventions and their outcomes
**Monitor:** Watch system behavior after any maintenance actions