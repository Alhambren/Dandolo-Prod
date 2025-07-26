// Check Venice API model types directly
const API_KEY = "ve_70b85a28e0e5aa41e8e0de8b8b8c8b0e3fe9"; // Using a known working key

async function checkVeniceModelTypes() {
  try {
    console.log("🔍 Checking Venice API model types directly");
    console.log("=".repeat(50));
    
    const modelTypes = ['text', 'image', 'embedding', 'tts', 'upscale'];
    
    for (const modelType of modelTypes) {
      console.log(`\n📋 Fetching ${modelType} models:`);
      
      try {
        const response = await fetch(`https://api.venice.ai/api/v1/models?type=${modelType}`, {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          const models = data.data || [];
          
          console.log(`  Found ${models.length} models`);
          
          // Show specific models we're interested in
          models.forEach(model => {
            if (model.id.includes('embedding') || model.id.includes('upscal')) {
              console.log(`  ⚠️ ${model.id} - type: ${model.type}, model_type: ${modelType}`);
            }
          });
          
          // Show first few models
          if (models.length > 0) {
            console.log(`  Sample models:`);
            models.slice(0, 3).forEach(model => {
              console.log(`    - ${model.id} (type: ${model.type})`);
            });
          }
        } else {
          console.log(`  ❌ Error: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkVeniceModelTypes();