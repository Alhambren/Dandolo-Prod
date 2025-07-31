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

// Models List Component - copied from working DeveloperDocs
const ModelsList: React.FC = () => {
  const availableModels = useQuery(api.models.getAvailableModels);
  
  if (availableModels === undefined) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-3"></div>
          <span>Loading models from Venice.ai...</span>
        </div>
      </GlassCard>
    );
  }
  
  if (!availableModels || availableModels.length === 0) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">No models available</p>
          <p className="text-gray-400 text-sm">
            Models are dynamically fetched from Venice.ai providers. Please check back later or ensure providers are active.
          </p>
        </div>
      </GlassCard>
    );
  }
  
  return (
    <GlassCard className="p-4">
      <h2 className="text-lg font-semibold mb-3">
        Models ({availableModels.length})
      </h2>
      <div className="space-y-2">
        {availableModels.map((model: any) => (
          <div key={model.id} className="p-2 bg-white/5 rounded text-xs">
            <code className="text-blue-400 block truncate">{model.id}</code>
            {model.type && (
              <span className="inline-block mt-1 px-1 py-0.5 bg-gray-700 text-xs rounded">
                {model.type}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Updated hourly from Venice.ai
      </p>
    </GlassCard>
  );
};

// Mobile-optimized provider card
const ProviderCard: React.FC<{ provider: any; rank: number }> = ({ provider, rank }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <GlassCard className="mb-3 overflow-hidden transition-all duration-300 hover:border-gray-600/50 active:scale-[0.98]">
      <div 
        className="p-4 cursor-pointer touch-manipulation"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Header Row - Compact */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                #{rank}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-white truncate">
                {provider.name}
              </h3>
              <p className="text-xs text-gray-400">
                {provider.region || 'Global'}
              </p>
            </div>
          </div>
          
          {/* Status Badge - Compact */}
          <div className="flex-shrink-0 ml-2">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              provider.isActive 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {provider.isActive ? '🟢' : '🔴'}
            </span>
          </div>
        </div>

        {/* Key Metrics Row - Compact */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Points</div>
            <div className="text-sm font-bold text-yellow-400">
              🏆 {provider.points > 0 ? provider.points.toLocaleString() : '0'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Speed</div>
            <div className="text-sm font-semibold">
              {provider.avgResponseTime ? (
                <span className={
                  provider.avgResponseTime < 1000 ? 'text-green-400' :
                  provider.avgResponseTime < 2000 ? 'text-yellow-400' :
                  'text-red-400'
                }>
                  {Math.round(provider.avgResponseTime)}ms
                </span>
              ) : (
                <span className="text-gray-500">-</span>
              )}
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Balance</div>
            <div className="text-sm font-semibold text-blue-400">
              ${((provider.vcuBalance ?? 0) * 0.10).toFixed(0)}
            </div>
          </div>
        </div>

        {/* Expand/Collapse Indicator */}
        <div className="flex items-center justify-center pt-2 border-t border-gray-700/50">
          <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <span className="text-lg">
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

const ProvidersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'responses' | 'points' | 'speed'>('responses');
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

  // Debug logging
  React.useEffect(() => {
    console.log("🔍 ProvidersPage Data Status:");
    console.log("- Providers loaded:", allProviders?.length ?? 0);
    console.log("- Points data:", providerLeaderboard !== undefined ? "loaded" : "loading");
    console.log("- Network stats:", networkStats !== undefined ? "loaded" : "loading");
  }, [allProviders, providerLeaderboard, networkStats]);

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Add debug logging
  console.log("🔍 ProvidersPage Debug Data:");
  console.log("- allProviders:", allProviders?.length || 0);
  console.log("- providersWithPoints:", providersWithPoints?.length || 0);
  console.log("- filteredProviders:", filteredProviders?.length || 0);

  const hasPointsError = providerLeaderboard === null;
  const pointsLoading = providerLeaderboard === undefined;
  const networkStatsError = networkStats === null;

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Network Providers</h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Active providers and available models powering the Dandolo.ai network
          </p>
          
          {hasPointsError && (
            <div className="mt-3 text-sm text-orange-400 bg-orange-900/20 border border-orange-800/50 rounded-lg px-3 py-2">
              ⚠️ Points data temporarily unavailable due to high load
            </div>
          )}
        </div>

        {/* Sidebar Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Models */}
          <div className="lg:w-80 flex-shrink-0">
            <ModelsList />
          </div>

          {/* Main Content - Providers */}
          <div className="flex-1">
            {/* Stats Overview - Responsive Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <GlassCard className="p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-400">Total Providers</div>
            <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold">
              {totalProviders}
            </div>
          </GlassCard>
          <GlassCard className="p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-400">Active Providers</div>
            <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-green-400">
              {activeProviders}
            </div>
          </GlassCard>
          <GlassCard className="p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-400">Total Responses</div>
            <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-blue-400">
              <span className="sm:hidden">{totalResponses > 1000 ? `${(totalResponses/1000).toFixed(1)}k` : totalResponses}</span>
              <span className="hidden sm:inline">{totalResponses.toLocaleString()}</span>
            </div>
          </GlassCard>
          <GlassCard className="p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-400">Avg Response Time</div>
            <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-purple-400">
              {avgResponseTime ? `${avgResponseTime}ms` : '-'}
            </div>
          </GlassCard>
        </div>

        {/* Search and Filters - Mobile Optimized */}
        <GlassCard className="mb-6">
          <div className="p-4 space-y-4">
            {/* Search Input */}
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

            {/* Filter Buttons - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Providers</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="points">🏆 Sort by Points</option>
                <option value="responses">📊 Sort by Responses</option>
                <option value="speed">⚡ Sort by Speed</option>
                <option value="name">📝 Sort by Name</option>
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Mobile Cards (< lg screens) */}
        <div className="lg:hidden space-y-0">
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
                {totalProviders === 0 ? (
                  <p className="text-sm">No providers have been registered yet. Be the first to join the network!</p>
                ) : (
                  <p className="text-sm">Try adjusting your search or filter criteria</p>
                )}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Desktop Table (lg+ screens) */}
        <div className="hidden lg:block">
          <GlassCard>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Inference Provided
                    </th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Responses
                    </th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Points
                    </th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Speed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredProviders.map((provider) => (
                    <tr key={provider._id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium">
                            {provider.name}
                          </div>
                          <div className="text-sm text-gray-400">
                            {provider.region || 'Global'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          provider.isActive 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {provider.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        ${((provider.vcuBalance ?? 0) * 0.10).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {provider.totalPrompts?.toLocaleString() ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          <span className="mr-1">🏆</span>
                          {hasPointsError ? (
                            <span className="text-gray-500">-</span>
                          ) : pointsLoading ? (
                            <span className="text-gray-500 animate-pulse">...</span>
                          ) : provider.points > 0 ? (
                            <span className="font-medium text-yellow-400">
                              {provider.points.toLocaleString()}
                              {provider.rank > 0 && provider.rank <= 3 && (
                                <span className="ml-1 text-xs text-gray-400">
                                  (#{provider.rank})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-500">0</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {provider.avgResponseTime ? (
                          <span className={
                            provider.avgResponseTime < 1000 ? 'text-green-400' :
                            provider.avgResponseTime < 2000 ? 'text-yellow-400' :
                            'text-red-400'
                          }>
                            {Math.round(provider.avgResponseTime)}ms
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredProviders.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  {totalProviders === 0 ? (
                    <div>
                      <div className="text-4xl mb-4">🌐</div>
                      <div>No providers have been registered yet. Be the first to join the network!</div>
                    </div>
                  ) : (
                    "No providers found matching your criteria"
                  )}
                </div>
              )}
            </div>
          </GlassCard>
        </div>

            {/* Footer */}
            <div className="mt-6 text-center lg:hidden">
              <p className="text-xs text-gray-500">
                Showing {filteredProviders.length} of {totalProviders} providers
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvidersPage;