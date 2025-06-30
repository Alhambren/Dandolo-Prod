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


// Main Usage Dashboard Component
export const UsageDashboard: React.FC = () => {
  const { address } = useAccount();
  const userPoints = useQuery(api.wallets.getUserPoints, address ? { address } : 'skip');
  const apiKeyStats = useQuery(api.apiKeys.getApiKeyStats, address ? { address } : 'skip');
  const networkStats = useQuery(api.stats.getNetworkStats);
  const userStats = useQuery(api.points.getUserStats, address ? { address } : 'skip');
  const providers = useQuery(api.providers.list);
  const userProvider = providers?.find(p => p.address === address);
  
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
      </div>
      
      {/* System Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Network Health</h4>
          <div className={`text-2xl font-bold ${networkStats?.networkHealth >= 95 ? 'text-green-400' : networkStats?.networkHealth >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
            {networkStats?.networkHealth?.toFixed(1) || '0.0'}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {networkStats?.activeProviders || 0} active providers
          </div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Avg Response Time</h4>
          <div className={`text-2xl font-bold ${networkStats?.avgResponseTime <= 1000 ? 'text-green-400' : networkStats?.avgResponseTime <= 3000 ? 'text-yellow-400' : 'text-red-400'}`}>
            {networkStats?.avgResponseTime ? `${networkStats.avgResponseTime.toFixed(0)}ms` : 'N/A'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Network average
          </div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Your Daily Usage</h4>
          <div className="text-2xl font-bold text-blue-400">
            {userStats?.promptsToday || 0}/50
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {userStats?.promptsRemaining || 50} remaining
          </div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Provider Status</h4>
          <div className={`text-2xl font-bold ${userProvider?.isActive ? 'text-green-400' : 'text-gray-400'}`}>
            {userProvider ? (userProvider.isActive ? 'Active' : 'Inactive') : 'None'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {userProvider ? `${userProvider.totalPrompts || 0} served` : 'Not a provider'}
          </div>
        </div>
      </div>

      {/* Real Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Points Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Points Balance</h3>
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {userPoints?.totalPoints?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-400">
            Earned from chat usage • 1 point per prompt
          </div>
          {userProvider && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Provider Performance</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-lg font-bold text-yellow-400">{userProvider.vcuBalance?.toFixed(2) || '0.00'}</div>
                  <div className="text-xs text-gray-500">VCU Balance</div>
                </div>
                <div>
                  <div className={`text-lg font-bold ${userProvider.avgResponseTime <= 1000 ? 'text-green-400' : userProvider.avgResponseTime <= 3000 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {userProvider.avgResponseTime ? `${userProvider.avgResponseTime.toFixed(0)}ms` : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">Avg Response</div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* API Keys Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">API Keys</h3>
          <div className="text-3xl font-bold text-green-400 mb-2">
            {apiKeyStats?.activeKeys || 0}
          </div>
          <div className="text-sm text-gray-400">
            Active developer/agent keys
          </div>
          {apiKeyStats && apiKeyStats.keys.length > 0 && (
            <div className="mt-4 space-y-2">
              {apiKeyStats.keys.slice(0, 3).map((key) => (
                <div key={key.id} className="flex justify-between text-sm">
                  <span className="text-gray-400">{key.name}</span>
                  <span className="text-gray-300">{key.dailyUsage}/{key.dailyLimit}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Getting Started Guide */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Getting Started</h3>
        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
              <span className="text-blue-400 text-xs">1</span>
            </div>
            <span>Use the chat interface to earn points (1 point per prompt)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center">
              <span className="text-purple-400 text-xs">2</span>
            </div>
            <span>Generate API keys for programmatic access</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <span className="text-green-400 text-xs">3</span>
            </div>
            <span>Register as a provider to earn points by serving requests</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageDashboard;