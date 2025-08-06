import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import GlassCard from './GlassCard';
import { ModelDetailPage } from './ModelDetailPage';

export default function ModelsPage() {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const availableModels = useQuery(api.models.getAvailableModels);
  // Use the correct analytics function that actually exists
  const usageMetrics = useQuery(api.analytics.getModelUsageStats);

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
            {availableModels.map((model: any) => (
              <div
                key={model.id}
                onClick={() => setSelectedModelId(model.id)}
                className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer border border-gray-700 hover:border-blue-500"
              >
                <div className="flex flex-col space-y-2">
                  <code className="text-sm text-blue-400 font-medium">{model.id}</code>
                  {model.name && model.name !== model.id && (
                    <span className="text-gray-300 text-sm">{model.name}</span>
                  )}
                  {model.type && (
                    <span className="px-2 py-1 bg-gray-700 text-xs rounded-full w-fit">
                      {model.type}
                    </span>
                  )}
                  {model.contextLength && (
                    <span className="text-gray-400 text-xs">
                      Context: {model.contextLength.toLocaleString()} tokens
                    </span>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-400 text-xs">
                      Used: {usageMetrics?.modelUsage?.[model.id] || 0} times
                    </span>
                    {(usageMetrics?.modelUsage?.[model.id] || 0) > 0 && (
                      <span className="text-green-400 text-xs">●</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}