const results = [
"kd7afcwrxrxggxtvtj7pyyp75h7m5bk1",
"kd7afcwrxrxggxtvtj7pyyp75h7m5bk1",
"kd7ac2khc9qyb5sdky5qn8acsn7m6x7p",
"kd7afcwrxrxggxtvtj7pyyp75h7m5bk1",
"kd7ac2khc9qyb5sdky5qn8acsn7m6x7p",
"kd7ac2khc9qyb5sdky5qn8acsn7m6x7p",
"kd7afcwrxrxggxtvtj7pyyp75h7m5bk1",
"kd7afcwrxrxggxtvtj7pyyp75h7m5bk1",
"kd7afcwrxrxggxtvtj7pyyp75h7m5bk1",
"kd7ac2khc9qyb5sdky5qn8acsn7m6x7p",
"kd7ac2khc9qyb5sdky5qn8acsn7m6x7p",
"kd7ac2khc9qyb5sdky5qn8acsn7m6x7p",
"kd7afcwrxrxggxtvtj7pyyp75h7m5bk1",
"kd7afcwrxrxggxtvtj7pyyp75h7m5bk1",
"kd7afcwrxrxggxtvtj7pyyp75h7m5bk1",
"kd7afcwrxrxggxtvtj7pyyp75h7m5bk1",
"kd7ac2khc9qyb5sdky5qn8acsn7m6x7p",
"kd7afcwrxrxggxtvtj7pyyp75h7m5bk1",
"kd7ac2khc9qyb5sdky5qn8acsn7m6x7p",
"kd7ac2khc9qyb5sdky5qn8acsn7m6x7p"
];

const provider1 = "kd7afcwrxrxggxtvtj7pyyp75h7m5bk1"; // Test 2
const provider2 = "kd7ac2khc9qyb5sdky5qn8acsn7m6x7p"; // Test Local

const count1 = results.filter(r => r === provider1).length;
const count2 = results.filter(r => r === provider2).length;

console.log("Provider Selection Results:");
console.log(`Test 2 (${provider1.substring(0, 8)}...): ${count1} times (${(count1/results.length*100).toFixed(1)}%)`);
console.log(`Test Local (${provider2.substring(0, 8)}...): ${count2} times (${(count2/results.length*100).toFixed(1)}%)`);
console.log(`Total: ${results.length} selections`);

if (Math.abs(count1 - count2) > 4) {
    console.log("⚠️  Significant imbalance detected!");
} else {
    console.log("✅ Distribution within normal range");
}