import React, { useState } from 'react';
import { Toaster } from "sonner";
import HomePage from './components/HomePage';
import ChatPage from './components/ChatPage';
import ProvidersPage from './components/ProvidersPage';
import DevelopersPage from './components/DevelopersPage';
import DashboardPage from './components/DashboardPage';
import { WalletConnectButton } from './components/WalletConnectButton';
import { Logo } from './components/Logo';

export default function App() {
  const [currentPage, setCurrentPage] = useState<
    'home' | 'chat' | 'providers' | 'dashboard' | 'developers'
  >('home');

  return (
    <div className="min-h-screen bg-dark-1 text-white">
      <Toaster position="bottom-right" />
      
      {/* Navigation bar - always visible */}
      <nav className="bg-dark-2/95 backdrop-blur-xl border-b border-dark-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <button 
                onClick={() => setCurrentPage('home')}
                className="hover:opacity-80 transition-opacity"
              >
                <Logo variant="shield" className="h-8 w-auto" showText={true} />
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-6">
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

              {/* Wallet Connection */}
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </nav>
      
      <main className={currentPage === 'home' || currentPage === 'chat' ? '' : 'max-w-7xl mx-auto px-6 py-8'}>
        {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} />}
        {currentPage === 'chat' && <ChatPage />}
        {currentPage === 'providers' && <ProvidersPage setCurrentPage={setCurrentPage} />}
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'developers' && <DevelopersPage />}
      </main>
    </div>
  );
}
