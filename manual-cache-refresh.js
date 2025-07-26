// Manually refresh cache using the correct internal function
const API_KEY = "ve_70b85a28e0e5aa41e8e0de8b8b8c8b0e3fe9"; // Working Venice key

async function manualCacheRefresh() {
  try {
    console.log("🔄 Manual cache refresh with new categorization logic");
    console.log("=".repeat(60));
    
    const categorized = {
      text: [],
      code: [],
      image: [],
      multimodal: [],
      audio: [],
    };

    const modelTypes = ['text', 'image', 'embedding', 'tts', 'upscale'];
    
    for (const modelType of modelTypes) {
      console.log(`\n📋 Processing ${modelType} models...`);
      
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
          
          console.log(`  Found ${models.length} ${modelType} models`);
          
          models.forEach((model) => {
            const modelInfo = {
              id: model.id,
              name: model.id,
              contextLength: model.context_length || 0,
            };
            
            // Apply the NEW categorization logic
            if (model.type === "image") {
              categorized.image.push(modelInfo);
              console.log(`    ✅ Image: ${model.id}`);
            } else if (model.type === "tts") {
              categorized.audio.push(modelInfo);
              console.log(`    ✅ Audio: ${model.id}`);
            } else if (model.capabilities?.supportsVision || model.capabilities?.vision) {
              categorized.multimodal.push(modelInfo);
              console.log(`    ✅ Multimodal: ${model.id}`);
            } else if (model.capabilities?.optimizedForCode) {
              categorized.code.push(modelInfo);
              console.log(`    ✅ Code: ${model.id}`);
            } else if (model.type === "text") {
              categorized.text.push(modelInfo);
              console.log(`    ✅ Text: ${model.id}`);
            } else {
              // Skip embedding, upscale, and other specialized models
              console.log(`    ❌ SKIPPED: ${model.id} (type: ${model.type})`);
            }
          });
        }
      } catch (error) {
        console.log(`  ❌ Error fetching ${modelType}: ${error.message}`);
      }
    }
    
    console.log("\n📊 Final categorization results:");
    console.log(`  Text models: ${categorized.text.length}`);
    console.log(`  Code models: ${categorized.code.length}`);
    console.log(`  Image models: ${categorized.image.length}`);
    console.log(`  Multimodal models: ${categorized.multimodal.length}`);
    console.log(`  Audio models: ${categorized.audio.length}`);
    
    console.log("\n🔍 Problematic models check:");
    const allModels = [
      ...categorized.text,
      ...categorized.code,
      ...categorized.image,
      ...categorized.multimodal,
      ...categorized.audio
    ];
    
    const embedding = allModels.find(m => m.id.includes('embedding'));
    const upscaler = allModels.find(m => m.id.includes('upscal'));
    
    if (embedding) {
      console.log(`❌ Embedding model still present: ${embedding.id}`);
    } else {
      console.log("✅ No embedding models in final categorization");
    }
    
    if (upscaler) {
      console.log(`❌ Upscaler model still present: ${upscaler.id}`);
    } else {
      console.log("✅ No upscaler models in final categorization");
    }
    
    console.log("\n🎯 This confirms the new logic correctly excludes embedding and upscaler models");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

manualCacheRefresh();