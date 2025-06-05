import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { GlassCard } from "./GlassCard";
import { ProviderCard } from "./ProviderCard";
import { useState } from "react";

export function ProvidersPage() {
  const providers = useQuery(api.providers.listActive);
  const networkStats = useQuery(api.stats.getNetworkStats);
  const [sortBy, setSortBy] = useState<'vcuBalance' | 'totalPrompts' | 'uptime'>('vcuBalance');

  if (!providers || !networkStats) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  const sortedProviders = providers.slice().sort((a, b) => {
    switch (sortBy) {
      case 'vcuBalance':
        return b.vcuBalance - a.vcuBalance;
      case 'totalPrompts':
        return b.totalPrompts - a.totalPrompts;
      case 'uptime':
        return b.uptime - a.uptime;
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-red bg-clip-text text-transparent mb-4">
          Network Providers
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Explore our decentralized network of AI compute providers. Each provider contributes Venice.ai VCU to power the network.
        </p>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <GlassCard>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-red mb-2">
              {networkStats.totalProviders}
            </div>
            <div className="text-gray-300">Active Providers</div>
          </div>
        </GlassCard>
        
        <GlassCard>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-gold mb-2">
              {networkStats.totalVCU.toLocaleString()}
            </div>
            <div className="text-gray-300">Total VCU</div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-red mb-2">
              {networkStats.totalPrompts.toLocaleString()}
            </div>
            <div className="text-gray-300">Total Prompts</div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-gold mb-2">
              {networkStats.avgResponseTime}ms
            </div>
            <div className="text-gray-300">Avg Response</div>
          </div>
        </GlassCard>
      </div>

      {/* Providers List */}
      <GlassCard>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">All Providers</h2>
            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'vcuBalance' | 'totalPrompts' | 'uptime')}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red"
              >
                <option value="vcuBalance">Sort by VCU Balance</option>
                <option value="totalPrompts">Sort by Total Prompts</option>
                <option value="uptime">Sort by Uptime</option>
              </select>
            </div>
          </div>

          {sortedProviders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProviders.map((provider, index) => (
                <ProviderCard
                  key={provider._id}
                  provider={provider}
                  rank={index + 1}
                  onClick={() => {
                    console.log(`Navigate to provider ${provider.address}`);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-red to-gold rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-3xl">🔌</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">No providers found</h3>
              <p className="text-gray-400 mb-6">
                Be the first to join our network and start earning rewards!
              </p>
              <button className="primary-cta">
                Become a Provider
              </button>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Network Health */}
      <GlassCard>
        <div className="p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Network Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gold mb-4">Performance Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Network Uptime</span>
                  <span className="text-gold font-semibold">
                    {networkStats.networkUptime.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Prompts Today</span>
                  <span className="text-red font-semibold">
                    {networkStats.promptsToday}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Average Response Time</span>
                  <span className="text-gold font-semibold">
                    {networkStats.avgResponseTime}ms
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gold mb-4">Provider Distribution</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Providers</span>
                  <span className="text-white font-semibold">
                    {networkStats.totalProviders}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Active Providers</span>
                  <span className="text-gold font-semibold">
                    {networkStats.activeUsers}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total VCU Pool</span>
                  <span className="text-red font-semibold">
                    {networkStats.totalVCU.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
