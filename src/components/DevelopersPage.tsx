import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAccount } from 'wagmi';
import GlassCard from './GlassCard';
import { toast } from 'sonner';

/**
 * DevelopersPage
 * Consolidated developer resources including SDK docs, API reference,
 * tools registry, and API key management console.
 */
const DevelopersPage: React.FC = () => {
  const { address } = useAccount();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'sdk' | 'api' | 'tools' | 'console'>('overview');

  const apiKeys = useQuery(api.developers.getUserApiKeys, address ? { address } : 'skip');
  const generateApiKey = useMutation(api.developers.generateApiKey);
  const generateAgentKey = useMutation(api.developers.generateAgentKey);
  const sdkStats = useQuery(api.developers.getSdkStats);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleGenerateApiKey = async (type: 'developer' | 'agent') => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      if (type === 'agent') {
        const key = await generateAgentKey({
          address,
          name: `Agent Key ${new Date().toLocaleDateString()}`,
          description: 'High-volume agent access'
        });
        copyToClipboard(key);
        toast.success('Agent API key generated and copied!');
      } else {
        const key = await generateApiKey({
          address,
          name: `Developer Key ${new Date().toLocaleDateString()}`
        });
        copyToClipboard(key);
        toast.success('Developer API key generated and copied!');
      }
    } catch (error) {
      toast.error('Failed to generate API key');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sdk', label: 'SDK' },
    { id: 'api', label: 'API Reference' },
    { id: 'tools', label: 'Tools Registry' },
    { id: 'console', label: 'Console' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Developer Resources</h1>

        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-8 border-b border-white/10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`px-4 py-2 font-medium transition-colors ${
                selectedTab === tab.id ? 'text-white border-b-2 border-gold' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <GlassCard className="p-6">
              <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
              <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">{`npm install @dandolo/sdk

import DandoloSDK from '@dandolo/sdk';

const dandolo = new DandoloSDK({
  apiKey: 'YOUR_API_KEY'
});

const response = await dandolo.prompt({
  message: 'Hello, AI!'
});`}</pre>
            </GlassCard>
            <GlassCard className="p-6">
              <h2 className="text-2xl font-bold mb-4">Network Stats</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total API Keys</span>
                  <span className="font-bold">{sdkStats?.totalApiKeys || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Keys</span>
                  <span className="font-bold">{sdkStats?.activeApiKeys || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total API Calls</span>
                  <span className="font-bold">{sdkStats?.totalUsage || 0}</span>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {selectedTab === 'console' && (
          <div className="space-y-8">
            <GlassCard className="p-6">
              <h2 className="text-2xl font-bold mb-4">API Key Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => handleGenerateApiKey('developer')}
                  className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  disabled={!address}
                >
                  <h3 className="font-bold mb-2">Developer Key (dk_)</h3>
                  <p className="text-sm">500 requests/day</p>
                </button>
                <button
                  onClick={() => handleGenerateApiKey('agent')}
                  className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  disabled={!address}
                >
                  <h3 className="font-bold mb-2">Agent Key (ak_)</h3>
                  <p className="text-sm">5,000 requests/day</p>
                </button>
              </div>
              {apiKeys && apiKeys.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold mb-2">Your API Keys</h3>
                  {apiKeys.map(key => (
                    <div key={key._id} className="p-3 bg-white/5 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-mono text-sm">{key.key}</p>
                        <p className="text-xs text-gray-400">
                          {key.name} • Used {key.usageCount || 0} times
                        </p>
                      </div>
                      <button onClick={() => copyToClipboard(key.key)} className="text-blue-400 hover:text-blue-300">
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {!address && <p className="text-yellow-400 text-center">Connect your wallet to manage API keys</p>}
            </GlassCard>
          </div>
        )}

        {selectedTab === 'tools' && (
          <div className="space-y-8">
            <GlassCard className="p-6">
              <h2 className="text-2xl font-bold mb-4">🛠️ AI Tools Registry</h2>
              <p className="text-gray-300 mb-6">
                Register tools that AI agents can use. Coming soon: Providers can offer specialized tools
                like web scraping, data analysis, or custom actions.
              </p>
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                <h3 className="font-bold text-yellow-400 mb-2">Coming Soon</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Register custom tools with standardized schemas</li>
                  <li>• Earn points when agents use your tools</li>
                  <li>• Browse and integrate community tools</li>
                  <li>• Tool composition and chaining</li>
                </ul>
              </div>
            </GlassCard>
          </div>
        )}

        {selectedTab === 'sdk' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <GlassCard className="p-6">
              <h2 className="text-2xl font-bold mb-4">SDK Installation</h2>
              <pre className="bg-black/50 p-4 rounded-lg text-sm">npm install @dandolo/sdk</pre>
              <p className="text-gray-300 mt-4">
                TypeScript support included. Works with Node.js 16+ and modern browsers.
              </p>
            </GlassCard>
            <GlassCard className="p-6">
              <h2 className="text-2xl font-bold mb-4">Multi-turn Conversations</h2>
              <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">{`const messages = [];

const res1 = await dandolo.chatCompletion({
  messages: [...messages, {role: 'user', content: 'Hello!'}]
});

messages.push(
  {role: 'user', content: 'Hello!'},
  res1.choices[0].message
);`}</pre>
            </GlassCard>
          </div>
        )}

        {selectedTab === 'api' && (
          <div className="space-y-8">
            <GlassCard className="p-6">
              <h2 className="text-2xl font-bold mb-4">REST API Endpoints</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">POST /api/v1/chat/completions</h3>
                  <p className="text-gray-300 mb-2">OpenAI-compatible chat endpoint</p>
                  <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">{`{
  "messages": [
    {"role": "system", "content": "You are helpful"},
    {"role": "user", "content": "Hello!"}
  ],
  "model": "gpt-3.5-turbo",
  "temperature": 0.7
}`}</pre>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">POST /api/v1/embed</h3>
                  <p className="text-gray-300 mb-2">Generate text embeddings</p>
                  <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">{`{
  "text": "Your text to embed"
}`}</pre>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">GET /api/v1/balance</h3>
                  <p className="text-gray-300">Check your API usage and limits</p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevelopersPage;

