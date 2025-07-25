import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

const ProvidersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'responses' | 'points' | 'speed'>('points');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Queries
  const networkStats = useQuery(api.stats.getNetworkStats);
  const allProviders = useQuery(api.providers.list);
  const availableModels = useQuery(api.models.getAvailableModels);
  const usageMetrics = useQuery(api.stats.getUsageMetrics);
  const modelUsageStats = useQuery(api.analytics.getModelUsageStats);
  const overallStats = useQuery(api.inference.getStats);
  const providerLeaderboard = useQuery(api.points.getProviderLeaderboardWithRank, { limit: 20 });

  // Less strict loading condition - don't wait for providerLeaderboard
  const isLoading = networkStats === undefined || allProviders === undefined || 
                   availableModels === undefined;

  // Merge points data with providers (resilient to missing data)
  const providersWithPoints = React.useMemo(() => {
    if (!allProviders) return [];
    
    // If providerLeaderboard is still loading or errored, just use providers without points
    if (!providerLeaderboard || !providerLeaderboard.topProviders) {
      return allProviders.map(provider => ({
        ...provider,
        points: 0,
        rank: 0
      }));
    }
    
    // Otherwise merge the data
    return allProviders.map(provider => {
      const leaderboardEntry = providerLeaderboard.topProviders.find(
        lp => lp.providerId === provider._id
      );
      
      return {
        ...provider,
        points: leaderboardEntry?.points ?? 0,
        rank: leaderboardEntry?.rank ?? 0
      };
    });
  }, [allProviders, providerLeaderboard]);

  // Debug logging to understand data state
  React.useEffect(() => {
    console.log("🔍 ProvidersPage Debug Data:");
    console.log("- Total providers from list query:", allProviders?.length);
    console.log("- Active providers from list query:", allProviders?.filter(p => p.isActive).length);
    console.log("- Network stats cache data:", networkStats);
    console.log("- All providers data:", allProviders);
    
    if (providerLeaderboard !== undefined) {
      console.log("🏆 Points Data Debug:");
      console.log("- providerLeaderboard:", providerLeaderboard);
      console.log("- providerLeaderboard.topProviders:", providerLeaderboard?.topProviders);
      console.log("- providersWithPoints:", providersWithPoints);
    } else {
      console.log("⏳ Points data still loading or errored");
    }
  }, [allProviders, networkStats, providerLeaderboard, providersWithPoints]);

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
            // Sort by response time (lower is better)
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hasPointsError = providerLeaderboard === null;
  const pointsLoading = providerLeaderboard === undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Network Providers</h1>
        <p className="text-gray-600">
          Active providers powering the Dandolo.ai network
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Providers</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {providersWithPoints.length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Active Providers</div>
          <div className="mt-2 text-3xl font-bold text-green-600">
            {providersWithPoints.filter(p => p.isActive).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Responses</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            {networkStats?.totalPrompts?.toLocaleString() ?? 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Avg Response Time</div>
          <div className="mt-2 text-3xl font-bold text-purple-600">
            {networkStats?.avgResponseTime ? `${networkStats.avgResponseTime}ms` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search providers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Providers</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="points">Sort by Points</option>
              <option value="name">Sort by Name</option>
              <option value="responses">Sort by Responses</option>
              <option value="speed">Sort by Speed</option>
            </select>
          </div>
        </div>

        {/* Providers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VCU Balance
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Responses
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Points
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Speed
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProviders.map((provider) => (
                <tr key={provider._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {provider.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {provider.region || 'Global'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      provider.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {provider.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${((provider.vcuBalance || 0) * 0.10).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {provider.totalPrompts?.toLocaleString() ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center">
                      <span className="mr-1">🏆</span>
                      {hasPointsError ? (
                        <span className="text-gray-500" title="Failed to load points">-</span>
                      ) : pointsLoading ? (
                        <span className="text-gray-400">...</span>
                      ) : (
                        <span className="font-medium">
                          {provider.points.toLocaleString()}
                          {provider.rank > 0 && provider.rank <= 3 && (
                            <span className="ml-1 text-xs text-gray-500">
                              (#{provider.rank})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {provider.avgResponseTime 
                      ? `${Math.round(provider.avgResponseTime)}ms` 
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredProviders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No providers found matching your criteria
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProvidersPage;