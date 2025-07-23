#!/usr/bin/env node

console.log("Testing audit script setup...");
console.log("Current working directory:", process.cwd());
console.log("Node version:", process.version);

// Test basic functionality
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function testBasicQuery() {
  try {
    console.log("Testing npx convex run providers:list...");
    const { stdout } = await execPromise('npx convex run providers:list');
    const data = JSON.parse(stdout);
    console.log(`Found ${data.length} providers`);
    console.log("Basic query test: SUCCESS");
  } catch (error) {
    console.error("Basic query test: FAILED", error.message);
  }
}

testBasicQuery();