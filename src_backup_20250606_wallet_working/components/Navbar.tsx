import React from 'react';

interface NavbarProps {
  currentPage: 'home' | 'chat' | 'providers' | 'dashboard' | 'developers';
  setCurrentPage: (page: 'home' | 'chat' | 'providers' | 'dashboard' | 'developers') => void;
}

export default function Navbar({ currentPage, setCurrentPage }: NavbarProps) {
  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'chat', label: 'Chat' },
    { id: 'providers', label: 'Providers' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'developers', label: 'Developers' },
  ] as const;

  return (
    <nav className="bg-black/50 backdrop-blur-lg border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-bold text-white">Dandolo</span>
          </div>
          
          <div className="flex space-x-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
} 