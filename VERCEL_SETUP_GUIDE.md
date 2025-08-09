# 🚀 Critical Vercel Console Configuration for API Subdomain

## ⚠️ MUST DO AFTER DEPLOYMENT

### 1. **Add Custom Domain** (CRITICAL!)
**Navigate to:** [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Domains

**Steps:**
1. Click **"Add Domain"**
2. Enter: **`api.dandolo.ai`**
3. Click **"Add"**
4. Vercel will verify your DNS CNAME record
5. Wait for SSL certificate auto-provisioning (10-60 minutes)

**Expected Result:**
```
✅ api.dandolo.ai → dandolo-prod.vercel.app (Active)
✅ dandolo.ai → dandolo-prod.vercel.app (Active)
```

### 2. **Environment Variables Verification**
Go to Settings → Environment Variables and confirm:
```
NODE_ENV = production
VITE_CONVEX_URL = https://judicious-hornet-148.convex.cloud
```

### 3. **Functions Configuration** (Recommended)
Go to Settings → Functions:
- **Maximum Duration:** 30 seconds
- **Regions:** Auto (or closest to your users)

## 🔧 Project Structure (Already Configured)
```
dandolo-prod/
├── api/
│   └── v1/
│       └── chat/
│           └── completions.js   ✅ API handler
├── dist/                        ✅ Built React app
├── vercel.json                  ✅ Updated with API routing
└── package.json                 ✅ Build configuration
```

## 🧪 Verification Steps (After Domain Setup)

### Test New API Endpoint:
```bash
# Should return 401/405 (not 404!) - means it's working
curl https://api.dandolo.ai/v1/chat/completions

# Test with proper request
curl -X POST https://api.dandolo.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```

### Test Main Site:
```bash
# Should return your React app
curl https://dandolo.ai
```

## ⚠️ Common Issues & Solutions

### "Invalid Configuration" Error:
- **Cause:** DNS hasn't propagated yet
- **Solution:** Wait 15-30 minutes, then refresh Vercel

### "SSL Provisioning" Status:
- **Normal:** Takes 10-60 minutes
- **Vercel uses Let's Encrypt automatically**

### API Routes Return 404:
- **Check:** `api/v1/chat/completions.js` exists in repo
- **Check:** Latest commit is deployed
- **Check:** Build completed successfully

## 🎯 Success Indicators

**In Vercel Console:**
- ✅ `api.dandolo.ai` shows as "Active"
- ✅ SSL certificate shows green checkmark
- ✅ Latest deployment successful

**API Testing:**
- ✅ `curl https://api.dandolo.ai/v1/chat/completions` returns HTTP 401/405
- ✅ Main site `https://dandolo.ai` loads React app
- ✅ Legacy endpoint still works as fallback

## 📞 Need Help?

If you see any issues:
1. Check Vercel dashboard for deployment errors
2. Verify DNS CNAME record is correct
3. Wait for SSL certificate provisioning
4. Run test scripts from repository

The API subdomain migration is **code-complete** ✅ - only Vercel console configuration remains!