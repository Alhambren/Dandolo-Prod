const fetch = require('node-fetch');

async function testAPICharacterConnection() {
  try {
    console.log("🏇 Testing API endpoint with 'my-horse-advisor' character...\n");
    
    const response = await fetch('https://dandolo-prod.vercel.app/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dk_test1234567890abcdef' // Using a developer key
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b',
        messages: [
          { role: 'user', content: 'What should I know about buying my first horse?' }
        ],
        venice_parameters: {
          character_slug: 'my-horse-advisor',
          include_venice_system_prompt: true
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    const result = await response.json();
    
    console.log("✅ API character connection test successful!");
    console.log("📝 Response:", result.choices[0].message.content);
    console.log("🤖 Model used:", result.model);
    console.log("🔢 Total tokens:", result.usage.total_tokens);
    
    // Check if the response seems to be from the horse advisor character
    const responseText = result.choices[0].message.content.toLowerCase();
    const horseTerms = ['horse', 'equine', 'saddle', 'bridle', 'stable', 'mare', 'stallion', 'veterinary', 'breeding'];
    const hasHorseTerms = horseTerms.some(term => responseText.includes(term));
    
    if (hasHorseTerms) {
      console.log("🎯 Character appears to be working via API - response contains horse-related terms!");
    } else {
      console.log("⚠️  Character might not be fully activated via API - no obvious horse-related terms detected.");
    }
    
  } catch (error) {
    console.error("❌ API character connection test failed:");
    console.error(error.message);
  }
}

testAPICharacterConnection();