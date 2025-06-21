import { useState } from 'react';
import { DeveloperPortal } from './DeveloperPortal';
import { DeveloperDocs } from './DeveloperDocs';

export function DeveloperHub() {
  const [activeView, setActiveView] = useState<'portal' | 'docs'>('portal');
  
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