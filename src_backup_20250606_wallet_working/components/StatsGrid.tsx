import React from 'react';
import { useQuery } from 'convex/react';
import GlassCard from './GlassCard';
import { api } from '../../convex/_generated/api';

// Format large numbers for display
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// Loading skeleton component
function StatsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <GlassCard key={i}>
          <div className="p-6 text-center">
            <div className="h-8 bg-gray-600/30 rounded mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-600/20 rounded mb-1 animate-pulse"></div>
            <div className="h-3 bg-gray-600/10 rounded animate-pulse"></div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

const StatsGrid: React.FC = () => {
  const systemStats = useQuery(api.analytics.getSystemStats);

  // Show loading skeleton while fetching
  if (!systemStats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <GlassCard key={i}>
            <div className="p-6 text-center">
              <div className="h-8 bg-gray-600/30 rounded mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-600/20 rounded mb-1 animate-pulse"></div>
              <div className="h-3 bg-gray-600/10 rounded animate-pulse"></div>
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-grid">
      <GlassCard className="p-4" data-testid="total-providers">
        <h3 className="text-lg font-semibold mb-2">Total Providers</h3>
        <p className="text-2xl font-bold">{systemStats?.totalProviders || 0}</p>
      </GlassCard>

      <GlassCard className="p-4" data-testid="active-users">
        <h3 className="text-lg font-semibold mb-2">Active Users</h3>
        <p className="text-2xl font-bold">{systemStats?.activeUsers || 0}</p>
      </GlassCard>

      <GlassCard className="p-4" data-testid="prompts-today">
        <h3 className="text-lg font-semibold mb-2">Prompts Today</h3>
        <p className="text-2xl font-bold">{systemStats?.promptsToday || 0}</p>
      </GlassCard>

      <GlassCard className="p-4" data-testid="total-vcu">
        <h3 className="text-lg font-semibold mb-2">Total VCU</h3>
        <p className="text-2xl font-bold">{systemStats?.totalVCU || 0}</p>
      </GlassCard>
    </div>
  );
};

export default StatsGrid;
