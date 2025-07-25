#!/bin/bash

echo "🔒 DANDOLO SECURITY AUDIT - PRODUCTION BUILD"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PREVIEW_URL="http://localhost:4173"
PASSED=0
FAILED=0

# Helper function for test results
check_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

echo "1. 🏗️  BUILD SECURITY CHECKS"
echo "-----------------------------"

# Check for environment files in build
ENV_FILES=$(find dist -name "*.env*" 2>/dev/null | wc -l)
check_result $([[ $ENV_FILES -eq 0 ]] && echo 0 || echo 1) "No .env files in build output"

# Check for source maps
SOURCE_MAPS=$(find dist -name "*.map" 2>/dev/null | wc -l)
check_result $([[ $SOURCE_MAPS -eq 0 ]] && echo 0 || echo 1) "No source maps in production build"

# Check for sensitive keys
SECRETS=$(grep -r "sk-\|CONVEX_DEPLOY_KEY\|private.*key" dist/ 2>/dev/null | wc -l)
check_result $([[ $SECRETS -eq 0 ]] && echo 0 || echo 1) "No hardcoded secrets in build"

# Check file permissions
SECURE_PERMS=$(find dist -type f -perm +044 | wc -l)
check_result $([[ $SECURE_PERMS -gt 0 ]] && echo 0 || echo 1) "Build files have secure permissions"

echo ""
echo "2. 🌐 SERVER RESPONSE CHECKS"
echo "-----------------------------"

# Check if preview server is running
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $PREVIEW_URL 2>/dev/null)
check_result $([[ $HTTP_STATUS -eq 200 ]] && echo 0 || echo 1) "Preview server responds with 200 OK"

# Check for security headers (when deployed, these should be added by Vercel)
CONTENT_TYPE=$(curl -s -I $PREVIEW_URL 2>/dev/null | grep -i "content-type" | grep "text/html")
check_result $([[ -n "$CONTENT_TYPE" ]] && echo 0 || echo 1) "Proper Content-Type header set"

# Check for sensitive data in homepage
SENSITIVE_DATA=$(curl -s $PREVIEW_URL 2>/dev/null | grep -E "sk-|vn_|password|secret" | wc -l)
check_result $([[ $SENSITIVE_DATA -eq 0 ]] && echo 0 || echo 1) "No sensitive data exposed on homepage"

echo ""
echo "3. 🔗 API ENDPOINT CHECKS"
echo "-------------------------"

# Check if API endpoints return proper errors (not 500s with stack traces)
API_ERROR=$(curl -s -o /dev/null -w "%{http_code}" $PREVIEW_URL/api/nonexistent 2>/dev/null)
check_result $([[ $API_ERROR -eq 404 ]] && echo 0 || echo 1) "API returns proper 404 for invalid endpoints"

echo ""
echo "4. 📦 BUILD OPTIMIZATION CHECKS"
echo "-------------------------------"

# Check build size (should be reasonable)
BUILD_SIZE_MB=$(du -sm dist/ | cut -f1)
check_result $([[ $BUILD_SIZE_MB -lt 50 ]] && echo 0 || echo 1) "Build size is reasonable (<50MB): ${BUILD_SIZE_MB}MB"

# Check for minification
MINIFIED=$(find dist -name "*.js" -exec grep -l "console.log\|debugger\|//.*TODO" {} \; 2>/dev/null | wc -l)
check_result $([[ $MINIFIED -eq 0 ]] && echo 0 || echo 1) "No debug code or comments in production build"

echo ""
echo "5. 🛡️  CONVEX CONFIGURATION CHECKS"
echo "----------------------------------"

# Check Convex URL is production
CONVEX_URL=$(grep -r "convex.cloud" dist/ | grep -o "https://[^\"]*convex.cloud" | head -1)
check_result $([[ "$CONVEX_URL" == "https://judicious-hornet-148.convex.cloud" ]] && echo 0 || echo 1) "Convex URL points to production: $CONVEX_URL"

# Check no development endpoints
DEV_ENDPOINTS=$(grep -r "localhost\|127.0.0.1\|dev.*convex" dist/ 2>/dev/null | wc -l)
check_result $([[ $DEV_ENDPOINTS -eq 0 ]] && echo 0 || echo 1) "No development endpoints in build"

echo ""
echo "📊 SECURITY AUDIT SUMMARY"
echo "========================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL SECURITY CHECKS PASSED!${NC}"
    echo "Your build is ready for production deployment."
    echo ""
    echo "Next steps:"
    echo "1. Run 'npm run build' to ensure latest changes"
    echo "2. Deploy to Vercel with: vercel --prod"
    echo "3. Configure DNS to point dandolo.ai to Vercel"
else
    echo -e "${RED}⚠️  SECURITY ISSUES FOUND!${NC}"
    echo "Please address the failed checks before deploying to production."
fi

echo ""
echo "Manual checks to perform:"
echo "• Open http://localhost:4173 and test wallet connection"
echo "• Test API key generation after wallet authentication"
echo "• Verify chat interface works properly"
echo "• Check browser console for any errors"
echo "• Test on mobile devices for responsive design"