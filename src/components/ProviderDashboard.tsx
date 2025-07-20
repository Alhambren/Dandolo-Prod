// Provider Dashboard Component for Dandolo.ai Points System
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAccount } from 'wagmi';

interface AnimatedPointsProps {
  currentPoints: number;
  usdBalance: number;
  isEarning: boolean;
  lastEarned?: number;
}

// Animated Points Counter Component
const AnimatedPointsCounter: React.FC<AnimatedPointsProps> = ({ 
  currentPoints, 
  usdBalance, 
  isEarning,
  lastEarned 
}) => {
  const [displayPoints, setDisplayPoints] = useState(currentPoints);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousPoints = useRef(currentPoints);
  
  useEffect(() => {
    if (currentPoints !== previousPoints.current) {
      setIsAnimating(true);
      
      // Animate count up over 1-2 seconds with ease-out-cubic
      const startValue = previousPoints.current;
      const endValue = currentPoints;
      const duration = 1500; // 1.5 seconds
      const startTime = Date.now();
      
      const updateCount = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out-cubic easing function
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        
        const currentValue = startValue + (endValue - startValue) * easeOutCubic;
        setDisplayPoints(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(updateCount);
        } else {
          setDisplayPoints(endValue);
          setIsAnimating(false);
          previousPoints.current = endValue;
        }
      };
      
      requestAnimationFrame(updateCount);
    }
  }, [currentPoints]);
  
  const formatPoints = (points: number) => {
    if (isAnimating && points !== currentPoints) {
      // Show decimal places during animation
      return points.toLocaleString(undefined, { 
        minimumFractionDigits: 1, 
        maximumFractionDigits: 1 
      });
    }
    // Final value shows whole numbers only
    return Math.floor(points).toLocaleString();
  };
  
  return (
    <div className={`card p-6 bg-brand-500/10 border-brand-500/20 rounded-3xl transition-all duration-300 ${
      isAnimating ? 'ring-2 ring-brand-500/50 scale-[1.02]' : ''
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-brand-500">Provider Points</h3>
        <div className={`flex items-center space-x-2 ${isEarning ? 'animate-pulse' : ''}`}>
          <div className={`w-2 h-2 rounded-full ${isEarning ? 'bg-system-green' : 'bg-neutral-500'}`} />
          <span className="text-xs text-white/60">{isEarning ? 'Earning' : 'Idle'}</span>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className={`text-4xl font-bold text-brand-500 transition-all duration-200 ${
          isAnimating ? 'scale-110' : ''
        }`}>
          {formatPoints(displayPoints)}
        </div>
        
        <div className="text-sm text-white/70 space-y-1">
          <div>Balance: ${usdBalance.toFixed(2)}</div>
          <div className="text-xs text-white/50">
            Daily Reward: +{Math.round(usdBalance * 10)} points at midnight UTC
          </div>
          {lastEarned && (
            <div className="text-xs text-white/40">
              Last earned: {new Date(lastEarned).toLocaleTimeString()}
            </div>
          )}
        </div>
        
        {/* Pulse effect on increase */}
        {isAnimating && (
          <div className="absolute inset-0 rounded-3xl bg-brand-500/20 animate-ping" />
        )}
      </div>
    </div>
  );
};

interface DailyProgressProps {
  usdBalance: number;
  earnedToday: number;
  hoursElapsed: number;
}

// Daily Progress Bar Component
const DailyProgress: React.FC<DailyProgressProps> = ({ 
  usdBalance, 
  earnedToday, 
  hoursElapsed 
}) => {
  const progress = Math.min((hoursElapsed / 24) * 100, 100);
  const usdProgress = Math.min((earnedToday / (usdBalance * 10)) * 100, 100);
  
  return (
    <div className="card p-6 bg-dark-3 rounded-3xl">
      <h3 className="text-lg font-semibold mb-4">Daily Reward Progress</h3>
      
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span>Earned Today</span>
          <span>{earnedToday.toLocaleString()}/{Math.round(usdBalance * 10).toLocaleString()} points</span>
        </div>
        
        {/* Reward Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-3">
          <div 
            className="h-3 bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-1000"
            style={{ width: `${usdProgress}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-white/60">
          <span>{usdProgress.toFixed(1)}% complete</span>
          <span>{hoursElapsed.toFixed(1)} hours elapsed</span>
        </div>
        
        <div className="text-xs text-white/40">
          Rewards distribute automatically at UTC midnight
        </div>
      </div>
    </div>
  );
};

interface HealthStatusProps {
  isActive: boolean;
  uptime: number;
  lastCheck?: number;
  healthHistory?: Array<{ status: boolean; timestamp: number; responseTime: number }>;
}

