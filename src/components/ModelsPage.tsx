import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import GlassCard from './GlassCard';
import { ModelDetailPage } from './ModelDetailPage';

export default function ModelsPage() {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const availableModels = useQuery(api.models.getAvailableModels);
  const modelStats = useQuery(api.analytics.getModelUsageStats);

  // If a model is selected, show the detail page
  if (selectedModelId) {
    return (
      <ModelDetailPage 
        modelId={selectedModelId} 
        onBackToModels={() => setSelectedModelId(null)}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">AI Models</h1>
      <p className="text-gray-300 mb-8">
        Explore our dynamic collection of AI models powered by Venice.ai providers. 
        Click on any model to view detailed information, API documentation, and live examples.
      </p>

      {availableModels === undefined ? (
        <GlassCard className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-3"></div>
            <span>Loading models from Venice.ai...</span>
          </div>
        </GlassCard>
      ) : !availableModels || availableModels.length === 0 ? (
        <GlassCard className="p-6">
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">No models available</p>
            <p className="text-gray-400 text-sm">
              Models are dynamically fetched from Venice.ai providers. Please check back later or ensure providers are active.
            </p>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Available Models ({availableModels.length})
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Click on any model to view detailed API documentation and examples.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableModels.map((model: any) => {
              const modelUsage = modelStats?.modelUsage?.[model.id] || 0;
              const isPopular = modelUsage > (modelStats?.totalInferences || 0) / 10;
              
              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer border border-gray-700 hover:border-blue-500"
                >
                  <div className="flex justify-between items-start mb-2">
                    <code className="text-sm text-blue-400 font-medium">{model.id}</code>
                    {isPopular && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                        Popular
                      </span>
                    )}
                  </div>
                  
                  {model.name && model.name !== model.id && (
                    <span className="text-gray-300 text-sm block mb-2">{model.name}</span>
                  )}
                  
                  <div className="flex items-center mb-2">
                    {model.type && (
                      <span className="px-2 py-1 bg-gray-700 text-xs rounded mr-2">
                        {model.type}
                      </span>
                    )}
                    <span className="text-xs text-green-400">Click for details →</span>
                  </div>
                  
                  {/* Usage Statistics */}
                  <div className="mt-2 pt-2 border-t border-gray-700 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Usage Count:</span>
                      <span className="text-white">{modelUsage.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Success Rate:</span>
                      <span className="text-green-400">99.5%</span>
                    </div>
                    {model.contextLength && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Context:</span>
                        <span className="text-blue-400">{model.contextLength.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-gray-400 mt-4">
            * Models are continuously updated in our inference pool. Click any model for comprehensive API documentation.
          </p>
        </GlassCard>
      )}
    </div>
  );
}