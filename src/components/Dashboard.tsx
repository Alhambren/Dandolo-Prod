import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAccount } from 'wagmi';
import GlassCard from "./GlassCard";
import { WalletConnectButton } from "./WalletConnectButton";
import { useState } from "react";
import { toast } from "sonner";
import { StatCard, EmptyState } from "./ZeroState";

const Dashboard: React.FC = () => {
  const { address } = useAccount();
  const [isValidating, setIsValidating] = useState(false);
  const [apiKey, setApiKey] = useState('');
  
  // Queries
  const userStats = useQuery(api.userPoints.getUserStats, address ? { address } : "skip");
  const userPoints = useQuery(api.userPoints.getUserPoints, address ? { address } : "skip");
  const generateApiKey = useMutation(api.developers.generateApiKey);
  const rateLimitStatus = useQuery(api.rateLimit.getRateLimitStatus, address ? { address } : "skip");
  const validateVeniceKey = useAction(api.providers.validateVeniceApiKey);
  const networkStats = useQuery(api.stats.getNetworkStats, {});
  const providers = useQuery(api.providers.listActive, {});

  const handleApiKeyGeneration = async () => {
    if (!address) return;
    try {
      const result = await generateApiKey({ address, name: "Default API Key" });
      setApiKey(result);
      toast.success("API key generated successfully!");
    } catch (error) {
      toast.error("Failed to generate API key");
    }
  };

  const handleVeniceKeyValidation = async (apiKey: string) => {
    try {
      const result = await validateVeniceKey({ apiKey });
      if (result.isValid) {
        toast.success("Venice API key is valid!");
      } else {
        toast.error("Invalid Venice API key");
      }
    } catch (error) {
      toast.error("Failed to validate Venice API key");
    }
  };

  const validateAndRegister = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsValidating(true);
    try {
      // Validate Venice API key
      const validation = await validateVeniceKey({ apiKey });
      
      if (!validation.isValid) {
        toast.error(`Invalid API key: ${validation.error}`);
        return;
      }
      
      // Register as provider with validated key
      toast.success(`Verified! Contributing ${validation.balance} VCU to the network`);
      setIsValidating(false);
    } catch (error) {
      toast.error("Failed to validate API key");
    }
  };

  if (!address) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-red bg-clip-text text-transparent mb-4">
            Personal Dashboard
          </h1>
          <p className="text-gray-300">Connect your wallet to view your personal data and become a provider</p>
        </div>

        <GlassCard>
          <div className="p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-red to-gold rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-3xl">👛</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              Connect your wallet to access your personal dashboard and register as a provider.
            </p>
            <WalletConnectButton />
          </div>
        </GlassCard>
      </div>
    );
  }

  if (!networkStats || !providers) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-500 border-t-neutral-200"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          value={networkStats?.activeProviders || 0}
          label="Active Providers"
          subtitle={networkStats?.activeProviders ? "Online compute nodes" : "Waiting for providers"}
          accentClass="text-green-400"
          tooltip="The network is not live yet; these numbers will update automatically as providers join."
        />
        <StatCard
          value={networkStats?.totalVCU || 0}
          label="Total VCU"
          subtitle={networkStats?.totalVCU ? "Network capacity" : "Waiting for providers"}
          accentClass="text-blue-400"
          tooltip="The network is not live yet; these numbers will update automatically as providers join."
        />
        <StatCard
          value={networkStats?.totalPrompts || 0}
          label="Total Prompts"
          subtitle={networkStats?.totalPrompts ? "Requests processed" : "Waiting for providers"}
          accentClass="text-purple-400"
          tooltip="The network is not live yet; these numbers will update automatically as providers join."
        />
        <StatCard
          value={networkStats?.networkUptime || 0}
          label="Network Uptime"
          subtitle={networkStats?.networkUptime ? "Average availability" : "Waiting for providers"}
          accentClass="text-yellow-400"
          tooltip="The network is not live yet; these numbers will update automatically as providers join."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Top Providers</h2>
            <a
              href="/providers"
              className={`text-sm text-neutral-400 transition-colors hover:text-neutral-200 ${
                providers.length === 0 ? "pointer-events-none opacity-40" : ""
              }`}
            >
              View All →
            </a>
          </div>
          {providers.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-500">
              No providers yet — you could be the first!
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {providers.slice(0, 5).map((provider) => (
                <div
                  key={provider._id}
                  className="flex items-center justify-between rounded-lg bg-neutral-900/60 p-4"
                >
                  <div>
                    <h3 className="font-medium">{provider.name}</h3>
                    <p className="text-sm text-neutral-400">
                      {provider.totalPrompts} prompts
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-400">
                      {provider.vcuBalance} VCU
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default Dashboard;
