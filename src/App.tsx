import React, { useState } from 'react';
import { Toaster } from "sonner";
import { useAccount } from 'wagmi';
import { Menu, X } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if current wallet is admin
  const isAdmin = isConnected && address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  // Close mobile menu when navigating
  const navigateTo = (page: typeof currentPage) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-dark-1 text-white">
      <Toaster position="bottom-right" />
      
      {/* Header always visible */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-dark-2/95 backdrop-blur-xl border-b border-dark-4">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center h-16">
            {/* Logo - Left Side */}
            <button 
              onClick={() => navigateTo('home')}
              className="flex items-center mr-4 md:mr-12 hover:opacity-80 transition-opacity"
            >
              <Logo variant="shield" className="h-8 w-auto" showText={true} />
            </button>
            
            {/* Desktop Navigation - Hidden on mobile */}
            <nav className="hidden md:flex items-center space-x-8 flex-1">
              <button
                onClick={() => navigateTo('chat')}
                className={`text-white/70 hover:text-white transition-colors ${currentPage === 'chat' ? 'text-white font-medium' : ''}`}
              >
                Chat
              </button>
              <button
                onClick={() => navigateTo('providers')}
                className={`text-white/70 hover:text-white transition-colors ${currentPage === 'providers' ? 'text-white font-medium' : ''}`}
              >
                Providers
              </button>
              <button
                onClick={() => navigateTo('dashboard')}
                className={`text-white/70 hover:text-white transition-colors ${currentPage === 'dashboard' ? 'text-white font-medium' : ''}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => navigateTo('developers')}
                className={`text-white/70 hover:text-white transition-colors ${currentPage === 'developers' ? 'text-white font-medium' : ''}`}
              >
                Developers
              </button>
              {/* Admin tab only visible to authorized admin wallet */}
              {isAdmin && (
                <button
                  onClick={() => navigateTo('admin')}
                  className={`text-white/70 hover:text-white transition-colors ${currentPage === 'admin' ? 'text-white font-medium' : ''}`}
                >
                  Admin
                </button>
              )}
            </nav>
            
            {/* Right side - Mobile menu button and wallet */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              
              {/* Wallet Button */}
              <WalletConnectButton />
            </div>
          </div>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-dark-2/98 backdrop-blur-xl border-t border-dark-4">
            <nav className="container mx-auto px-4 py-4 space-y-2">
              <button
                onClick={() => navigateTo('chat')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  currentPage === 'chat' 
                    ? 'bg-white/10 text-white font-medium' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => navigateTo('providers')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  currentPage === 'providers' 
                    ? 'bg-white/10 text-white font-medium' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                Providers
              </button>
              <button
                onClick={() => navigateTo('dashboard')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  currentPage === 'dashboard' 
                    ? 'bg-white/10 text-white font-medium' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => navigateTo('developers')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  currentPage === 'developers' 
                    ? 'bg-white/10 text-white font-medium' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                Developers
              </button>
              {/* Admin tab only visible to authorized admin wallet */}
              {isAdmin && (
                <button
                  onClick={() => navigateTo('admin')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    currentPage === 'admin' 
                      ? 'bg-white/10 text-white font-medium' 
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Admin
                </button>
              )}
            </nav>
          </div>
        )}
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
          {currentPage === 'home' && <HomePage onNavigate={navigateTo} />}
          {currentPage === 'providers' && (
            <div className="container mx-auto px-4 md:px-6 py-4 md:py-8">
              <ProvidersPage setCurrentPage={navigateTo} />
            </div>
          )}
          {currentPage === 'dashboard' && (
            <div className="container mx-auto px-4 md:px-6 py-4 md:py-8">
              <DashboardPage />
            </div>
          )}
          {currentPage === 'developers' && (
            <div className="container mx-auto px-4 md:px-6 py-4 md:py-8">
              <DevelopersPage />
            </div>
          )}
        </main>
      )}
    </div>
  );
}
