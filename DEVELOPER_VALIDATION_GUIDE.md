# Developer Guide: Provider Validation System

## Overview

This guide explains the new provider validation logic for developers working on the Dandolo.ai codebase. It covers the validation flow, debugging tools, and best practices for maintaining the system.

## Architecture Overview

### Validation Flow

```
User Registration → Format Validation → Venice.ai API Test → Encryption → Storage
                                    ↓
Provider Selection ← Health Monitoring ← Auto-Activation ← Balance Detection
```

### Key Components

1. **Format Validation** (`/convex/crypto.ts`)
2. **API Validation** (`/convex/providers.ts`)
3. **Health Monitoring** (`/convex/providers.ts`)
4. **Debug Tools** (`/debug-provider-validation.js`)

## Validation Logic Breakdown

### 1. Format Validation (`validateApiKeyFormat`)

**Location:** `/convex/crypto.ts:50-75`

**Purpose:** Basic format checks before expensive API calls

```typescript
export function validateApiKeyFormat(apiKey: string): boolean {
  const cleanKey = apiKey.trim();
  
  // Must be at least 20 characters
  if (cleanKey.length < 20) return false;
  
  // Must contain only valid characters
  const validCharacters = /^[a-zA-Z0-9_-]+$/;
  if (!validCharacters.test(cleanKey)) return false;
  
  // Accept known prefixes OR 32+ character keys
  const validPrefixes = ['vn_', 'sk-', 'pk-', 'ak-', 'api_', 'key_'];
  const hasValidPrefix = validPrefixes.some(prefix => cleanKey.startsWith(prefix));
  
  return hasValidPrefix || cleanKey.length >= 32;
}
```

**Key Changes from Previous Version:**
- ✅ Reduced minimum length: 30 → 20 characters
- ✅ Added support for multiple prefixes
- ✅ Fallback for unprefixed long keys
- ✅ Allow hyphens and underscores

### 2. Venice.ai API Validation (`validateVeniceApiKey`)

**Location:** `/convex/providers.ts:209-370`

**Purpose:** Verify API key works with Venice.ai and detect balance

```typescript
export const validateVeniceApiKey = action({
  args: { apiKey: v.string() },
  handler: async (_ctx, args) => {
    const key = args.apiKey.trim();
    
    // 1. Block non-Venice API keys
    const BLOCKED_PREFIXES = ['sk-', 'claude-', 'hf_', 'gsk_', 'xai-'];
    for (const prefix of BLOCKED_PREFIXES) {
      if (key.startsWith(prefix)) {
        return { isValid: false, error: `This is a ${getProviderName(prefix)} key` };
      }
    }
    
    // 2. Test connection to Venice.ai
    const response = await fetch("https://api.venice.ai/api/v1/models", {
      headers: { "Authorization": `Bearer ${key}` }
    });
    
    if (response.ok) {
      // 3. Verify Venice.ai response patterns
      const data = await response.json();
      const hasVeniceModel = data.data?.some(model => 
        ['venice-', 'v-', 'model-'].some(prefix => 
          model.id?.toLowerCase().includes(prefix)
        )
      );
      
      // 4. Attempt balance detection
      const balanceResult = await detectBalance(key);
      
      return {
        isValid: true,
        balance: balanceResult.balance,
        models: data.data?.length || 0,
        warning: balanceResult.warning
      };
    }
    
    return { isValid: false, error: "Invalid Venice.ai API key" };
  }
});
```

**Key Features:**
- ✅ **Provider Detection:** Identifies non-Venice API keys
- ✅ **Balance Detection:** Attempts to get VCU balance
- ✅ **Flexible Parsing:** Handles multiple response formats
- ✅ **Error Context:** Provides specific failure reasons

### 3. Balance Detection Logic

**Enhanced Balance Parsing:**
```typescript
// Multiple fallback patterns for Venice.ai balance responses
if (balanceData.balance !== undefined) {
  balanceUSD = parseFloat(balanceData.balance) || 0;
} else if (balanceData.vcu_balance !== undefined) {
  balanceUSD = parseFloat(balanceData.vcu_balance) || 0;
} else if (balanceData.balances?.VCU !== undefined) {
  balanceUSD = parseFloat(balanceData.balances.VCU) || 0;
} else if (balanceData.credits !== undefined) {
  balanceUSD = parseFloat(balanceData.credits) || 0;
}
// ... additional patterns
```

**Why Multiple Patterns:** Venice.ai API responses vary, so we check all possible locations.

### 4. Health Monitoring System

**Consecutive Failure Tracking:**
```typescript
export const updateProviderStatus = internalMutation({
  handler: async (ctx, args) => {
    const currentFailures = provider.consecutiveFailures || 0;
    
    if (args.healthCheckPassed) {
      // Reset failures and reactivate
      await ctx.db.patch(args.providerId, {
        consecutiveFailures: 0,
        isActive: true
      });
    } else {
      // Increment failures, mark inactive after 2
      const newFailures = currentFailures + 1;
      const shouldMarkInactive = newFailures >= 2;
      
      await ctx.db.patch(args.providerId, {
        consecutiveFailures: newFailures,
        isActive: shouldMarkInactive ? false : provider.isActive
      });
    }
  }
});
```

**Key Features:**
- **Tolerance:** Allows 1 failure before marking inactive
- **Auto-Recovery:** Healthy providers automatically reactivate
- **Tracking:** Records detailed health history

## Database Schema Updates

### Enhanced Provider Table

```typescript
providers: defineTable({
  // ... existing fields ...
  encryptionVersion: v.optional(v.number()), // 1=XOR, 2=AES-256-GCM
  consecutiveFailures: v.optional(v.number()),
  markedInactiveAt: v.optional(v.number()),
  lastHealthCheck: v.optional(v.number()),
})
```

### Health Tracking Table

```typescript
providerHealth: defineTable({
  providerId: v.id("providers"),
  status: v.boolean(),
  responseTime: v.number(),
  timestamp: v.number(),
  error: v.optional(v.string()),
})
```

## Debugging and Monitoring

### Debug Script Usage

**Run Provider Analysis:**
```bash
node debug-provider-validation.js
```

**Sample Output:**
```
🔍 Debugging Provider Validation Issues
=====================================
📊 Found 8 total providers:

✅ Active providers: 3
❌ Inactive providers: 5

🔴 INACTIVE PROVIDERS:
======================
1. TestProvider
   ID: j57abc123def456
   VCU Balance: $25.00
   Issues: Has VCU balance but inactive
   Manual Activation Command:
   await client.action(api.providers.adminActivateProviderAction, {
     providerId: "j57abc123def456",
     reason: "Manual activation after validation fix"
   });
```

### Admin Functions

**Manual Provider Activation:**
```javascript
// Get detailed provider status
const status = await api.providers.adminDebugProvider({
  providerId: "j57abc123def456"
});

// Activate provider manually
const result = await api.providers.adminActivateProviderAction({
  providerId: "j57abc123def456",
  reason: "Manual activation after investigation",
  overrideValidation: false
});
```

**Comprehensive Provider Debug:**
```javascript
const debugInfo = await api.providers.adminDebugProvider({
  providerId: "j57abc123def456"
});

console.log({
  provider: debugInfo.provider,
  points: debugInfo.points,
  recentHealthChecks: debugInfo.recentHealthChecks
});
```

## Error Handling Patterns

### Validation Error Messages

**Before (Generic):**
```
"Invalid API key format"
```

**After (Specific):**
```
"This appears to be an Anthropic API key. Dandolo requires Venice.ai keys for decentralized compute. Get your key from venice.ai"
```

### Error Categories

1. **Format Errors:**
   - Too short
   - Invalid characters
   - Wrong provider

2. **API Errors:**
   - Connection failed
   - Invalid key
   - Rate limited

3. **System Errors:**
   - Duplicate key
   - Database issues
   - Encryption failures

## Testing Patterns

### Unit Testing Format Validation

```javascript
// Test valid formats
const validKeys = [
  "vn_1234567890abcdef1234567890",
  "sk-1234567890abcdef1234567890abcdef",
  "test1234567890abcdef1234567890abcdef" // 32+ chars
];

validKeys.forEach(key => {
  assert(validateApiKeyFormat(key), `Should accept ${key}`);
});

// Test invalid formats
const invalidKeys = [
  "short123",
  "sk-toolShort",
  "invalid@characters#here"
];

invalidKeys.forEach(key => {
  assert(!validateApiKeyFormat(key), `Should reject ${key}`);
});
```

### Integration Testing API Validation

```javascript
// Test with actual Venice.ai key
const result = await api.providers.validateVeniceApiKey({
  apiKey: process.env.TEST_VENICE_KEY
});

assert(result.isValid, "Valid Venice.ai key should be accepted");
assert(typeof result.balance === 'number', "Should return numeric balance");

// Test with invalid key
const invalidResult = await api.providers.validateVeniceApiKey({
  apiKey: "invalid_key_123"
});

assert(!invalidResult.isValid, "Invalid key should be rejected");
assert(typeof invalidResult.error === 'string', "Should return error message");
```

## Performance Considerations

### Validation Caching

**Consider caching for frequently validated keys:**
```typescript
// Potential optimization (not implemented yet)
const validationCache = new Map<string, ValidationResult>();

export function validateWithCache(apiKey: string) {
  const hash = createSecureHash(apiKey);
  
  if (validationCache.has(hash)) {
    return validationCache.get(hash);
  }
  
  const result = validateApiKey(apiKey);
  validationCache.set(hash, result);
  return result;
}
```

### Health Check Optimization

**Current frequency:** Every 15 minutes via cron
**Optimization opportunities:**
- Adaptive frequency based on provider reliability
- Batch health checks to reduce API calls
- Circuit breaker pattern for consistently failing providers

## Security Considerations

### API Key Encryption

**New Providers (AES-256-GCM):**
```typescript
const encryptionResult = await ctx.runAction(internal.cryptoSecure.encryptApiKey, {
  apiKey: cleanApiKey
});
// Stores: encrypted, iv, authTag
```

**Legacy Providers (XOR - Deprecated):**
```typescript
// Still supported for migration but not used for new providers
const decrypted = decryptLegacyXOR(encrypted, salt);
```

### Fingerprinting for Duplicate Detection

```typescript
export function createApiKeyFingerprint(apiKey: string): string {
  const suffix = apiKey.slice(-8);
  const hash = createSecureHash(apiKey);
  return `${hash}_${suffix}`;
}
```

**Why this approach:**
- Prevents duplicate keys without storing plaintext
- Uses secure hashing + suffix for collision resistance
- Allows verification without decryption

## Best Practices for Developers

### Adding New Validation Rules

1. **Test thoroughly** with real Venice.ai keys
2. **Provide specific error messages** for failures
3. **Consider backward compatibility** with existing providers
4. **Add debug logging** for troubleshooting
5. **Document expected behavior** and edge cases

### Modifying Health Checks

1. **Test failure scenarios** manually
2. **Ensure recovery mechanisms** work correctly
3. **Monitor impact** on provider availability
4. **Consider rate limits** and API costs
5. **Add admin override** capabilities

### Database Migrations

1. **Support legacy formats** during transition
2. **Provide migration scripts** for existing data
3. **Test with production-like data** volumes
4. **Plan rollback procedures** if needed
5. **Monitor performance** impact

## Common Pitfalls and Solutions

### Issue: Overly Strict Validation

**Problem:** Legitimate providers being rejected
**Solution:** Use fallback patterns and admin override functions

### Issue: Venice.ai API Changes

**Problem:** Balance detection or model listing fails
**Solution:** Multiple parsing patterns and graceful degradation

### Issue: Performance Degradation

**Problem:** Too many API calls during validation
**Solution:** Implement caching and batch operations

### Issue: Security Vulnerabilities

**Problem:** API key exposure or weak encryption
**Solution:** Use AES-256-GCM and secure fingerprinting

## Migration Guide

### From Previous Version

1. **API Key Handling:**
   - Old: XOR encryption with salt
   - New: AES-256-GCM with IV and auth tag

2. **Validation Logic:**
   - Old: Strict 30+ character requirement
   - New: Flexible 20+ with prefix checking

3. **Health Monitoring:**
   - Old: Single failure = inactive
   - New: 2+ consecutive failures = inactive

4. **Error Messages:**
   - Old: Generic validation errors
   - New: Provider-specific guidance

## Future Enhancements

### Planned Improvements

1. **Adaptive Validation:** ML-based API key pattern recognition
2. **Load Balancing:** Intelligent provider selection based on performance
3. **Circuit Breakers:** Automatic failure isolation and recovery
4. **Monitoring Dashboard:** Real-time provider health visualization
5. **Auto-Scaling:** Dynamic provider pool management

### Contributing Guidelines

1. **Follow existing patterns** for consistency
2. **Add comprehensive tests** for new features
3. **Update documentation** with changes
4. **Consider backward compatibility** impact
5. **Get review** for security-related changes

---

**Remember:** The validation system is critical infrastructure. Test thoroughly and monitor closely after changes.

**Documentation:** Keep this guide updated as the system evolves.

**Support:** Use the debug tools and monitoring commands for troubleshooting.