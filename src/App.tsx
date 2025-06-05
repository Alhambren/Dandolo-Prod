import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { useState, useEffect } from "react";
import { HomePage } from "./components/HomePage";
import { Dashboard } from "./components/Dashboard";
import { ProviderRegistration } from "./components/ProviderRegistration";
import { ProvidersPage } from "./components/ProvidersPage";
import { ChatPage } from "./components/ChatPage";
import { DevelopersPage } from "./components/DevelopersPage";
import { WalletConnection } from "./components/WalletConnection";

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'dashboard' | 'providers' | 'register' | 'chat' | 'developers'>('home');
  const [sessionId, setSessionId] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);

  useEffect(() => {
    // Generate session ID for anonymous users
    if (!sessionId) {
      setSessionId(Math.random().toString(36).substring(2, 15));
    }
  }, [sessionId]);

  const handleWalletConnection = (connected: boolean, address?: string) => {
    setIsWalletConnected(connected);
    setWalletAddress(address || '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg-start to-bg-end">
      {/* Navigation */}
      <nav className="bg-black/20 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => setCurrentPage('home')}
                className="text-2xl font-bold bg-gradient-to-r from-gold to-red bg-clip-text text-transparent hover:scale-105 transition-transform"
              >
                Dandolo.ai
              </button>
              <div className="hidden md:flex items-center space-x-6">
                <button
                  onClick={() => setCurrentPage('home')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 'home'
                      ? 'bg-red text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => setCurrentPage('chat')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 'chat'
                      ? 'bg-red text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  AI Chat
                </button>
                <button
                  onClick={() => setCurrentPage('providers')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 'providers'
                      ? 'bg-red text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Providers
                </button>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 'dashboard'
                      ? 'bg-red text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentPage('developers')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 'developers'
                      ? 'bg-red text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Developers
                </button>
                <WalletConnection onConnectionChange={handleWalletConnection} />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Authenticated>
                <SignOutButton />
              </Authenticated>
              <Unauthenticated>
                {!isWalletConnected && (
                  <div className="text-sm text-gray-300">
                    Session: {sessionId.substring(0, 8)}...
                  </div>
                )}
              </Unauthenticated>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Content 
          currentPage={currentPage} 
          sessionId={sessionId} 
          setCurrentPage={setCurrentPage}
          walletAddress={walletAddress}
          isWalletConnected={isWalletConnected}
          onWalletConnection={handleWalletConnection}
        />
      </main>

      <Toaster theme="dark" />
    </div>
  );
}

function Content({ 
  currentPage, 
  sessionId, 
  setCurrentPage,
  walletAddress,
  isWalletConnected,
  onWalletConnection
}: { 
  currentPage: string; 
  sessionId: string;
  setCurrentPage: (page: 'home' | 'dashboard' | 'providers' | 'register' | 'chat' | 'developers') => void;
  walletAddress: string;
  isWalletConnected: boolean;
  onWalletConnection: (connected: boolean, address?: string) => void;
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (currentPage === 'home') {
    return <HomePage setCurrentPage={setCurrentPage} />;
  }

  if (currentPage === 'dashboard') {
    return <Dashboard sessionId={sessionId} walletAddress={walletAddress} isWalletConnected={isWalletConnected} onWalletConnection={onWalletConnection} />;
  }

  if (currentPage === 'chat') {
    return <ChatPage sessionId={sessionId} />;
  }

  if (currentPage === 'providers') {
    return <ProvidersPage setCurrentPage={setCurrentPage} />;
  }

  if (currentPage === 'developers') {
    return <DevelopersPage />;
  }

  if (currentPage === 'register') {
    return (
      <Authenticated>
        <ProviderRegistration />
      </Authenticated>
    );
  }

  return <HomePage setCurrentPage={setCurrentPage} />;
}
