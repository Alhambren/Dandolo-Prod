import React, { useState } from 'react';
import { Toaster } from "sonner";
import { useAccount } from 'wagmi';
import HomePage from './components/HomePage';
import { ChatInterface } from './components/ChatInterface';
import ProvidersPage from './components/ProvidersPage';
import DevelopersPage from './components/DevelopersPage';
import DashboardPage from './components/DashboardPage';
import { AdminDashboardPage } from './components/AdminDashboard';
import { WalletConnectButton } from './components/WalletConnectButton';
import { Logo } from './components/Logo';

// CRITICAL: Hardcoded admin address - must match AdminDashboard.tsx
const ADMIN_ADDRESS = "0xC07481520d98c32987cA83B30EAABdA673cDbe8c";

export default function App() {
  const { address, isConnected } = useAccount();
  const [currentPage, setCurrentPage] = useState<
    'home' | 'chat' | 'providers' | 'dashboard' | 'developers' | 'admin'
  >('home');

  // Check if current wallet is admin
  const isAdmin = isConnected && address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  return (
    <div className="min-h-screen bg-dark-1 text-white">
      <Toaster position="bottom-right" />
      
      {/* Header always visible */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-dark-2/95 backdrop-blur-xl border-b border-dark-4">
        <div className="container mx-auto px-6">
          <div className="flex items-center h-16">
            {/* Logo and Nav Group - Left Side */}
            <div className="flex items-center flex-1">
              <button 
                onClick={() => setCurrentPage('home')}
                className="flex items-center mr-12 hover:opacity-80 transition-opacity"
              >
                <Logo variant="shield" className="h-8 w-auto" showText={true} />
              </button>
              
              <nav className="hidden md:flex items-center space-x-8">
                <button
                  onClick={() => setCurrentPage('chat')}
                  className={`text-white/70 hover:text-white transition-colors ${currentPage === 'chat' ? 'text-white font-medium' : ''}`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setCurrentPage('providers')}
                  className={`text-white/70 hover:text-white transition-colors ${currentPage === 'providers' ? 'text-white font-medium' : ''}`}
                >
                  Providers
                </button>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className={`text-white/70 hover:text-white transition-colors ${currentPage === 'dashboard' ? 'text-white font-medium' : ''}`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentPage('developers')}
                  className={`text-white/70 hover:text-white transition-colors ${currentPage === 'developers' ? 'text-white font-medium' : ''}`}
                >
                  Developers
                </button>
                {/* Admin tab only visible to authorized admin wallet */}
                {isAdmin && (
                  <button
                    onClick={() => setCurrentPage('admin')}
                    className={`text-white/70 hover:text-white transition-colors ${currentPage === 'admin' ? 'text-white font-medium' : ''}`}
                  >
                    Admin
                  </button>
                )}
              </nav>
            </div>
            
            {/* Wallet Button - Right Side */}
            <WalletConnectButton />
          </div>
        </div>
      </header>
      
      {/* All pages now have top padding for header */}
      {currentPage === 'chat' ? (
        <div className="pt-16">
          <ChatInterface />
        </div>
      ) : currentPage === 'admin' && isAdmin ? (
        <AdminDashboardPage />
      ) : (
        <main className="pt-16">
          {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} />}
          {currentPage === 'providers' && (
            <div className="container mx-auto px-6 py-8">
              <ProvidersPage setCurrentPage={setCurrentPage} />
            </div>
          )}
          {currentPage === 'dashboard' && (
            <div className="container mx-auto px-6 py-8">
              <DashboardPage />
            </div>
          )}
          {currentPage === 'developers' && (
            <div className="container mx-auto px-6 py-8">
              <DevelopersPage />
            </div>
          )}
        </main>
      )}
    </div>
  );
}
