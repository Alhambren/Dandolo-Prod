import React from 'react';
import { useQuery } from 'convex/react';
import GlassCard from './GlassCard';
import { api } from '../../convex/_generated/api';

const ProvidersPage: React.FC = () => {
  const systemStats = useQuery(api.analytics.getSystemStats);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white" data-testid="providers-page">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">AI Providers</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div data-testid="top-providers">
            <h2 className="text-2xl font-bold mb-4">Top Providers</h2>
            <div className="grid grid-cols-1 gap-4">
              <GlassCard className="p-4" data-testid="provider-card">
                <h3 className="text-lg font-semibold">Provider Alpha</h3>
                <p className="text-gray-300">GPT-4 • 99.9% Uptime</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-400">Avg Response</p>
                    <p className="font-semibold">1.2s</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Success Rate</p>
                    <p className="font-semibold">99.8%</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4" data-testid="provider-card">
                <h3 className="text-lg font-semibold">Provider Beta</h3>
                <p className="text-gray-300">Claude 2 • 99.8% Uptime</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-400">Avg Response</p>
                    <p className="font-semibold">1.5s</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Success Rate</p>
                    <p className="font-semibold">99.7%</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4" data-testid="provider-card">
                <h3 className="text-lg font-semibold">Provider Gamma</h3>
                <p className="text-gray-300">PaLM 2 • 99.7% Uptime</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-400">Avg Response</p>
                    <p className="font-semibold">1.8s</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Success Rate</p>
                    <p className="font-semibold">99.6%</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>

          <div data-testid="live-activity">
            <h2 className="text-2xl font-bold mb-4">Network Health</h2>
            <GlassCard className="p-4" data-testid="network-health">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-300">Total Providers</p>
                  <p className="text-2xl font-bold">{systemStats?.totalProviders || 0}</p>
                </div>
                <div>
                  <p className="text-gray-300">Active Providers</p>
                  <p className="text-2xl font-bold">{systemStats?.activeProviders || 0}</p>
                </div>
                <div>
                  <p className="text-gray-300">Network Uptime</p>
                  <p className="text-2xl font-bold">{systemStats?.networkUptime || 0}%</p>
                </div>
                <div>
                  <p className="text-gray-300">Avg Response Time</p>
                  <p className="text-2xl font-bold">{systemStats?.avgResponseTime || 0}s</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvidersPage;
