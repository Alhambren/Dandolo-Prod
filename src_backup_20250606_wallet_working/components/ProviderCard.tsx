import GlassCard from "./GlassCard";
import { motion } from "framer-motion";

interface Provider {
  _id: string;
  name: string;
  address: string;
  uptime: number;
  totalPrompts: number;
  vcuBalance: number;
  isActive: boolean;
  lastHealthCheck?: number;
}

interface ProviderCardProps {
  provider: Provider;
  rank?: number;
  onClick?: () => void;
}

export function ProviderCard({ provider, rank, onClick }: ProviderCardProps) {
  const getStatusColor = (uptime: number) => {
    if (uptime >= 95) return "text-gold";
    if (uptime >= 80) return "text-gold";
    return "text-red";
  };

  const getStatusBg = (uptime: number) => {
    if (uptime >= 95) return "bg-gold/20 border-gold/30";
    if (uptime >= 80) return "bg-gold/20 border-gold/30";
    return "bg-red/20 border-red/30";
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <GlassCard>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {rank && (
                <div className="w-8 h-8 bg-gradient-to-r from-red to-gold rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {rank}
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-white">{provider.name}</h3>
                <p className="text-sm text-gray-400 font-mono">
                  {provider.address.substring(0, 8)}...{provider.address.substring(-6)}
                </p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBg(provider.uptime)}`}>
              {provider.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className={`text-xl font-bold ${getStatusColor(provider.uptime)}`}>
                {provider.uptime.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red">{provider.totalPrompts}</div>
              <div className="text-xs text-gray-400">Prompts</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gold">{provider.vcuBalance}</div>
              <div className="text-xs text-gray-400">VCU</div>
            </div>
          </div>

          {/* Uptime Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                provider.uptime > 95 ? 'bg-gold' :
                provider.uptime > 80 ? 'bg-gold' : 'bg-red'
              }`}
              style={{ width: `${provider.uptime}%` }}
            />
          </div>

          {provider.lastHealthCheck && (
            <div className="text-xs text-gray-500 mt-2 text-center">
              Last check: {new Date(provider.lastHealthCheck).toLocaleTimeString()}
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
