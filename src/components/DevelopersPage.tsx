import { useState } from "react";
import { GlassCard } from "./GlassCard";
import { toast } from "sonner";

export function DevelopersPage() {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'sdk' | 'api' | 'examples'>('overview');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sdk', label: 'SDK' },
    { id: 'api', label: 'API Reference' },
    { id: 'examples', label: 'Examples' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
          Developer Documentation
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Integrate Dandolo.ai into your applications with our SDK and APIs. 
          Build AI agents, automate workflows, and scale your AI infrastructure.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center">
        <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          <GlassCard>
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Getting Started</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">1</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">Get API Key</h3>
                  <p className="text-gray-300">Generate your API key from the dashboard</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">2</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">Install SDK</h3>
                  <p className="text-gray-300">Add our SDK to your project</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">3</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">Start Building</h3>
                  <p className="text-gray-300">Integrate AI into your applications</p>
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Features</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center space-x-3">
                    <span className="text-green-400">✓</span>
                    <span>Automatic provider routing</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="text-green-400">✓</span>
                    <span>Real-time response streaming</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="text-green-400">✓</span>
                    <span>Built-in error handling</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="text-green-400">✓</span>
                    <span>Usage analytics</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="text-green-400">✓</span>
                    <span>Webhook support</span>
                  </li>
                </ul>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Use Cases</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center space-x-3">
                    <span className="text-purple-400">🤖</span>
                    <span>AI Agents & Chatbots</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="text-blue-400">📊</span>
                    <span>Data Analysis Tools</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="text-green-400">✍️</span>
                    <span>Content Generation</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="text-pink-400">🔍</span>
                    <span>Search & Recommendations</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="text-yellow-400">⚡</span>
                    <span>Workflow Automation</span>
                  </li>
                </ul>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* SDK Tab */}
      {selectedTab === 'sdk' && (
        <div className="space-y-6">
          <GlassCard>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">JavaScript/TypeScript SDK</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Installation</h3>
                  <div className="bg-gray-900 rounded-lg p-4 relative">
                    <code className="text-green-400">npm install @dandolo/sdk</code>
                    <button
                      onClick={() => copyToClipboard("npm install @dandolo/sdk")}
                      className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Basic Usage</h3>
                  <div className="bg-gray-900 rounded-lg p-4 relative">
                    <pre className="text-sm text-gray-300 overflow-x-auto">
{`import { DandoloSDK } from '@dandolo/sdk';

const dandolo = new DandoloSDK({
  apiKey: 'your-api-key',
  baseUrl: 'https://accomplished-malamute-324.convex.cloud',
  wallet: 'your-wallet-address'
});

// Send a prompt
const response = await dandolo.prompt({
  message: 'Explain quantum computing',
  model: 'gpt-4'
});

console.log(response.text);`}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(`import { DandoloSDK } from '@dandolo/sdk';

const dandolo = new DandoloSDK({
  apiKey: 'your-api-key',
  wallet: 'your-wallet-address'
});

// Send a prompt
const response = await dandolo.prompt({
  message: 'Explain quantum computing',
  model: 'gpt-4'
});

console.log(response.text);`)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Advanced Features</h3>
                  <div className="bg-gray-900 rounded-lg p-4 relative">
                    <pre className="text-sm text-gray-300 overflow-x-auto">
{`// Streaming responses
const stream = await dandolo.promptStream({
  message: 'Write a long story',
  model: 'gpt-4'
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}

// Batch processing
const responses = await dandolo.batchPrompt([
  { message: 'Translate: Hello', model: 'gpt-3.5-turbo' },
  { message: 'Summarize: ...', model: 'gpt-4' }
]);

// Check balance
const balance = await dandolo.getBalance();
console.log(\`Points remaining: \${balance}\`);`}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(`// Streaming responses
const stream = await dandolo.promptStream({
  message: 'Write a long story',
  model: 'gpt-4'
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}

// Batch processing
const responses = await dandolo.batchPrompt([
  { message: 'Translate: Hello', model: 'gpt-3.5-turbo' },
  { message: 'Summarize: ...', model: 'gpt-4' }
]);

// Check balance
const balance = await dandolo.getBalance();
console.log(\`Points remaining: \${balance}\`);`)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* API Reference Tab */}
      {selectedTab === 'api' && (
        <div className="space-y-6">
          <GlassCard>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">REST API Reference</h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Authentication</h3>
                  <p className="text-gray-300 mb-4">Include your API key in the Authorization header:</p>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <code className="text-green-400">Authorization: Bearer your-api-key</code>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">POST /api/v1/prompt</h3>
                  <p className="text-gray-300 mb-4">Send a prompt to the AI network</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-white font-medium mb-2">Request Body:</h4>
                      <div className="bg-gray-900 rounded-lg p-4">
                        <pre className="text-sm text-gray-300">
{`{
  "message": "Your prompt here",
  "model": "gpt-4",
  "stream": false,
  "max_tokens": 1000
}`}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-white font-medium mb-2">Response:</h4>
                      <div className="bg-gray-900 rounded-lg p-4">
                        <pre className="text-sm text-gray-300">
{`{
  "id": "prompt_123",
  "text": "AI response here",
  "provider": "AI Provider Alpha",
  "tokens": 150,
  "cost": 1,
  "response_time": 1200
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">GET /api/v1/balance</h3>
                  <p className="text-gray-300 mb-4">Check your points balance</p>
                  
                  <div>
                    <h4 className="text-white font-medium mb-2">Response:</h4>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <pre className="text-sm text-gray-300">
{`{
  "balance": 1500,
  "total_spent": 2500,
  "last_activity": "2024-01-15T10:30:00Z"
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Rate Limits</h3>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <ul className="text-yellow-200 space-y-1">
                      <li>• 100 requests per minute</li>
                      <li>• 1000 requests per hour</li>
                      <li>• 10,000 requests per day</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Examples Tab */}
      {selectedTab === 'examples' && (
        <div className="space-y-6">
          <GlassCard>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Code Examples</h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">AI Chatbot Integration</h3>
                  <div className="bg-gray-900 rounded-lg p-4 relative">
                    <pre className="text-sm text-gray-300 overflow-x-auto">
{`import { DandoloSDK } from '@dandolo/sdk';

class AIChatbot {
  constructor(apiKey) {
    this.dandolo = new DandoloSDK({ apiKey });
  }

  async handleMessage(userMessage, context = []) {
    const prompt = this.buildPrompt(userMessage, context);
    
    const response = await this.dandolo.prompt({
      message: prompt,
      model: 'gpt-4',
      max_tokens: 500
    });

    return {
      message: response.text,
      cost: response.cost,
      provider: response.provider
    };
  }

  buildPrompt(message, context) {
    const contextStr = context.map(c => 
      \`User: \${c.user}\\nBot: \${c.bot}\`
    ).join('\\n');
    
    return \`\${contextStr}\\nUser: \${message}\\nBot:\`;
  }
}

// Usage
const bot = new AIChatbot('your-api-key');
const response = await bot.handleMessage('Hello!');
console.log(response.message);`}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(`import { DandoloSDK } from '@dandolo/sdk';

class AIChatbot {
  constructor(apiKey) {
    this.dandolo = new DandoloSDK({ apiKey });
  }

  async handleMessage(userMessage, context = []) {
    const prompt = this.buildPrompt(userMessage, context);
    
    const response = await this.dandolo.prompt({
      message: prompt,
      model: 'gpt-4',
      max_tokens: 500
    });

    return {
      message: response.text,
      cost: response.cost,
      provider: response.provider
    };
  }

  buildPrompt(message, context) {
    const contextStr = context.map(c => 
      \`User: \${c.user}\\nBot: \${c.bot}\`
    ).join('\\n');
    
    return \`\${contextStr}\\nUser: \${message}\\nBot:\`;
  }
}

// Usage
const bot = new AIChatbot('your-api-key');
const response = await bot.handleMessage('Hello!');
console.log(response.message);`)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Content Generation Pipeline</h3>
                  <div className="bg-gray-900 rounded-lg p-4 relative">
                    <pre className="text-sm text-gray-300 overflow-x-auto">
{`import { DandoloSDK } from '@dandolo/sdk';

class ContentGenerator {
  constructor(apiKey) {
    this.dandolo = new DandoloSDK({ apiKey });
  }

  async generateBlogPost(topic, keywords) {
    // Generate outline
    const outline = await this.dandolo.prompt({
      message: \`Create a blog post outline for: \${topic}. Include these keywords: \${keywords.join(', ')}\`,
      model: 'gpt-4'
    });

    // Generate content for each section
    const sections = await this.dandolo.batchPrompt(
      outline.text.split('\\n').map(section => ({
        message: \`Write detailed content for this section: \${section}\`,
        model: 'gpt-4',
        max_tokens: 800
      }))
    );

    return {
      outline: outline.text,
      sections: sections.map(s => s.text),
      totalCost: outline.cost + sections.reduce((sum, s) => sum + s.cost, 0)
    };
  }
}

// Usage
const generator = new ContentGenerator('your-api-key');
const post = await generator.generateBlogPost(
  'AI in Healthcare', 
  ['machine learning', 'diagnosis', 'treatment']
);`}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(`import { DandoloSDK } from '@dandolo/sdk';

class ContentGenerator {
  constructor(apiKey) {
    this.dandolo = new DandoloSDK({ apiKey });
  }

  async generateBlogPost(topic, keywords) {
    // Generate outline
    const outline = await this.dandolo.prompt({
      message: \`Create a blog post outline for: \${topic}. Include these keywords: \${keywords.join(', ')}\`,
      model: 'gpt-4'
    });

    // Generate content for each section
    const sections = await this.dandolo.batchPrompt(
      outline.text.split('\\n').map(section => ({
        message: \`Write detailed content for this section: \${section}\`,
        model: 'gpt-4',
        max_tokens: 800
      }))
    );

    return {
      outline: outline.text,
      sections: sections.map(s => s.text),
      totalCost: outline.cost + sections.reduce((sum, s) => sum + s.cost, 0)
    };
  }
}

// Usage
const generator = new ContentGenerator('your-api-key');
const post = await generator.generateBlogPost(
  'AI in Healthcare', 
  ['machine learning', 'diagnosis', 'treatment']
);`)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Webhook Handler</h3>
                  <div className="bg-gray-900 rounded-lg p-4 relative">
                    <pre className="text-sm text-gray-300 overflow-x-auto">
{`// Express.js webhook handler
app.post('/webhook/dandolo', (req, res) => {
  const { event, data } = req.body;
  
  switch (event) {
    case 'prompt.completed':
      console.log(\`Prompt \${data.id} completed by \${data.provider}\`);
      // Update your database, send notifications, etc.
      break;
      
    case 'balance.low':
      console.log(\`Balance low: \${data.balance} points remaining\`);
      // Auto-purchase more points or notify user
      break;
      
    case 'provider.changed':
      console.log(\`Provider switched to \${data.new_provider}\`);
      break;
  }
  
  res.status(200).send('OK');
});

// Configure webhook URL in your dashboard:
// https://your-app.com/webhook/dandolo`}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(`// Express.js webhook handler
app.post('/webhook/dandolo', (req, res) => {
  const { event, data } = req.body;
  
  switch (event) {
    case 'prompt.completed':
      console.log(\`Prompt \${data.id} completed by \${data.provider}\`);
      // Update your database, send notifications, etc.
      break;
      
    case 'balance.low':
      console.log(\`Balance low: \${data.balance} points remaining\`);
      // Auto-purchase more points or notify user
      break;
      
    case 'provider.changed':
      console.log(\`Provider switched to \${data.new_provider}\`);
      break;
  }
  
  res.status(200).send('OK');
});

// Configure webhook URL in your dashboard:
// https://your-app.com/webhook/dandolo`)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
