import Link from 'next/link';
import { GlassCard } from '../components/GlassCard';
import { useStats } from '../hooks/useStats';
import { useCountdown } from '../hooks/useCountdown';
import { Tooltip } from '../components/Tooltip';

export default function LandingPage() {
  const { stats, nextEpoch, topProviders, isLoading } = useStats();
  const countdown = nextEpoch ? useCountdown(nextEpoch.startTime) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#100000] to-[#080000] text-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-[#ff5b5b] to-[#ffb14d] bg-clip-text text-transparent mb-6">
            Dandolo.ai
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-12">
            The first decentralized AI inference network powered by Venice.ai VCU
          </p>
          
          <div className="flex justify-center space-x-6">
            <Link 
              href="/chat"
              className="px-8 py-4 bg-gradient-to-r from-[#ff5b5b] to-[#ffb14d] text-white font-semibold rounded-lg hover:shadow-lg transition-all"
            >
              Try AI Chat (Free)
            </Link>
            <Link
              href="/providers"
              className="px-8 py-4 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all hover:shadow-[0_0_15px_rgba(255,177,77,0.3)]"
            >
              Provide VCU
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard>
            <div className="p-6">
              <div className="text-3xl font-bold text-[#ff4b55] mb-2">
                {isLoading ? '0' : stats?.activeProviders ?? 0}
              </div>
              <div className="text-gray-300">Venice.ai Providers</div>
              <Tooltip text="Active compute providers" />
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-6">
              <div className="text-3xl font-bold text-[#f1c40f] mb-2">
                {isLoading ? '0' : stats?.activeUsers ?? 0}
              </div>
              <div className="text-gray-300">Active Users (24h)</div>
              <Tooltip text="Users in last 24 hours" />
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-6">
              <div className="text-3xl font-bold text-[#ff4b55] mb-2">
                {isLoading ? '0' : stats?.promptsToday ?? 0}
              </div>
              <div className="text-gray-300">Prompts Routed Today</div>
              <Tooltip text="Anonymous requests processed" />
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-6">
              <div className="text-3xl font-bold text-[#f1c40f] mb-2">
                {isLoading ? '0' : stats?.totalVCU ?? 0}
              </div>
              <div className="text-gray-300">Total VCU Available</div>
              <Tooltip text="Network compute capacity" />
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Epoch Countdown */}
      {countdown && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <GlassCard className="rounded-3xl px-8 py-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Next Epoch Starts In</h3>
              <div className="text-4xl font-mono mb-2">
                {String(countdown.days).padStart(2, '0')}:
                {String(countdown.hours).padStart(2, '0')}:
                {String(countdown.minutes).padStart(2, '0')}:
                {String(countdown.seconds).padStart(2, '0')}
              </div>
              <p className="text-gray-400">Rewards are distributed every Sunday at midnight UTC</p>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Top Providers */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <GlassCard>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Top Providers</h3>
              <Link href="/providers" className="text-[#ffb14d] hover:text-[#ff5b5b] transition-colors">
                View All →
              </Link>
            </div>
            
            {topProviders?.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No providers found</div>
            ) : (
              <div className="space-y-4">
                {topProviders?.map((provider) => (
                  <div key={provider._id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#ff5b5b] to-[#ffb14d]" />
                      <div>
                        <div className="font-medium">{provider.name}</div>
                        <div className="text-sm text-gray-400">
                          {provider.prompts24h} prompts • {provider.vcuEarned7d} VCU
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <span className="px-2 py-1 text-xs bg-white/10 rounded">{provider.region}</span>
                      <span className="px-2 py-1 text-xs bg-white/10 rounded">{provider.gpuType}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <GlassCard className="rounded-3xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#d16bff] to-[#ff6b6b] flex items-center justify-center text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-bold mb-2">Register Provider</h3>
              <p className="text-gray-300">
                Connect your Venice.ai API key and join the decentralized network
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#34b3ff] to-[#00e0ff] flex items-center justify-center text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-bold mb-2">Serve Prompts</h3>
              <p className="text-gray-300">
                Automatically receive and process AI prompts from users
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#34ff8d] to-[#00d26a] flex items-center justify-center text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-bold mb-2">Earn Rewards</h3>
              <p className="text-gray-300">
                Get points based on your VCU contribution and prompt processing
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
} 