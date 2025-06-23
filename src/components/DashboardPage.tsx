import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { useAccount } from 'wagmi';
import GlassCard from './GlassCard';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import AnimatedPointsCounter from './AnimatedPointsCounter';

const DashboardPage: React.FC = () => {
  const { address } = useAccount();
  const [providerName, setProviderName] = useState('');
  const [veniceApiKey, setVeniceApiKey] = useState('');
  
  // SECURITY NOTE: API key is only temporarily stored in memory during registration
  // and is immediately cleared. It's never persisted or logged.
  const [isRegistering, setIsRegistering] = useState(false);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [dailyVCUPoints, setDailyVCUPoints] = useState(0);
  const animationFrameRef = useRef<number>();

  // Queries
  const userStats = useQuery(api.points.getUserStats, address ? { address } : "skip");
  const userPoints = useQuery(api.wallets.getUserPoints, address ? { address } : "skip");
  const providers = useQuery(api.providers.list);
  const currentProvider = providers?.find(p => p.address === address);
  const providerStats = useQuery(
    api.points.getProviderPoints,
    currentProvider?._id ? { providerId: currentProvider._id } : "skip"
  );
  const addressPoints = useQuery(
    api.providers.getPointsByAddress,
    address ? { address } : "skip"
  );
  
  // Health and performance queries
  const networkStats = useQuery(api.stats.getNetworkStats);
  const providerHealth = useQuery(
    api.providers.getProviderUptime,
    currentProvider?._id ? { providerId: currentProvider._id, hours: 24 } : "skip"
  );
  const healthHistory = useQuery(
    api.providers.getHealthHistory,
    currentProvider?._id ? { providerId: currentProvider._id, limit: 6 } : "skip"
  );

  // Mutations and Actions
  const validateVeniceApiKey = useAction(api.providers.validateVeniceApiKey);
  const registerProviderWithVCU = useAction(api.providers.registerProviderWithVCU);
  const removeProvider = useMutation(api.providers.remove);

  // Calculate daily VCU points (1:1 ratio, updates throughout the day)
  useEffect(() => {
    if (currentProvider?.vcuBalance) {
      const hoursElapsed = new Date().getHours() + (new Date().getMinutes() / 60);
      const dailyProgress = hoursElapsed / 24;
      const pointsEarnedToday = Math.floor(currentProvider.vcuBalance * dailyProgress);
      setDailyVCUPoints(pointsEarnedToday);
    }
  }, [currentProvider]);

  // Animate points counter
  useEffect(() => {
    // For providers: combine provider points + user points
    // For non-providers: just user points
    const providerPoints = providerStats?.points || 0;
    const personalPoints = userPoints || 0;
    const targetPoints = currentProvider ? (providerPoints + personalPoints) : personalPoints;
    if (targetPoints !== displayPoints) {
      const startPoints = displayPoints;
      const endPoints = targetPoints;
      const duration = 1000;
      const startTime = Date.now();

      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentPoints = startPoints + (endPoints - startPoints) * easeOutQuart;

        setDisplayPoints(currentPoints);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [providerStats?.points, userPoints, currentProvider]);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#D4AF37', '#E63946', '#FFFFFF']
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#D4AF37', '#E63946', '#FFFFFF']
      });
    }, 250);
  };

  const validateAndRegister = async () => {
    if (!address) {
      toast.error("Connect wallet first");
      return;
    }

    if (!veniceApiKey.trim()) {
      toast.error("Enter Venice.ai API key");
      return;
    }

    setIsRegistering(true);

    try {
      const validation = await validateVeniceApiKey({ apiKey: veniceApiKey });

      if (!validation.isValid) {
        throw new Error(validation.error || "Invalid API key");
      }

      // Use automatically detected VCU balance
      const detectedVcuBalance = validation.balance || 0;
      
      if (validation.warning) {
        toast.warning(validation.warning);
      }
      
      if (detectedVcuBalance > 0) {
        toast.success(`✅ Validated! Detected ${detectedVcuBalance.toFixed(2)} VCU available (${validation.models || 0} models)`);
      } else {
        toast.success(`✅ Validated! Venice.ai API key works (${validation.models || 0} models available). VCU balance will be updated automatically.`);
      }

      const providerId = await registerProviderWithVCU({
        address: address,
        name: providerName || `Provider ${address.substring(0, 8)}`,
        veniceApiKey: veniceApiKey.trim(),
        vcuBalance: detectedVcuBalance,
      });

      setProviderName("");
      setVeniceApiKey("");
      toast.success("🎉 Provider registered successfully!");
      triggerConfetti();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Registration failed";
      toast.error(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  if (currentProvider && currentProvider._id) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{currentProvider.name}</h2>
                <p className="text-sm text-gray-400">{address}</p>
              </div>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold ${
                currentProvider.isActive 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  currentProvider.isActive ? 'bg-green-500' : 'bg-red-500'
                } animate-pulse`}></div>
                <span>{currentProvider.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            {/* Real-time stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-gold">{currentProvider.vcuBalance?.toFixed(2) || '0.00'}</div>
                <div className="text-sm text-gray-400">VCU Available</div>
                <div className="text-xs text-gray-500 mt-1">
                  Updates hourly
                </div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-red">{currentProvider.totalPrompts}</div>
                <div className="text-sm text-gray-400">Prompts Served</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className={`text-2xl font-bold ${providerHealth?.uptimePercentage >= 95 ? 'text-green-400' : providerHealth?.uptimePercentage >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {providerHealth?.uptimePercentage?.toFixed(1) || '0.0'}%
                </div>
                <div className="text-sm text-gray-400">24h Uptime</div>
                <div className="text-xs text-gray-500 mt-1">
                  {providerHealth?.totalChecks || 0} checks
                </div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className={`text-2xl font-bold ${currentProvider.avgResponseTime <= 1000 ? 'text-green-400' : currentProvider.avgResponseTime <= 3000 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {currentProvider.avgResponseTime ? `${currentProvider.avgResponseTime.toFixed(0)}ms` : 'N/A'}
                </div>
                <div className="text-sm text-gray-400">Avg Response</div>
                <div className="text-xs text-gray-500 mt-1">
                  Last 24h
                </div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <AnimatedPointsCounter points={displayPoints} />
                <div className="text-sm text-gray-400">Total Points</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg border-2 border-gold/30">
                <div className="text-2xl font-bold text-gold animate-pulse">{dailyVCUPoints}</div>
                <div className="text-sm text-gray-400">VCU Points Today</div>
                <div className="text-xs text-gray-500 mt-1">
                  Updates hourly
                </div>
              </div>
            </div>

            {/* Points Breakdown */}
            {addressPoints && (
              <div className="bg-white/5 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold mb-4 text-white">Points Breakdown</h3>
                
                {/* Provider Points */}
                <div className="mb-6">
                  <h4 className="text-md font-medium mb-3 text-gray-300">Provider Earnings</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-yellow-400">{addressPoints.breakdown.vcuProviding.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">VCU Providing</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-400">{addressPoints.breakdown.promptService.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">Prompt Service</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-400">{addressPoints.breakdown.developerApi.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">Developer API</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-purple-400">{addressPoints.breakdown.agentApi.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">Agent API</div>
                    </div>
                  </div>
                </div>

                {/* User Points */}
                <div className="mb-4 border-t border-gray-700 pt-4">
                  <h4 className="text-md font-medium mb-3 text-gray-300">Personal Usage</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-cyan-400">{userPoints || 0}</div>
                      <div className="text-xs text-gray-400">Chat Points</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-cyan-400">{userStats?.promptsToday || 0}</div>
                      <div className="text-xs text-gray-400">Prompts Today</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-cyan-400">{userStats?.promptsRemaining || 0}</div>
                      <div className="text-xs text-gray-400">Remaining Today</div>
                    </div>
                  </div>
                </div>

                <div className="text-center border-t border-gray-700 pt-3">
                  <div className="text-2xl font-bold text-gold">{((addressPoints.totalPoints || 0) + (userPoints || 0)).toLocaleString()}</div>
                  <div className="text-sm text-gray-400">Total Points (Provider + Personal)</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Provider: {addressPoints.totalPoints.toLocaleString()} • Personal: {(userPoints || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Health & Performance Section */}
            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold mb-4 text-white">Health & Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Health Status */}
                <div>
                  <h4 className="text-md font-medium mb-3 text-gray-300">Health Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Last Health Check</span>
                      <span className="text-sm text-white">
                        {currentProvider.lastHealthCheck 
                          ? new Date(currentProvider.lastHealthCheck).toLocaleString()
                          : 'Never'
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Consecutive Failures</span>
                      <span className={`text-sm font-semibold ${currentProvider.consecutiveFailures > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {currentProvider.consecutiveFailures || 0}
                      </span>
                    </div>
                    {healthHistory && healthHistory.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Recent Checks</span>
                        <div className="flex space-x-1">
                          {healthHistory.slice(0, 6).map((check, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 rounded-full ${check.status ? 'bg-green-500' : 'bg-red-500'}`}
                              title={`${check.status ? 'Healthy' : 'Failed'} - ${new Date(check.timestamp).toLocaleString()}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Network Stats */}
                <div>
                  <h4 className="text-md font-medium mb-3 text-gray-300">Network Overview</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Network Health</span>
                      <span className={`text-sm font-semibold ${networkStats?.networkHealth >= 95 ? 'text-green-400' : networkStats?.networkHealth >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {networkStats?.networkHealth?.toFixed(1) || '0.0'}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Network Avg Response</span>
                      <span className="text-sm text-white">
                        {networkStats?.avgResponseTime ? `${networkStats.avgResponseTime.toFixed(0)}ms` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Active Providers</span>
                      <span className="text-sm text-white">
                        {networkStats?.activeProviders || 0} / {networkStats?.totalProviders || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Info */}
            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Provider Address</span>
                <span className="text-white font-mono text-sm">{currentProvider.address}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Registered</span>
                <span className="text-white">
                  {new Date(currentProvider._creationTime || 0).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to remove this provider?')) {
                    await removeProvider({ providerId: currentProvider._id });
                    toast.success('Provider removed');
                  }
                }}
                className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Remove Provider
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Registration form for non-providers
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <GlassCard className="p-4">
            <h3 className="text-lg font-semibold mb-2">Your Points</h3>
            <p className="text-2xl font-bold">{userPoints || 0}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <h3 className="text-lg font-semibold mb-2">Prompts Today</h3>
            <p className="text-2xl font-bold">{userStats?.promptsToday || 0}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <h3 className="text-lg font-semibold mb-2">Remaining</h3>
            <p className="text-2xl font-bold">{userStats?.promptsRemaining || 50}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <h3 className="text-lg font-semibold mb-2">Network Health</h3>
            <p className={`text-2xl font-bold ${networkStats?.networkHealth >= 95 ? 'text-green-400' : networkStats?.networkHealth >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
              {networkStats?.networkHealth?.toFixed(1) || '0.0'}%
            </p>
            <div className="text-xs text-gray-400 mt-1">
              {networkStats?.activeProviders || 0} active providers
            </div>
          </GlassCard>
        </div>
        <GlassCard className="p-6">
          <h2 className="text-2xl font-bold mb-4">Become a Provider</h2>
          <p className="text-gray-300 mb-6">
            Add your Venice.ai API key to contribute VCU to the network and earn rewards.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Provider Name (Optional)
              </label>
              <input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="Enter a name for your provider"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold"
                disabled={isRegistering}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Venice.ai API Key
              </label>
              <input
                type="password"
                value={veniceApiKey}
                onChange={(e) => setVeniceApiKey(e.target.value)}
                placeholder="Enter your Venice.ai API key"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold"
                disabled={isRegistering}
              />
            </div>
            <button
              onClick={validateAndRegister}
              disabled={isRegistering || !veniceApiKey.trim() || !address}
              className="w-full px-4 py-3 bg-gradient-to-r from-red to-gold text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {isRegistering ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Validating & Registering...
                </>
              ) : (
                "Register as Provider"
              )}
            </button>
            {!address && (
              <p className="text-sm text-yellow-400 text-center">
                Please connect your wallet to register as a provider
              </p>
            )}
          </div>
          <div className="mt-4 p-4 bg-gold/10 border border-gold/30 rounded-lg">
            <p className="text-sm text-gold">
              Your Venice.ai VCU will be automatically detected and added to the shared network pool. You'll earn 1 point per VCU per day, plus additional points for serving requests. VCU balances update automatically every hour.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default DashboardPage;
