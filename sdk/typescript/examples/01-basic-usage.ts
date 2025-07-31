/**
 * Example 1: Basic Usage
 * 
 * Demonstrates the zero-configuration setup and basic usage
 * of the Dandolo SDK with superior error handling and
 * developer experience.
 */

import Dandolo from '../src/index';

async function basicUsageExample() {
  console.log('🚀 Dandolo SDK - Basic Usage Example');
  console.log('====================================\n');

  // 1. Zero-Configuration Setup
  console.log('1. Setting up Dandolo client...');
  
  const client = new Dandolo({
    apiKey: process.env.DANDOLO_API_KEY || 'ak_your_agent_key_here',
    // That's it! No complex configuration needed
    // The SDK automatically:
    // - Detects agent vs developer keys
    // - Sets optimal defaults
    // - Configures retry and error handling
  });

  // Test connection
  console.log('   Testing connection...');
  const connectionTest = await client.test();
  console.log(`   ✅ Connection: ${connectionTest.message}\n`);

  // 2. Simple Chat Completion
  console.log('2. Simple chat completion...');
  
  try {
    const response = await client.chat.completions.create({
      messages: [
        { role: 'user', content: 'Explain quantum computing in simple terms' }
      ]
      // Model auto-selected based on your API key and content
      // Temperature optimized for the task
    });

    console.log('   🤖 Response:', response.choices[0]?.message.content);
    console.log('   📊 Usage:', response.usage);
    
    if (response.dandolo_agent) {
      console.log('   🎯 Agent Enhanced Features:', {
        processing_time: response.dandolo_agent.processing_time_ms + 'ms',
        instructions_processed: response.dandolo_agent.instruction_count
      });
    }
    
  } catch (error) {
    // Superior error handling with actionable suggestions
    console.error('❌ Error:', error.message);
    
    if (error.suggestions) {
      console.log('💡 Suggestions:');
      error.suggestions.forEach((suggestion: string, i: number) => {
        console.log(`   ${i + 1}. ${suggestion}`);
      });
    }
  }

  console.log();

  // 3. Enhanced Streaming
  console.log('3. Enhanced streaming with metadata...');
  
  let streamedContent = '';
  
  await client.chat.completions.stream({
    messages: [
      { role: 'user', content: 'Write a short story about AI' }
    ]
  }, {
    onChunk: (chunk) => {
      if (chunk.content) {
        process.stdout.write(chunk.content);
        streamedContent += chunk.content;
      }
      
      // Enhanced metadata available during streaming
      if (chunk.agent_metadata) {
        console.log('\n   📡 Agent Metadata:', chunk.agent_metadata);
      }
    },
    onComplete: (response) => {
      console.log('\n\n   ✅ Streaming complete!');
      console.log('   📊 Final Usage:', response.usage);
      console.log('   📝 Total Content Length:', streamedContent.length);
    },
    onError: (error) => {
      console.error('   ❌ Streaming Error:', error.message);
    }
  });

  console.log();

  // 4. Smart Model Selection
  console.log('4. Smart model selection...');
  
  // Get the best model for different tasks
  const chatModel = await client.models.getBest('chat');
  const codeModel = await client.models.getBest('code');
  
  console.log('   💬 Best Chat Model:', chatModel.id);
  console.log('   💻 Best Code Model:', codeModel.id);
  
  // Use specialized model for code
  const codeResponse = await client.chat.completions.create({
    model: codeModel.id,
    messages: [
      { role: 'user', content: 'Write a TypeScript function to calculate factorial' }
    ]
  });
  
  console.log('   🔢 Code Response:', codeResponse.choices[0]?.message.content);

  console.log();

  // 5. Usage and Billing Information
  console.log('5. Usage and billing information...');
  
  const usage = await client.usage();
  console.log('   📈 Usage Stats:', {
    daily_usage: usage.daily_usage,
    daily_limit: usage.daily_limit,
    remaining: usage.remaining,
    key_type: usage.key_type
  });

  console.log();

  // 6. Real-time Rate Limit Monitoring
  console.log('6. Rate limit monitoring...');
  
  client.on('rate_limit_exceeded', (error) => {
    console.log('   ⚠️ Rate limit exceeded:', error.message);
    console.log('   🕐 Reset time:', new Date(error.reset_time || Date.now()));
  });
  
  client.on('response', (response) => {
    if (client.rateLimit) {
      console.log('   📊 Rate Limit Status:', {
        remaining: client.rateLimit.remaining,
        limit: client.rateLimit.limit,
        type: client.rateLimit.type
      });
    }
  });

  console.log('✨ Basic usage example completed!\n');
}

// Comparison with other SDKs
function comparisonWithOtherSdks() {
  console.log('🔄 Comparison with Other SDKs');
  console.log('==============================\n');

  console.log(`
📝 OpenAI SDK:
   ❌ Complex configuration required
   ❌ Basic error messages
   ❌ No intelligent model selection
   ❌ Limited streaming metadata
   ❌ No built-in rate limit handling

🚀 Dandolo SDK:
   ✅ Zero-configuration setup
   ✅ Actionable error suggestions
   ✅ Intelligent model auto-selection
   ✅ Rich streaming metadata
   ✅ Built-in rate limit monitoring
   ✅ Agent-enhanced capabilities
   ✅ Superior developer experience

💡 Venice.ai/OpenRoute.ai:
   ❌ Basic streaming implementation
   ❌ No agent orchestration
   ❌ Limited framework integrations
   ❌ Basic context management

🎯 Dandolo Advantages:
   ✅ Advanced streaming protocols
   ✅ Multi-agent orchestration
   ✅ Framework-agnostic adapters
   ✅ Intelligent context optimization
   ✅ Production-ready monitoring
  `);
}

// Run the example
if (require.main === module) {
  basicUsageExample()
    .then(() => comparisonWithOtherSdks())
    .catch(console.error);
}

export { basicUsageExample };