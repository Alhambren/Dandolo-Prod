import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import GlassCard from './GlassCard';

interface ModelDetailPageProps {
  modelId: string;
  onBackToModels: () => void;
}

// Status indicator component
const StatusIndicator: React.FC<{ status: string; message: string; activeProviders: number }> = ({ 
  status, message, activeProviders 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'available':
        return { 
          icon: '⚡', 
          color: 'text-green-400', 
          bgColor: 'bg-green-500/10', 
          borderColor: 'border-green-500/30' 
        };
      case 'limited':
        return { 
          icon: '⚠️', 
          color: 'text-yellow-400', 
          bgColor: 'bg-yellow-500/10', 
          borderColor: 'border-yellow-500/30' 
        };
      default:
        return { 
          icon: '❌', 
          color: 'text-red-400', 
          bgColor: 'bg-red-500/10', 
          borderColor: 'border-red-500/30' 
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center px-3 py-2 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
      <span className="mr-2">{config.icon}</span>
      <span className={`text-sm font-medium ${config.color}`}>
        {message}
      </span>
    </div>
  );
};

// API Example component with dynamic model ID
const ApiExample: React.FC<{ modelId: string; type: string }> = ({ modelId, type }) => {
  const getExampleForType = () => {
    switch (type) {
      case 'image':
        return {
          title: 'Image Generation',
          endpoint: '/v1/images/generations',
          code: `curl https://dandolo.ai/api/v1/images/generations \\
  -H "Authorization: Bearer dk_your_developer_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelId}",
    "prompt": "A beautiful sunset over mountains",
    "width": 1024,
    "height": 1024,
    "steps": 4
  }'`
        };
      case 'audio':
        return {
          title: 'Text-to-Speech',
          endpoint: '/v1/audio/speech',
          code: `curl https://dandolo.ai/api/v1/audio/speech \\
  -H "Authorization: Bearer dk_your_developer_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelId}",
    "input": "Hello, this is a test of text-to-speech.",
    "voice": "alloy"
  }'`
        };
      default:
        return {
          title: 'Chat Completion',
          endpoint: '/v1/chat/completions',
          code: `curl https://dandolo.ai/api/v1/chat/completions \\
  -H "Authorization: Bearer dk_your_developer_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelId}",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant"},
      {"role": "user", "content": "Hello!"}
    ],
    "temperature": 0.7,
    "max_tokens": 1000,
    "stream": false
  }'`
        };
    }
  };

  const example = getExampleForType();

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-4">{example.title}</h3>
      <div className="mb-3">
        <code className="text-blue-400 text-sm">POST {example.endpoint}</code>
      </div>
      <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
        {example.code}
      </pre>
    </GlassCard>
  );
};

// Python example component
const PythonExample: React.FC<{ modelId: string; type: string }> = ({ modelId, type }) => {
  const getExampleForType = () => {
    switch (type) {
      case 'image':
        return `import requests

response = requests.post(
    "https://dandolo.ai/api/v1/images/generations",
    headers={"Authorization": "Bearer dk_your_developer_key"},
    json={
        "model": "${modelId}",
        "prompt": "A beautiful sunset over mountains",
        "width": 1024,
        "height": 1024,
        "steps": 4
    }
)

data = response.json()
image_url = data['data'][0]['url']
print(f"Generated image: {image_url}")`;

      case 'audio':
        return `import requests

response = requests.post(
    "https://dandolo.ai/api/v1/audio/speech",
    headers={"Authorization": "Bearer dk_your_developer_key"},
    json={
        "model": "${modelId}",
        "input": "Hello, this is a test of text-to-speech.",
        "voice": "alloy"
    }
)

# Save the audio file
with open("speech.mp3", "wb") as f:
    f.write(response.content)`;

      default:
        return `import requests

response = requests.post(
    "https://dandolo.ai/api/v1/chat/completions",
    headers={"Authorization": "Bearer dk_your_developer_key"},
    json={
        "model": "${modelId}",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant"},
            {"role": "user", "content": "Hello!"}
        ],
        "temperature": 0.7,
        "max_tokens": 1000
    }
)

data = response.json()
print(data['choices'][0]['message']['content'])`;
    }
  };

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-4">Python Example</h3>
      <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
        {getExampleForType()}
      </pre>
    </GlassCard>
  );
};

