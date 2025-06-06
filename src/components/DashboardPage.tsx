import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useAccount } from 'wagmi';
import GlassCard from './GlassCard';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { Id } from '../../convex/_generated/dataModel';
import confetti from 'canvas-confetti';

interface Provider {
  _id: Id<"providers">;
  address: string;
  name: string;
  description?: string;
  vcuBalance: number;
  totalPrompts: number;
  uptime: number;
  isActive: boolean;
  registrationDate: number;
  lastHealthCheck?: number;
  avgResponseTime?: number;
  status: 'active' | 'inactive' | 'pending';
}

interface ProviderStats {
  points: number;
  totalPrompts: number;
  recentHealthChecks: Array<{
    _id: Id<"healthChecks">;
    timestamp: number;
    status: 'success' | 'failure';
    responseTime?: number;
    errorMessage?: string;
  }>;
}

const formatPoints = (points: number) => {
  return points.toFixed(5);
};

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
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
};

const DashboardPage: React.FC = () => {
  const { address } = useAccount();
  const [providerName, setProviderName] = useState('');
  const [veniceApiKey, setVeniceApiKey] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [displayPoints, setDisplayPoints] = useState(0);
  const animationFrameRef = useRef<number>();

  // Queries
  const userStats = useQuery(api.points.getUserStats, { address });
  const systemStats = useQuery(api.analytics.getSystemStats);
  const providers = useQuery(api.providers.list) as Provider[] | undefined;
  const currentProvider = providers?.find(p => p.address === address);
  const providerStats = useQuery(
    api.providers.getStats, 
    currentProvider ? { providerId: currentProvider._id } : "skip"
  ) as ProviderStats | undefined;

  // Mutations
  const registerProvider = useMutation(api.providers.registerProvider);
  const removeProvider = useMutation(api.providers.remove);

  // Animate points counter
  useEffect(() => {
    if (userStats?.points !== undefined) {
      const startPoints = displayPoints;
      const endPoints = userStats.points;
      const duration = 1000; // 1 second
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentPoints = startPoints + (endPoints - startPoints) * easeOutQuart;

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
  }, [userStats?.points]);

  const handleProviderRegistration = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!providerName.trim()) {
      toast.error("Please enter a provider name");
      return;
    }

    if (!veniceApiKey.trim()) {
      toast.error("Please enter your Venice.ai API key");
      return;
    }

    setIsRegistering(true);
    try {
      await registerProvider({
        address,
        name: providerName,
        description: "Venice.ai Provider",
        veniceApiKey: veniceApiKey.trim()
      });
      toast.success("Provider registered successfully!");
      setProviderName("");
      setVeniceApiKey("");
    } catch (error) {
      toast.error("Failed to register provider");
      console.error(error);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div>
            <h2 className="text-2xl font-bold mb-4">User Stats</h2>
            <div className="grid grid-cols-1 gap-4">
              <GlassCard className="p-4">
                <h3 className="text-lg font-semibold">Points Balance</h3>
                <p className="text-2xl font-bold">{formatPoints(displayPoints)}</p>
              </GlassCard>
              <GlassCard className="p-4">
                <h3 className="text-lg font-semibold">Total Prompts</h3>
                <p className="text-2xl font-bold">{userStats?.totalPrompts || 0}</p>
              </GlassCard>
              <GlassCard className="p-4">
                <h3 className="text-lg font-semibold">Avg Response Time</h3>
                <p className="text-2xl font-bold">{userStats?.avgResponseTime || 0}ms</p>
              </GlassCard>
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-4">System Stats</h2>
            <div className="grid grid-cols-1 gap-4">
              <GlassCard className="p-4">
                <h3 className="text-lg font-semibold">Active Providers</h3>
                <p className="text-2xl font-bold">{systemStats?.activeProviders || 0}</p>
              </GlassCard>
              <GlassCard className="p-4">
                <h3 className="text-lg font-semibold">Network Health</h3>
                <p className="text-2xl font-bold">{systemStats?.networkHealth || 0}%</p>
              </GlassCard>
              <GlassCard className="p-4">
                <h3 className="text-lg font-semibold">Total Requests</h3>
                <p className="text-2xl font-bold">{systemStats?.totalRequests || 0}</p>
              </GlassCard>
            </div>
          </div>
        </div>

        {/* Provider Section */}
        {!currentProvider ? (
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">Become a Provider</h2>
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
                  placeholder="Enter a name or leave blank for anonymous"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold"
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
                />
              </div>
              
              <button
                onClick={handleProviderRegistration}
                disabled={isRegistering || !veniceApiKey.trim() || !address}
                className="w-full primary-cta disabled:opacity-50"
              >
                {isRegistering ? "Registering..." : "Register as Provider"}
              </button>
              
              {!address && (
                <p className="text-sm text-yellow-400 text-center">
                  Please connect your wallet to register as a provider
                </p>
              )}
            </div>
            
            <div className="mt-4 p-4 bg-gold/10 border border-gold/30 rounded-lg">
              <p className="text-sm text-gold">
                Your Venice.ai VCU will be added to the shared network pool and you'll earn points based on your contribution.
              </p>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Your Provider Status</h2>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                currentProvider.isActive 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {currentProvider.isActive ? '🟢 Active' : '🔴 Inactive'}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <div className="text-2xl font-bold text-gold">{currentProvider.vcuBalance}</div>
                <div className="text-sm text-gray-400">VCU Available</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red">{currentProvider.totalPrompts}</div>
                <div className="text-sm text-gray-400">Prompts Served</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gold">{currentProvider.uptime.toFixed(1)}%</div>
                <div className="text-sm text-gray-400">Uptime</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red">{providerStats?.points || 0}</div>
                <div className="text-sm text-gray-400">Points Earned</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300">Provider Name</span>
                <span className="text-white font-medium">{currentProvider.name}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300">Last Health Check</span>
                <span className="text-white">
                  {currentProvider.lastHealthCheck 
                    ? new Date(currentProvider.lastHealthCheck).toLocaleString()
                    : 'Never'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300">Registration Date</span>
                <span className="text-white">
                  {currentProvider.registrationDate
                    ? new Date(currentProvider.registrationDate).toLocaleDateString()
                    : 'Unknown'
                  }
                </span>
              </div>
            </div>
            
            {/* Recent Health Checks */}
            {providerStats?.recentHealthChecks && providerStats.recentHealthChecks.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">Recent Health Checks</h3>
                <div className="space-y-2">
                  {providerStats.recentHealthChecks.slice(0, 5).map((check, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          check.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm text-gray-300">
                          {new Date(check.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-400">
                        {check.responseTime ? `${check.responseTime}ms` : 'Failed'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to remove this provider?')) {
                    await removeProvider({ providerId: currentProvider._id });
                    toast.success('Provider removed');
                  }
                }}
                className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md hover:bg-red-500/30 transition-colors text-sm"
              >
                Remove Provider
              </button>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default DashboardPage; 