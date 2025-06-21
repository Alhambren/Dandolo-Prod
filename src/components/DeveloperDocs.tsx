import { useState, useEffect } from 'react';
import GlassCard from './GlassCard';

export function DeveloperDocs() {
  const [activeTab, setActiveTab] = useState('quickstart');
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Developer Documentation</h1>
      
      {/* Tab Navigation */}
      <div className="flex gap-4 mb-8 border-b border-gray-700">
        {['quickstart', 'endpoints', 'examples', 'models'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-1 capitalize transition-colors ${
              activeTab === tab 
                ? 'border-b-2 border-blue-500 text-blue-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
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
              <p className="text-gray-300">
                Dandolo is a decentralized AI inference network. We route your requests 
                across multiple independent compute providers, ensuring high availability 
                and no vendor lock-in.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">1. Get Your API Key</h3>
              <p className="text-gray-300 mb-3">
                Choose your key type based on usage:
              </p>
              <ul className="list-disc list-inside text-gray-400 mb-3">
                <li><code className="text-blue-400">dk_</code> Developer Keys: 500 requests/day</li>
                <li><code className="text-blue-400">ak_</code> Agent Keys: 5,000 requests/day</li>
              </ul>
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
                Dandolo uses the same API format as OpenAI and Venice.ai. 
                Just change your endpoint:
              </p>
              <pre className="bg-black/50 p-4 rounded-lg">
{`curl https://dandolo.ai/api/chat/completions \\
  -H "Authorization: Bearer YOUR_DANDOLO_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "llama-3.3-70b-instruct",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
              </pre>
            </div>
            
            <div className="mt-8 p-4 bg-green-500/20 border border-green-500 rounded-lg">
              <p className="font-semibold">✨ Why Dandolo?</p>
              <ul className="text-sm mt-2 space-y-1">
                <li>• No single point of failure</li>
                <li>• Privacy-first (no logging or tracking)</li>
                <li>• 20+ open models available</li>
                <li>• Compatible with existing AI tools</li>
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
              All endpoints follow the standard format. Replace the base URL with{' '}
              <code className="bg-gray-800 px-2 py-1 rounded text-blue-400">https://dandolo.ai/api</code>
            </p>
          </div>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Chat Completions</h3>
            <div className="mb-3">
              <code className="text-blue-400">POST /chat/completions</code>
            </div>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "model": "llama-3.3-70b-instruct",
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
{`curl https://dandolo.ai/api/models`}
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
              💡 <strong>Tip:</strong> Dandolo works with any OpenAI-compatible client. 
              Just set your base URL to <code className="bg-gray-800 px-2 py-1 rounded">https://dandolo.ai/api</code> and use your Dandolo key.
            </p>
          </div>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Python - Multiple Options</h3>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`# Option 1: Using OpenAI Python SDK
from openai import OpenAI

client = OpenAI(
    api_key="dk_your_dandolo_key",
    base_url="https://dandolo.ai/api"
)

# Option 2: Using Venice SDK  
from venice import Venice

client = Venice(
    api_key="dk_your_dandolo_key",
    base_url="https://dandolo.ai/api"
)

# Option 3: Using requests
import requests

response = requests.post(
    "https://dandolo.ai/api/chat/completions",
    headers={"Authorization": "Bearer dk_your_dandolo_key"},
    json={
        "model": "llama-3.3-70b-instruct",
        "messages": [{"role": "user", "content": "Hello!"}]
    }
)

# All three methods work identically!`}
            </pre>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">For AI Agents</h3>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`// Agent keys (ak_) have higher limits for production use
const DANDOLO_CONFIG = {
  apiKey: 'ak_your_agent_key',  // 5,000 requests/day
  baseURL: 'https://dandolo.ai/api'
};

// Works with LangChain
import { ChatOpenAI } from "langchain/chat_models/openai";

const llm = new ChatOpenAI({
  openAIApiKey: DANDOLO_CONFIG.apiKey,
  configuration: {
    baseURL: DANDOLO_CONFIG.baseURL
  }
});

// Works with AutoGPT, BabyAGI, etc.
// Just configure the base URL and use your agent key`}
            </pre>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">cURL</h3>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`curl https://dandolo.ai/api/chat/completions \\
  -H "Authorization: Bearer dk_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "llama-3.3-70b-instruct",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
            </pre>
          </GlassCard>
        </div>
      )}
      
      {/* Models */}
      {activeTab === 'models' && <ModelsList />}
    </div>
  );
}

// Dynamic models list
function ModelsList() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    // Fetch without auth - models endpoint is public
    fetch('/api/models')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch models');
        return res.json();
      })
      .then(data => {
        setModels(data.data || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);
  
  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="loading-spinner w-6 h-6 mr-3"></div>
          <span>Loading models...</span>
        </div>
      </GlassCard>
    );
  }
  
  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">Failed to load models: {error}</p>
          <p className="text-gray-400 text-sm">
            Note: Model list requires an active provider connection.
          </p>
        </div>
      </GlassCard>
    );
  }
  
  return (
    <GlassCard className="p-6">
      <h2 className="text-xl font-semibold mb-4">
        Available Models ({models.length})
      </h2>
      {models.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {models.map((model: any) => (
            <div key={model.id} className="p-3 bg-white/5 rounded-lg">
              <code className="text-sm text-blue-400">{model.id}</code>
              <p className="text-xs text-gray-400 mt-1">by {model.owned_by || 'Venice.ai'}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-400">No models available at the moment.</p>
        </div>
      )}
      <p className="text-sm text-gray-400 mt-4">
        * All Venice.ai models are available through Dandolo
      </p>
    </GlassCard>
  );
}