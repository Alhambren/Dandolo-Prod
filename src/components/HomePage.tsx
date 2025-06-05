import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect } from "react";
import { HeroSection } from "./HeroSection";
import { StatsGrid } from "./StatsGrid";
import { EpochCountdown } from "./EpochCountdown";
import { ProviderCard } from "./ProviderCard";
import { GlassCard } from "./GlassCard";

interface HomePageProps {
  setCurrentPage: (page: 'home' | 'dashboard' | 'providers' | 'register' | 'chat' | 'developers') => void;
}

export function HomePage({ setCurrentPage }: HomePageProps) {
  // Use real-time data from Convex
  const topProviders = useQuery(api.stats.getProviderLeaderboard);
  const allProviders = useQuery(api.providers.list);
  const initSampleData = useMutation(api.providers.initSampleData);

  useEffect(() => {
    // Initialize sample data if no providers exist
    if (allProviders && allProviders.length === 0) {
      initSampleData();
    }
  }, [allProviders, initSampleData]);

  return (
    <div className="space-y-12">
      <HeroSection setCurrentPage={setCurrentPage} />
      
      {/* Real-time stats from Convex */}
      <StatsGrid />
      
      <EpochCountdown />
      
      {/* Top Providers - Real Data */}
      <GlassCard>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-white">Top Providers</h2>
            <div className="flex items-center space-x-4">
              {allProviders && allProviders.length === 0 && (
                <button 
                  onClick={() => initSampleData()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Initialize Demo Data
                </button>
              )}
              <button 
                onClick={() => setCurrentPage('providers')}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                View All →
              </button>
            </div>
          </div>
          
          {topProviders && topProviders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topProviders.slice(0, 6).map((provider) => (
                <ProviderCard
                  key={provider._id}
                  provider={provider}
                  rank={provider.rank}
                  onClick={() => {
                    console.log(`Navigate to provider ${provider.address}`);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                {allProviders === undefined ? "Loading providers..." : "No providers found"}
              </div>
              {allProviders && allProviders.length === 0 && (
                <button 
                  onClick={() => initSampleData()}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Initialize Demo Data
                </button>
              )}
            </div>
          )}
        </div>
      </GlassCard>

      {/* How It Works */}
      <GlassCard>
        <div className="p-8">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Register Provider</h3>
              <p className="text-gray-300">Connect your Venice.ai API key and join the decentralized network</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Serve Prompts</h3>
              <p className="text-gray-300">Automatically receive and process AI prompts from users</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Earn Rewards</h3>
              <p className="text-gray-300">Get points based on your VCU contribution and prompt processing</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
