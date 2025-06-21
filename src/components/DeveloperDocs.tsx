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
              <h3 className="text-lg font-semibold mb-3">1. Get Your API Key</h3>
              <p className="text-gray-300 mb-3">
                Connect your wallet and generate an API key in the Developer Portal.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">2. Change Your Base URL</h3>
              <p className="text-gray-300 mb-3">
                Just point your Venice.ai client to Dandolo:
              </p>
              <pre className="bg-black/50 p-4 rounded-lg">
{`// Before: Venice.ai
baseUrl: "https://api.venice.ai"

// After: Dandolo  
baseUrl: "https://dandolo.ai/api"`}
              </pre>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">3. Use Your Dandolo Key</h3>
              <pre className="bg-black/50 p-4 rounded-lg">
{`apiKey: "dk_your_dandolo_key"  // or ak_ for agents`}
              </pre>
            </div>
            
            <div className="mt-8 p-4 bg-green-500/20 border border-green-500 rounded-lg">
              <p className="font-semibold">✨ That's it!</p>
              <p className="text-sm mt-1">
                All Venice.ai endpoints, models, and parameters work exactly the same.
              </p>
            </div>
          </div>
        </GlassCard>
      )}
      
      {/* Endpoints */}
      {activeTab === 'endpoints' && (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Chat Completions</h3>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`POST https://dandolo.ai/api/chat/completions

{
  "model": "llama-3.3-70b-instruct",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}`}
            </pre>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Image Generation</h3>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`POST https://dandolo.ai/api/images/generations

{
  "model": "flux-schnell",
  "prompt": "A beautiful sunset",
  "width": 1024,
  "height": 1024,
  "steps": 4
}`}
            </pre>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">List Models</h3>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`GET https://dandolo.ai/api/models`}
            </pre>
          </GlassCard>
        </div>
      )}
      
      {/* Examples */}
      {activeTab === 'examples' && (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Python</h3>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`from venice import Venice

client = Venice(
    api_key="dk_your_key",
    base_url="https://dandolo.ai/api"
)

response = client.chat.completions.create(
    model="llama-3.3-70b-instruct",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)`}
            </pre>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Node.js / TypeScript</h3>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`import Venice from 'venice-ai';

const client = new Venice({
  apiKey: 'ak_your_key',
  baseUrl: 'https://dandolo.ai/api'
});

const response = await client.chat.completions.create({
  model: 'llama-3.3-70b-instruct',
  messages: [{ role: 'user', content: 'Hello!' }]
});`}
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