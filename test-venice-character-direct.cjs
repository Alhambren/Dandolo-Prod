const fetch = require('node-fetch');

async function testVeniceCharacterDirect() {
  const veniceApiKey = "-XEXr4K3QZFv5A_DZrNHbKDtn64JB6c4pHpaGGxbpa";
  
  console.log("🏇 Testing Venice.ai character connection directly...\n");
  
  try {
    const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${veniceApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b',
        messages: [
          { role: 'user', content: 'Hello! Can you give me advice about horses?' }
        ],
        venice_parameters: {
          character_slug: 'my-horse-advisor'
        }
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log("✅ Venice.ai character connection successful!");
      console.log("📝 Response:", result.choices[0].message.content.substring(0, 300) + "...");
      console.log("🤖 Model used:", result.model);
      
      // Check if character is working
      const responseText = result.choices[0].message.content.toLowerCase();
      const horseTerms = ['horse', 'equine', 'saddle', 'bridle', 'stable', 'mare', 'stallion', 'veterinary'];
      const hasHorseTerms = horseTerms.some(term => responseText.includes(term));
      
      if (hasHorseTerms) {
        console.log("🎯 Character working! Response contains horse-related terms!");
      } else {
        console.log("⚠️  Character might not be activated - no obvious horse terms detected.");
      }
      
      console.log("\n🔧 Exact API call that works:");
      console.log("POST https://api.venice.ai/api/v1/chat/completions");
      console.log("Headers: Authorization: Bearer [venice-api-key]");
      console.log("Body:", JSON.stringify({
        model: 'llama-3.3-70b',
        messages: [{ role: 'user', content: 'Hello! Can you give me advice about horses?' }],
        venice_parameters: { character_slug: 'my-horse-advisor' }
      }, null, 2));
      
    } else {
      const error = await response.text();
      console.error("❌ Venice.ai API call failed:", error);
    }
    
  } catch (error) {
    console.error("❌ Error testing Venice.ai directly:", error.message);
  }
}

testVeniceCharacterDirect();