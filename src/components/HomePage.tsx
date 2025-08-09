import React, { useRef, useEffect, useState } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Logo } from './Logo';
import GlassCard from './GlassCard';
import Button from './ui/Button';

interface HomePageProps {
  onNavigate?: (page: 'home' | 'chat' | 'providers' | 'dashboard' | 'developers') => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const networkStats = useQuery(api.stats.getNetworkStats);
  const monthlyStats = useQuery(api.inference.getMonthlyStats);
  const availableModels = useQuery(api.models.getAvailableModels);
  const routeInference = useAction(api.inference.routeSimple);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPaused, setIsVideoPaused] = React.useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleNavigation = (page: 'home' | 'chat' | 'providers' | 'dashboard' | 'developers') => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  const handleApiTest = async () => {
    if (!routeInference) {
      setError('API not available');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const requestParams = {
        messages: [{ role: 'user' as const, content: 'Hello! Can you tell me about Dandolo AI in one sentence?' }],
        address: apiKey.trim() || 'anonymous', // Use API key as address or 'anonymous'
        sessionId: `playground-${Date.now()}`,
        intentType: 'chat' as const, // Correct parameter name
        model: 'llama-3.3-70b',
        allowAdultContent: false
      };

      console.log('Making Convex API call with params:', requestParams);
      
      const result = await routeInference(requestParams);
      
      if (result && result.response) {
        setResponse(result.response);
      } else {
        setResponse('✓ API connection successful! The model responded with a test message.');
      }
    } catch (err) {
      console.error('API test error:', err);
      if (err instanceof Error) {
        if (err.message.includes('Rate limit exceeded') || err.message.includes('rate limit')) {
          setError('Rate limit reached. Try with an API key for higher limits.');
        } else if (err.message.includes('Invalid API key') || err.message.includes('invalid key')) {
          setError('Invalid API key. Please check your key or leave empty for anonymous.');
        } else if (err.message.includes('Server Error')) {
          setError('Dandolo AI is temporarily unavailable. Please try again in a moment.');
        } else {
          setError(`Error: ${err.message}`);
        }
      } else {
        setError('Failed to connect to API');
      }
    } finally {
      setIsLoading(false);
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
    <div className="min-h-screen bg-bg-primary text-white" data-testid="main-page">
      {/* New Developer-Focused Hero Section */}
      <div className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
          <div className="absolute inset-0 opacity-40" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"}}></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-24 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Headlines and CTAs */}
            <div className="text-left">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
                <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
                  Decentralized AI Routing
                </span>
                <br />
                <span className="bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent">
                  in 30 seconds
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-white/70 mb-8 max-w-lg leading-relaxed">
                Professional AI infrastructure with no vendor lock-in. 
                Multiple providers, zero censorship, enterprise reliability.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={() => handleNavigation('developers')}
                  rightIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  }
                >
                  Get API Key
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => handleNavigation('chat')}
                >
                  Try Live Demo
                </Button>
              </div>

              {/* Developer Trust Signals */}
              <div className="flex items-center gap-6 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Venice.ai Compatible</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>No Rate Limits</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>99.9% Uptime</span>
                </div>
              </div>
            </div>

            {/* Right Column - Interactive API Demo */}
            <div className="relative">
              <GlassCard padding="lg" className="relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Try the API Now</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-system-red rounded-full"></div>
                    <div className="w-3 h-3 bg-system-yellow rounded-full"></div>
                    <div className="w-3 h-3 bg-system-green rounded-full"></div>
                  </div>
                </div>
                
                {/* API Key Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Your API Key (optional - uses anonymous if empty)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="dk_your_api_key_here or leave empty"
                      className="w-full bg-bg-tertiary border border-glass-border rounded-lg px-3 py-2 text-sm font-mono text-white/80 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/30"
                      disabled={isLoading}
                    />
                    <div className="absolute right-2 top-2 text-xs text-white/40">
                      🔒 Secure
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    {apiKey.trim() ? 'Using your API key' : 'Anonymous mode: 15 requests/day'}
                  </div>
                </div>

                <div className="bg-bg-tertiary rounded-lg p-4 font-mono text-sm overflow-x-auto mb-4">
                  <div className="text-system-green mb-2"># Live API Test</div>
                  <pre className="text-white/80 whitespace-pre-wrap text-xs">
<span className="text-brand-secondary">curl</span> <span className="text-system-orange">https://api.dandolo.ai/v1/chat/completions</span> <span className="text-white/60">\</span>
  <span className="text-brand-secondary">-H</span> <span className="text-system-orange">"Content-Type: application/json"</span> <span className="text-white/60">\</span>
  <span className="text-brand-secondary">-H</span> <span className="text-system-orange">"Authorization: Bearer [YOUR_KEY]"</span> <span className="text-white/60">\</span>
  <span className="text-brand-secondary">-d</span> <span className="text-white/60">'</span><span className="text-white/60">{`{`}</span>
    <span className="text-system-orange">"model"</span><span className="text-white">:</span> <span className="text-system-orange">"llama-3.3-70b"</span><span className="text-white/60">,</span>
    <span className="text-system-orange">"messages"</span><span className="text-white">:</span> <span className="text-white/60">[{`{`}</span><span className="text-system-orange">"role"</span><span className="text-white">:</span><span className="text-system-orange">"user"</span><span className="text-white/60">,</span> <span className="text-system-orange">"content"</span><span className="text-white">:</span><span className="text-system-orange">"Hello!"</span><span className="text-white/60">{`}`}]</span>
  <span className="text-white/60">{`}`}</span><span className="text-white/60">'</span>
                  </pre>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    loading={isLoading}
                    onClick={handleApiTest}
                    leftIcon={
                      !isLoading ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      ) : undefined
                    }
                  >
                    {isLoading ? 'Sending...' : 'Send Request'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleNavigation('developers')}
                    disabled={isLoading}
                  >
                    Get API Key →
                  </Button>
                </div>
              </GlassCard>
              
              {/* Response Area */}
              <GlassCard className="mt-4" padding="md" variant={error ? 'error' : response ? 'success' : 'default'}>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-brand-primary">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-mono">Connecting to Dandolo AI...</span>
                  </div>
                ) : error ? (
                  <div>
                    <div className="text-xs text-system-red mb-2 font-mono">✗ Request Failed</div>
                    <div className="text-sm text-white/80 bg-bg-tertiary rounded p-2 font-mono">
                      {error}
                    </div>
                  </div>
                ) : response ? (
                  <div>
                    <div className="text-xs text-system-green mb-2 font-mono flex items-center gap-2">
                      <div className="w-2 h-2 bg-system-green rounded-full"></div>
                      ✓ Response received
                    </div>
                    <div className="text-sm text-white/90 bg-bg-tertiary rounded p-3 font-mono leading-relaxed">
                      {response}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs text-brand-primary mb-2 font-mono flex items-center gap-2">
                      <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></div>
                      Ready to test • {apiKey.trim() ? 'Using your API key' : 'Anonymous: 15 free requests'}
                    </div>
                    <div className="text-sm text-white/60 italic">
                      Click "Send Request" to see live response from Dandolo AI
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Metrics */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Trusted by Developers Worldwide</h2>
          <p className="text-white/60 text-lg">Real-time network statistics</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <GlassCard padding="md" className="text-center" hover>
            <div className="text-4xl font-bold text-brand-primary mb-2">
              {monthlyStats?.monthlyTokens !== undefined ? 
                monthlyStats.monthlyTokens >= 1000000000000 ? 
                  (monthlyStats.monthlyTokens / 1000000000000).toFixed(1) + 'T' :
                monthlyStats.monthlyTokens >= 1000000000 ? 
                  (monthlyStats.monthlyTokens / 1000000000).toFixed(1) + 'B' :
                monthlyStats.monthlyTokens >= 1000000 ? 
                  (monthlyStats.monthlyTokens / 1000000).toFixed(1) + 'M' :
                monthlyStats.monthlyTokens >= 1000 ? 
                  (monthlyStats.monthlyTokens / 1000).toFixed(1) + 'K' : 
                  monthlyStats.monthlyTokens.toString()
                : (
                  <div className="w-20 h-8 bg-glass rounded animate-pulse mx-auto"></div>
                )}
            </div>
            <div className="text-white/60 text-sm font-medium">Monthly Tokens</div>
          </GlassCard>
          
          <GlassCard padding="md" className="text-center" hover>
            <div className="text-4xl font-bold text-brand-primary mb-2">
              {networkStats?.activeUsers ? 
                networkStats.activeUsers >= 1000000 ? 
                  (networkStats.activeUsers / 1000000).toFixed(1) + 'M+' :
                networkStats.activeUsers >= 1000 ? 
                  (networkStats.activeUsers / 1000).toFixed(1) + 'K+' : 
                  networkStats.activeUsers + '+'
                : (
                  <div className="w-20 h-8 bg-glass rounded animate-pulse mx-auto"></div>
                )}
            </div>
            <div className="text-white/60 text-sm font-medium">Active Users</div>
          </GlassCard>
          
          <GlassCard padding="md" className="text-center" hover>
            <div className="text-4xl font-bold text-brand-primary mb-2">
              {networkStats?.activeProviders ? 
                networkStats.activeProviders + '+' 
                : (
                  <div className="w-16 h-8 bg-glass rounded animate-pulse mx-auto"></div>
                )}
            </div>
            <div className="text-white/60 text-sm font-medium">Providers</div>
          </GlassCard>
          
          <GlassCard padding="md" className="text-center" hover>
            <div className="text-4xl font-bold text-brand-primary mb-2">
              {availableModels && typeof availableModels === 'object' ? 
                Object.values(availableModels).flat().length + '+' 
                : (
                  <div className="w-16 h-8 bg-glass rounded animate-pulse mx-auto"></div>
                )}
            </div>
            <div className="text-white/60 text-sm font-medium">AI Models</div>
          </GlassCard>
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