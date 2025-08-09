# API Subdomain Deployment Guide

This guide walks through deploying the new `api.dandolo.ai` subdomain setup.

## ✅ Completed Implementation

The following has been successfully implemented:

### 1. **Serverless Function** ✅
- Created `api/v1/chat/completions.js` with enhanced monitoring headers
- Updated `vercel.json` with function configuration
- Includes proper error handling and response time tracking

### 2. **Documentation Updates** ✅
- Updated `README.md` with new API endpoint throughout
- Updated `DeveloperDocs.tsx` with new endpoint examples
- Updated `DeveloperPortal.tsx` and `ModelDetailPage.tsx`
- Added prominent notices about the new endpoint

### 3. **Frontend API Client** ✅
- Created `src/lib/api.ts` with fallback support
- Implements automatic failover between primary and legacy endpoints
- Includes comprehensive error handling and monitoring
- Updated `.env.example` with new configuration options

### 4. **Testing Infrastructure** ✅
- Created comprehensive test suite: `test-api-subdomain.js`
- Created quick verification script: `verify-api-setup.sh`
- Created simple endpoint test: `test-new-endpoint.sh`

## 🚀 Deployment Steps

### Phase 1: DNS Configuration

**You need to configure DNS records in your DNS provider:**

```dns
# Option A: CNAME Record (Recommended)
Type: CNAME
Name: api
Value: dandolo-prod.vercel.app
TTL: 3600

# Option B: A Record (Alternative)
Type: A
Name: api  
Value: 76.76.21.21
TTL: 3600
```

**Verification:**
```bash
nslookup api.dandolo.ai
# Should resolve to Vercel's infrastructure
```

### Phase 2: Vercel Custom Domain

**Add custom domain in Vercel Dashboard:**

1. Go to your Vercel project settings
2. Navigate to "Domains" section
3. Add `api.dandolo.ai` as a custom domain
4. Vercel will provide verification instructions if needed
5. Wait for SSL certificate provisioning (automatic, up to 24 hours)

### Phase 3: Deploy Code Changes

**Deploy all code changes:**
```bash
# Commit all changes
git add .
git commit -m "Implement api.dandolo.ai subdomain with fallback support"

# Push to trigger Vercel deployment
git push origin main
```

### Phase 4: Verification

**Run test scripts:**
```bash
# Quick verification
./verify-api-setup.sh

# Comprehensive test suite  
node test-api-subdomain.js

# Test with API key (replace with real key)
TEST_API_KEY=dk_your_key node test-api-subdomain.js
```

## 📊 Expected Results

### DNS Propagation Timeline
- **Initial Setup**: 15 minutes - 2 hours
- **Global Propagation**: Up to 48 hours
- **SSL Certificate**: Usually within 1 hour of domain verification

### Working Endpoints
Once configured, both endpoints will work:
- ✅ `https://api.dandolo.ai/v1/chat/completions` (Primary)
- ✅ `https://dandolo-prod.vercel.app/api/v1/chat/completions` (Fallback)

### Response Headers
The new endpoint includes monitoring headers:
```
X-Dandolo-Version: 1.0.0
X-Dandolo-Endpoint: api.dandolo.ai
X-Response-Time: 1247
```

## 🔧 Troubleshooting

### DNS Not Resolving
```bash
# Check DNS propagation
dig api.dandolo.ai
nslookup api.dandolo.ai

# Clear local DNS cache
sudo dscacheutil -flushcache  # macOS
ipconfig /flushdns             # Windows
```

### SSL Certificate Issues
- Check domain ownership in Vercel
- Verify no CAA records blocking Let's Encrypt  
- Wait up to 24 hours for automatic provisioning

### 405 Method Not Allowed
- Verify serverless function path matches request
- Check `vercel.json` configuration
- Ensure function exports default handler

## 🔄 Migration Strategy

### Week 1: Parallel Operation
- [x] Both endpoints active
- [x] Update documentation to prefer new endpoint
- [ ] Monitor traffic distribution

### Week 2: Soft Deprecation  
- [ ] Add deprecation header to old endpoint
- [ ] Email API key holders about migration
- [ ] Update all examples to use new endpoint

### Week 3: Traffic Redirect
- [ ] Add 301 redirect from old to new endpoint  
- [ ] Monitor for failed requests
- [ ] Support both in client libraries

### Week 4: Full Migration
- [ ] Old endpoint returns deprecation notice
- [ ] All traffic on new endpoint
- [ ] Remove old endpoint references

## 📈 Monitoring

### Key Metrics to Track
- Request volume per endpoint
- Response times (X-Response-Time header)
- Error rates by endpoint
- SSL certificate expiry
- DNS resolution success rate

### Health Checks
```bash
# Automated monitoring script
*/5 * * * * /path/to/verify-api-setup.sh >> /var/log/api-health.log
```

## ✅ Post-Deployment Checklist

- [ ] DNS records configured and propagated
- [ ] Vercel custom domain added and verified  
- [ ] SSL certificate active and valid
- [ ] Primary endpoint responding (api.dandolo.ai)
- [ ] Fallback endpoint still working
- [ ] CORS headers configured correctly
- [ ] Authentication working properly
- [ ] Monitoring headers present
- [ ] Documentation updated
- [ ] Test scripts passing

## 🆘 Emergency Rollback

If issues occur:

1. **DNS Rollback**: Remove api.dandolo.ai DNS records
2. **Code Rollback**: 
   ```bash
   git revert <commit-hash>
   git push origin main
   ```
3. **Client Fallback**: Frontend automatically falls back to legacy endpoint

The fallback system ensures zero downtime during migration.

---

**Contact for issues:**
- GitHub Issues: Your repository issues
- Documentation: Updated at https://api.dandolo.ai
- Status: Monitor at https://dandolo.ai/providers