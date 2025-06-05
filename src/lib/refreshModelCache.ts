import { api } from "../../convex/_generated/api";
import { useAction, useQuery } from "convex/react";

export async function refreshModelCache() {
  try {
    const response = await fetch('https://api.venice.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.VENICE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Venice API error: ${response.statusText}`);
    }

    const models = await response.json();
    
    // Update the cache in Convex
    const mutation = api.models.updateModelCache;
    await mutation({
      models: models.map((model: any) => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        status: model.status,
        capabilities: model.capabilities,
        lastUpdated: Date.now(),
      })),
    });

    return models;
  } catch (error) {
    console.error('Failed to refresh model cache:', error);
    throw error;
  }
}

export function useModelCache() {
  const refreshCache = useAction(api.models.refreshModelCache);
  const models = useQuery(api.models.getAvailableModels);

  return {
    models,
    refreshCache,
  };
} 