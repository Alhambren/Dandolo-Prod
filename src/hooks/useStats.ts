import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export const useStats = () => {
  const networkStats = useQuery(api.stats.getNetworkStats);
  const nextEpoch = useQuery(api.epochs.getNextEpoch);
  const topProviders = useQuery(api.providers.getTopProviders, { limit: 5 });

  return {
    stats: networkStats,
    nextEpoch,
    topProviders,
    isLoading: !networkStats || !nextEpoch || !topProviders,
    error: null // Convex handles errors internally
  };
}; 