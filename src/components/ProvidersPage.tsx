import React from 'react';
import { useQuery } from 'convex/react';
import GlassCard from './GlassCard';
import { api } from '../../convex/_generated/api';
import { Link } from 'react-router-dom';

const ProvidersPage: React.FC = () => {
  const networkStats = useQuery(api.stats.getNetworkStats);
  const providers = useQuery(api.providers.listActive);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white" data-testid="providers-page">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">AI Providers</h1>
          <Link 
            to="/register-provider" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Register as Provider
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div data-testid="top-providers">
            <h2 className="text-2xl font-bold mb-4">Active Providers</h2>
            <div className="grid grid-cols-1 gap-4">
              {providers && providers.length > 0 ? (
                providers.map((provider) => (
                  <GlassCard key={provider._id} className="p-4" data-testid="provider-card">
                    <h3 className="text-lg font-semibold">{provider.name}</h3>
                    <p className="text-gray-300">{provider.description || 'No description provided'}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-400">Uptime</p>
                        <p className="font-semibold">{provider.uptime.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Total Prompts</p>
                        <p className="font-semibold">{provider.totalPrompts}</p>
                      </div>
                    </div>
                  </GlassCard>
                ))
              ) : (
                <GlassCard className="p-4" data-testid="no-providers">
                  <p className="text-gray-300 text-center">No providers registered yet. Be the first to join the network!</p>
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

export default ProvidersPage;
