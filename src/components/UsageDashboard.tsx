// Real-time Usage Dashboard Component for Dandolo.ai Points System
import React, { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAccount } from 'wagmi';

interface UsageCounterProps {
  used: number;
  limit: number;
  resetTime: string;
  userType: string;
}

// Usage Counter Component with Countdown
const UsageCounter: React.FC<UsageCounterProps> = ({ used, limit, resetTime, userType }) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const resetTimestamp = new Date(resetTime).getTime();
      const difference = resetTimestamp - now;
      
      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining('Resetting...');
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [resetTime]);
  
  const percentage = (used / limit) * 100;
  const remaining = limit - used;
  
  // Color coding based on usage
  const getColorClass = () => {
    if (percentage >= 90) return 'text-system-red bg-system-red/10 border-system-red/20';
    if (percentage >= 70) return 'text-system-orange bg-system-orange/10 border-system-orange/20';
    return 'text-system-green bg-system-green/10 border-system-green/20';
  };
  
  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-system-red';
    if (percentage >= 70) return 'bg-system-orange';
    return 'bg-system-green';
  };
  
  return (
    <div className={`card p-6 ${getColorClass()} border rounded-3xl transition-all duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Daily Usage</h3>
        <span className="badge badge-secondary">{userType}</span>
      </div>
      
      <div className="space-y-4">
        <div className="text-2xl font-bold">
          {used}/{limit} prompts used
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-white/20 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        
        <div className="flex justify-between text-sm opacity-80">
          <span>{remaining} remaining</span>
          <span>Resets in: {timeRemaining}</span>
        </div>
        
        {remaining <= 10 && remaining > 0 && (
          <div className="text-sm font-medium text-system-orange">
            ⚠️ {remaining} prompts remaining today
          </div>
        )}
        
        {remaining === 0 && (
          <div className="text-sm font-medium text-system-red">
            🚫 Daily limit reached. Upgrade for higher limits.
          </div>
        )}
      </div>
    </div>
  );
};

interface PointsDisplayProps {
  totalPoints: number;
  todayPoints: number;
  pointsPerPrompt: number;
  userType: string;
}

// Points Display Component (Static)
const PointsDisplay: React.FC<PointsDisplayProps> = ({ 
  totalPoints, 
  todayPoints, 
  pointsPerPrompt,
  userType 
}) => {
  return (
    <div className="card p-6 bg-brand-500/10 border-brand-500/20 rounded-3xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-brand-500">Reputation Points</h3>
        <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
      </div>
      
      <div className="space-y-3">
        <div className="text-3xl font-bold text-brand-500">
          {totalPoints.toLocaleString()}
        </div>
        
        <div className="text-sm text-white/70">
          Today: +{todayPoints} points
        </div>
        
        <div className="text-xs text-white/50">
          Earning {pointsPerPrompt} point{pointsPerPrompt !== 1 ? 's' : ''} per prompt ({userType})
        </div>
        
        <div className="text-xs text-white/40">
          Points are permanent reputation that never decrease
        </div>
      </div>
    </div>
  );
};

interface ApiKeyStatsProps {
  address: string;
}

// API Key Management Component
const ApiKeyStats: React.FC<ApiKeyStatsProps> = ({ address }) => {
  const apiStats = useQuery(api.apiKeys.getApiKeyStats, { address });
  
  if (!apiStats) {
    return (
      <div className="card p-6 bg-dark-3 rounded-3xl">
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/2 mb-4" />
          <div className="space-y-2">
            <div className="h-3 bg-white/10 rounded" />
            <div className="h-3 bg-white/10 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card p-6 bg-dark-3 rounded-3xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">API Keys</h3>
        <span className="text-sm text-white/60">{apiStats.activeKeys}/{apiStats.totalKeys} active</span>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xl font-bold">{apiStats.totalUsage.toLocaleString()}</div>
            <div className="text-xs text-white/60">Total Requests</div>
          </div>
          <div>
            <div className="text-xl font-bold">{apiStats.dailyUsage.toLocaleString()}</div>
            <div className="text-xs text-white/60">Today's Usage</div>
          </div>
        </div>
        
        {apiStats.keys.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-white/80">Recent Keys:</div>
            {apiStats.keys.slice(0, 3).map((key) => (
              <div key={key.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${key.isActive ? 'bg-system-green' : 'bg-neutral-500'}`} />
                  <span className="font-mono">{key.keyPreview}</span>
                  <span className="text-white/40">({key.keyType})</span>
                </div>
                <span className="text-white/60">{key.dailyUsage}/{key.dailyLimit}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Main Usage Dashboard Component
export const UsageDashboard: React.FC = () => {
  const { address } = useAccount();
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds default
  
  // Mock data for demonstration - in real app this would come from Convex queries
  const [usageData, setUsageData] = useState({
    used: 45,
    limit: 100,
    resetTime: new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString(), // 14 hours from now
    userType: 'user' as const,
    totalPoints: 1234,
    todayPoints: 45,
    pointsPerPrompt: 1,
  });
  
  // Real-time polling (when document is visible)
  useEffect(() => {
    if (!address) return;
    
    const pollUserStats = () => {
      if (document.hidden) return;
      
      // In real implementation, this would be:
      // fetchUserStats().then(updateUsageData);
      
      // Simulate real-time updates for demo
      setUsageData(prev => ({
        ...prev,
        used: Math.min(prev.used + Math.random() * 2, prev.limit),
        totalPoints: prev.totalPoints + Math.floor(Math.random() * 3),
        todayPoints: prev.todayPoints + Math.floor(Math.random() * 2),
      }));
    };
    
    const interval = setInterval(pollUserStats, refreshInterval);
    return () => clearInterval(interval);
  }, [address, refreshInterval]);
  
  if (!address) {
    return (
      <div className="p-6 text-center text-white/60">
        Connect your wallet to view usage statistics
      </div>
    );
  }
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Usage Dashboard</h2>
        <div className="flex items-center space-x-2 text-sm text-white/60">
          <div className="w-2 h-2 bg-system-green rounded-full animate-pulse" />
          <span>Live updates every {refreshInterval / 1000}s</span>
        </div>
      </div>
      
      {/* Usage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UsageCounter 
          used={usageData.used}
          limit={usageData.limit}
          resetTime={usageData.resetTime}
          userType={usageData.userType}
        />
        
        <PointsDisplay 
          totalPoints={usageData.totalPoints}
          todayPoints={usageData.todayPoints}
          pointsPerPrompt={usageData.pointsPerPrompt}
          userType={usageData.userType}
        />
        
        <ApiKeyStats address={address} />
      </div>
      
      {/* Upgrade Prompt */}
      {usageData.used / usageData.limit > 0.8 && (
        <div className="card p-4 bg-brand-500/10 border-brand-500/20 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-brand-500">Approaching Daily Limit</div>
              <div className="text-sm text-white/70">
                Upgrade to Developer API for 1,000 requests/day and 2x points
              </div>
            </div>
            <button className="btn-primary text-sm px-4 py-2">
              Upgrade
            </button>
          </div>
        </div>
      )}
      
      {/* Debug Controls (remove in production) */}
      <div className="card p-4 bg-dark-4 rounded-2xl">
        <div className="text-sm text-white/60 mb-2">Debug Controls:</div>
        <div className="flex space-x-2">
          <button 
            className="btn-ghost text-xs"
            onClick={() => setRefreshInterval(1000)}
          >
            1s updates
          </button>
          <button 
            className="btn-ghost text-xs"
            onClick={() => setRefreshInterval(5000)}
          >
            5s updates
          </button>
          <button 
            className="btn-ghost text-xs"
            onClick={() => setUsageData(prev => ({ ...prev, used: 0, todayPoints: 0 }))}
          >
            Reset usage
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsageDashboard;