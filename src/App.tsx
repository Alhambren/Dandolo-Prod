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
import { useWallet } from "./hooks/useWallet";
import { DashboardPage } from "./components/DashboardPage";
import { GlassCard } from "./components/GlassCard";

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'providers' | 'dashboard' | 'developers'>('home');
  const { address, connect, disconnect, isConnecting } = useWallet();
  const userStats = useQuery(api.analytics.getSystemStats);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      {/* Navigation */}
      <nav className="bg-black/50 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => setCurrentPage('home')}
              className="text-2xl font-bold bg-gradient-to-r from-gold to-red bg-clip-text text-transparent hover:scale-105 transition-transform cursor-pointer"
            >
              Dandolo.ai
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <button
                onClick={() => setCurrentPage('home')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === 'home'
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
            </div>

            {/* Wallet Connection */}
            <div className="flex items-center">
              {address ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-300">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                  <button
                    onClick={disconnect}
                    className="px-3 py-2 rounded-md text-sm font-medium bg-red text-white hover:bg-red/90 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-3 py-2 rounded-md text-sm font-medium bg-red text-white hover:bg-red/90 transition-colors disabled:opacity-50"
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'home' && <ChatPage sessionId="test-session" walletAddress={address || undefined} />}
        {currentPage === 'providers' && <ProvidersPage />}
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'developers' && <DevelopersPage />}
      </main>

      <Toaster theme="dark" />
    </div>
  );
}

function Content({ 
  currentPage, 
  address,
  setCurrentPage
}: { 
  currentPage: string; 
  address: string | null;
  setCurrentPage: (page: 'home' | 'dashboard' | 'providers' | 'register' | 'chat' | 'developers') => void;
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
    return <DashboardPage />;
  }

  if (currentPage === 'chat') {
    return <ChatPage sessionId="test-session" walletAddress={address} />;
  }

  if (currentPage === 'providers') {
    return <ProvidersPage />;
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
