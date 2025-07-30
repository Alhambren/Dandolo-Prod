// Test script to simulate the exact provider selection logic
function selectProvider(providers) {
    const randomIndex = Math.floor(Math.random() * providers.length);
    return { index: randomIndex, provider: providers[randomIndex] };
}

const providers = [
    { name: "Test 2", id: "kd7afcwrxrxggxtvtj7pyyp75h7m5bk1" },
    { name: "Test Local", id: "kd7ac2khc9qyb5sdky5qn8acsn7m6x7p" }
];

console.log("Simulating provider selection logic:");
console.log("Provider 0: Test 2");
console.log("Provider 1: Test Local");
console.log("");

const results = { 0: 0, 1: 0 };
const iterations = 100;

for (let i = 0; i < iterations; i++) {
    const selection = selectProvider(providers);
    results[selection.index]++;
    
    if (i < 20) {
        console.log(`Selection ${i+1}: Index ${selection.index} (${selection.provider.name})`);
    }
}

console.log(`\nResults after ${iterations} iterations:`);
console.log(`Test 2 (index 0): ${results[0]} times (${(results[0]/iterations*100).toFixed(1)}%)`);
console.log(`Test Local (index 1): ${results[1]} times (${(results[1]/iterations*100).toFixed(1)}%)`);

// Check for bias
const bias = Math.max(results[0], results[1]) / iterations;
if (bias > 0.7) {
    console.log(`⚠️  POTENTIAL BIAS: ${(bias*100).toFixed(1)}% toward one provider`);
} else if (bias > 0.6) {
    console.log(`⚡ SLIGHT BIAS: ${(bias*100).toFixed(1)}% toward one provider (within normal range)`);
} else {
    console.log(`✅ Distribution appears balanced`);
}

// Test rapid succession (like concurrent requests)
console.log("\nTesting rapid succession (simulating concurrent requests):");
const rapidResults = { 0: 0, 1: 0 };
const start = Date.now();
for (let i = 0; i < 50; i++) {
    const selection = selectProvider(providers);
    rapidResults[selection.index]++;
}
const end = Date.now();

console.log(`Rapid test results (${end - start}ms):`);
console.log(`Test 2: ${rapidResults[0]} times (${(rapidResults[0]/50*100).toFixed(1)}%)`);
console.log(`Test Local: ${rapidResults[1]} times (${(rapidResults[1]/50*100).toFixed(1)}%)`);