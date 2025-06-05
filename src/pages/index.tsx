import Link from 'next/link';
import { GlassCard } from '../components/GlassCard';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-red to-gold bg-clip-text text-transparent mb-6">
            Dandolo.ai
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-12">
            The first decentralized AI inference network powered by Venice.ai VCU
          </p>
          
          <div className="flex justify-center space-x-6">
            <Link 
              href="/chat"
              className="px-8 py-4 bg-gradient-to-r from-red to-gold text-white font-semibold rounded-lg hover:shadow-lg transition-all"
            >
              Try AI Chat (Free)
            </Link>
            <Link
              href="/providers"
              className="px-8 py-4 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
            >
              Provide VCU
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <GlassCard>
            <div className="p-8 text-center">
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="text-xl font-bold text-white mb-4">Decentralized</h3>
              <p className="text-gray-300">
                Powered by a network of independent providers, ensuring reliability and censorship resistance
              </p>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-8 text-center">
              <div className="text-4xl mb-4">⚡️</div>
              <h3 className="text-xl font-bold text-white mb-4">Fast & Reliable</h3>
              <p className="text-gray-300">
                Optimized routing and load balancing for consistent, low-latency responses
              </p>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-8 text-center">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold text-white mb-4">Earn Rewards</h3>
              <p className="text-gray-300">
                Share your Venice.ai compute and earn rewards based on your VCU contribution
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
} 