// Simple test to check API key validation
const testApiKey = "dk_123456789abcdef123456789abcdef123456789abcdef";
const convexUrl = "https://good-monitor-677.convex.cloud";

console.log("Testing API key validation...");
console.log("Test key:", testApiKey);
console.log("Convex URL:", convexUrl);

// Test the validation endpoint by making a request
fetch(`${convexUrl}/v1/chat/completions`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${testApiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    messages: [{"role": "user", "content": "Hello"}],
    model: "auto-select",
    temperature: 0.7,
    max_tokens: 100
  })
}).then(response => {
  console.log("Response status:", response.status);
  return response.text();
}).then(text => {
  console.log("Response body:", text);
}).catch(error => {
  console.error("Error:", error.message);
});