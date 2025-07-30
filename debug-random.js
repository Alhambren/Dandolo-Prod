// Test script to check random distribution
console.log("Testing Math.random() distribution:");

const iterations = 100;
const buckets = { 0: 0, 1: 0 };

for (let i = 0; i < iterations; i++) {
    const randomIndex = Math.floor(Math.random() * 2);
    buckets[randomIndex]++;
}

console.log(`Results after ${iterations} iterations:`);
console.log(`Index 0: ${buckets[0]} times (${(buckets[0]/iterations*100).toFixed(1)}%)`);
console.log(`Index 1: ${buckets[1]} times (${(buckets[1]/iterations*100).toFixed(1)}%)`);

// Check if distribution is heavily biased (>80% to one side)
const bias = Math.max(buckets[0], buckets[1]) / iterations;
if (bias > 0.8) {
    console.log(`⚠️  BIAS DETECTED: ${(bias*100).toFixed(1)}% bias toward one option`);
} else {
    console.log(`✅ Distribution appears normal`);
}

console.log("\nTesting with provider count of 2 (like in the system):");
for (let i = 0; i < 20; i++) {
    const randomIndex = Math.floor(Math.random() * 2);
    console.log(`Session ${i+1}: Provider ${randomIndex} selected`);
}