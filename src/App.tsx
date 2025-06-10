import React, { useState } from 'react';
import { Toaster } from "sonner";
import HomePage from './components/HomePage';
import ChatPage from './components/ChatPage';
import ProvidersPage from './components/ProvidersPage';
import DevelopersPage from './components/DevelopersPage';
import DashboardPage from './components/DashboardPage';
import AudioStudio from './components/AudioStudio';
import VisionLab from './components/VisionLab';
import ToolsMarketplace from './components/ToolsMarketplace';
import ProvidersHub from './components/ProvidersHub';
import DeveloperConsole from './components/DeveloperConsole';
import { WalletConnectButton } from './components/WalletConnectButton';

export default function App() {
  const [currentPage, setCurrentPage] = useState<
    | 'home'
    | 'chat'
    | 'audio'
    | 'vision'
    | 'tools'
    | 'providers'
    | 'providershub'
    | 'dashboard'
    | 'developers'
    | 'console'
  >('home');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Toaster position="bottom-right" />
      
      <nav className="bg-black/50 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <button 
                onClick={() => setCurrentPage('home')}
                className="text-xl font-bold bg-gradient-to-r from-red to-gold bg-clip-text text-transparent"
              >
                Dandolo.ai
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentPage('chat')}
                className={`text-gray-300 hover:text-white ${currentPage === 'chat' ? 'text-white font-medium' : ''}`}
              >
                Chat
              </button>
              <button
                onClick={() => setCurrentPage('audio')}
                className={`text-gray-300 hover:text-white ${currentPage === 'audio' ? 'text-white font-medium' : ''}`}
              >
                Audio
              </button>
              <button
                onClick={() => setCurrentPage('vision')}
                className={`text-gray-300 hover:text-white ${currentPage === 'vision' ? 'text-white font-medium' : ''}`}
              >
                Vision
              </button>
              <button
                onClick={() => setCurrentPage('tools')}
                className={`text-gray-300 hover:text-white ${currentPage === 'tools' ? 'text-white font-medium' : ''}`}
              >
                Tools
              </button>
              <button
                onClick={() => setCurrentPage('providers')}
                className={`text-gray-300 hover:text-white ${currentPage === 'providers' ? 'text-white font-medium' : ''}`}
              >
                Providers
              </button>
              <button
                onClick={() => setCurrentPage('providershub')}
                className={`text-gray-300 hover:text-white ${currentPage === 'providershub' ? 'text-white font-medium' : ''}`}
              >
                Hub
              </button>
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`text-gray-300 hover:text-white ${currentPage === 'dashboard' ? 'text-white font-medium' : ''}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentPage('developers')}
                className={`text-gray-300 hover:text-white ${currentPage === 'developers' ? 'text-white font-medium' : ''}`}
              >
                Developers
              </button>
              <button
                onClick={() => setCurrentPage('console')}
                className={`text-gray-300 hover:text-white ${currentPage === 'console' ? 'text-white font-medium' : ''}`}
              >
                Console
              </button>

              {/* Wallet Connection */}
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 py-8">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'chat' && <ChatPage />}
        {currentPage === 'audio' && <AudioStudio />}
        {currentPage === 'vision' && <VisionLab />}
        {currentPage === 'tools' && <ToolsMarketplace />}
        {currentPage === 'providers' && <ProvidersPage setCurrentPage={setCurrentPage} />}
        {currentPage === 'providershub' && <ProvidersHub />}
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'developers' && <DevelopersPage />}
        {currentPage === 'console' && <DeveloperConsole />}
      </main>
    </div>
  );
}
