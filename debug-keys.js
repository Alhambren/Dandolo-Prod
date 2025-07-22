// Test Convex directly with npx convex dev
console.log("Run these commands to test API keys:");
console.log("");
console.log("1. Create API key:");
console.log('npx convex dev --run apiKeys:createApiKey --arg address "0xC07481520d98c32987cA83B30EAABdA673cDbe8c" --arg name "Test Key" --arg keyType "developer"');
console.log("");
console.log("2. Check if any keys exist:");
console.log('npx convex dev --run apiKeys:getApiKeyStats --arg address "0xC07481520d98c32987cA83B30EAABdA673cDbe8c"');
console.log("");
console.log("3. Validate a specific key:");
console.log('npx convex dev --run apiKeys:validateKey --arg key "dk_YOUR_KEY_HERE"');