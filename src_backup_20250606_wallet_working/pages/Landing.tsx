import React from 'react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import GlassCard from "../components/GlassCard";
import { StatsGrid } from "../components/StatsGrid";

interface LandingProps {
  onNav: (page: 'landing' | 'chat' | 'providers' | 'dashboard') => void;
}

const Landing: React.FC<LandingProps> = ({ onNav }) => {
  const networkStats = useQuery(api.stats.getNetworkStats);
  const providers = useQuery(api.stats.getProviderLeaderboard);

  return (
    <div className="space-y-8">
      {/* Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard>
          <h3 className="text-lg font-semibold text-gray-300">Total Providers</h3>
          <p className="text-3xl font-bold text-white">{networkStats?.totalProviders || 0}</p>
        </GlassCard>
        <GlassCard>
          <h3 className="text-lg font-semibold text-gray-300">Active Providers</h3>
          <p className="text-3xl font-bold text-white">{networkStats?.activeProviders || 0}</p>
        </GlassCard>
        <GlassCard>
          <h3 className="text-lg font-semibold text-gray-300">Total VCU</h3>
          <p className="text-3xl font-bold text-white">{networkStats?.totalVCU || 0}</p>
        </GlassCard>
        <GlassCard>
          <h3 className="text-lg font-semibold text-gray-300">Network Uptime</h3>
          <p className="text-3xl font-bold text-white">{networkStats?.networkUptime || 0}%</p>
        </GlassCard>
      </div>

      {/* Provider Leaderboard */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-4">Top Providers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers?.map((provider) => (
            <GlassCard key={provider._id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
                  <p className="text-sm text-gray-400">Rank #{provider.rank}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gold">{provider.vcuBalance} VCU</p>
                  <p className="text-sm text-gray-400">{provider.uptime}% Uptime</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-12 text-center">
        <button
          onClick={() => onNav('chat')}
          className="px-8 py-4 bg-gradient-to-r from-gold to-red text-black font-bold rounded-lg hover:opacity-90 transition-opacity"
        >
          Start Chatting Now
        </button>
      </div>
    </div>
  );
};

export default Landing; 