// Model capabilities component
const ModelCapabilities: React.FC<{ capabilities: any }> = ({ capabilities }) => {
  const capabilityList = [
    { key: 'supportsStreaming', label: 'Streaming', icon: '🌊' },
    { key: 'supportsSystemMessage', label: 'System Messages', icon: '⚙️' },
    { key: 'supportsTemperature', label: 'Temperature Control', icon: '🌡️' },
    { key: 'supportsMaxTokens', label: 'Max Tokens', icon: '📏' },
    { key: 'supportsTools', label: 'Function Calling', icon: '🔧' },
    { key: 'supportsVision', label: 'Vision/Multimodal', icon: '👁️' },
    { key: 'supportsImageGeneration', label: 'Image Generation', icon: '🎨' },
    { key: 'supportsAudio', label: 'Audio Processing', icon: '🔊' },
  ];

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-4">Model Capabilities</h3>
      <div className="grid grid-cols-2 gap-3">
        {capabilityList.map(({ key, label, icon }) => (
          <div
            key={key}
            className={`flex items-center p-3 rounded-lg ${
              capabilities[key] 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-gray-500/10 border border-gray-500/30'
            }`}
          >
            <span className="mr-2">{icon}</span>
            <span className={`text-sm ${capabilities[key] ? 'text-green-400' : 'text-gray-400'}`}>
              {label}
            </span>
            {capabilities[key] && <span className="ml-auto text-green-400 text-xs">✓</span>}
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

export const ModelDetailPage: React.FC<ModelDetailPageProps> = ({ modelId, onBackToModels }) => {
  const modelDetails = useQuery(api.models.getModelDetails, { modelId });
  const availability = useQuery(api.models.getModelAvailability, { modelId });

  // Loading state
  if (modelDetails === undefined || availability === undefined) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mr-3"></div>
          <span>Loading model details from Venice.ai...</span>
        </div>
      </div>
    );
  }

  // Model not found
  if (!modelDetails) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <button
          onClick={onBackToModels}
          className="mb-6 text-blue-400 hover:text-blue-300 transition-colors"
        >
          ← Back to Models
        </button>
        
        <GlassCard className="p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-4">Model Not Found</h1>
          <p className="text-gray-400 mb-6">
            The model "{modelId}" is no longer available on Venice.ai or has been removed from the network.
          </p>
          <button
            onClick={onBackToModels}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
          >
            Browse Available Models
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Back button */}
      <button
        onClick={onBackToModels}
        className="mb-6 text-blue-400 hover:text-blue-300 transition-colors"
      >
        ← Back to Models
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{modelDetails.name}</h1>
            <code className="text-blue-400 bg-gray-800 px-2 py-1 rounded">
              {modelDetails.id}
            </code>
          </div>
          <div className="flex items-center gap-4">
            <StatusIndicator 
              status={availability?.status || 'unavailable'}
              message={availability?.message || 'Status unknown'}
              activeProviders={availability?.activeProviders || 0}
            />
          </div>
        </div>

        {/* Model type badge */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">
            {modelDetails.type?.charAt(0).toUpperCase() + modelDetails.type?.slice(1)} Model
          </span>
          {modelDetails.contextLength && (
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
              {modelDetails.contextLength.toLocaleString()} context
            </span>
          )}
        </div>
      </div>

      {/* Grid layout for content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Model Capabilities */}
        <ModelCapabilities capabilities={modelDetails.capabilities} />

        {/* Provider Information */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Network Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Active Providers:</span>
              <span className="text-white font-medium">{availability?.activeProviders || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Providers:</span>
              <span className="text-white font-medium">{availability?.totalProviders || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Last Updated:</span>
              <span className="text-white font-medium">
                {modelDetails.lastUpdated 
                  ? new Date(modelDetails.lastUpdated).toLocaleString()
                  : 'Unknown'
                }
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* API Examples */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">API Examples</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ApiExample modelId={modelDetails.id} type={modelDetails.type || 'text'} />
          <PythonExample modelId={modelDetails.id} type={modelDetails.type || 'text'} />
        </div>

        {/* Additional examples for streaming */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Streaming Example</h3>
          <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
{`curl https://dandolo.ai/api/v1/chat/completions \\
  -H "Authorization: Bearer dk_your_developer_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelDetails.id}",
    "messages": [
      {"role": "user", "content": "Tell me a story"}
    ],
    "stream": true
  }'`}
          </pre>
        </GlassCard>

        {/* Rate limits and pricing info */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Usage & Limits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Developer Keys (dk_)</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• 500 requests per day</li>
                <li>• Perfect for development & testing</li>
                <li>• Full API access</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Agent Keys (ak_)</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• 5,000 requests per day</li>
                <li>• Ideal for production agents</li>
                <li>• Higher rate limits</li>
              </ul>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};