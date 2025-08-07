import React, { useRef, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Logo } from './Logo';

interface HomePageProps {
  onNavigate?: (page: 'home' | 'chat' | 'providers' | 'dashboard' | 'developers') => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const networkStats = useQuery(api.stats.getNetworkStats);
  const overallStats = useQuery(api.inference.getStats);
  const availableModels = useQuery(api.models.getAvailableModels);
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

      {/* OpenRouter-style Statistics */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-5xl font-bold text-white mb-2">
              {overallStats?.totalTokens ? 
                overallStats.totalTokens >= 1000000000000 ? 
                  (overallStats.totalTokens / 1000000000000).toFixed(1) + 'T' :
                overallStats.totalTokens >= 1000000000 ? 
                  (overallStats.totalTokens / 1000000000).toFixed(1) + 'B' :
                overallStats.totalTokens >= 1000000 ? 
                  (overallStats.totalTokens / 1000000).toFixed(1) + 'M' :
                overallStats.totalTokens >= 1000 ? 
                  (overallStats.totalTokens / 1000).toFixed(1) + 'K' : 
                  overallStats.totalTokens.toString()
                : (
                  <div className="w-20 h-12 bg-gray-700 rounded animate-pulse mx-auto"></div>
                )}
            </div>
            <div className="text-white/60 text-lg">Monthly Tokens</div>
          </div>
          
          <div>
            <div className="text-5xl font-bold text-white mb-2">
              {networkStats?.activeUsers ? 
                networkStats.activeUsers >= 1000000 ? 
                  (networkStats.activeUsers / 1000000).toFixed(1) + 'M+' :
                networkStats.activeUsers >= 1000 ? 
                  (networkStats.activeUsers / 1000).toFixed(1) + 'K+' : 
                  networkStats.activeUsers + '+'
                : (
                  <div className="w-20 h-12 bg-gray-700 rounded animate-pulse mx-auto"></div>
                )}
            </div>
            <div className="text-white/60 text-lg">Global Users</div>
          </div>
          
          <div>
            <div className="text-5xl font-bold text-white mb-2">
              {networkStats?.activeProviders ? 
                networkStats.activeProviders + '+' 
                : (
                  <div className="w-16 h-12 bg-gray-700 rounded animate-pulse mx-auto"></div>
                )}
            </div>
            <div className="text-white/60 text-lg">Active Providers</div>
          </div>
          
          <div>
            <div className="text-5xl font-bold text-brand-500 mb-2">
              {availableModels && typeof availableModels === 'object' ? 
                Object.values(availableModels).flat().length + '+' 
                : (
                  <div className="w-16 h-12 bg-gray-700 rounded animate-pulse mx-auto"></div>
                )}
            </div>
            <div className="text-white/60 text-lg">Models</div>
          </div>
        </div>
      </div>

      {/* Getting Started Section */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Get Started in 3 Steps</h2>
          <p className="text-white/60 text-lg">Start using decentralized AI in minutes</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1: Signup */}
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center">
                <span className="text-xl font-bold text-brand-500">1</span>
              </div>
              <h3 className="text-xl font-semibold">Signup</h3>
            </div>
            <p className="text-white/60 mb-6">
              Create an account to get started. You can set up an org for your team later.
            </p>
          </div>

          {/* Step 2: Choose Your Access Level */}
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center">
                <span className="text-xl font-bold text-brand-500">2</span>
              </div>
              <h3 className="text-xl font-semibold">Choose Your Access Level</h3>
            </div>
            <p className="text-white/60 mb-6">
              Different API key types with daily rate limits to match your needs.
            </p>
            <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Anonymous</span>
                <span className="font-mono text-white">50/day</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Developer</span>
                <span className="font-mono text-white">500/day</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Agent</span>
                <span className="font-mono text-brand-400">5,000/day</span>
              </div>
            </div>
          </div>

          {/* Step 3: Get API key */}
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center">
                <span className="text-xl font-bold text-brand-500">3</span>
              </div>
              <h3 className="text-xl font-semibold">Get your API key</h3>
            </div>
            <p className="text-white/60 mb-6">
              Create an API key and start making requests. <span className="text-brand-400">Fully Venice.ai compatible.</span>
            </p>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔑</span>
                <div className="flex-1">
                  <div className="text-xs text-white/40 mb-1">DANDOLO_API_KEY</div>
                  <div className="font-mono text-sm text-white/80">••••••••••••••</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center mt-12">
          <button
            onClick={() => handleNavigation('developers')}
            className="px-8 py-4 bg-brand-500 hover:bg-brand-600 rounded-xl font-semibold text-lg transition-all transform hover:scale-105"
          >
            Get Started with Dandolo
          </button>
        </div>
      </div>

      {/* Why Dandolo Section */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">The Decentralized Alternative</h2>
          <p className="text-white/60 text-lg">Anonymous inference. Multiple providers. No censorship.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          <div>
            <h3 className="text-2xl font-semibold mb-6">What We Offer</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <div>
                  <p className="font-medium">20+ Uncensored Models</p>
                  <p className="text-white/60 text-sm">Access the full Venice.ai model catalog</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <div>
                  <p className="font-medium">Anonymous by Default</p>
                  <p className="text-white/60 text-sm">No accounts, tracking, or conversation logs</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <div>
                  <p className="font-medium">Venice.ai Compatible API</p>
                  <p className="text-white/60 text-sm">Drop-in replacement with Venice.ai models</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <div>
                  <p className="font-medium">Better Reliability</p>
                  <p className="text-white/60 text-sm">Multiple providers ensure 99.9% uptime</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <div>
                  <p className="font-medium">Pay Per Token</p>
                  <p className="text-white/60 text-sm">No subscriptions or commitments</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-semibold mb-6">How It Works</h3>
            <div className="space-y-6">
              <div className="relative pl-8">
                <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-brand-500"></div>
                </div>
                <div className="absolute left-3 top-6 bottom-0 w-px bg-white/10"></div>
                <div>
                  <p className="font-medium mb-1">Your request arrives</p>
                  <p className="text-white/60 text-sm">Encrypted and anonymous from the start</p>
                </div>
              </div>
              
              <div className="relative pl-8">
                <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-brand-500"></div>
                </div>
                <div className="absolute left-3 top-6 bottom-0 w-px bg-white/10"></div>
                <div>
                  <p className="font-medium mb-1">Smart routing selects provider</p>
                  <p className="text-white/60 text-sm">Based on model availability and performance</p>
                </div>
              </div>
              
              <div className="relative pl-8">
                <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-brand-500"></div>
                </div>
                <div>
                  <p className="font-medium mb-1">Venice.ai processes inference</p>
                  <p className="text-white/60 text-sm">Through verified provider infrastructure</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-brand-500/10 border border-brand-500/30 rounded-lg">
              <p className="text-sm">
                <span className="font-semibold text-brand-400">Pro tip:</span> Developers get 500 requests/day, 
                AI agents get 5,000 requests/day
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Ready to Build Without Limits?
        </h2>
        <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
          Join thousands of developers using Dandolo for uncensored, reliable AI inference.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => handleNavigation('chat')}
            className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl font-semibold text-lg transition-all"
          >
            Try It First
          </button>
          <button
            onClick={() => handleNavigation('developers')}
            className="px-8 py-4 bg-brand-500 hover:bg-brand-600 rounded-2xl font-semibold text-lg transition-all transform hover:scale-105"
          >
            Get API Access
          </button>
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