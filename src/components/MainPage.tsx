import React from 'react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAccount } from "wagmi";
import { Logo } from './Logo';

interface LeaderboardEntry {
  address: string;
  points: number;
  promptsToday: number;
  isCurrentUser: boolean;
  rank: number;
}

interface LeaderboardData {
  topLeaders: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  totalParticipants: number;
}

const MainPage: React.FC = () => {
  const { address } = useAccount();
  const networkStats = useQuery(api.stats.getNetworkStats);
  const leaderboard = useQuery(api.points.getPointsLeaderboardWithUserRank, {
    limit: 10,
    currentAddress: address || undefined,
  }) as LeaderboardData | undefined;

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section with Logo */}
      <div className="bg-gradient-to-br from-black via-red-dark to-black py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-8">
            <Logo className="h-24 w-24" showText={false} />
          </div>
          <h1 className="text-5xl font-bold text-gold mb-4">
            Welcome to Dandolo
          </h1>
          <p className="text-xl text-gold-light">
            Your AI Infrastructure Platform
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-4 -mt-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Providers', value: networkStats?.totalProviders || 0, icon: '🏭' },
            { label: 'Active Users', value: networkStats?.activeUsers || 0, icon: '👥' },
            { label: 'Prompts Today', value: networkStats?.promptsToday || 0, icon: '💬' },
            { label: 'Total VCU', value: networkStats?.totalVCU || 0, icon: '⚡' },
          ].map((stat, idx) => (
            <div 
              key={idx}
              className="bg-black-light border border-gold/30 rounded-lg p-6 hover:border-gold transition-all"
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold text-gold mb-1">{stat.value.toLocaleString()}</div>
              <div className="text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top 10 Points Leaders */}
        <div className="bg-black-light border border-red/30 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-gold mb-6 flex items-center gap-3">
            <span>🏆</span> Top 10 Points Leaders
          </h2>
          
          {leaderboard ? (
            <div className="space-y-3">
              {leaderboard.topLeaders.map((leader, idx) => {
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div
                    key={leader.address}
                    className={`p-4 rounded-lg border transition-all ${
                      leader.isCurrentUser
                        ? 'bg-gradient-gold border-gold shadow-lg shadow-gold/30'
                        : 'bg-black border-gray-800 hover:border-gold/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold">
                          {idx < 3 ? medals[idx] : `#${idx + 1}`}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${
                              leader.isCurrentUser ? 'text-black' : 'text-white'
                            }`}>
                              {leader.address.slice(0, 6)}...{leader.address.slice(-4)}
                            </span>
                            {leader.isCurrentUser && (
                              <span className="text-xs bg-black text-gold px-2 py-1 rounded font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className={`text-sm ${
                            leader.isCurrentUser ? 'text-black/70' : 'text-gray-500'
                          }`}>
                            {leader.promptsToday} prompts today
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          leader.isCurrentUser ? 'text-black' : 'text-gold'
                        }`}>
                          {leader.points.toLocaleString()}
                        </div>
                        <div className={`text-sm ${
                          leader.isCurrentUser ? 'text-black/70' : 'text-gray-500'
                        }`}>
                          points
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Current user if not in top 10 */}
              {leaderboard.currentUserEntry && (
                <>
                  <div className="text-center text-gray-600 py-2">• • •</div>
                  <div className="p-4 rounded-lg border bg-gradient-gold border-gold shadow-lg shadow-gold/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-black">
                          #{leaderboard.currentUserEntry.rank}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-black font-medium">
                              {leaderboard.currentUserEntry.address.slice(0, 6)}...
                              {leaderboard.currentUserEntry.address.slice(-4)}
                            </span>
                            <span className="text-xs bg-black text-gold px-2 py-1 rounded font-bold">
                              YOU
                            </span>
                          </div>
                          <div className="text-sm text-black/70">
                            {leaderboard.currentUserEntry.promptsToday} prompts today
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-black">
                          {leaderboard.currentUserEntry.points.toLocaleString()}
                        </div>
                        <div className="text-sm text-black/70">points</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <div className="text-center text-gray-500 text-sm mt-4 pt-4 border-t border-gray-800">
                Total participants: {leaderboard.totalParticipants}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-black animate-pulse rounded-lg" />
              ))}
            </div>
          )}
        </div>

        {/* Network Health */}
        <div className="bg-black-light border border-red/30 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-gold mb-6 flex items-center gap-3">
            <span>🏥</span> Network Health
          </h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-400 mb-1">Total Providers</div>
                <div className="text-3xl font-bold text-red">{networkStats?.totalProviders || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Active Providers</div>
                <div className="text-3xl font-bold text-green-500">{networkStats?.activeProviders || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Network Uptime</div>
                <div className="text-3xl font-bold text-gold">{networkStats?.networkUptime || 0}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Avg Response</div>
                <div className="text-3xl font-bold text-red">{networkStats?.avgResponseTime || 0}ms</div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gold/10 border border-gold/30 rounded-lg">
              <p className="text-gold text-sm">
                🚀 Network is ready for providers! Be among the first to join and help build the decentralized AI infrastructure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage; 