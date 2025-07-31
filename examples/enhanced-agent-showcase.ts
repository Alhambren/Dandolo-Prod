#!/usr/bin/env tsx
/**
 * Enhanced Dandolo Agent SDK Showcase
 * 
 * This example demonstrates all the superior features that make Dandolo
 * the best AI agent integration platform, surpassing Venice.ai and OpenRoute.ai
 * 
 * Features demonstrated:
 * - Agent-specific instruction processing
 * - Superior streaming with metadata
 * - Secure API design with zero exposed secrets
 * - Context-aware conversations
 * - Intelligent model routing
 * - Enhanced error handling
 * - Workflow management
 * - Multi-format instruction support
 * 
 * Run with: npx tsx examples/enhanced-agent-showcase.ts
 */

import Dandolo from '../sdk/typescript/src/index';
import { AgentInstruction, StreamingChunk, ChatCompletionResponse } from '../sdk/typescript/src/types';

// ============================================================================
// Configuration & Setup
// ============================================================================

const client = new Dandolo({
  apiKey: process.env.DANDOLO_API_KEY || 'ak_demo_key_for_showcase',
  agentId: 'enhanced-showcase-agent-v1.0',
  debug: true, // Enable detailed logging
  agentEnhanced: true // Enable all agent features
});

// ============================================================================
// Example 1: Agent Instructions with Multi-Format Support
// ============================================================================

