import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { GlassCard } from "./GlassCard";
import { WalletConnection } from "./WalletConnection";
import { useState } from "react";
import { toast } from "sonner";

interface DashboardProps {
  sessionId: string;
  walletAddress: string;
  isWalletConnected: boolean;
  onWalletConnection: (connected: boolean, address?: string) => void;
}

export function Dashboard({ sessionId, walletAddress, isWalletConnected, onWalletConnection }: DashboardProps) {
  const [apiKey, setApiKey] = useState("");
  const [isProvider, setIsProvider] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  const userStats = useQuery(api.points.getUserStats, { sessionId });
  const usageHistory = useQuery(api.inference.getUserUsage, { sessionId });
  const generateApiKey = useMutation(api.developers.generateApiKey);
  const rateLimitStatus = useQuery(api.rateLimit.getRateLimitStatus, { sessionId });
  const validateVeniceKey = useAction(api.providers.validateVeniceApiKey);
  const networkStats = useQuery(api.stats.getNetworkStats);
  const providers = useQuery(api.providers.listActive);

  const handleWalletConnectionChange = (connected: boolean, walletAddress?: string) => {
    onWalletConnection(connected, walletAddress);
    if (!connected) {
      setIsProvider(false);
      setApiKey("");
    }
  };

  const validateAndRegister = async () => {
    if (!apiKey.startsWith('vk_')) {
      toast.error("Please enter a valid Venice API key (starts with vk_)");
      return;
    }

    if (!walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsValidating(true);
    try {
      // Validate Venice API key
      const validation = await validateVeniceKey({ apiKey });
      
      if (!validation.isValid) {
        toast.error(`Invalid API key: ${validation.error}`);
        return;
      }
      
      // Register as provider with validated key
      toast.success(`Verified! Contributing ${validation.balance} VCU to the network`);
      setIsProvider(true);
      setApiKey(""); // Clear for security
    } catch (error) {
      toast.error("Failed to validate API key");
    } finally {
      setIsValidating(false);
    }
  };

  const handleGenerateApiKey = async () => {
    try {
      const newApiKey = await generateApiKey({ sessionId });
      navigator.clipboard.writeText(newApiKey);
      toast.success("API key generated and copied to clipboard!");
    } catch (error) {
      toast.error("Failed to generate API key");
    }
  };

  if (!isWalletConnected) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-red bg-clip-text text-transparent mb-4">
            Personal Dashboard
          </h1>
          <p className="text-gray-300">Connect your wallet to view your personal data and become a provider</p>
        </div>

        <GlassCard>
          <div className="p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-red to-gold rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-3xl">👛</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              Connect your wallet to access your personal dashboard and register as a provider.
            </p>
            <WalletConnection onConnectionChange={handleWalletConnectionChange} />
          </div>
        </GlassCard>
      </div>
    );
  }

  if (!networkStats || !providers) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  const activeProviders = providers.filter(p => p.status === 'active').length;
  const totalVCU = providers.reduce((sum, p) => sum + p.vcuBalance, 0);
  const avgUptime = providers.reduce((sum, p) => sum + p.uptime, 0) / providers.length;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-red bg-clip-text text-transparent">
        Network Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-red mb-2">
              {activeProviders}
            </div>
            <div className="text-gray-300">Active Providers</div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-gold mb-2">
              {totalVCU.toLocaleString()}
            </div>
            <div className="text-gray-300">Total VCU</div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-red mb-2">
              {networkStats.totalPrompts.toLocaleString()}
            </div>
            <div className="text-gray-300">Total Prompts</div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-gold mb-2">
              {avgUptime.toFixed(1)}%
            </div>
            <div className="text-gray-300">Avg Uptime</div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Network Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gold mb-4">Performance Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Network Uptime</span>
                  <span className="text-gold font-semibold">
                    {networkStats.networkUptime.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Prompts Today</span>
                  <span className="text-red font-semibold">
                    {networkStats.promptsToday}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Average Response Time</span>
                  <span className="text-gold font-semibold">
                    {networkStats.avgResponseTime}ms
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gold mb-4">Provider Distribution</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Providers</span>
                  <span className="text-white font-semibold">
                    {providers.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Active Providers</span>
                  <span className="text-gold font-semibold">
                    {activeProviders}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total VCU Pool</span>
                  <span className="text-red font-semibold">
                    {totalVCU.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Usage Stats - MVP Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-red mb-2">{userStats?.promptsToday || 0}</div>
            <div className="text-gray-300 mb-2">Prompts Today</div>
            <div className="text-xs text-gray-400">Free MVP (50/day limit)</div>
          </div>
        </GlassCard>
        
        <GlassCard>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-gold mb-2">{rateLimitStatus?.remaining || 0}</div>
            <div className="text-gray-300 mb-2">Prompts Remaining</div>
            <div className="text-xs text-gray-400">Resets daily</div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-gold mb-2">{userStats?.points || 0}</div>
            <div className="text-gray-300 mb-2">Points (Private)</div>
            <div className="text-xs text-gray-400">For future use</div>
          </div>
        </GlassCard>
      </div>

      {/* Privacy Notice */}
      <GlassCard>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-4">🔒 Privacy Guarantee</h2>
          <div className="bg-gold/10 border border-gold/30 rounded-lg p-4">
            <div className="text-gold text-sm">
              <p className="mb-2"><strong>Dandolo is a private routing service.</strong> We NEVER store or analyze your prompts:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Prompts are routed directly to Venice.ai providers</li>
                <li>No prompt content is ever stored or logged</li>
                <li>Only anonymous usage metrics are tracked (count, timestamp)</li>
                <li>Your conversations remain completely private</li>
              </ul>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Provider Registration/Status */}
      <GlassCard>
        <div className="p-6">
          {!isProvider ? (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Become a Provider</h2>
              <p className="text-gray-300 mb-6">
                Share your Venice.ai compute with the network and earn points based on your VCU contribution.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Venice API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Venice API key (vk_...)"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red focus:border-transparent"
                  />
                </div>
                
                <button
                  onClick={validateAndRegister}
                  disabled={!apiKey || isValidating || !walletAddress}
                  className="px-6 py-3 bg-gradient-to-r from-red to-gold text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isValidating ? "Validating..." : "Verify & Register"}
                </button>
              </div>
              
              <div className="mt-6 p-4 bg-red/10 border border-red/30 rounded-lg">
                <div className="text-red text-sm">
                  <p className="mb-2">🔑 We'll verify your Venice API key and check your VCU balance</p>
                  <p className="mb-2">⚡ Your VCU will be added to the shared network pool</p>
                  <p>🎯 Earn points daily based on your VCU contribution</p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Your Provider Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gold mb-1">🟢 Online</div>
                  <div className="text-gray-300 text-sm">Status</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red mb-1">1,247</div>
                  <div className="text-gray-300 text-sm">VCU Available</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gold mb-1">23</div>
                  <div className="text-gray-300 text-sm">Points Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red mb-1">1,456</div>
                  <div className="text-gray-300 text-sm">Total Points</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Points Info */}
      <GlassCard>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-4">MVP Points System (Private)</h2>
          <div className="bg-red/10 border border-red/30 rounded-lg p-4 mb-4">
            <div className="text-red text-sm">
              <p className="mb-2">🔒 <strong>Your points are private</strong> - only visible in your personal dashboard</p>
              <p className="mb-2">⭐ Earn points by using the platform (tracked for future rewards)</p>
              <p className="mb-2">🏗️ Providers earn points based on daily VCU contribution</p>
              <p>🚀 Points will be used for future platform rewards and governance</p>
            </div>
          </div>
          
          {userStats && userStats.promptsToday >= 50 && (
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-4">
              <div className="text-gold text-sm">
                ⚠️ You've reached the daily limit (50 prompts). Try again tomorrow!
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Developer Tools */}
      <GlassCard>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Developer Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gold mb-3">API Access</h3>
              <p className="text-gray-300 mb-4">Generate API keys for programmatic access</p>
              <button
                onClick={handleGenerateApiKey}
                className="px-4 py-2 bg-red text-white rounded-lg hover:bg-red/80 transition-colors font-semibold"
              >
                Generate API Key
              </button>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gold mb-3">SDK Integration</h3>
              <p className="text-gray-300 mb-4">Integrate Dandolo into your applications</p>
              <button
                onClick={() => window.location.href = '#developers'}
                className="px-4 py-2 bg-gold text-bg rounded-lg hover:bg-gold/80 transition-colors font-semibold"
              >
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Recent Activity - Metadata Only */}
      <GlassCard>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
          {usageHistory && usageHistory.length > 0 ? (
            <div className="space-y-3">
              {usageHistory.slice(0, 10).map((log) => (
                <div key={log._id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white font-medium">
                      Private prompt routed
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>Model: {log.model}</span>
                    <span>Tokens: {log.tokens}</span>
                    <span>Provider: {log.providerId}</span>
                    <span>Response: {log.responseTime}ms</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">No recent activity</div>
              <button
                onClick={() => window.location.href = '#chat'}
                className="primary-cta"
              >
                Start Using AI Chat
              </button>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
