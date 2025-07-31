import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import GlassCard from './GlassCard';

// Get sanitized API base URL for documentation (never expose internal URLs)
const getApiBaseUrl = () => {
  return 'https://api.dandolo.ai';
};

interface DeveloperDocsProps {
  onModelSelect?: (modelId: string) => void;
}

export function DeveloperDocs({ onModelSelect }: DeveloperDocsProps) {
  const [activeTab, setActiveTab] = useState('quickstart');
  const apiBaseUrl = getApiBaseUrl();
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Developer Documentation</h1>
      
      {/* Tab Navigation - Includes Models tab for Venice.ai integration */}
      <div className="flex gap-4 mb-8 border-b border-gray-700">
        {['quickstart', 'endpoints', 'examples', 'agents', 'testing', 'models'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-1 capitalize transition-colors ${
              activeTab === tab 
                ? 'border-b-2 border-blue-500 text-blue-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'agents' ? 'AI Agents' : tab}
          </button>
        ))}
      </div>
      
      {/* Quick Start */}
      {activeTab === 'quickstart' && (
        <GlassCard className="p-8">
          <h2 className="text-2xl font-bold mb-6">Quick Start</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">What is Dandolo?</h3>
              <p className="text-gray-300 mb-3">
                Dandolo is a decentralized AI inference platform that provides access to 
                uncensored open-source models through a network of verified providers.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  <strong>Key Difference:</strong> Unlike centralized AI providers, Dandolo routes 
                  your requests to independent compute providers, ensuring better uptime, 
                  uncensored responses, and no conversation logging.
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">1. Get Your API Key</h3>
              <p className="text-gray-300 mb-3">
                Choose your key type based on usage needs:
              </p>
              <ul className="list-disc list-inside text-gray-400 mb-3">
                <li><code className="text-blue-400">dk_</code> Developer Keys: 500 requests/day - Perfect for development and testing</li>
                <li><code className="text-blue-400">ak_</code> Agent Keys: 5,000 requests/day - Ideal for production AI agents and applications</li>
              </ul>
              <div className="bg-green-500/10 border border-green-500 rounded-lg p-3 mt-3">
                <p className="text-sm text-green-300">
                  ✅ <strong>Both key types</strong> provide full access to all Dandolo features including chat completions, image generation, and Venice AI model routing.
                </p>
              </div>
              <button 
                onClick={() => window.location.hash = '#portal'}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
              >
                Generate API Key →
              </button>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">2. Make Your First Request</h3>
              <p className="text-gray-300 mb-3">
                Dandolo uses standard chat completion API format. 
                Connect with any HTTP client:
              </p>
              <pre className="bg-black/50 p-4 rounded-lg">
{`# Developer key (500 requests/day)
curl https://api.dandolo.ai/v1/chat/completions \\
  -H "Authorization: Bearer dk_your_developer_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "auto-select",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Agent key (5,000 requests/day)  
curl https://api.dandolo.ai/v1/chat/completions \\
  -H "Authorization: Bearer ak_your_agent_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "auto-select",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
              </pre>
            </div>
            
            <div className="mt-8 p-4 bg-green-500/20 border border-green-500 rounded-lg">
              <p className="font-semibold">✨ Why Dandolo?</p>
              <ul className="text-sm mt-2 space-y-1">
                <li>• Access to uncensored AI model pool</li>
                <li>• Higher reliability through multiple providers</li>
                <li>• Privacy-first (no logging or tracking)</li>
                <li>• Standard API format - use any client</li>
              </ul>
            </div>
          </div>
        </GlassCard>
      )}
      
      {/* Endpoints */}
      {activeTab === 'endpoints' && (
        <div className="space-y-6">
          <div className="mb-6">
            <p className="text-gray-300">
              All endpoints use the Dandolo routing infrastructure. Current base URL:{' '}
              <code className="bg-gray-800 px-2 py-1 rounded text-blue-400">https://api.dandolo.ai</code>
            </p>
            <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-3 mt-3">
              <p className="text-sm text-blue-300">
                💡 <strong>Key Authentication:</strong> Both <code>dk_</code> and <code>ak_</code> keys work with all endpoints. 
                The three-layer validation ensures your requests are properly authenticated and routed through Venice AI providers.
              </p>
            </div>
          </div>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Chat Completions</h3>
            <div className="mb-3">
              <code className="text-blue-400">POST /v1/chat/completions</code>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              Supports both developer keys (<code>dk_</code>) and agent keys (<code>ak_</code>) for authentication.
            </p>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "model": "auto-select",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "Explain quantum computing"}
  ],
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": false  // Set to true for streaming responses
}`}
            </pre>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Available Models</h3>
            <div className="mb-3">
              <code className="text-blue-400">GET /models</code>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Returns all available models in the network. No authentication required.
            </p>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`curl https://api.dandolo.ai/api/v1/models \\
  -H "Authorization: Bearer dk_your_key"  # or ak_your_key`}
            </pre>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Image Generation</h3>
            <div className="mb-3">
              <code className="text-blue-400">POST /images/generations</code>
            </div>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "model": "flux-schnell",
  "prompt": "A beautiful sunset over mountains",
  "width": 1024,
  "height": 1024,
  "steps": 4
}`}
            </pre>
          </GlassCard>
        </div>
      )}
      
      {/* Examples */}
      {activeTab === 'examples' && (
        <div className="space-y-6">
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500 rounded-lg">
            <p className="text-sm">
              💡 <strong>Tip:</strong> Dandolo uses standard chat completion API format. 
              All requests use <code className="bg-gray-800 px-2 py-1 rounded">https://api.dandolo.ai</code> and route through Venice AI providers.
            </p>
          </div>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Python</h3>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`# Direct HTTP requests (recommended)
import requests

response = requests.post(
    "https://api.dandolo.ai/v1/chat/completions",
    headers={"Authorization": "Bearer dk_your_developer_key"},  # or ak_your_agent_key
    json={
        "model": "auto-select",
        "messages": [{"role": "user", "content": "Hello!"}]
    }
)

data = response.json()
print(data['choices'][0]['message']['content'])

# Alternative: Using LiteLLM for framework compatibility
# Install: pip install litellm
import litellm

response = litellm.completion(
    model="dandolo/auto-select",
    messages=[{"role": "user", "content": "Hello!"}],
    api_key="dk_your_dandolo_key",
    json={
        "messages": [{"role": "user", "content": "Hello!"}],
        "model": "auto-select"
    }
)

print(response.choices[0].message.content)`}
            </pre>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">For AI Agents</h3>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`// Agent keys (ak_) have higher limits for production use
const DANDOLO_CONFIG = {
  apiKey: 'ak_your_agent_key',  // 5,000 requests/day
  baseURL: 'https://api.dandolo.ai/v1'
};

// Works with LangChain via custom LLM
import { LLM } from "@langchain/core/language_models/llms";

class DandoloLLM extends LLM {
  _call(prompt) {
    return fetch("https://api.dandolo.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + DANDOLO_CONFIG.apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }]
      })
    }).then(r => r.json()).then(d => d.choices[0].message.content);
  }
}

