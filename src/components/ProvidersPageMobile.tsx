import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

// Glass card component for dark theme
const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 ${className}`}>
      {children}
    </div>
  );
};

// Mobile-optimized provider card
const ProviderCard: React.FC<{ provider: any; rank: number }> = ({ provider, rank }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <GlassCard className="mb-4 overflow-hidden transition-all duration-300 hover:border-gray-600/50 active:scale-[0.98]">
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                #{rank}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-white truncate">
                {provider.name}
              </h3>
              <p className="text-sm text-gray-400">
                {provider.region || 'Global'}
              </p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="flex-shrink-0">
            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
              provider.isActive 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {provider.isActive ? '🟢 Active' : '🔴 Offline'}
            </span>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Points</div>
            <div className="flex items-center justify-center">
              <span className="text-lg font-bold text-yellow-400">
                🏆 {provider.points > 0 ? provider.points.toLocaleString() : '0'}
              </span>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Speed</div>
            <div className="text-lg font-semibold">
              {provider.avgResponseTime ? (
                <span className={
                  provider.avgResponseTime < 1000 ? 'text-green-400' :
                  provider.avgResponseTime < 2000 ? 'text-yellow-400' :
                  'text-red-400'
                }>
                  ⚡ {Math.round(provider.avgResponseTime)}ms
                </span>
              ) : (
                <span className="text-gray-500">-</span>
              )}
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Balance</div>
            <div className="text-lg font-semibold text-blue-400">
              ${((provider.vcuBalance ?? 0) * 0.10).toFixed(0)}
            </div>
          </div>
        </div>

        {/* Expand/Collapse Indicator */}
        <div className="flex items-center justify-center pt-2 border-t border-gray-700/50">
          <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-700/50 bg-gray-800/30">
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Responses</div>
                <div className="text-sm font-medium text-white">
                  {provider.totalPrompts?.toLocaleString() ?? 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Inference Provided</div>
                <div className="text-sm font-medium text-white">
                  ${((provider.vcuBalance ?? 0) * 0.10).toFixed(2)}
                </div>
              </div>
            </div>
            
            {provider.points > 0 && provider.rank > 0 && provider.rank <= 3 && (
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">
                    {provider.rank === 1 ? '🥇' : provider.rank === 2 ? '🥈' : '🥉'}
                  </span>
                  <span className="text-sm font-medium text-yellow-400">
                    Top {provider.rank} Provider
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
};

const ProvidersPageMobile: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'responses' | 'points' | 'speed'>('points');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Queries
  const networkStats = useQuery(api.stats.getNetworkStats);
  const allProviders = useQuery(api.providers.list);
  const availableModels = useQuery(api.models.getAvailableModels);
  const providerLeaderboard = useQuery(api.points.getProviderLeaderboardWithRank, { limit: 20 });

  // Only wait for essential data
  const isLoading = allProviders === undefined;

  // Merge points data with providers (handles all error cases)
  const providersWithPoints = React.useMemo(() => {
    if (!allProviders) return [];
    
    // If we have leaderboard data, merge it
    if (providerLeaderboard?.topProviders) {
      return allProviders.map(provider => {
        const leaderboardEntry = providerLeaderboard.topProviders.find(
          lp => lp.providerId === provider._id
        );
        
        return {
          ...provider,
          points: leaderboardEntry?.points ?? 0,
          rank: leaderboardEntry?.rank ?? 0,
          avgResponseTime: provider.avgResponseTime ?? null
        };
      });
    }
    
    // Otherwise just use provider data with defaults
    return allProviders.map(provider => ({
      ...provider,
      points: 0,
      rank: 0,
      avgResponseTime: provider.avgResponseTime ?? null
    }));
  }, [allProviders, providerLeaderboard]);

  // Filter and sort providers
  const filteredProviders = React.useMemo(() => {
    if (!providersWithPoints) return [];
    
    return providersWithPoints
      .filter(provider => {
        const matchesSearch = provider.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || 
          (selectedStatus === 'active' ? provider.isActive : !provider.isActive);
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'responses':
            return (b.totalPrompts ?? 0) - (a.totalPrompts ?? 0);
          case 'points':
            return (b.points ?? 0) - (a.points ?? 0);
          case 'speed':
            const aTime = a.avgResponseTime ?? Infinity;
            const bTime = b.avgResponseTime ?? Infinity;
            return aTime - bTime;
          default:
            return 0;
        }
      });
  }, [providersWithPoints, searchTerm, selectedStatus, sortBy]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading providers...</p>
        </div>
      </div>
    );
  }

  const hasPointsError = providerLeaderboard === null;
  const pointsLoading = providerLeaderboard === undefined;

  // Calculate real stats from provider data
  const totalProviders = providersWithPoints.length;
  const activeProviders = providersWithPoints.filter(p => p.isActive).length;
  const totalResponses = providersWithPoints.reduce((sum, p) => sum + (p.totalPrompts ?? 0), 0);
  const avgResponseTime = providersWithPoints.filter(p => p.avgResponseTime).length > 0
    ? Math.round(providersWithPoints.reduce((sum, p) => sum + (p.avgResponseTime ?? 0), 0) / 
        providersWithPoints.filter(p => p.avgResponseTime).length)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Network Providers</h1>
          <p className="text-gray-400 text-sm">
            Active providers powering the Dandolo.ai network
          </p>
          {hasPointsError && (
            <div className="mt-3 text-sm text-orange-400 bg-orange-900/20 border border-orange-800/50 rounded-lg px-3 py-2">
              ⚠️ Points data temporarily unavailable
            </div>
          )}
        </div>

        {/* Stats Overview - Mobile Optimized Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <GlassCard className="p-4">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Providers</div>
            <div className="mt-1 text-2xl font-bold">
              {totalProviders}
            </div>
            <div className="text-xs text-green-400 mt-1">
              {activeProviders} active
            </div>
          </GlassCard>
          
          <GlassCard className="p-4">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Responses</div>
            <div className="mt-1 text-2xl font-bold text-blue-400">
              {totalResponses > 1000 ? `${(totalResponses/1000).toFixed(1)}k` : totalResponses}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Total served
            </div>
          </GlassCard>
        </div>

        {/* Search and Filters - Mobile Optimized */}
        <GlassCard className="mb-6">
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search providers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400 text-sm"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="flex-1 min-w-0 px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 min-w-0 px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="points">🏆 By Points</option>
                <option value="responses">📊 By Responses</option>
                <option value="speed">⚡ By Speed</option>
                <option value="name">📝 By Name</option>
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Providers List */}
        <div className="space-y-0">
          {filteredProviders.map((provider, index) => (
            <ProviderCard 
              key={provider._id} 
              provider={provider} 
              rank={index + 1}
            />
          ))}
          
          {filteredProviders.length === 0 && (
            <GlassCard className="p-8">
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-medium mb-2">No providers found</h3>
                <p className="text-sm">Try adjusting your search or filter criteria</p>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Showing {filteredProviders.length} of {totalProviders} providers
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProvidersPageMobile;