import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import GlassCard from './GlassCard';
import { api } from '../../convex/_generated/api';

interface ProvidersPageProps {
  setCurrentPage?: (page: string) => void;
}

const ProvidersPage: React.FC<ProvidersPageProps> = ({ setCurrentPage }) => {
  const networkStats = useQuery(api.stats.getNetworkStats);
  const allProviders = useQuery(api.providers.list);
  const availableModels = useQuery(api.models.getAvailableModels);
  const usageMetrics = useQuery(api.stats.getUsageMetrics);
  const modelUsageStats = useQuery(api.analytics.getModelUsageStats);
  const overallStats = useQuery(api.inference.getStats);
  
  const isLoading = networkStats === undefined || allProviders === undefined || 
                   availableModels === undefined || usageMetrics === undefined || 
                   modelUsageStats === undefined || overallStats === undefined;
  
  
  // Debug logging to understand data state
  React.useEffect(() => {
    if (allProviders && networkStats) {
      console.log("🔍 ProvidersPage Debug Data:");
      console.log("- Total providers from list query:", allProviders.length);
      console.log("- Active providers from list query:", allProviders.filter(p => p.isActive).length);
      console.log("- Network stats cache data:", {
        totalProviders: networkStats.totalProviders,
        activeProviders: networkStats.activeProviders,
        cacheAge: networkStats.cacheAge
      });
      console.log("- All providers data:", allProviders.map(p => ({ 
        name: p.name, 
        isActive: p.isActive, 
        vcuBalance: p.vcuBalance,
        totalPrompts: p.totalPrompts 
      })));
    }
  }, [allProviders, networkStats]);
  
  // Get ACTUAL active providers from the list query
  const activeProviders = allProviders?.filter(p => p.isActive) || [];
  const topProviders = [...activeProviders].sort((a, b) => {
    // Sort by total prompts served, then by balance
    if (b.totalPrompts !== a.totalPrompts) return b.totalPrompts - a.totalPrompts;
    return (b.vcuBalance || 0) - (a.vcuBalance || 0);
  }).slice(0, 10);
  
  // Calculate real metrics from actual provider data
  const avgResponseTime = activeProviders.length > 0 
    ? activeProviders.reduce((sum, p) => sum + (p.avgResponseTime || 0), 0) / activeProviders.length 
    : 0;
  
  const totalBalance = activeProviders.reduce((sum, p) => sum + (p.vcuBalance || 0), 0);
  const totalRequests = activeProviders.reduce((sum, p) => sum + (p.totalPrompts || 0), 0);
  
  const successRate = networkStats?.totalPrompts && networkStats.totalPrompts > 0
    ? ((networkStats.totalPrompts - (networkStats.failedPrompts || 0)) / networkStats.totalPrompts * 100).toFixed(1)
    : '100.0';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white" data-testid="providers-page">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">AI Providers</h1>
          <button
            onClick={() => setCurrentPage?.('dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Register as Provider
          </button>
        </div>

        {/* Enhanced Network Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {/* Network Status - FIXED to show actual count */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Network Status</h3>
              {networkStats?.cacheAge !== undefined && (
                <div className="text-xs text-gray-500" title={`Cache age: ${Math.round(networkStats.cacheAge / 1000)}s`}>
                  {networkStats.cacheAge < 5 * 60 * 1000 ? '🟢' : networkStats.cacheAge < 10 * 60 * 1000 ? '🟡' : '🔴'}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {activeProviders.length}
                </div>
                <div className="text-xs text-gray-500">
                  Active Providers
                  {allProviders && allProviders.length !== activeProviders.length && (
                    <span className="text-gray-600"> ({allProviders.length} total)</span>
                  )}
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                activeProviders.length >= 5 
                  ? 'bg-green-500/20 text-green-400' 
                  : activeProviders.length > 0
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {activeProviders.length >= 5 ? 'Healthy' : activeProviders.length > 0 ? 'Limited' : 'Offline'}
              </div>
            </div>
          </GlassCard>

          {/* Response Time - FIXED to calculate from actual providers */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Avg Response Time</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-2xl font-bold ${
                  avgResponseTime <= 1000 ? 'text-green-400' : 
                  avgResponseTime <= 3000 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {avgResponseTime > 0 ? `${Math.round(avgResponseTime)}ms` : 'N/A'}
                </div>
                <div className="text-xs text-gray-500">Network average</div>
              </div>
              <div className="text-xs text-gray-400">
                {avgResponseTime > 0 && avgResponseTime <= 1000 ? '⚡ Fast' : 
                 avgResponseTime > 0 && avgResponseTime <= 3000 ? '🔄 Normal' : 
                 avgResponseTime > 3000 ? '🐌 Slow' : ''}
              </div>
            </div>
          </GlassCard>

          {/* Success Rate */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Success Rate</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-2xl font-bold ${
                  parseFloat(successRate) >= 99 ? 'text-green-400' : 
                  parseFloat(successRate) >= 95 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {successRate}%
                </div>
                <div className="text-xs text-gray-500">Last 24h</div>
              </div>
              <div className="text-2xl">
                {parseFloat(successRate) >= 99 ? '✨' : 
                 parseFloat(successRate) >= 95 ? '✓' : '⚠️'}
              </div>
            </div>
          </GlassCard>

          {/* Total Capacity - Using actual provider balances */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Network Capacity</h3>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                ${(totalBalance * 0.10).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">Total Balance</div>
              <div className="text-xs text-gray-400 mt-1">
                {totalRequests.toLocaleString()} requests served
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Network Health Overview */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Network Overview
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-400">Network Load</span>
                  <span className="text-sm">{Math.min(100, Math.round((networkStats?.currentLoad || 0) * 100))}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      (networkStats?.currentLoad || 0) < 0.7 ? 'bg-green-400' : 
                      (networkStats?.currentLoad || 0) < 0.9 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.min(100, (networkStats?.currentLoad || 0) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-700">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Available Models</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableModels && typeof availableModels === 'object' && Object.entries(availableModels).map(([category, models]) => {
                    // Ensure models is an array
                    const modelArray = Array.isArray(models) ? models : [];
                    if (modelArray.length === 0) return null;
                    
                    return (
                      <div key={category}>
                        <div className="text-xs text-gray-500 mb-1 capitalize">{category}:</div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {modelArray.slice(0, 3).map((model: any) => {
                            const modelName = model.name || model;
                            const usageToday = Array.isArray(modelUsageStats) ? 
                              modelUsageStats.find((m: any) => m.model === modelName)?.count || 0 : 0;
                            const tokensUsed = Array.isArray(usageMetrics?.modelUsage) ? 
                              usageMetrics.modelUsage.find((m: any) => m.model === modelName)?.totalTokens || 0 : 0;
                            return (
                              <div key={modelName} className="px-2 py-1 bg-gray-700 rounded text-xs" title={`${usageToday} uses today, ${tokensUsed.toLocaleString()} tokens`}>
                                <div className="flex items-center gap-1">
                                  <span>{modelName.split('/').pop()}</span>
                                  {usageToday > 0 && (
                                    <span className="bg-blue-500 text-white rounded-full px-1 text-[10px]">{usageToday}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {modelArray.length > 3 && (
                            <span className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300">
                              +{modelArray.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(!availableModels || typeof availableModels !== 'object' || Object.keys(availableModels).length === 0) && (
                    <div className="flex flex-wrap gap-1">
                      {['GPT-4', 'Claude-3', 'Mistral', 'Llama-3'].map(model => (
                        <span key={model} className="px-2 py-1 bg-gray-700 rounded text-xs">
                          {model}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-700">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Network Stats</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Requests Today</span>
                    <span>{usageMetrics?.last24h?.toLocaleString() || networkStats?.promptsToday?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tokens Today</span>
                    <span className="text-blue-400">
                      {usageMetrics?.totalTokens?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Tokens</span>
                    <span className="text-green-400">
                      {overallStats?.totalTokens?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Avg Response</span>
                    <span className={`${
                      avgResponseTime <= 1000 ? 'text-green-400' : 
                      avgResponseTime <= 3000 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {avgResponseTime > 0 ? `${Math.round(avgResponseTime)}ms` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Uptime</span>
                    <span>{activeProviders.length > 0 ? '99.9%' : '0%'}</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Top Providers - Shows actual providers */}
          <div className="xl:col-span-2">
            <GlassCard className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Provider Network</h2>
                <span className="text-sm text-gray-400">
                  {activeProviders.length > 0 ? `Top ${Math.min(10, activeProviders.length)} by performance` : 'No active providers'}
                </span>
              </div>
              
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center justify-between py-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
                          <div>
                            <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                            <div className="h-3 bg-gray-700 rounded w-24"></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="h-4 bg-gray-700 rounded w-16 mb-2"></div>
                          <div className="h-3 bg-gray-700 rounded w-12"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : topProviders && topProviders.length > 0 ? (
                <div className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-700 text-xs text-gray-400">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4">Provider</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-2 text-right">Balance</div>
                    <div className="col-span-2 text-right">Requests</div>
                    <div className="col-span-1 text-right">Speed</div>
                  </div>
                  
                  {topProviders.map((provider, index) => (
                    <div 
                      key={provider._id} 
                      className="grid grid-cols-12 gap-2 py-3 border-b border-gray-800 hover:bg-gray-800/30 transition-colors items-center"
                    >
                      <div className="col-span-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                      
                      <div className="col-span-4">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            provider.isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-400'
                          }`}>
                            {provider.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{provider.name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">
                              {provider.address.substring(0, 6)}...{provider.address.substring(38)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-span-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          provider.isActive 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {provider.isActive ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      
                      <div className="col-span-2 text-right">
                        <div className="font-medium text-sm">
                          ${((provider.vcuBalance || 0) * 0.10).toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="col-span-2 text-right">
                        <div className="text-sm text-gray-300">
                          {provider.totalPrompts?.toLocaleString() || 0}
                        </div>
                      </div>
                      
                      <div className="col-span-1 text-right">
                        <div className={`text-xs ${
                          provider.avgResponseTime && provider.avgResponseTime <= 1000 ? 'text-green-400' : 
                          provider.avgResponseTime && provider.avgResponseTime <= 3000 ? 'text-yellow-400' : 
                          provider.avgResponseTime ? 'text-red-400' : 'text-gray-500'
                        }`}>
                          {provider.avgResponseTime ? `${Math.round(provider.avgResponseTime)}ms` : '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {activeProviders.length > 10 && (
                    <div className="pt-3 text-center">
                      <button className="text-sm text-blue-400 hover:text-blue-300">
                        View all {activeProviders.length} providers →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-4">No active providers yet</div>
                  <button
                    onClick={() => setCurrentPage?.('dashboard')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Be the first provider
                  </button>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvidersPage;