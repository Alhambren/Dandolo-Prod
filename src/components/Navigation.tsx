import React from 'react';
import { Logo } from './Logo';

const Navigation: React.FC<{ onNavigate: (page: string) => void; currentPage: string }> = ({ 
  onNavigate, 
  currentPage 
}) => {
  const navItems = [
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'providers', label: 'Providers', icon: '🏭' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'developers', label: 'Developers', icon: '👨‍💻' },
  ];

  return (
    <nav className="bg-black border-b border-gold/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => onNavigate('main')} className="hover:opacity-80 transition-opacity">
            <Logo className="h-10 w-10" />
          </button>
          
          <div className="flex items-center gap-6">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  currentPage === item.id
                    ? 'bg-gradient-gold text-black font-bold'
                    : 'text-gold hover:bg-gold/10'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            
            <button className="bg-gradient-red text-white px-6 py-2 rounded-lg font-bold hover:shadow-lg hover:shadow-red/30 transition-all">
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 