#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('Testing TypeScript compilation...');

const tsc = spawn('npx', ['tsc', '-p', 'convex', '--noEmit'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

tsc.on('close', (code) => {
  if (code === 0) {
    console.log('✅ TypeScript compilation successful!');
  } else {
    console.log(`❌ TypeScript compilation failed with code ${code}`);
  }
  process.exit(code);
});

tsc.on('error', (err) => {
  console.error('Failed to run TypeScript compiler:', err);
  process.exit(1);
});