// Health Status Indicator Component
const HealthStatus: React.FC<HealthStatusProps> = ({ 
  isActive, 
  uptime, 
  lastCheck,
  healthHistory = []
}) => {
  const [showHistory, setShowHistory] = useState(false);
  
  const getStatusColor = () => {
    if (!isActive) return 'bg-system-red';
    if (uptime >= 99) return 'bg-system-green';
    if (uptime >= 95) return 'bg-system-orange';
    return 'bg-system-red';
  };
  
  const recentChecks = healthHistory.slice(-6);
  
  return (
    <div className="card p-6 bg-dark-3 rounded-3xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Health Status</h3>
        <div 
          className="relative"
          onMouseEnter={() => setShowHistory(true)}
          onMouseLeave={() => setShowHistory(false)}
        >
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          
          {/* Tooltip with recent checks */}
          {showHistory && recentChecks.length > 0 && (
            <div className="absolute right-0 top-6 bg-dark-2 border border-dark-4 rounded-xl p-3 z-10 min-w-[200px]">
              <div className="text-xs text-white/80 mb-2">Last 6 Health Checks:</div>
              <div className="flex space-x-1">
                {recentChecks.map((check, index) => (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded text-center text-xs leading-4 ${
                      check.status ? 'bg-system-green text-white' : 'bg-system-red text-white'
                    }`}
                    title={`${check.status ? 'Passed' : 'Failed'} - ${check.responseTime}ms`}
                  >
                    {check.status ? '✓' : '✗'}
                  </div>
                ))}
              </div>
              <div className="text-xs text-white/60 mt-2">
                {recentChecks.filter(c => c.status).length}/{recentChecks.length} passed
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        <div className={`text-2xl font-bold ${
          isActive ? 'text-system-green' : 'text-system-red'
        }`}>
          {isActive ? 'Healthy' : 'Unhealthy'}
        </div>
        
        <div className="text-sm text-white/70">
          Uptime: {uptime.toFixed(2)}%
        </div>
        
        {lastCheck && (
          <div className="text-xs text-white/50">
            Last checked: {new Date(lastCheck).toLocaleTimeString()}
          </div>
        )}
        
        <div className="text-xs text-white/40">
          Health checks run every 4 hours
        </div>
      </div>
    </div>
  );
};

interface ProviderStatsProps {
  address: string;
}

// Provider Statistics Component
const ProviderStats: React.FC<ProviderStatsProps> = ({ address }) => {
  const providerStats = useQuery(api.providers.getProviderStats, { address });
  
  if (!providerStats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-6 bg-dark-3 rounded-3xl animate-pulse">
            <div className="h-4 bg-white/20 rounded w-1/2 mb-4" />
            <div className="space-y-2">
              <div className="h-8 bg-white/10 rounded" />
              <div className="h-3 bg-white/10 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (!providerStats.isActive && providerStats.totalPrompts === 0) {
    return (
      <div className="card p-6 bg-dark-3 rounded-3xl text-center">
        <div className="text-white/60">
          No provider found for this wallet address.
        </div>
        <button className="btn-primary mt-4">
          Register as Provider
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Points and Health Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Points Card */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Points Earned</h3>
            {providerStats.isActive && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            )}
          </div>
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {providerStats.points.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">
            {providerStats.isActive ? 'Actively earning' : 'Inactive'}
          </div>
        </GlassCard>
        
        {/* Performance Card */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Requests Served</span>
              <span className="font-semibold">{providerStats.totalPrompts.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Avg Response</span>
              <span className="font-semibold">
                {providerStats.avgResponseTime > 0 ? `${providerStats.avgResponseTime.toFixed(0)}ms` : 'No data yet'}
              </span>
            </div>
          </div>
        </GlassCard>
        
        {/* Health Card */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Health Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                providerStats.isActive 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {providerStats.isActive ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Last Check</span>
              <span className="font-semibold text-sm">
                {provider?.lastHealthCheck 
                  ? new Date(provider.lastHealthCheck).toLocaleTimeString()
                  : 'No data'
                }
              </span>
            </div>
          </div>
        </GlassCard>
      </div>
      
      {/* Provider Guide */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Provider Performance</h3>
        <div className="text-sm text-gray-400 space-y-2">
          <p>• Points are earned at 1 point per 100 tokens processed</p>
          <p>• Provider status is monitored through regular health checks</p>
          <p>• Performance metrics help optimize request routing</p>
          {providerStats.totalPrompts === 0 && (
            <p className="text-yellow-400">• No requests processed yet - waiting for network traffic</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

// Main Provider Dashboard Component
export const ProviderDashboard: React.FC = () => {
  const { address } = useAccount();
  const [simulateEarning, setSimulateEarning] = useState(false);
  
  // Simulate real-time updates for demo
  useEffect(() => {
    if (!simulateEarning) return;
    
    const interval = setInterval(() => {
      // In real app, this would trigger from WebSocket events
    }, 3000);
    
    return () => clearInterval(interval);
  }, [simulateEarning]);
  
  if (!address) {
    return (
      <div className="p-6 text-center text-white/60">
        Connect your wallet to view provider dashboard
      </div>
    );
  }
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Provider Dashboard</h2>
        <div className="flex items-center space-x-4">
          <button 
            className={`btn-ghost text-xs ${simulateEarning ? 'bg-brand-500/20' : ''}`}
            onClick={() => setSimulateEarning(!simulateEarning)}
          >
            {simulateEarning ? 'Stop' : 'Start'} Demo Mode
          </button>
        </div>
      </div>
      
      {/* Provider Stats */}
      <ProviderStats address={address} />
      
      {/* Real-time Notifications (would be WebSocket powered) */}
      <div className="card p-4 bg-system-green/10 border-system-green/20 rounded-2xl">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-system-green rounded-full animate-pulse" />
          <span className="text-sm font-medium text-system-green">Live Provider Events</span>
        </div>
        <div className="text-xs text-white/60 mt-1">
          Connected to real-time point distribution system
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;