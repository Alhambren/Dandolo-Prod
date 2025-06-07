import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import StatsGrid from './StatsGrid';
import GlassCard from './GlassCard';

const HomePage: React.FC = () => {
  const networkStats = useQuery(api.stats.getNetworkStats);
  const topProviders = useQuery(api.providers.getTopProviders, { limit: 3 });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white" data-testid="main-page">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Welcome to Dandolo</h1>
          <p className="text-xl text-gray-300">Your AI Infrastructure Platform</p>
        </div>

        <div className="mb-12">
          <StatsGrid />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div data-testid="top-providers">
            <h2 className="text-2xl font-bold mb-4">Top Providers</h2>
            <div className="grid grid-cols-1 gap-4">
              {topProviders && topProviders.length > 0 ? (
                topProviders.map((provider) => (
                  <GlassCard key={provider._id} className="p-4" data-testid="provider-card">
                    <h3 className="text-lg font-semibold">{provider.name}</h3>
                    <p className="text-gray-300">
                      {provider.prompts24h} prompts in 24h • {provider.vcuEarned7d} VCU earned
                    </p>
                  </GlassCard>
                ))
              ) : (
                <GlassCard className="p-8 text-center" data-testid="no-providers">
                  <p className="text-gray-300">No providers online yet</p>
                  <p className="text-sm text-gray-400 mt-2">Be the first to contribute VCU!</p>
                </GlassCard>
              )}
            </div>
          </div>

          <div data-testid="live-activity">
            <h2 className="text-2xl font-bold mb-4">Network Health</h2>
            <GlassCard className="p-4" data-testid="network-health">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-300">Total Providers</p>
                  <p className="text-2xl font-bold">{networkStats?.totalProviders || 0}</p>
                </div>
                <div>
                  <p className="text-gray-300">Active Providers</p>
                  <p className="text-2xl font-bold">{networkStats?.activeProviders || 0}</p>
                </div>
                <div>
                  <p className="text-gray-300">Network Uptime</p>
                  <p className="text-2xl font-bold">{networkStats?.networkUptime || 0}%</p>
                </div>
                <div>
                  <p className="text-gray-300">Avg Response Time</p>
                  <p className="text-2xl font-bold">{networkStats?.avgResponseTime || 0}ms</p>
                </div>
              </div>
              {(!networkStats || networkStats.totalProviders === 0) && (
                <p className="text-gray-400 text-center mt-4 text-sm">Network launching soon</p>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
