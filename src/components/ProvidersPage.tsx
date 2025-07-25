import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

// Glass card component for dark theme
const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 ${className}`}>
      {children}
    </div>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Network Providers</h1>
          <p className="text-gray-400">
            Active providers powering the Dandolo.ai network
          </p>
          {hasPointsError && (
            <div className="mt-2 text-sm text-orange-400 bg-orange-900/20 border border-orange-800 rounded-md px-3 py-2">
              ⚠️ Points data temporarily unavailable due to high load
            </div>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <GlassCard className="p-6">
            <div className="text-sm font-medium text-gray-400">Total Providers</div>
            <div className="mt-2 text-3xl font-bold">
              {totalProviders}
            </div>
          </GlassCard>
          <GlassCard className="p-6">
            <div className="text-sm font-medium text-gray-400">Active Providers</div>
            <div className="mt-2 text-3xl font-bold text-green-400">
              {activeProviders}
            </div>
          </GlassCard>
          <GlassCard className="p-6">
            <div className="text-sm font-medium text-gray-400">Total Responses</div>
            <div className="mt-2 text-3xl font-bold text-blue-400">
              {totalResponses.toLocaleString()}
            </div>
          </GlassCard>
          <GlassCard className="p-6">
            <div className="text-sm font-medium text-gray-400">Avg Response Time</div>
            <div className="mt-2 text-3xl font-bold text-purple-400">
              {avgResponseTime ? `${avgResponseTime}ms` : '-'}
            </div>
          </GlassCard>
        </div>

        {/* Filters and Search */}
        <GlassCard className="mb-6">
          <div className="p-4 border-b border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search providers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400"
              />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              >
                <option value="all">All Providers</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              >
                <option value="responses">Sort by Responses</option>
                <option value="points">Sort by Points</option>
                <option value="name">Sort by Name</option>
                <option value="speed">Sort by Speed</option>
              </select>
            </div>
          </div>

          {/* Providers Table */}
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
                    Balance
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
                No providers found matching your criteria
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default ProvidersPage;