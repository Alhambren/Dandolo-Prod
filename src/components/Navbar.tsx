import React, { useState } from 'react';
import { Logo } from './Logo';
import { WalletConnectButton } from './WalletConnectButton';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
      <div className="px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer touch-manipulation" 
            onClick={() => {
              onNavigate('home');
              setMobileMenuOpen(false);
            }}
          >
            <Logo variant="shield" showText={false} className="h-8" />
            <span className="text-lg font-semibold text-white hidden sm:inline">
              Dandolo.ai
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => onNavigate('home')}
              className={`nav-link ${currentPage === 'home' ? 'text-brand-400' : ''}`}
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('chat')}
              className={`nav-link ${currentPage === 'chat' ? 'text-brand-400' : ''}`}
            >
              Chat
            </button>
            <button
              onClick={() => onNavigate('providers')}
              className={`nav-link ${currentPage === 'providers' ? 'text-brand-400' : ''}`}
            >
              Providers
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className={`nav-link ${currentPage === 'dashboard' ? 'text-brand-400' : ''}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onNavigate('developers')}
              className={`nav-link ${currentPage === 'developers' ? 'text-brand-400' : ''}`}
            >
              Developers
            </button>
            <WalletConnectButton />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white active:bg-gray-700 rounded-lg transition-colors touch-manipulation"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-3 border-t border-gray-700 pt-4 animate-slide-up">
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  onNavigate('home');
                  setMobileMenuOpen(false);
                }}
                className={`text-left px-3 py-2 rounded transition-colors touch-manipulation ${
                  currentPage === 'home' ? 'bg-gray-700 text-brand-400' : 'text-gray-300 hover:text-white active:bg-gray-700'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => {
                  onNavigate('chat');
                  setMobileMenuOpen(false);
                }}
                className={`text-left px-3 py-2 rounded transition-colors touch-manipulation ${
                  currentPage === 'chat' ? 'bg-gray-700 text-brand-400' : 'text-gray-300 hover:text-white active:bg-gray-700'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => {
                  onNavigate('providers');
                  setMobileMenuOpen(false);
                }}
                className={`text-left px-3 py-2 rounded transition-colors touch-manipulation ${
                  currentPage === 'providers' ? 'bg-gray-700 text-brand-400' : 'text-gray-300 hover:text-white active:bg-gray-700'
                }`}
              >
                Providers
              </button>
              <button
                onClick={() => {
                  onNavigate('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`text-left px-3 py-2 rounded transition-colors touch-manipulation ${
                  currentPage === 'dashboard' ? 'bg-gray-700 text-brand-400' : 'text-gray-300 hover:text-white active:bg-gray-700'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  onNavigate('developers');
                  setMobileMenuOpen(false);
                }}
                className={`text-left px-3 py-2 rounded transition-colors touch-manipulation ${
                  currentPage === 'developers' ? 'bg-gray-700 text-brand-400' : 'text-gray-300 hover:text-white active:bg-gray-700'
                }`}
              >
                Developers
              </button>
              <div className="pt-3 border-t border-gray-700">
                <WalletConnectButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};