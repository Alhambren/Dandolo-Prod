import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { GlassCard } from "./GlassCard";

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

export function StatsGrid() {
  const networkStats = useQuery(api.stats.getNetworkStats);
  
  // Show loading state while fetching real data
  if (!networkStats) {
    return <StatsLoadingSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <GlassCard>
        <div className="p-6 text-center">
          <div className="text-3xl font-bold text-red mb-2">
            {networkStats.totalProviders || 0}
          </div>
          <div className="text-white font-medium mb-1">Venice.ai Providers</div>
          <div className="text-xs text-gray-400">Active compute providers</div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="p-6 text-center">
          <div className="text-3xl font-bold text-gold mb-2">
            {networkStats.activeUsers || 0}
          </div>
          <div className="text-white font-medium mb-1">Active Users</div>
          <div className="text-xs text-gray-400">Users in last 24 hours</div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="p-6 text-center">
          <div className="text-3xl font-bold text-red mb-2">
            {formatNumber(networkStats.promptsToday || 0)}
          </div>
          <div className="text-white font-medium mb-1">Prompts Routed Today</div>
          <div className="text-xs text-gray-400">Anonymous requests processed</div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="p-6 text-center">
          <div className="text-3xl font-bold text-gold mb-2">
            {formatNumber(networkStats.totalVCU || 0)}
          </div>
          <div className="text-white font-medium mb-1">Total VCU Available</div>
          <div className="text-xs text-gray-400">Network compute capacity</div>
        </div>
      </GlassCard>
    </div>
  );
}