// Works with any agent framework:
// - Custom agents, BabyAGI, LangGraph
// - LiteLLM, LangSmith, CrewAI
// - Just configure base URL to: https://api.dandolo.ai/v1
// - Both dk_ and ak_ keys provide full Venice AI model access`}
            </pre>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">cURL</h3>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`# Developer key (500 requests/day)
curl https://api.dandolo.ai/v1/chat/completions \\
  -H "Authorization: Bearer dk_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "auto-select",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
            </pre>
          </GlassCard>
        </div>
      )}
      
      {/* AI Agents */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500 rounded-lg">
            <p className="text-sm">
              🤖 <strong>Agent Integration:</strong> Dandolo is designed for AI agents with high-throughput, 
              uncensored access to multiple models through our decentralized network.
            </p>
          </div>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">LangChain Integration</h3>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`from langchain.llms.base import LLM
import requests

class DandoloLLM(LLM):
    api_key: str
    base_url: str = "https://api.dandolo.ai/v1"
    
    @property
    def _llm_type(self) -> str:
        return "dandolo"
    
    def _call(self, prompt: str, stop=None) -> str:
        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": "auto-select",
                "messages": [{"role": "user", "content": prompt}]
            }
        )
        return response.json()['choices'][0]['message']['content']

# Usage
llm = DandoloLLM(api_key="ak_your_agent_key")
result = llm("Explain quantum computing")`}
            </pre>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">AutoGen Framework</h3>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`import autogen

config_list = [{
    "model": "auto-select",
    "api_key": "ak_your_agent_key",
    "base_url": "https://api.dandolo.ai/v1"
}]

assistant = autogen.AssistantAgent(
    name="assistant",
    llm_config={"config_list": config_list}
)

user = autogen.UserProxyAgent(
    name="user",
    human_input_mode="NEVER"
)

user.initiate_chat(assistant, message="Hello from AutoGen!")`}
            </pre>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Agent Best Practices</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">🔑 Key Management</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Use <code className="text-blue-400">ak_</code> keys for production (5,000 requests/day)</li>
                  <li>• Monitor usage with <code className="text-blue-400">/api/v1/balance</code> endpoint</li>
                  <li>• Implement retry logic with exponential backoff</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">⚡ Performance</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Use <code className="text-blue-400">auto-select</code> model for intelligent routing</li>
                  <li>• Batch multiple requests when possible</li>
                  <li>• Manage conversation context to stay within token limits</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">🛡️ Error Handling</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Handle 429 rate limits with backoff</li>
                  <li>• Check for 503 provider unavailable and retry</li>
                  <li>• Validate responses before processing</li>
                </ul>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
      
      {/* Testing */}
      {activeTab === 'testing' && (
        <div className="space-y-6">
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500 rounded-lg">
            <p className="text-sm">
              🧪 <strong>Testing Tools:</strong> We provide comprehensive testing scripts to validate your integration.
            </p>
          </div>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Start Test (Bash)</h3>
            <p className="text-gray-300 mb-3">
              Test your API key immediately with our bash script:
            </p>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`# Download and run the quick start script
