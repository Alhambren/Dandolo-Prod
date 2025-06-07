import React from 'react';
import { useQuery } from 'convex/react';
import GlassCard from './GlassCard';
import { api } from '../../convex/_generated/api';

interface ProvidersPageProps {
  setCurrentPage?: (page: string) => void;
}
const ProvidersPage: React.FC<ProvidersPageProps> = ({ setCurrentPage }) => {
  const networkStats = useQuery(api.stats.getNetworkStats);
  const providers = useQuery(api.providers.listActive);

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Active Providers - Full height */}
          <GlassCard className="p-6 h-full">
            <h2 className="text-2xl font-bold mb-4">Active Providers</h2>
            {providers && providers.length > 0 ? (
              <div className="space-y-4">
                {providers.map((provider) => (
                  <div key={provider._id} className="p-4 bg-white/5 rounded-lg">
                    <h3 className="text-lg font-semibold">{provider.name}</h3>
                    <p className="text-gray-300">{provider.description || 'Venice.ai Compute Provider'}</p>
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center py-8">
                  <div className="mb-6">
                    <svg className="w-24 h-24 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Be the First Provider
                  </h3>
                  <p className="text-gray-400 max-w-md mx-auto mb-6">
                    Connect your Venice.ai compute to the network and start processing AI requests for the community.
                  </p>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>✓ Contribute VCU to the network</p>
                    <p>✓ Automatic request routing</p>
                    <p>✓ Real-time health monitoring</p>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Network Health - Full height */}
          <GlassCard className="p-6 h-full">
            <h2 className="text-2xl font-bold mb-4">Network Health</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-300">Total Providers</p>
                <p className="text-2xl font-bold">{networkStats?.totalProviders || 0}</p>
                {(!networkStats || networkStats.totalProviders === 0) && (
                  <p className="text-xs text-gray-500">Waiting for first provider</p>
                )}
              </div>
              <div>
                <p className="text-gray-300">Active Providers</p>
                <p className="text-2xl font-bold">{networkStats?.activeProviders || 0}</p>
                {(!networkStats || networkStats.activeProviders === 0) && (
                  <p className="text-xs text-gray-500">Ready to activate</p>
                )}
              </div>
              <div>
                <p className="text-gray-300">Network Uptime</p>
                <p className="text-2xl font-bold">{networkStats?.networkUptime || 0}%</p>
                {(!networkStats || networkStats.networkUptime === 0) && (
                  <p className="text-xs text-gray-500">Awaiting providers</p>
                )}
              </div>
              <div>
                <p className="text-gray-300">Avg Response Time</p>
                <p className="text-2xl font-bold">{networkStats?.avgResponseTime || 0}ms</p>
                {(!networkStats || networkStats.avgResponseTime === 0) && (
                  <p className="text-xs text-gray-500">No requests yet</p>
                )}
              </div>
            </div>

            <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 mt-6">
              <p className="text-sm text-gold">
                🚀 Network is ready for providers! Be among the first to join and help build the decentralized AI infrastructure.
              </p>
            </div>
          </GlassCard>
        </div>

        {/* How to Become a Provider Section */}
        <div className="mt-12 max-w-2xl mx-auto">
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold mb-6">How to Become a Provider</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <span className="text-gold font-bold text-lg">1.</span>
                <div className="flex-1">
                  <p className="font-medium text-white">Get Venice.ai API Key</p>
                  <p className="text-sm text-gray-400">Sign up at venice.ai to get your VCU access token</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-gold font-bold text-lg">2.</span>
                <div className="flex-1">
                  <p className="font-medium text-white">Register as Provider</p>
                  <p className="text-sm text-gray-400">Connect your wallet and add your Venice.ai API key</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-gold font-bold text-lg">3.</span>
                <div className="flex-1">
                  <p className="font-medium text-white">Start Processing</p>
                  <p className="text-sm text-gray-400">Your VCU will automatically process AI requests from the network</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-red/10 border border-red/30 rounded-lg">
              <h3 className="font-semibold text-red mb-2">Provider Benefits</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Priority routing based on uptime</li>
                <li>• Real-time performance monitoring</li>
                <li>• Contribute to decentralized AI</li>
                <li>• Direct Venice.ai integration</li>
              </ul>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default ProvidersPage;
