import React, { useRef, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Logo } from './Logo';

interface HomePageProps {
  onNavigate?: (page: 'home' | 'chat' | 'providers' | 'dashboard' | 'developers') => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const networkStats = useQuery(api.stats.getNetworkStats);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPaused, setIsVideoPaused] = React.useState(false);

  const handleNavigation = (page: 'home' | 'chat' | 'providers' | 'dashboard' | 'developers') => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  // Handle video loading and fallback
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Hide poster after video starts playing
      video.addEventListener('loadeddata', () => {
        video.style.opacity = '1';
      });
      
      video.addEventListener('canplay', () => {
        video.style.opacity = '1';
      });
      
      video.addEventListener('error', () => {
        if (video.parentElement) {
          video.parentElement.style.background = 'linear-gradient(135deg, rgba(255, 201, 71, 0.1) 0%, rgba(0, 0, 0, 0.8) 100%)';
          video.style.display = 'none';
        }
      });
      
      // Set a timeout to hide poster if video takes too long
      const timeoutId = setTimeout(() => {
        if (video.networkState === video.NETWORK_LOADING || video.readyState < video.HAVE_ENOUGH_DATA) {
          video.removeAttribute('poster');
          video.style.opacity = '0.5';
        }
      }, 2000); // 2 second timeout
      
      return () => clearTimeout(timeoutId);
    }
  }, []);

  return (
    <div className="min-h-screen bg-dark-1 text-white" data-testid="main-page">
      {/* Hero Section with Video */}
      <div className="relative overflow-hidden min-h-[80vh] flex items-center">
        {/* Video Background */}
        <div className="absolute inset-0">
          <video 
            ref={videoRef}
            autoPlay 
            muted 
            loop 
            playsInline
            className="w-full h-full object-cover transition-opacity duration-1000"
            style={{ filter: 'brightness(0.6)', opacity: '0.3' }}
          >
            <source src="/logos/hero-video.mp4" type="video/mp4" />
            {/* Fallback for browsers that don't support video */}
            <div className="w-full h-full bg-gradient-to-br from-brand-500/20 to-dark-1"></div>
          </video>
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-1/70 via-dark-1/30 to-dark-1/50"></div>
          <div className="absolute inset-0 bg-gradient-radial from-brand-500/15 via-transparent to-transparent"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-24 w-full">
          <div className="text-center flex flex-col items-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-center">
              <span className="bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent drop-shadow-2xl">
                The Anonymous Interface
              </span>
              <br />
              <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent drop-shadow-2xl">
                For AI
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-white/80 mb-4 max-w-4xl leading-relaxed drop-shadow-lg font-medium text-center px-4">
              Better uptime, no subscriptions, zero tracking
            </p>
            
            <p className="text-base sm:text-lg md:text-xl text-white/60 mb-8 max-w-3xl leading-relaxed text-center px-4">
              Connect to AI providers worldwide through our decentralized, 
              privacy-first infrastructure
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button 
                onClick={() => handleNavigation('chat')}
                className="btn-primary text-lg px-8 py-4 shadow-2xl shadow-brand-500/30 hover:shadow-brand-500/50 transition-shadow"
              >
                Start Chatting
              </button>
              <button 
                onClick={() => handleNavigation('providers')}
                className="btn-secondary text-lg px-8 py-4 backdrop-blur-sm bg-white/10 border-white/20 hover:bg-white/20"
              >
                Browse Providers
              </button>
            </div>
            
            {/* Powered by Venice.ai */}
            <div className="flex items-center justify-center w-full">
              <img 
                src="/logos/powered-by.png" 
                alt="Powered by Venice.ai" 
                className="h-28 opacity-95 hover:opacity-100 transition-all duration-300 hover:scale-105"
              />
            </div>
            
            {/* Scroll Indicator */}
            <div className="flex justify-center mt-16 animate-bounce">
              <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Video Controls */}
        <button
          onClick={() => {
            if (videoRef.current) {
              if (isVideoPaused) {
                videoRef.current.play();
                setIsVideoPaused(false);
              } else {
                videoRef.current.pause();
                setIsVideoPaused(true);
              }
            }
          }}
          className="absolute top-6 right-6 bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white/70 hover:text-white p-3 rounded-full transition-all duration-200 z-20"
          aria-label={isVideoPaused ? 'Play video' : 'Pause video'}
        >
          {isVideoPaused ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-6 py-24 relative z-10 bg-dark-1">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Network Statistics</h2>
          <p className="text-white/60 text-lg">Real-time metrics from our decentralized network</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card card-hover p-8 text-center">
            <div className="text-4xl font-bold text-brand-500 mb-2">
              {networkStats?.activeProviders || 0}
            </div>
            <div className="text-white/80 font-medium mb-1">Active Providers</div>
            <div className="text-white/50 text-sm">Online and serving requests</div>
          </div>
          
          <div className="card card-hover p-8 text-center">
            <div className="text-4xl font-bold text-system-green mb-2">
              {networkStats?.totalPrompts ? 
                networkStats.totalPrompts >= 1000 ? 
                  (networkStats.totalPrompts / 1000).toFixed(1) + 'k' : 
                  networkStats.totalPrompts.toLocaleString() 
                : '0'}
            </div>
            <div className="text-white/80 font-medium mb-1">Total Requests</div>
            <div className="text-white/50 text-sm">AI inferences processed</div>
          </div>
          
          <div className="card card-hover p-8 text-center">
            <div className="text-4xl font-bold text-system-blue mb-2">
              {networkStats?.activeUsers || 0}
            </div>
            <div className="text-white/80 font-medium mb-1">Active Users</div>
            <div className="text-white/50 text-sm">Using the network today</div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Why Choose Dandolo</h2>
          <p className="text-white/60 text-lg">The anonymous alternative to centralized AI platforms</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="card card-hover p-8">
            <div className="w-12 h-12 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Anonymous by Default</h3>
            <p className="text-white/60 leading-relaxed">
              Zero tracking, no accounts, no conversation storage. 
              Your privacy is guaranteed, not just promised.
            </p>
          </div>
          
          <div className="card card-hover p-8">
            <div className="w-12 h-12 bg-system-blue/10 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Better Uptime</h3>
            <p className="text-white/60 leading-relaxed">
              Decentralized infrastructure eliminates single points of failure.
              When one provider goes down, others keep you online.
            </p>
          </div>
          
          <div className="card card-hover p-8">
            <div className="w-12 h-12 bg-system-purple/10 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-2xl">🌐</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">No Subscriptions</h3>
            <p className="text-white/60 leading-relaxed">
              Pay per use, not per month. No commitments, no contracts,
              no recurring charges for features you don't use.
            </p>
          </div>
          
          <div className="card card-hover p-8">
            <div className="w-12 h-12 bg-system-green/10 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-2xl">🔧</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Drop-in Replacement</h3>
            <p className="text-white/60 leading-relaxed">
              Compatible with existing tools and workflows.
              Switch from centralized providers in minutes, not days.
            </p>
          </div>
          
          <div className="card card-hover p-8">
            <div className="w-12 h-12 bg-system-orange/10 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-2xl">🎨</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Censorship Resistant</h3>
            <p className="text-white/60 leading-relaxed">
              Decentralized infrastructure means no single entity
              controls your access to AI capabilities.
            </p>
          </div>
          
          <div className="card card-hover p-8">
            <div className="w-12 h-12 bg-system-pink/10 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Transparent Pricing</h3>
            <p className="text-white/60 leading-relaxed">
              No hidden costs or surprise bills. Market-driven pricing
              keeps costs competitive and fair for everyone.
            </p>
          </div>
        </div>
      </div>


      {/* CTA Section */}
      <div className="bg-dark-2 border-y border-dark-4">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-white/60 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of users leveraging decentralized AI infrastructure. 
              No setup required, start chatting immediately.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => handleNavigation('chat')}
                className="btn-primary text-lg px-8 py-4"
              >
                Start Free Chat
              </button>
              <button 
                onClick={() => handleNavigation('providers')}
                className="btn-secondary text-lg px-8 py-4"
              >
                Add Inference
              </button>
              <button 
                onClick={() => handleNavigation('developers')}
                className="btn-secondary text-lg px-8 py-4"
              >
                API Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;