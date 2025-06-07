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
  const [isRegistering, setIsRegistering] = useState(false);
  const [displayPoints, setDisplayPoints] = useState(0);
  const animationFrameRef = useRef<number>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Queries
  const userStats = useQuery(api.points.getUserStats, address ? { address } : "skip");
  const userPoints = useQuery(api.points.getUserPoints, address ? { address } : "skip");
  const systemStats = useQuery(api.analytics.getSystemStats);
  const providers = useQuery(api.providers.list);
  const currentProvider = providers?.find(p => p.address === address);
  const providerStats = useQuery(
    api.providers.getStats,
    currentProvider?._id ? { providerId: currentProvider._id } : "skip"
  );

  // Mutations and Actions
  const validateVeniceApiKey = useAction(api.providers.validateVeniceApiKey);
  const registerProviderWithVCU = useMutation(api.providers.registerProviderWithVCU);
  const removeProvider = useMutation(api.providers.remove);

  // Animate points counter
  useEffect(() => {
    const targetPoints = providerStats?.points || userPoints || 0;
    if (targetPoints !== displayPoints) {
      const startPoints = displayPoints;
      const duration = 1000;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentPoints = startPoints + (targetPoints - startPoints) * easeOutQuart;
        
        setDisplayPoints(currentPoints);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [providerStats?.points, userPoints]);

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
      // Step 1: validate API key and fetch VCU
      const validation = await validateVeniceApiKey({ apiKey: veniceApiKey });

      if (!validation.isValid) {
        throw new Error(validation.error || "Invalid API key");
      }

      toast.success(`✅ Validated! ${validation.balance.toLocaleString()} VCU available (${validation.models} models)`);

      // Step 2: register provider with computed balance
      await registerProviderWithVCU({
        address: address,
        name: providerName || `Provider ${address.substring(0, 8)}`,
        veniceApiKey: veniceApiKey.trim(),
        vcuBalance: validation.balance,
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
      <>
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-8">Provider Dashboard</h1>
            
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-gold">{currentProvider.vcuBalance}</div>
                  <div className="text-sm text-gray-400">VCU Available</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-red">{currentProvider.totalPrompts}</div>
                  <div className="text-sm text-gray-400">Prompts Served</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-gold">{currentProvider.uptime.toFixed(1)}%</div>
                  <div className="text-sm text-gray-400">Uptime</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <AnimatedPointsCounter points={displayPoints} />
                  <div className="text-sm text-gray-400">Points Earned</div>
                </div>
              </div>
              
              {/* Health status */}
              <div className="bg-white/5 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Last Health Check</span>
                  <span className="text-white">
                    {currentProvider.lastHealthCheck 
                      ? `${Math.floor((Date.now() - currentProvider.lastHealthCheck) / 60000)} minutes ago`
                      : 'Never'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Average Response Time</span>
                  <span className="text-white">{currentProvider.avgResponseTime}ms</span>
                </div>
              </div>
              
              {/* Health History Visualization */}
              {providerStats?.recentHealthChecks && providerStats.recentHealthChecks.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Health History</h3>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex space-x-1 mb-2">
                      {providerStats.recentHealthChecks.slice(0, 30).map((check, index) => (
                        <div
                          key={index}
                          className={`flex-1 h-8 rounded-sm ${
                            check.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                          } hover:opacity-80 cursor-pointer`}
                          title={`${new Date(check.timestamp).toLocaleString()} - ${
                            check.responseTime ? `${check.responseTime}ms` : 'Failed'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>30 minutes ago</span>
                      <span>Now</span>
                    </div>
                  </div>
                </div>
              )}
              
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
      </>
    );
  }

  // Registration form for non-providers
  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
          
          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
          </div>

          {/* Provider Registration */}
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
                Your Venice.ai VCU will be added to the shared network pool and you'll earn rewards based on your contribution.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
