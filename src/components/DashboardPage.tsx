import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { GlassCard } from "./GlassCard";

export function DashboardPage() {
  const userStats = useQuery(api.analytics.getSystemStats);

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-red bg-clip-text text-transparent">
        Dashboard
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <GlassCard>
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">Usage Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Daily Prompts:</span>
                <span className="text-gold">{userStats?.promptsToday || 0}/50</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Prompts:</span>
                <span className="text-gold">{userStats?.totalPrompts || 0}</span>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">Wallet Balance</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">VCU Balance:</span>
                <span className="text-gold">{userStats?.totalVCU || 0} VCU</span>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">System Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Active Providers:</span>
                <span className="text-gold">{userStats?.activeProviders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">System Health:</span>
                <span className="text-green-400">Healthy</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
} 