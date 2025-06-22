import React from 'react';
import { useQuery } from 'convex/react';
import GlassCard from './GlassCard';
import { api } from '../../convex/_generated/api';

interface ProvidersPageProps {
  setCurrentPage?: (page: string) => void;
}

const ProvidersPage: React.FC<ProvidersPageProps> = ({ setCurrentPage }) => {
  const networkStats = useQuery(api.stats.getNetworkStats);
  const topProviders = useQuery(api.providers.getTopProviders, { limit: 5 });
  const isLoading = networkStats === undefined || topProviders === undefined;

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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Network Health */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              Network Status
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Active Providers</span>
                {isLoading ? (
                  <div className="w-8 h-6 bg-gray-700 rounded animate-pulse"></div>
                ) : (
                  <span className="text-2xl font-bold">{networkStats?.activeProviders || 0}</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-400">Total VCU</span>
                  <div className="text-xs text-gray-500">Updates hourly</div>
                </div>
                {isLoading ? (
                  <div className="w-12 h-6 bg-gray-700 rounded animate-pulse"></div>
                ) : (
                  <span className="text-2xl font-bold text-blue-400">{networkStats?.totalVCU?.toFixed(2) || '0.00'}</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Requests</span>
                {isLoading ? (
                  <div className="w-12 h-6 bg-gray-700 rounded animate-pulse"></div>
                ) : (
                  <span className="text-2xl font-bold">{networkStats?.totalPrompts?.toLocaleString() || 0}</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Avg Response</span>
                {isLoading ? (
                  <div className="w-10 h-6 bg-gray-700 rounded animate-pulse"></div>
                ) : networkStats?.avgResponseTime && networkStats.avgResponseTime > 0 ? (
                  <span className="text-2xl font-bold">{Math.round(networkStats.avgResponseTime)}ms</span>
                ) : (
                  <span className="text-sm text-gray-500">No data yet</span>
                )}
              </div>
              <div className="pt-2 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Network Health</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    (networkStats?.activeProviders || 0) > 0 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {(networkStats?.activeProviders || 0) > 0 ? 'Operational' : 'Initializing'}
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Top Providers */}
          <div className="xl:col-span-2">
            <GlassCard className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Top Providers</h2>
                {topProviders && topProviders.length > 0 && (
                  <span className="text-sm text-gray-400">
                    Ranked by performance
                  </span>
                )}
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-700 rounded animate-pulse mb-2 w-24"></div>
                            <div className="h-3 bg-gray-700 rounded animate-pulse w-32"></div>
                          </div>
                        </div>
                        <div className="flex gap-6">
                          <div>
                            <div className="h-3 bg-gray-700 rounded animate-pulse w-16 mb-1"></div>
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-12"></div>
                          </div>
                          <div>
                            <div className="h-3 bg-gray-700 rounded animate-pulse w-16 mb-1"></div>
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-12"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : topProviders && topProviders.length > 0 ? (
                <div className="space-y-3">
                  {topProviders.map((provider, index) => (
                    <div key={provider._id} className="group hover:bg-white/5 transition-colors p-4 rounded-lg border border-transparent hover:border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                            index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                            index === 2 ? 'bg-gradient-to-r from-orange-400 to-red-500' :
                            'bg-gradient-to-r from-blue-400 to-purple-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                                {provider.name}
                              </h3>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                provider.isActive 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {provider.isActive ? 'Online' : 'Offline'}
                              </div>
                            </div>
                            <p className="text-sm text-gray-400 font-mono">
                              {provider.address.substring(0, 8)}...{provider.address.substring(provider.address.length - 6)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-6 text-right">
                          <div>
                            <p className="text-xs text-gray-400">VCU Balance</p>
                            <p className="font-semibold text-blue-400">{provider.vcuBalance.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Requests Served</p>
                            <p className="font-semibold text-green-400">{provider.totalPrompts.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mb-6">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    No Active Providers Yet
                  </h3>
                  <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                    Be the first to provide AI compute and help build the decentralized inference network.
                  </p>
                  <button
                    onClick={() => setCurrentPage?.('dashboard')}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-medium transition-all transform hover:scale-105"
                  >
                    Register as Provider
                  </button>
                </div>
              )}
            </GlassCard>
          </div>
        </div>

        {/* Provider Guide */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <span className="w-6 h-6 bg-gradient-to-r from-green-400 to-blue-500 rounded mr-3 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
              Quick Start Guide
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400 font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="font-medium text-white">Obtain Venice VCU Allowance</p>
                  <p className="text-sm text-gray-400 mt-1">Stake VVV tokens to get Venice VCU allowance for AI model access</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="font-medium text-white">Connect Wallet & Register</p>
                  <p className="text-sm text-gray-400 mt-1">Link your Ethereum wallet and register with your Venice.ai "inference only" API key</p>
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.898-.833-2.598 0L3.732 8.5c-.77.833-.192 2.5 1.306 2.5z" />
                      </svg>
                      <span className="text-red-400 font-medium text-sm">CRITICAL WARNING</span>
                    </div>
                    <p className="text-red-300 text-xs leading-tight">
                      <strong>Never use an admin key!</strong> Only use "inference only" API keys. Admin keys could give attackers access to your VVV tokens.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-400 font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="font-medium text-white">Start Earning Points</p>
                  <p className="text-sm text-gray-400 mt-1">Process inference requests and earn 1 point per 100 tokens</p>
                </div>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <span className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-red-500 rounded mr-3 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </span>
              Provider Benefits
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-300">Earn points for every request processed</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-300">Real-time performance monitoring</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-gray-300">Priority routing based on reliability</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-300">Contribute to decentralized AI infrastructure</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={() => setCurrentPage?.('dashboard')}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-medium transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Register as Provider
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default ProvidersPage;
