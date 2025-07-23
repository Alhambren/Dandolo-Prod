#!/bin/bash

echo "🎨 Running Image Generation Tests"
echo "================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Error: node_modules not found. Run 'npm install' first"
    exit 1
fi

# Set Convex URL if not set
if [ -z "$VITE_CONVEX_URL" ]; then
    export VITE_CONVEX_URL="https://deep-reindeer-817.convex.cloud"
    echo "ℹ️  Using default Convex URL: $VITE_CONVEX_URL"
fi

echo ""
echo "Starting image generation tests..."
echo ""

# Run the test script
node test-image-generation.js "$@"

echo ""
echo "Test completed."