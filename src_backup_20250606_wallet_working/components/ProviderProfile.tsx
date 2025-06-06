import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import GlassCard from "./GlassCard";
import { Id } from "../../convex/_generated/dataModel";

interface ProviderProfileProps {
  providerId: Id<"providers">;
}

export function ProviderProfile({ providerId }: ProviderProfileProps) {
  const provider = useQuery(api.providers.getStats, { providerId });

  if (!provider) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <GlassCard>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{provider.name}</h1>
              <div className="flex items-center space-x-4">
                <span className="text-gray-400 font-mono">{provider.address}</span>
                <button 
                  onClick={() => navigator.clipboard.writeText(provider.address)}
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                >
                  📋 Copy
                </button>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
              provider.isActive 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {provider.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-1">{provider.totalPrompts}</div>
              <div className="text-sm text-gray-400">Total Prompts</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">{provider.uptime.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">{provider.vcuBalance}</div>
              <div className="text-sm text-gray-400">VCU Balance</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-400 mb-1">{provider.points}</div>
              <div className="text-sm text-gray-400">Points Earned</div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Health Status */}
      <GlassCard>
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">Health Status</h3>
          <div className="space-y-4">
            {provider.recentHealthChecks?.slice(0, 5).map((check, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    check.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-white">
                    {new Date(check.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">
                    {check.responseTime ? `${check.responseTime}ms` : 'Failed'}
                  </div>
                  {check.errorMessage && (
                    <div className="text-xs text-red-400">{check.errorMessage}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