async function demonstrateAgentInstructions() {
  console.log('🎯 === Agent Instructions Demo ===\\n');

  const instructions: AgentInstruction[] = [
    {
      type: 'system_prompt',
      content: 'You are an expert technical writer who creates clear, comprehensive documentation.',
      metadata: {
        priority: 'high',
        temperature: 0.7,
        format: 'markdown'
      }
    },
    {
      type: 'context_injection', 
      content: 'Focus on practical examples and real-world applications.',
      metadata: {
        priority: 'medium',
        workflow_id: 'documentation-generation',
        step_id: 'context-setup'
      }
    },
    {
      type: 'workflow_step',
      content: 'Generate comprehensive documentation with code examples',
      metadata: {
        workflow_id: 'documentation-generation',
        step_id: 'content-generation',
        dependencies: ['context-setup'],
        tools: ['code_analysis', 'example_generation'],
        max_tokens: 2000
      }
    }
  ];

  try {
    const response = await client.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: 'Create documentation for a REST API endpoint that handles user authentication'
        }
      ],
      instructions: instructions,
      context_id: 'doc-session-123',
      workflow_id: 'documentation-generation',
      agent_options: {
        stream_mode: 'agent_enhanced',
        context_preservation: true,
        instruction_parsing: true,
        multi_step_workflow: true
      }
    });

    console.log('✅ Agent Instructions Response:');
    console.log(response.choices[0].message.content);
    
    // Show agent metadata (only available with agent keys)
    if (response.dandolo_agent) {
      console.log('\\n📊 Agent Metadata:');
      console.log(`- Agent ID: ${response.dandolo_agent.agent_id}`);
      console.log(`- Processing Time: ${response.dandolo_agent.processing_time_ms}ms`);
      console.log(`- Instructions Processed: ${response.dandolo_agent.instruction_count}`);
    }

  } catch (error) {
    console.error('❌ Agent Instructions Error:', error);
  }
}\n\n// ============================================================================\n// Example 2: Superior Streaming with Real-time Metadata\n// ============================================================================\n\nasync function demonstrateSuperiorStreaming() {\n  console.log('\\n⚡ === Superior Streaming Demo ===\\n');\n\n  const instructions: AgentInstruction[] = [\n    {\n      type: 'system_prompt',\n      content: 'You are a creative storyteller who writes engaging narratives with rich descriptions.',\n      metadata: {\n        priority: 'high',\n        temperature: 0.8\n      }\n    },\n    {\n      type: 'workflow_step',\n      content: 'Create a compelling story with character development',\n      metadata: {\n        workflow_id: 'story-generation',\n        step_id: 'narrative-creation',\n        tools: ['creative_writing', 'character_development']\n      }\n    }\n  ];\n\n  try {\n    let fullResponse = '';\n    let chunkCount = 0;\n    const startTime = Date.now();\n\n    await client.chat.completions.stream({\n      messages: [\n        {\n          role: 'user',\n          content: 'Write a short story about an AI agent that discovers creativity'\n        }\n      ],\n      instructions: instructions,\n      context_id: 'story-session-456',\n      workflow_id: 'story-generation',\n      agent_options: {\n        stream_mode: 'workflow_aware',\n        context_preservation: true,\n        instruction_parsing: true\n      }\n    }, {\n      mode: 'agent_enhanced',\n      onChunk: (chunk: StreamingChunk) => {\n        chunkCount++;\n        fullResponse += chunk.content;\n        \n        // Real-time streaming output\n        process.stdout.write(chunk.content);\n        \n        // Show enhanced metadata (unique to Dandolo)\n        if (chunk.agent_metadata && Object.keys(chunk.agent_metadata).length > 0) {\n          console.log(`\\n[METADATA] Processing state:`, chunk.agent_metadata);\n        }\n        \n        if (chunk.workflow_state && Object.keys(chunk.workflow_state).length > 0) {\n          console.log(`[WORKFLOW] Current step:`, chunk.workflow_state);\n        }\n        \n        if (chunk.instruction_feedback && chunk.instruction_feedback.length > 0) {\n          console.log(`[FEEDBACK] Instructions:`, chunk.instruction_feedback);\n        }\n      },\n      onComplete: (response: ChatCompletionResponse) => {\n        const elapsed = Date.now() - startTime;\n        console.log('\\n\\n✅ Streaming Complete!');\n        console.log(`📊 Stats: ${chunkCount} chunks, ${response.usage.total_tokens} tokens, ${elapsed}ms`);\n        \n        if (response.dandolo_agent) {\n          console.log(`🤖 Agent: ${response.dandolo_agent.agent_id}`);\n          console.log(`⚙️ Processing: ${response.dandolo_agent.processing_time_ms}ms`);\n        }\n      },\n      onError: (error) => {\n        console.error('\\n❌ Streaming Error:', error.message);\n        console.error('💡 Suggestions:', error.details?.suggestions || 'Check connection');\n      }\n    });\n\n  } catch (error) {\n    console.error('❌ Superior Streaming Error:', error);\n  }\n}\n\n// ============================================================================\n// Example 3: Context-Aware Multi-Turn Conversation\n// ============================================================================\n\nasync function demonstrateContextAwareConversation() {\n  console.log('\\n🧠 === Context-Aware Conversation Demo ===\\n');\n\n  const contextId = 'context-demo-789';\n  \n  // Create persistent context\n  const context = await client.context.create({\n    id: contextId,\n    settings: {\n      max_messages: 20,\n      max_tokens: 4000,\n      auto_summarize: true,\n      summarize_threshold: 15\n    }\n  });\n  \n  console.log(`📝 Created context: ${context.id}`);\n\n  // Multi-turn conversation with context preservation\n  const conversations = [\n    'My name is Alex and I\\'m building an AI agent for customer support.',\n    'What programming languages would you recommend for this project?',\n    'How can I implement the context management you mentioned?',\n    'What was my name again, and what am I building?'\n  ];\n\n  for (let i = 0; i < conversations.length; i++) {\n    console.log(`\\n💬 Turn ${i + 1}: ${conversations[i]}`);\n    \n    try {\n      const response = await client.chat.completions.create({\n        messages: [\n          {\n            role: 'user',\n            content: conversations[i],\n            context_id: contextId,\n            timestamp: Date.now()\n          }\n        ],\n        context_id: contextId,\n        instructions: [\n          {\n            type: 'context_injection',\n            content: 'Remember previous conversation context and user details',\n            metadata: {\n              priority: 'high',\n              context_window: 4000\n            }\n          }\n        ],\n        agent_options: {\n          context_preservation: true,\n          instruction_parsing: true\n        }\n      });\n\n      console.log(`🤖 Response: ${response.choices[0].message.content}`);\n      \n      // Show context usage\n      if (response.usage) {\n        console.log(`📊 Tokens: ${response.usage.total_tokens}`);\n      }\n\n    } catch (error) {\n      console.error(`❌ Context Error (Turn ${i + 1}):`, error);\n    }\n    \n    // Small delay between turns\n    await new Promise(resolve => setTimeout(resolve, 1000));\n  }\n}\n\n// ============================================================================\n// Example 4: Intelligent Model Routing\n// ============================================================================\n\nasync function demonstrateIntelligentModelRouting() {\n  console.log('\\n🎯 === Intelligent Model Routing Demo ===\\n');\n\n  const testCases = [\n    {\n      name: 'Code Generation',\n      input: 'Create a Python function to validate email addresses',\n      expectedType: 'code'\n    },\n    {\n      name: 'Creative Writing',\n      input: 'Write a haiku about artificial intelligence',\n      expectedType: 'chat'\n    },\n    {\n      name: 'Data Analysis',\n      input: 'Analyze this large dataset and provide insights on customer behavior patterns across multiple quarters',\n      expectedType: 'analysis'\n    },\n    {\n      name: 'Image Generation',\n      input: 'Create an image of a futuristic cityscape at sunset',\n      expectedType: 'image'\n    }\n  ];\n\n  for (const testCase of testCases) {\n    console.log(`\\n🧪 Testing: ${testCase.name}`);\n    \n    try {\n      // Get the best model for this task type\n      const bestModel = await client.models.getBest(testCase.expectedType as any);\n      console.log(`🎯 Best Model: ${bestModel.id} (${bestModel.type})`);\n      \n      // Use auto-select for intelligent routing\n      const response = await client.chat.completions.create({\n        messages: [\n          {\n            role: 'user',\n            content: testCase.input\n          }\n        ],\n        model: 'auto-select', // Let Dandolo choose the best model\n        instructions: [\n          {\n            type: 'system_prompt',\n            content: `Optimize for ${testCase.expectedType} generation`,\n            metadata: {\n              model_preference: bestModel.id,\n              priority: 'high'\n            }\n          }\n        ]\n      });\n\n      console.log(`✅ Model Used: ${response.model}`);\n      console.log(`📝 Response: ${response.choices[0].message.content.substring(0, 100)}...`);\n      \n    } catch (error) {\n      console.error(`❌ Model Routing Error (${testCase.name}):`, error);\n    }\n  }\n}\n\n// ============================================================================\n// Example 5: Enhanced Error Handling & Recovery\n// ============================================================================\n\nasync function demonstrateEnhancedErrorHandling() {\n  console.log('\\n🛡️ === Enhanced Error Handling Demo ===\\n');\n  \n  // Simulate various error scenarios\n  const errorScenarios = [\n    {\n      name: 'Invalid API Key',\n      client: new Dandolo({ apiKey: 'invalid_key_123' })\n    },\n    {\n      name: 'Rate Limit Test',\n      client: client, // Use main client\n      rapidRequests: true\n    },\n    {\n      name: 'Invalid Model',\n      client: client,\n      model: 'non-existent-model-xyz'\n    }\n  ];\n\n  for (const scenario of errorScenarios) {\n    console.log(`\\n🧪 Testing: ${scenario.name}`);\n    \n    try {\n      if (scenario.rapidRequests) {\n        // Make rapid requests to test rate limiting\n        const promises = Array(5).fill(0).map(async (_, i) => {\n          return scenario.client.chat.completions.create({\n            messages: [{ role: 'user', content: `Test message ${i}` }]\n          });\n        });\n        \n        await Promise.all(promises);\n        console.log('✅ All rapid requests succeeded');\n        \n      } else {\n        await scenario.client.chat.completions.create({\n          messages: [{ role: 'user', content: 'Hello' }],\n          ...(scenario.model && { model: scenario.model })\n        });\n        console.log('✅ Request succeeded unexpectedly');\n      }\n      \n    } catch (error: any) {\n      // Demonstrate enhanced error handling\n      console.log(`❌ Expected Error: ${error.type}`);\n      console.log(`🔍 Error Code: ${error.code}`);\n      console.log(`💬 Message: ${error.message}`);\n      \n      if (error.request_id) {\n        console.log(`🆔 Request ID: ${error.request_id}`);\n      }\n      \n      // Show error suggestions (unique to Dandolo)\n      if (error.details?.suggestions) {\n        console.log('💡 Suggestions:');\n        error.details.suggestions.forEach((suggestion: string, i: number) => {\n          console.log(`   ${i + 1}. ${suggestion}`);\n        });\n      }\n      \n      // Show retry information for rate limits\n      if (error.type === 'rate_limit_error' && client.rateLimit) {\n        console.log(`⏰ Rate Limit: ${client.rateLimit.remaining}/${client.rateLimit.limit}`);\n        console.log(`🔄 Reset: ${new Date(client.rateLimit.reset * 1000).toISOString()}`);\n      }\n    }\n    \n    // Small delay between tests\n    await new Promise(resolve => setTimeout(resolve, 500));\n  }\n}\n\n// ============================================================================\n// Example 6: Workflow Management & Multi-Step Processing\n// ============================================================================\n\nasync function demonstrateWorkflowManagement() {\n  console.log('\\n🔄 === Workflow Management Demo ===\\n');\n  \n  // Define a complex multi-step workflow\n  const workflow = {\n    id: 'research-and-write-workflow',\n    name: 'Research & Write Article',\n    description: 'A workflow that researches a topic and writes a comprehensive article',\n    version: '1.0',\n    steps: [\n      {\n        id: 'research',\n        name: 'Topic Research',\n        type: 'prompt',\n        config: {\n          instructions: [\n            {\n              type: 'system_prompt',\n              content: 'You are a thorough researcher who gathers comprehensive information.',\n              metadata: { priority: 'high', temperature: 0.3 }\n            }\n          ]\n        },\n        dependencies: []\n      },\n      {\n        id: 'outline',\n        name: 'Create Outline',\n        type: 'prompt',\n        config: {\n          instructions: [\n            {\n              type: 'context_injection',\n              content: 'Use the research findings to create a structured outline',\n              metadata: { workflow_id: 'research-and-write-workflow' }\n            }\n          ]\n        },\n        dependencies: ['research']\n      },\n      {\n        id: 'write',\n        name: 'Write Article',\n        type: 'prompt',\n        config: {\n          instructions: [\n            {\n              type: 'workflow_step',\n              content: 'Write a comprehensive article based on research and outline',\n              metadata: {\n                workflow_id: 'research-and-write-workflow',\n                step_id: 'write',\n                dependencies: ['research', 'outline'],\n                max_tokens: 2000\n              }\n            }\n          ]\n        },\n        dependencies: ['research', 'outline']\n      }\n    ]\n  };\n  \n  console.log(`🏗️ Workflow: ${workflow.name}`);\n  console.log(`📋 Steps: ${workflow.steps.map(s => s.name).join(' → ')}`);\n  \n  // Execute workflow steps with enhanced instructions\n  const topic = 'The future of AI agents in software development';\n  const workflowContext: Record<string, any> = {};\n  \n  for (const step of workflow.steps) {\n    console.log(`\\n⚙️ Executing: ${step.name}`);\n    \n    try {\n      // Build messages based on step and previous results\n      let stepPrompt = '';\n      switch (step.id) {\n        case 'research':\n          stepPrompt = `Research the topic: \"${topic}\". Provide key insights, current trends, and relevant examples.`;\n          break;\n        case 'outline':\n          stepPrompt = `Based on this research: \"${workflowContext.research}\", create a detailed outline for an article about \"${topic}\".`;\n          break;\n        case 'write':\n          stepPrompt = `Write a comprehensive article about \"${topic}\" using this outline: \"${workflowContext.outline}\" and research: \"${workflowContext.research}\".`;\n          break;\n      }\n      \n      const response = await client.chat.completions.create({\n        messages: [\n          {\n            role: 'user',\n            content: stepPrompt\n          }\n        ],\n        instructions: step.config.instructions,\n        workflow_id: workflow.id,\n        context_id: `workflow-${workflow.id}-execution`,\n        agent_options: {\n          multi_step_workflow: true,\n          context_preservation: true,\n          instruction_parsing: true\n        }\n      });\n      \n      // Store step result\n      workflowContext[step.id] = response.choices[0].message.content;\n      \n      console.log(`✅ ${step.name} completed`);\n      console.log(`📊 Tokens: ${response.usage.total_tokens}`);\n      console.log(`📝 Output: ${response.choices[0].message.content.substring(0, 150)}...`);\n      \n    } catch (error) {\n      console.error(`❌ Workflow Step Error (${step.name}):`, error);\n      break; // Stop workflow on error\n    }\n  }\n  \n  console.log('\\n🎉 Workflow completed!');\n  console.log(`📄 Final article length: ${workflowContext.write?.length || 0} characters`);\n}\n\n// ============================================================================\n// Main Demo Runner\n// ============================================================================\n\nasync function runCompleteShowcase() {\n  console.log('🚀 DANDOLO AGENT SDK - COMPLETE SHOWCASE');\n  console.log('=========================================');\n  console.log('🎯 Demonstrating features that surpass Venice.ai and OpenRoute.ai\\n');\n  \n  // Test connection first\n  console.log('🔍 Testing connection...');\n  const connectionTest = await client.test();\n  if (connectionTest.success) {\n    console.log('✅ Connection successful!\\n');\n  } else {\n    console.log('❌ Connection failed:', connectionTest.message);\n    console.log('💡 This is expected with demo credentials\\n');\n  }\n  \n  // Show current usage (if connected)\n  try {\n    const usage = await client.usage();\n    console.log('📊 Current Usage:');\n    console.log(`   Daily: ${usage.daily_usage}/${usage.daily_limit}`);\n    console.log(`   Type: ${usage.key_type}`);\n    console.log(`   Remaining: ${usage.remaining}\\n`);\n  } catch (error) {\n    console.log('📊 Usage info not available (demo mode)\\n');\n  }\n  \n  // Run all demonstrations\n  try {\n    await demonstrateAgentInstructions();\n    await demonstrateSuperiorStreaming();\n    await demonstrateContextAwareConversation();\n    await demonstrateIntelligentModelRouting();\n    await demonstrateEnhancedErrorHandling();\n    await demonstrateWorkflowManagement();\n    \n    console.log('\\n🎉 === SHOWCASE COMPLETE ===');\n    console.log('\\n✨ Key advantages over Venice.ai and OpenRoute.ai:');\n    console.log('   🎯 Agent-first design with instruction support');\n    console.log('   ⚡ Superior streaming with real-time metadata');\n    console.log('   🧠 Automatic context management');\n    console.log('   🤖 Intelligent model routing');\n    console.log('   🛡️ Enhanced error handling with suggestions');\n    console.log('   🔄 Built-in workflow management');\n    console.log('   🔒 Zero-trust security architecture');\n    console.log('   📊 Comprehensive observability');\n    console.log('\\n💎 Experience the most joyful AI agent SDK ever created!');\n    \n  } catch (error) {\n    console.error('❌ Showcase Error:', error);\n  }\n}\n\n// Run the complete showcase\nif (require.main === module) {\n  runCompleteShowcase().catch(console.error);\n}\n\nexport {\n  demonstrateAgentInstructions,\n  demonstrateSuperiorStreaming,\n  demonstrateContextAwareConversation,\n  demonstrateIntelligentModelRouting,\n  demonstrateEnhancedErrorHandling,\n  demonstrateWorkflowManagement,\n  runCompleteShowcase\n};"}