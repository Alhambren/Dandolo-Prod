const { ConvexHttpClient } = require("convex/browser");

async function testCharacterConnection() {
  const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL || "https://judicious-hornet-148.convex.cloud");
  
  try {
    console.log("🏇 Testing Venice.ai character connection with 'my-horse-advisor'...\n");
    
    // Test the route action with venice_parameters including character_slug
    const result = await client.action("inference:route", {
      messages: [
        { role: "user", content: "Hello! Can you give me some advice about horses?" }
      ],
      intent: "chat",
      sessionId: `test-character-${Date.now()}`,
      isAnonymous: true,
      venice_parameters: {
        character_slug: "my-horse-advisor",
        include_venice_system_prompt: true
      }
    });
    
    console.log("✅ Character connection test successful!");
    console.log("📝 Response:", result.response);
    console.log("🤖 Model used:", result.model);
    console.log("🔢 Total tokens:", result.totalTokens);
    console.log("🏪 Provider:", result.provider);
    
    // Check if the response seems to be from the horse advisor character
    const response = result.response.toLowerCase();
    const horseTerms = ['horse', 'equine', 'saddle', 'bridle', 'stable', 'mare', 'stallion', 'colt', 'filly'];
    const hasHorseTerms = horseTerms.some(term => response.includes(term));
    
    if (hasHorseTerms) {
      console.log("🎯 Character appears to be working - response contains horse-related terms!");
    } else {
      console.log("⚠️  Character might not be fully activated - no obvious horse-related terms detected.");
    }
    
  } catch (error) {
    console.error("❌ Character connection test failed:");
    console.error(error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

testCharacterConnection();