import React, { useState, useEffect } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import GlassCard from './GlassCard';
import { toast } from 'sonner';
import { useWalletAuth } from '../hooks/useWalletAuth';

export function DeveloperPortal() {
  const { 
    sessionToken, 
    isAuthenticated, 
    isAuthenticating, 
    address,
    isConnected,
    authenticate,
    requireAuth 
  } = useWalletAuth();
  
  // Debug logging
  useEffect(() => {
    console.log('=== DeveloperPortal Debug State ===');
    console.log('isConnected:', isConnected);
    console.log('address:', address);
    console.log('sessionToken:', sessionToken ? `${sessionToken.substring(0, 20)}...` : null);
    console.log('isAuthenticated:', isAuthenticated);
    console.log('isAuthenticating:', isAuthenticating);
    console.log('localStorage sessionToken:', localStorage.getItem('dandolo_wallet_session') ? 'EXISTS' : 'NOT_FOUND');
    console.log('localStorage address:', localStorage.getItem('dandolo_wallet_address'));
    console.log('localStorage expiry:', localStorage.getItem('dandolo_session_expiry'));
    console.log('=== End Debug State ===');
  }, [isConnected, address, sessionToken, isAuthenticated, isAuthenticating]);
  
  const [showGenerator, setShowGenerator] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [keyType, setKeyType] = useState<'developer' | 'agent'>('developer');
  const [generatedKey, setGeneratedKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  
  const apiKeys = useQuery(api.developers.getUserApiKeys, 
    sessionToken ? { sessionToken } : 'skip'
  );
  const generateKey = useAction(api.apiKeys.createApiKey);
  const revokeKey = useMutation(api.developers.revokeApiKey);
  const revokeAllUserKeys = useMutation(api.developers.revokeAllUserKeys);
  const networkStats = useQuery(api.stats.getNetworkStats);
  
  // Get availability for new key creation
  const activeKeys = apiKeys?.filter(k => k.isActive) || [];
  const hasDeveloperKey = activeKeys.some(k => k.keyType === 'developer');
  const hasAgentKey = activeKeys.some(k => k.keyType === 'agent');
  const canCreateDeveloper = !hasDeveloperKey;
  const canCreateAgent = !hasAgentKey;
  const canCreateAnyKey = canCreateDeveloper || canCreateAgent;
  
  // Auto-switch to available key type if current selection is unavailable
  React.useEffect(() => {
    if (keyType === 'developer' && !canCreateDeveloper && canCreateAgent) {
      setKeyType('agent');
    } else if (keyType === 'agent' && !canCreateAgent && canCreateDeveloper) {
      setKeyType('developer');
    }
  }, [keyType, canCreateDeveloper, canCreateAgent]);
  
  const handleGenerateKey = async () => {
    // Add these safety checks at the beginning
    if (!showGenerator) {
      console.error('Key generation called but generator not shown');
      return;
    }
    
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for your API key');
      return;
    }
    
    // Add user confirmation
    const confirmMessage = `Generate a new ${keyType} API key named "${newKeyName}"?\n\nThis key will only be shown once and cannot be retrieved later.`;
    if (!confirm(confirmMessage)) {
      return;
    }
    
    // CRITICAL: Require wallet authentication
    if (!isConnected || !address) {
      toast.error('Please connect your wallet to generate API keys');
      return;
    }
    
    // Ensure user is authenticated before proceeding
    const authToken = await requireAuth();
    if (!authToken) {
      toast.error('Authentication required to generate API keys');
      return;
    }
    
    // Validate address format
    if (!address.startsWith('0x') || address.length !== 42) {
      toast.error('Invalid wallet address format');
      return;
    }
    
    // Check if user can create this key type
    if (keyType === 'developer' && !canCreateDeveloper) {
      toast.error('You already have a developer key. Each user can only have one developer key.');
      return;
    }
    if (keyType === 'agent' && !canCreateAgent) {
      toast.error('You already have an agent key. Each user can only have one agent key.');
      return;
    }
    
    try {
      console.log('User confirmed key generation for:', { address, name: newKeyName, keyType });
      const result = await generateKey({
        address,
        name: newKeyName.trim(),
        keyType,
      });
      
      // CRITICAL: Ensure modal shows
      if (!result.key) {
        throw new Error('Key generation failed - no key returned');
      }
      
      console.log('Key generated successfully, showing modal');
      setGeneratedKey(result.key);
      setShowKeyModal(true);  // This MUST be set to show the modal
      setKeyCopied(false);
      setNewKeyName('');
      setShowGenerator(false);
      
      // Don't show success toast here - wait until user copies the key
    } catch (error: any) {
      console.error('Key generation failed:', error);
      toast.error(error?.message || 'Failed to generate key');
    }
  };
  
  const handleCleanupBrokenKeys = async () => {
    if (!confirm('This will revoke all existing keys. You can then generate new ones. Continue?')) {
      return;
    }
    
    try {
      if (!sessionToken) {
        toast.error('Please authenticate first');
        return;
      }
      const result = await revokeAllUserKeys({ sessionToken });
      toast.success(`Revoked ${result.revokedCount} keys. You can now generate new ones.`);
      // Force refresh of API keys list
      window.location.reload();
    } catch (error) {
      toast.error('Failed to cleanup keys');
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
    setKeyCopied(true);
  };
  
  // Show wallet connection or authentication required message
  if (!isConnected || !address) {
    return (
      <div className="max-w-4xl mx-auto">
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">🔐 Wallet Required</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to access the Developer Portal and generate API keys.
          </p>
          <p className="text-sm text-gray-500">
            API keys are tied to your wallet address for security and individual access control.
          </p>
        </GlassCard>
      </div>
    );
  }

  // Show authentication loading or prompt
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto">
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">
            {isAuthenticating ? '🔐 Authenticating...' : '🔐 Authentication Required'}
          </h2>
          <p className="text-gray-400 mb-6">
            {isAuthenticating 
              ? 'Please sign the authentication message in your wallet.'
              : 'We need to verify your wallet ownership for secure access.'
            }
          </p>
          {!isAuthenticating && (
            <button
              onClick={authenticate}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
            >
              Authenticate Wallet
            </button>
          )}
          <p className="text-sm text-gray-500 mt-4">
            This creates a secure session for managing your API keys securely.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* API Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <GlassCard className="p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">API Health</h3>
          <div className={`text-2xl font-bold ${networkStats?.networkHealth >= 95 ? 'text-green-400' : networkStats?.networkHealth >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
            {networkStats?.networkHealth?.toFixed(1) || '0.0'}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Service availability
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Response Time</h3>
          <div className={`text-2xl font-bold ${networkStats?.avgResponseTime <= 1000 ? 'text-green-400' : networkStats?.avgResponseTime <= 3000 ? 'text-yellow-400' : 'text-red-400'}`}>
            {networkStats?.avgResponseTime ? `${networkStats.avgResponseTime.toFixed(0)}ms` : '~1200ms'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Average latency
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Active Providers</h3>
          <div className="text-2xl font-bold text-blue-400">
            {networkStats?.activeProviders || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {networkStats?.totalProviders || 0} total providers
          </div>
        </GlassCard>
      </div>
      
      {/* API Keys Section */}
      <GlassCard className="p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 mr-4">
            <h2 className="text-xl font-semibold">API Keys</h2>
            <p className="text-sm text-gray-400 mt-1">
              You can have one developer key (500/day) and one agent key (5,000/day). Both provide full access to Venice AI models.
            </p>
            <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-3 mt-2">
              <p className="text-xs text-blue-300">
                ✅ <strong>Equal Access:</strong> Both <code>dk_</code> and <code>ak_</code> keys provide identical functionality - chat completions, image generation, and model routing through Venice AI providers. The only difference is daily request limits.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            disabled={!canCreateAnyKey || !isConnected || !address}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap"
          >
            {!isConnected ? 'Connect Wallet' : canCreateAnyKey ? '+ New Key' : 'All Keys Created'}
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
                  disabled={!canCreateDeveloper}
                  className="mr-2"
                />
                <span className={!canCreateDeveloper ? 'text-gray-500' : ''}>
                  Developer Key (dk_) - 500 requests/day {!canCreateDeveloper && '- Already Created'}
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={keyType === 'agent'}
                  onChange={() => setKeyType('agent')}
                  disabled={!canCreateAgent}
                  className="mr-2"
                />
                <span className={!canCreateAgent ? 'text-gray-500' : ''}>
                  Agent Key (ak_) - 5,000 requests/day {!canCreateAgent && '- Already Created'}
                </span>
              </label>
            </div>
            
            <button
              onClick={handleGenerateKey}
              disabled={!newKeyName || !isConnected || !address || (keyType === 'developer' && !canCreateDeveloper) || (keyType === 'agent' && !canCreateAgent)}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg disabled:opacity-50 transition-colors"
            >
              Generate {keyType === 'developer' ? 'Developer' : 'Agent'} Key
            </button>
          </div>
        )}
        
        {/* Temporary cleanup for broken keys */}
        {apiKeys && apiKeys.length > 0 && apiKeys.every(k => k.isActive) && (
          <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500 rounded-lg">
            <p className="text-sm mb-2">⚠️ It looks like your keys were auto-generated and can't be accessed.</p>
            <button
              onClick={handleCleanupBrokenKeys}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-medium"
            >
              Clean Up and Start Fresh
            </button>
          </div>
        )}
        
        {/* Keys List */}
        <div className="space-y-3">
          {apiKeys?.map((key) => (
            <div key={key._id} className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{key.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      key.keyType === 'agent' 
                        ? 'bg-purple-500/20 text-purple-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {key.keyType === 'agent' ? 'Agent' : 'Developer'}
                    </span>
                    {key.isActive ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">
                        Revoked
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm text-gray-400 font-mono bg-black/50 px-2 py-1 rounded">
                      {key.maskedKey}
                    </p>
                    <span className="text-xs text-gray-500">🔒 Secured</span>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    Created: {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsed && ` • Last used: ${new Date(key.lastUsed).toLocaleString()}`}
                  </p>
                </div>
                
                <div className="text-right ml-4">
                  <p className="text-sm mb-2 font-semibold">
                    <span className={key.dailyUsage / key.dailyLimit > 0.8 ? 'text-yellow-400' : 'text-green-400'}>
                      {key.dailyUsage}
                    </span>
                    <span className="text-gray-400">/{key.dailyLimit}</span>
                    <span className="text-xs text-gray-500 block">today</span>
                  </p>
                  
                  {key.isActive && (
                    <button
                      onClick={() => {
                        if (confirm(`Revoke "${key.name}"? This cannot be undone and you won't be able to create another ${key.keyType} key.`)) {
                          if (sessionToken) {
                            revokeKey({ keyId: key._id, sessionToken });
                          } else {
                            toast.error('Please authenticate first');
                          }
                        }
                      }}
                      className="text-red-400 hover:text-red-300 text-sm transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
              
              {/* Usage bar */}
              <div className="mt-3 bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    key.dailyUsage / key.dailyLimit > 0.9 
                      ? 'bg-red-500' 
                      : key.dailyUsage / key.dailyLimit > 0.7 
                        ? 'bg-yellow-500' 
                        : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min((key.dailyUsage / key.dailyLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
          
          {!apiKeys?.length && (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-2">No API keys yet.</p>
              <p className="text-sm text-gray-500">
                Create a developer key (500 requests/day) or agent key (5,000 requests/day) to get started.
              </p>
            </div>
          )}
          
          {apiKeys && apiKeys.length > 0 && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300 mb-1">🔐 Security Notice</p>
              <p className="text-xs text-gray-400 mb-2">
                Your API keys are securely stored and can never be viewed in full again after creation. 
                Keep your keys safe and never share them publicly.
              </p>
              <p className="text-xs text-blue-300">
                💡 <strong>Key Prefixes:</strong> Developer keys start with <code>dk_</code> and agent keys start with <code>ak_</code>. 
                Both provide full access to Venice AI models through Dandolo routing.
              </p>
            </div>
          )}
        </div>
      </GlassCard>
      
      {/* One-time key display modal - ensure this is at the root level of the return statement */}
      {showKeyModal && generatedKey && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <GlassCard className="p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4">🎉 API Key Generated!</h2>
            
            <div className="bg-red-500/20 border border-red-500 p-4 rounded-lg mb-6">
              <p className="font-semibold mb-1">⚠️ IMPORTANT - SAVE THIS KEY NOW</p>
              <p className="text-sm">This is the ONLY time you'll see the full key.</p>
              <p className="text-sm mt-2">Copy it now and store it securely!</p>
            </div>
            
            <div className="bg-black/50 p-4 rounded-lg font-mono text-sm mb-6 break-all border-2 border-green-400/50">
              {generatedKey}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(generatedKey)}
                className={`flex-1 px-4 py-2 ${keyCopied ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'} rounded-lg transition-colors font-semibold`}
              >
                {keyCopied ? '✅ Copied to Clipboard!' : '📋 Copy Key'}
              </button>
              <button
                onClick={() => {
                  if (!keyCopied) {
                    if (!confirm('Are you sure? You haven\'t copied the key yet!')) {
                      return;
                    }
                  }
                  setShowKeyModal(false);
                  setGeneratedKey('');
                  toast.success('Key saved successfully!');
                }}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                {keyCopied ? 'Close' : 'Close (without copying)'}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
      
      {/* Service Status */}
      <GlassCard className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Service Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${networkStats?.networkHealth >= 95 ? 'bg-green-500' : networkStats?.networkHealth >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <span className="font-medium">API Endpoints</span>
            </div>
            <span className={`text-sm font-semibold ${networkStats?.networkHealth >= 95 ? 'text-green-400' : networkStats?.networkHealth >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
              {networkStats?.networkHealth >= 95 ? 'Operational' : networkStats?.networkHealth >= 80 ? 'Degraded' : 'Issues'}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${networkStats?.activeProviders > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium">Model Providers</span>
            </div>
            <span className={`text-sm font-semibold ${networkStats?.activeProviders > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {networkStats?.activeProviders > 0 ? 'Available' : 'Unavailable'}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${networkStats?.avgResponseTime <= 2000 ? 'bg-green-500' : networkStats?.avgResponseTime <= 5000 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <span className="font-medium">Response Performance</span>
            </div>
            <span className={`text-sm font-semibold ${networkStats?.avgResponseTime <= 2000 ? 'text-green-400' : networkStats?.avgResponseTime <= 5000 ? 'text-yellow-400' : 'text-red-400'}`}>
              {networkStats?.avgResponseTime <= 2000 ? 'Fast' : networkStats?.avgResponseTime <= 5000 ? 'Moderate' : 'Slow'}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Quick Start Guide */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Start</h2>
        <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto text-sm">
{`// Use direct HTTP requests with Dandolo
// Developer key (dk_) for development - 500 requests/day
const response = await fetch("https://api.dandolo.ai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer dk_your_developer_key",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "auto-select",
    messages: [{ role: "user", content: "Hello!" }]
  })
});

// Agent key (ak_) for production - 5,000 requests/day
const prodResponse = await fetch("https://api.dandolo.ai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ak_your_agent_key",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "auto-select",
    messages: [{ role: "user", content: "Hello from production!" }]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`}
        </pre>
      </GlassCard>
    </div>
  );
}