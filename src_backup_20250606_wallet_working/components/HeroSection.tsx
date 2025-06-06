interface HeroSectionProps {
  setCurrentPage: (page: 'home' | 'dashboard' | 'providers' | 'register' | 'chat' | 'developers') => void;
}

export function HeroSection({ setCurrentPage }: HeroSectionProps) {
  return (
    <div className="text-center py-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-gold via-red to-gold bg-clip-text text-transparent mb-6">
          Dandolo.ai
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          The first decentralized AI inference network. Connect your Venice.ai compute, 
          earn rewards, and access AI models through our distributed infrastructure.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
          <button 
            onClick={() => setCurrentPage('chat')}
            className="primary-cta"
          >
            Try AI Chat (Free)
          </button>
          
          <button 
            onClick={() => setCurrentPage('dashboard')}
            className="secondary-cta"
          >
            Provide VCU
          </button>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl mb-3">🌐</div>
            <h3 className="text-lg font-semibold text-white mb-2">Decentralized</h3>
            <p className="text-gray-400">No single point of failure</p>
          </div>
          <div>
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold text-white mb-2">Fast & Reliable</h3>
            <p className="text-gray-400">Sub-second response times</p>
          </div>
          <div>
            <div className="text-3xl mb-3">💰</div>
            <h3 className="text-lg font-semibold text-white mb-2">Earn Rewards</h3>
            <p className="text-gray-400">Get paid for your compute</p>
          </div>
        </div>
      </div>
    </div>
  );
}
