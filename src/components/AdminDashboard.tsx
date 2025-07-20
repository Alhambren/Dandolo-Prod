import React, { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { generateSecureToken } from '../../convex/crypto';
import {
  Shield,
  Activity,
  Users,
  Zap,
  AlertTriangle,
  Settings,
  LogOut,
  Eye,
  Server,
  TrendingUp,
  Clock,
  DollarSign
} from 'lucide-react';

// CRITICAL: Hardcoded admin address - matches PRD requirement
const ADMIN_ADDRESS = "0xC07481520d98c32987cA83B30EAABdA673cDbe8c";

interface AdminSession {
  token: string;
  expires: number;
  signature: string;
}

interface SystemMetrics {
  activeNodes: number;
  inferenceVolume: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  systemHealth: number;
  usdBalance: number;
  totalPoints: number;
}

const AdminAuth: React.FC<{ onAuthenticated: (session: AdminSession) => void }> = ({ onAuthenticated }) => {
  const { address, isConnected } = useAccount();
  const { signMessage } = useSignMessage();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (address.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
      setError('Unauthorized wallet address');
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `Dandolo Admin Access - Timestamp: ${timestamp}`;
      
      const signature = await signMessage({ message });
      
      // Create session token (1 hour expiry as per PRD)
      const session: AdminSession = {
        token: `admin_${timestamp}_${generateSecureToken(16)}`,
        expires: Date.now() + (60 * 60 * 1000), // 1 hour
        signature: signature as string
      };

      // Store session in secure storage
      sessionStorage.setItem('dandolo_admin_session', JSON.stringify(session));
      
      onAuthenticated(session);
    } catch (error) {
      setError('Authentication failed');
      console.error('Admin auth error:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 max-w-md w-full">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-yellow-500" />
            <h1 className="text-2xl font-bold text-white">Admin Access</h1>
          </div>
          <p className="text-gray-400 mb-6">Connect your authorized wallet to access the Dandolo.ai Admin Dashboard.</p>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">
              ⚠️ This dashboard is restricted to authorized personnel only.
            </p>
          </div>
          <p className="text-xs text-gray-500">Please connect wallet to continue.</p>
        </div>
      </div>
    );
  }

  if (address?.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-xl border border-red-500/20 max-w-md w-full">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <h1 className="text-2xl font-bold text-white">Unauthorized</h1>
          </div>
          <p className="text-gray-400 mb-4">Access denied for wallet:</p>
          <p className="text-gray-300 font-mono text-sm bg-gray-800 p-3 rounded break-all mb-6">
            {address}
          </p>
          <p className="text-red-400 text-sm">This dashboard is restricted to authorized administrators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-green-500" />
          <h1 className="text-2xl font-bold text-white">Admin Authentication</h1>
        </div>
        <p className="text-gray-400 mb-6">
          Authorized wallet detected. Sign the authentication message to access the dashboard.
        </p>
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
          <p className="text-green-400 text-sm">
            ✓ Wallet verified: {address.substring(0, 6)}...{address.substring(38)}
          </p>
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        <button
          onClick={authenticate}
          disabled={isAuthenticating}
          className="w-full bg-yellow-500 text-black font-semibold py-3 px-4 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAuthenticating ? 'Authenticating...' : 'Sign Authentication Message'}
        </button>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<{ session: AdminSession; onLogout: () => void }> = ({ session, onLogout }) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Auto-logout after 15 minutes of inactivity (PRD requirement)
  useEffect(() => {
    const checkActivity = () => {
      if (Date.now() - lastActivity > 15 * 60 * 1000) {
        onLogout();
      }
    };

    const interval = setInterval(checkActivity, 60000); // Check every minute
    const activityListener = () => setLastActivity(Date.now());
    
    window.addEventListener('mousemove', activityListener);
    window.addEventListener('keypress', activityListener);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', activityListener);
      window.removeEventListener('keypress', activityListener);
    };
  }, [lastActivity, onLogout]);

  // Check session expiry
  useEffect(() => {
    if (Date.now() > session.expires) {
      onLogout();
    }
  }, [session.expires, onLogout]);

  const tabs = [
    { id: 'overview', name: 'System Overview', icon: Activity },
    { id: 'analytics', name: 'Inference Analytics', icon: TrendingUp },
    { id: 'nodes', name: 'Network Topology', icon: Server },
    { id: 'security', name: 'Security Monitor', icon: Eye },
    { id: 'governance', name: 'Protocol Governance', icon: Settings },
    { id: 'financial', name: 'Financial Dashboard', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8 text-yellow-500" />
              <div>
                <h1 className="text-2xl font-bold text-white">DANDOLO.AI SOVEREIGN CONTROL</h1>
                <p className="text-sm text-gray-400">
                  Connected: {ADMIN_ADDRESS.substring(0, 8)}...{ADMIN_ADDRESS.substring(34)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-400">Session expires in</p>
                <p className="text-sm text-white">
                  {Math.max(0, Math.floor((session.expires - Date.now()) / 60000))} min
                </p>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="px-6">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                    selectedTab === tab.id
                      ? 'bg-gray-800 text-yellow-500 border-b-2 border-yellow-500'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {selectedTab === 'overview' && <SystemOverview />}
        {selectedTab === 'analytics' && <InferenceAnalytics />}
        {selectedTab === 'nodes' && <NetworkTopology />}
        {selectedTab === 'security' && <SecurityMonitor />}
        {selectedTab === 'governance' && <ProtocolGovernance />}
        {selectedTab === 'financial' && <FinancialDashboard />}
      </div>
    </div>
  );
};

const SystemOverview: React.FC = () => {
  const { address } = useAccount();
  const systemMetrics = useQuery(
    api.admin.getSystemMetrics, 
    address ? { adminAddress: address } : 'skip'
  );

  if (!systemMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-400">Loading system metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            <h3 className="text-sm font-medium text-gray-400">INFERENCE</h3>
          </div>
          <p className="text-3xl font-bold text-white">{systemMetrics.inferenceVolume.perMinute}</p>
          <p className="text-sm text-gray-400">requests/min</p>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className={`w-6 h-6 ${systemMetrics.systemHealth > 90 ? 'text-green-500' : systemMetrics.systemHealth > 70 ? 'text-yellow-500' : 'text-red-500'}`} />
            <h3 className="text-sm font-medium text-gray-400">SYSTEM HEALTH</h3>
          </div>
          <p className="text-3xl font-bold text-white">{systemMetrics.systemHealth}%</p>
          <p className="text-sm text-gray-400">
            {systemMetrics.systemHealth > 90 ? 'all systems nominal' : 
             systemMetrics.systemHealth > 70 ? 'minor issues detected' : 'critical issues'}
          </p>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Server className="w-6 h-6 text-blue-500" />
            <h3 className="text-sm font-medium text-gray-400">ACTIVE PROVIDERS</h3>
          </div>
          <p className="text-3xl font-bold text-white">{systemMetrics.activeProviders}</p>
          <p className="text-sm text-gray-400">distributed inference</p>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-6 h-6 text-purple-500" />
            <h3 className="text-sm font-medium text-gray-400">BALANCE</h3>
          </div>
          <p className="text-3xl font-bold text-white">${systemMetrics.usdBalance.toFixed(2)}</p>
          <p className="text-sm text-gray-400">Venice.ai credits</p>
        </div>
      </div>

      {/* Live Routing Map Placeholder */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Live Routing Map</h2>
        <div className="h-96 bg-gray-800 rounded-lg flex items-center justify-center">
          <p className="text-gray-400">Network topology visualization will be implemented here</p>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <span className="text-gray-300">Recent Anomalies</span>
            <span className="text-2xl font-bold text-green-500">{systemMetrics.recentAnomalies}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <span className="text-gray-300">Protocol Integrity</span>
            <span className="text-2xl font-bold text-green-500">
              {systemMetrics.protocolIntegrity ? '✓' : '⚠️'}
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <span className="text-gray-300">Anonymity Status</span>
            <span className="text-2xl font-bold text-green-500">{systemMetrics.anonymityStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Placeholder components for other tabs
const InferenceAnalytics: React.FC = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
    <h2 className="text-xl font-bold text-white mb-4">Inference Analytics</h2>
    <p className="text-gray-400">Analytics dashboard coming soon...</p>
  </div>
);

const NetworkTopology: React.FC = () => {
  const { address } = useAccount();
  const networkData = useQuery(
    api.admin.getNetworkTopology,
    address ? { adminAddress: address } : 'skip'
  );

  if (!networkData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-400">Loading network topology...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Routing Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Server className="w-6 h-6 text-blue-500" />
            <h3 className="text-sm font-medium text-gray-400">TOTAL ROUTES</h3>
          </div>
          <p className="text-3xl font-bold text-white">{networkData.routingStats.totalRoutes}</p>
          <p className="text-sm text-gray-400">lifetime requests</p>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-green-500" />
            <h3 className="text-sm font-medium text-gray-400">AVG LATENCY</h3>
          </div>
          <p className="text-3xl font-bold text-white">{networkData.routingStats.averageLatency}ms</p>
          <p className="text-sm text-gray-400">response time</p>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h3 className="text-sm font-medium text-gray-400">FAILED ROUTES</h3>
          </div>
          <p className="text-3xl font-bold text-white">{networkData.routingStats.failedRoutes}</p>
          <p className="text-sm text-gray-400">error rate</p>
        </div>
      </div>

      {/* Provider Network Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Provider Network Status</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Provider</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Address</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Balance</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Prompts Served</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Health Score</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {networkData.providers.map((provider) => (
                <tr key={provider.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-white">{provider.name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-mono text-sm text-gray-400">
                      {provider.address.substring(0, 8)}...{provider.address.substring(34)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      provider.isActive 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {provider.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white">
                    ${(provider.vcuBalance * 0.10).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-white">
                    {provider.totalPrompts}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        provider.healthScore > 80 ? 'bg-green-500' :
                        provider.healthScore > 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-white">{provider.healthScore}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-400 text-sm">
                    {provider.lastActivity 
                      ? new Date(provider.lastActivity).toLocaleDateString()
                      : 'Never'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SecurityMonitor: React.FC = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
    <h2 className="text-xl font-bold text-white mb-4">Security Monitor</h2>
    <p className="text-gray-400">Security monitoring coming soon...</p>
  </div>
);

const ProtocolGovernance: React.FC = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
    <h2 className="text-xl font-bold text-white mb-4">Protocol Governance</h2>
    <p className="text-gray-400">Governance controls coming soon...</p>
  </div>
);

const FinancialDashboard: React.FC = () => {
  const { address } = useAccount();
  const financialData = useQuery(
    api.admin.getFinancialMetrics,
    address ? { adminAddress: address } : 'skip'
  );

  if (!financialData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-400">Loading financial metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-6 h-6 text-purple-500" />
            <h3 className="text-sm font-medium text-gray-400">BALANCE</h3>
          </div>
          <p className="text-3xl font-bold text-white">${financialData.usdBalance.toFixed(2)}</p>
          <p className="text-sm text-gray-400">Venice.ai credits</p>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-red-500" />
            <h3 className="text-sm font-medium text-gray-400">DAILY BURN</h3>
          </div>
          <p className="text-3xl font-bold text-white">{financialData.burnRate.daily}</p>
          <p className="text-sm text-gray-400">USD/day</p>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-yellow-500" />
            <h3 className="text-sm font-medium text-gray-400">DAYS REMAINING</h3>
          </div>
          <p className="text-3xl font-bold text-white">{financialData.budgetProjection.daysRemaining}</p>
          <p className="text-sm text-gray-400">at current burn rate</p>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-6 h-6 text-blue-500" />
            <h3 className="text-sm font-medium text-gray-400">COST/REQUEST</h3>
          </div>
          <p className="text-3xl font-bold text-white">{financialData.costPerInference.toFixed(4)}</p>
          <p className="text-sm text-gray-400">USD per inference</p>
        </div>
      </div>

      {/* Burn Rate Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">USD Burn Rate</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Daily</span>
              <span className="text-white font-semibold">${financialData.burnRate.daily}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Weekly</span>
              <span className="text-white font-semibold">${financialData.burnRate.weekly}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Monthly</span>
              <span className="text-white font-semibold">${financialData.burnRate.monthly}</span>
            </div>
          </div>
          
          {financialData.budgetProjection.recommendedTopup > 0 && (
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="text-yellow-500 font-medium">Budget Alert</span>
              </div>
              <p className="text-sm text-yellow-400">
                Recommended top-up: ${financialData.budgetProjection.recommendedTopup}
              </p>
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Points Distribution</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Distributed</span>
              <span className="text-white font-semibold">{financialData.pointsDistributed.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">This Week</span>
              <span className="text-white font-semibold">{financialData.pointsDistributed.thisWeek.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Rate (per day)</span>
              <span className="text-white font-semibold">{Math.round(financialData.pointsDistributed.distributionRate).toLocaleString()}</span>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-blue-500 font-medium">Points Economy</span>
            </div>
            <p className="text-sm text-blue-400">
              Points are awarded at 1 point per 100 tokens processed
            </p>
          </div>
        </div>
      </div>

      {/* Cost Analysis */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Venice.ai Integration Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500 mb-2">✓</div>
            <div className="text-gray-400 text-sm">API Connection</div>
            <div className="text-white font-medium">Healthy</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500 mb-2">
              {financialData.usdBalance > 100 ? '✓' : '⚠️'}
            </div>
            <div className="text-gray-400 text-sm">Balance Status</div>
            <div className="text-white font-medium">
              {financialData.usdBalance > 100 ? 'Sufficient' : 'Low'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-500 mb-2">{financialData.burnRate.daily}</div>
            <div className="text-gray-400 text-sm">Current Usage</div>
            <div className="text-white font-medium">USD/day</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminDashboardPage: React.FC = () => {
  const [session, setSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    // Check for existing session on mount
    const savedSession = sessionStorage.getItem('dandolo_admin_session');
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession) as AdminSession;
        if (Date.now() < parsedSession.expires) {
          setSession(parsedSession);
        } else {
          sessionStorage.removeItem('dandolo_admin_session');
        }
      } catch {
        sessionStorage.removeItem('dandolo_admin_session');
      }
    }
  }, []);

  const handleAuthenticated = (newSession: AdminSession) => {
    setSession(newSession);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('dandolo_admin_session');
    setSession(null);
  };

  if (!session) {
    return <AdminAuth onAuthenticated={handleAuthenticated} />;
  }

  return <AdminDashboard session={session} onLogout={handleLogout} />;
};

export default AdminDashboardPage;