curl -O https://dandolo.ai/quick-start.sh
chmod +x quick-start.sh
./quick-start.sh dk_your_api_key

# Or run directly:
./quick-start.sh`}
            </pre>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Python Test Suite</h3>
            <p className="text-gray-300 mb-3">
              Comprehensive testing with detailed reporting:
            </p>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`# Download and run Python test suite
curl -O https://dandolo.ai/test-dandolo-integration.py
python test-dandolo-integration.py --api-key dk_your_key

# Run with advanced tests (images, embeddings, performance)
python test-dandolo-integration.py --api-key dk_your_key --advanced`}
            </pre>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">JavaScript/Node.js Test</h3>
            <p className="text-gray-300 mb-3">
              For JavaScript environments:
            </p>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`# Download and run JavaScript test suite
curl -O https://dandolo.ai/test-dandolo-integration.js
node test-dandolo-integration.js --api-key dk_your_key --advanced`}
            </pre>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Manual Testing with cURL</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Connection Test</h4>
                <pre className="bg-black/50 p-3 rounded text-xs overflow-x-auto">
{`curl https://api.dandolo.ai/v1/chat/completions \\
  -H "Authorization: Bearer dk_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "auto-select", "messages": [{"role": "user", "content": "Hello!"}]}'`}
                </pre>
              </div>
              <div>
                <h4 className="font-medium mb-2">Balance Check</h4>
                <pre className="bg-black/50 p-3 rounded text-xs overflow-x-auto">
{`curl https://api.dandolo.ai/api/v1/balance \\
  -H "Authorization: Bearer dk_your_key"`}
                </pre>
              </div>
              <div>
                <h4 className="font-medium mb-2">Models List</h4>
                <pre className="bg-black/50 p-3 rounded text-xs overflow-x-auto">
{`curl https://api.dandolo.ai/v1/models \\
  -H "Authorization: Bearer dk_your_key"`}
                </pre>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Common Error Scenarios</h3>
            <div className="space-y-3">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                <p className="text-red-300 font-medium">401 Unauthorized</p>
                <p className="text-sm text-gray-400">Check API key format (dk_ or ak_ prefix) and validity</p>
              </div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                <p className="text-yellow-300 font-medium">429 Rate Limited</p>
                <p className="text-sm text-gray-400">Daily limit reached. Check usage or upgrade to agent key</p>
              </div>
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded">
                <p className="text-orange-300 font-medium">503 Service Unavailable</p>
                <p className="text-sm text-gray-400">No active providers. Retry in 30-60 seconds</p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
      
      {/* Models */}
      {activeTab === 'models' && <ModelsList onModelSelect={onModelSelect} />}
    </div>
  );
}

// Dynamic models list with clickable models
function ModelsList({ onModelSelect }: { onModelSelect?: (modelId: string) => void }) {
  const availableModels = useQuery(api.models.getAvailableModels);
  
  if (availableModels === undefined) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-3"></div>
          <span>Loading models from Venice.ai...</span>
        </div>
      </GlassCard>
    );
  }
  
  if (!availableModels || availableModels.length === 0) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">No models available</p>
          <p className="text-gray-400 text-sm">
            Models are dynamically fetched from Venice.ai providers. Please check back later or ensure providers are active.
          </p>
        </div>
      </GlassCard>
    );
  }
  
  return (
    <GlassCard className="p-6">
      <h2 className="text-xl font-semibold mb-4">
        Available Models ({availableModels.length})
      </h2>
      <p className="text-gray-400 text-sm mb-4">
        Click on any model to view detailed API documentation and examples.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {availableModels.map((model: any) => (
          <div 
            key={model.id} 
            onClick={() => onModelSelect?.(model.id)}
            className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-blue-500/30"
          >
            <code className="text-sm text-blue-400 font-medium">{model.id}</code>
            <div className="flex items-center mt-2">
              {model.type && (
                <span className="px-2 py-1 bg-gray-700 text-xs rounded mr-2">
                  {model.type}
                </span>
              )}
              <span className="text-xs text-green-400">Click for details →</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Live from Venice.ai • Updated dynamically
            </p>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-400 mt-4">
        * Models are continuously updated in our inference pool. Click any model for comprehensive API documentation.
      </p>
    </GlassCard>
  );
}