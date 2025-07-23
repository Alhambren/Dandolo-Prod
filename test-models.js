const { ConvexHttpClient } = require('convex/browser');
const client = new ConvexHttpClient(process.env.CONVEX_URL || 'https://capricious-walrus-506.convex.cloud');

async function testModels() {
  try {
    console.log('Testing model cache and Venice.ai connectivity...');
    
    // Get model cache health
    const health = await client.query('models:getModelCacheHealth', {});
    console.log('Model cache health:', JSON.stringify(health, null, 2));
    
    // Get available models
    const models = await client.query('models:getAvailableModels', {});
    console.log('\nTotal cached models:', models.length);
    
    const imageModels = models.filter(m => m.type === 'image');
    console.log('Image models found:', imageModels.length);
    console.log('Image model IDs:', imageModels.map(m => m.id));
    
    // Test Venice.ai connectivity
    console.log('\nTesting Venice.ai API connectivity...');
    const veniceTest = await client.action('models:testVeniceAPI', {});
    console.log('Venice API test result:', JSON.stringify(veniceTest, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testModels();