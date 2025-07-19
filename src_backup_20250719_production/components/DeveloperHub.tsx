import { useState, useEffect } from 'react';
import { DeveloperPortal } from './DeveloperPortal';
import { DeveloperDocs } from './DeveloperDocs';

export function DeveloperHub() {
  const [activeView, setActiveView] = useState<'portal' | 'docs'>('portal');
  
  // Handle hash-based navigation
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#portal') {
        setActiveView('portal');
      } else if (window.location.hash === '#docs') {
        setActiveView('docs');
      }
    };
    
    // Check initial hash
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  return (
    <div className="min-h-screen bg-dark-1 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Developer Hub</h1>
          
          {/* View Toggle */}
          <div className="flex bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setActiveView('portal')}
              className={`px-6 py-2 rounded-md transition-colors ${
                activeView === 'portal' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              API Keys
            </button>
            <button
              onClick={() => setActiveView('docs')}
              className={`px-6 py-2 rounded-md transition-colors ${
                activeView === 'docs' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Documentation
            </button>
          </div>
        </div>
        
        {/* Content */}
        {activeView === 'portal' && <DeveloperPortal />}
        {activeView === 'docs' && <DeveloperDocs />}
      </div>
    </div>
  );
}