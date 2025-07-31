import { useState, useEffect } from 'react';
import { DeveloperPortal } from './DeveloperPortal';
import { DeveloperDocs } from './DeveloperDocs';
import { ModelDetailPage } from './ModelDetailPage';

type ViewType = 'portal' | 'docs' | 'model-detail';

export function DeveloperHub() {
  const [activeView, setActiveView] = useState<ViewType>('portal');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  
  // Handle hash-based navigation including model details
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#portal') {
        setActiveView('portal');
        setSelectedModelId(null);
      } else if (hash === '#docs') {
        setActiveView('docs');
        setSelectedModelId(null);
      } else if (hash.startsWith('#model/')) {
        const modelId = hash.replace('#model/', '');
        setSelectedModelId(modelId);
        setActiveView('model-detail');
      }
    };
    
    // Check initial hash
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Function to navigate to model detail page
  const navigateToModel = (modelId: string) => {
    window.location.hash = `#model/${modelId}`;
  };

  // Function to navigate back to models list
  const backToModels = () => {
    window.location.hash = '#docs';
  };
  
  return (
    <div className="min-h-screen bg-dark-1 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Header - Hide when viewing model details */}
        {activeView !== 'model-detail' && (
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">Developer Hub</h1>
            
            {/* View Toggle */}
            <div className="flex bg-white/10 rounded-lg p-1">
              <button
                onClick={() => {
                  setActiveView('portal');
                  window.location.hash = '#portal';
                }}
                className={`px-6 py-2 rounded-md transition-colors ${
                  activeView === 'portal' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                API Keys
              </button>
              <button
                onClick={() => {
                  setActiveView('docs');
                  window.location.hash = '#docs';
                }}
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
        )}
        
        {/* Content */}
        {activeView === 'portal' && <DeveloperPortal />}
        {activeView === 'docs' && <DeveloperDocs onModelSelect={navigateToModel} />}
        {activeView === 'model-detail' && selectedModelId && (
          <ModelDetailPage 
            modelId={selectedModelId} 
            onBackToModels={backToModels}
          />
        )}
      </div>
    </div>
  );
}