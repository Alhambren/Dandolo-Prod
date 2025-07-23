#!/bin/bash
echo "Checking TypeScript compilation for Convex..."
cd /Users/pjkershaw/Dandolo-Prod
npx tsc -p convex --noEmit
echo "TypeScript check completed."