import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import GlassCard from './GlassCard';
import { toast } from 'sonner';

export function DeveloperPortal() {
  const { address } = useAccount();
  const [showGenerator, setShowGenerator] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [keyType, setKeyType] = useState<'developer' | 'agent'>('developer');
  const [generatedKey, setGeneratedKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  
  const apiKeys = useQuery(api.developers.getUserApiKeys, 
    address ? { address } : 'skip'
  );
  const generateKey = useMutation(api.developers.generateApiKey);
  const revokeKey = useMutation(api.developers.revokeApiKey);
  
  const handleGenerateKey = async () => {
    if (!address || !newKeyName) return;
    
    try {
      const key = await generateKey({
        address,
        name: newKeyName,
        keyType,
      });
      
      setGeneratedKey(key);
      setShowKeyModal(true);
      setNewKeyName('');
      setShowGenerator(false);
    } catch (error) {
      toast.error('Failed to generate key');
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Developer Portal</h1>
      
      {/* API Keys Section */}
      <GlassCard className="p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">API Keys</h2>
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
          >
            + New Key
          </button>
        </div>
        
        {/* Key Generator */}
        {showGenerator && (
          <div className="mb-6 p-4 bg-white/5 rounded-lg">
            <input
              type="text"
              placeholder="Key name (e.g., Production Bot)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="w-full mb-4 px-4 py-2 bg-white/10 rounded-lg border border-white/20 text-white placeholder-white/60"
            />
            
            <div className="flex gap-4 mb-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={keyType === 'developer'}
                  onChange={() => setKeyType('developer')}
                  className="mr-2"
                />
                Developer (500/day)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={keyType === 'agent'}
                  onChange={() => setKeyType('agent')}
                  className="mr-2"
                />
                Agent (5,000/day)
              </label>
            </div>
            
            <button
              onClick={handleGenerateKey}
              disabled={!newKeyName}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg disabled:opacity-50 transition-colors"
            >
              Generate Key
            </button>
          </div>
        )}
        
        {/* Keys List */}
        <div className="space-y-3">
          {apiKeys?.map((key) => (
            <div key={key._id} className="p-4 bg-white/5 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{key.name}</h3>
                  <p className="text-sm text-gray-400 font-mono">{key.maskedKey}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Created: {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsed && ` • Last used: ${new Date(key.lastUsed).toLocaleString()}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm mb-2">
                    {key.dailyUsage}/{key.dailyLimit} today
                  </p>
                  <button
                    onClick={() => {
                      if (confirm('Revoke this key? This cannot be undone.')) {
                        revokeKey({ keyId: key._id, address: address! });
                      }
                    }}
                    className="text-red-400 hover:text-red-300 text-sm transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              </div>
              
              {/* Usage bar */}
              <div className="mt-3 bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${(key.dailyUsage / key.dailyLimit) * 100}%` }}
                />
              </div>
            </div>
          ))}
          
          {!apiKeys?.length && (
            <p className="text-gray-400 text-center py-8">
              No API keys yet. Create one to get started!
            </p>
          )}
        </div>
      </GlassCard>
      
      {/* One-time key display modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <GlassCard className="p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4">🎉 API Key Generated!</h2>
            
            <div className="bg-yellow-500/20 border border-yellow-500 p-4 rounded-lg mb-6">
              <p className="font-semibold mb-1">⚠️ Save this key now!</p>
              <p className="text-sm">This is the only time you'll see the full key.</p>
            </div>
            
            <div className="bg-black/50 p-4 rounded-lg font-mono text-sm mb-6 break-all">
              {generatedKey}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(generatedKey)}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
              >
                Copy Key
              </button>
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setGeneratedKey('');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
              >
                I've Saved It
              </button>
            </div>
          </GlassCard>
        </div>
      )}
      
      {/* Quick Start Guide */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Start</h2>
        <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto text-sm">
{`// Just change your Venice.ai base URL
const client = new Venice({
  apiKey: "YOUR_DANDOLO_KEY",
  baseUrl: "https://dandolo.ai/api"  // <-- Add this
});

// Everything else works exactly the same!
const response = await client.chat.completions.create({
  model: "llama-3.3-70b",
  messages: [{ role: "user", content: "Hello!" }]
});`}
        </pre>
      </GlassCard>
    </div>
  );
}