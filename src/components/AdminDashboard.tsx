import React, { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useQuery, useMutation } from 'convex/react';
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
  DollarSign,
  Ban,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserX,
  Database,
  Lock
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

const InferenceAnalytics: React.FC = () => {
  const { address } = useAccount();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [activeTab, setActiveTab] = useState<'queries' | 'users' | 'participants'>('queries');
  
  const queryAnalytics = useQuery(
    api.admin.getQueryAnalytics,
    address ? { adminAddress: address, timeRange } : 'skip'
  );
  const userAnalytics = useQuery(
    api.admin.getUserAnalytics,
    address ? { adminAddress: address, timeRange } : 'skip'
  );
  const networkParticipants = useQuery(
    api.admin.getAllNetworkParticipants,
    address ? { adminAddress: address } : 'skip'
  );

  const timeRangeTabs = [
    { id: '24h', name: '24h' },
    { id: '7d', name: '7d' },
    { id: '30d', name: '30d' },
  ];

  const analyticsTabs = [
    { id: 'queries', name: 'Query Analytics', icon: Activity },
    { id: 'users', name: 'User Analytics', icon: Users },
    { id: 'participants', name: 'All Participants', icon: Server },
  ];

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex space-x-1">
          {analyticsTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </div>

        <div className="flex space-x-1">
          {timeRangeTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeRange(tab.id as any)}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                timeRange === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Query Analytics Tab */}
      {activeTab === 'queries' && queryAnalytics && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">Query Analytics ({timeRange})</h2>
          
          {/* Query Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-6 h-6 text-blue-500" />
                <h3 className="text-sm font-medium text-gray-400">TOTAL QUERIES</h3>
              </div>
              <p className="text-3xl font-bold text-white">{queryAnalytics.totalQueries.toLocaleString()}</p>
              <p className="text-sm text-gray-400">in last {timeRange}</p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className={`w-6 h-6 ${queryAnalytics.successRate >= 95 ? 'text-green-500' : queryAnalytics.successRate >= 90 ? 'text-yellow-500' : 'text-red-500'}`} />
                <h3 className="text-sm font-medium text-gray-400">SUCCESS RATE</h3>
              </div>
              <p className="text-3xl font-bold text-white">{queryAnalytics.successRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-400">completion rate</p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className={`w-6 h-6 ${queryAnalytics.averageResponseTime < 1500 ? 'text-green-500' : queryAnalytics.averageResponseTime < 3000 ? 'text-yellow-500' : 'text-red-500'}`} />
                <h3 className="text-sm font-medium text-gray-400">AVG RESPONSE</h3>
              </div>
              <p className="text-3xl font-bold text-white">{queryAnalytics.averageResponseTime}ms</p>
              <p className="text-sm text-gray-400">response time</p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Database className="w-6 h-6 text-purple-500" />
                <h3 className="text-sm font-medium text-gray-400">TOKENS PROCESSED</h3>
              </div>
              <p className="text-3xl font-bold text-white">{queryAnalytics.totalTokensProcessed.toLocaleString()}</p>
              <p className="text-sm text-gray-400">total tokens</p>
            </div>
          </div>

          {/* Cost Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-6 h-6 text-red-500" />
                <h3 className="text-sm font-medium text-gray-400">TOTAL COST</h3>
              </div>
              <p className="text-3xl font-bold text-white">${queryAnalytics.costMetrics.totalCostUSD}</p>
              <p className="text-sm text-gray-400">USD spent</p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6 text-yellow-500" />
                <h3 className="text-sm font-medium text-gray-400">COST/QUERY</h3>
              </div>
              <p className="text-3xl font-bold text-white">${queryAnalytics.costMetrics.costPerQuery.toFixed(4)}</p>
              <p className="text-sm text-gray-400">average cost</p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-6 h-6 text-green-500" />
                <h3 className="text-sm font-medium text-gray-400">COST/TOKEN</h3>
              </div>
              <p className="text-3xl font-bold text-white">${queryAnalytics.costMetrics.costPerToken.toFixed(6)}</p>
              <p className="text-sm text-gray-400">per token</p>
            </div>
          </div>

          {/* Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Query Types */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Query Type Distribution</h3>
              <div className="space-y-3">
                {Object.entries(queryAnalytics.queryTypes)
                  .sort(([,a], [,b]) => (b as number) - (a as number))
                  .map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-gray-300 capitalize">{type}</span>
                    <span className="text-white font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Usage */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Top Models Used</h3>
              <div className="space-y-3">
                {Object.entries(queryAnalytics.modelUsage)
                  .sort(([,a], [,b]) => (b as number) - (a as number))
                  .slice(0, 8)
                  .map(([model, count]) => (
                  <div key={model} className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">{model}</span>
                    <span className="text-white font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Provider Distribution */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Provider Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(queryAnalytics.providerDistribution)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .map(([provider, count]) => (
                <div key={provider} className="flex justify-between items-center p-3 bg-gray-800 rounded">
                  <span className="text-gray-300">{provider}</span>
                  <span className="text-white font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error Analysis */}
          {queryAnalytics.errorAnalysis.totalErrors > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Error Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="text-2xl font-bold text-red-400">{queryAnalytics.errorAnalysis.totalErrors}</div>
                  <div className="text-sm text-gray-400">Total Errors</div>
                </div>
                <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="text-2xl font-bold text-red-400">{queryAnalytics.errorAnalysis.errorRate.toFixed(2)}%</div>
                  <div className="text-sm text-gray-400">Error Rate</div>
                </div>
                <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <div className="text-2xl font-bold text-yellow-400">{Object.keys(queryAnalytics.errorAnalysis.errorTypes).length}</div>
                  <div className="text-sm text-gray-400">Error Types</div>
                </div>
              </div>
              <div className="space-y-2">
                {Object.entries(queryAnalytics.errorAnalysis.errorTypes).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center p-2 bg-gray-800 rounded">
                    <span className="text-gray-300">{type}</span>
                    <span className="text-red-400 font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Analytics Tab */}
      {activeTab === 'users' && userAnalytics && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">User Analytics ({timeRange})</h2>
          
          {/* User Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-6 h-6 text-blue-500" />
                <h3 className="text-sm font-medium text-gray-400">TOTAL USERS</h3>
              </div>
              <p className="text-3xl font-bold text-white">{userAnalytics.totalUsers}</p>
              <p className="text-sm text-gray-400">all time</p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-6 h-6 text-green-500" />
                <h3 className="text-sm font-medium text-gray-400">ACTIVE USERS</h3>
              </div>
              <p className="text-3xl font-bold text-white">{userAnalytics.activeUsers}</p>
              <p className="text-sm text-gray-400">last {timeRange}</p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <UserX className="w-6 h-6 text-yellow-500" />
                <h3 className="text-sm font-medium text-gray-400">ANONYMOUS</h3>
              </div>
              <p className="text-3xl font-bold text-white">{userAnalytics.anonymousUsers}</p>
              <p className="text-sm text-gray-400">estimated unique</p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-6 h-6 text-purple-500" />
                <h3 className="text-sm font-medium text-gray-400">AUTHENTICATED</h3>
              </div>
              <p className="text-3xl font-bold text-white">{userAnalytics.authenticatedUsers}</p>
              <p className="text-sm text-gray-400">with wallet/keys</p>
            </div>
          </div>

          {/* Usage Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-6 h-6 text-blue-500" />
                <h3 className="text-sm font-medium text-gray-400">TOTAL QUERIES</h3>
              </div>
              <p className="text-3xl font-bold text-white">{userAnalytics.usage.totalQueries}</p>
              <p className="text-sm text-gray-400">in last {timeRange}</p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6 text-green-500" />
                <h3 className="text-sm font-medium text-gray-400">AVG/USER</h3>
              </div>
              <p className="text-3xl font-bold text-white">{userAnalytics.usage.averageQueriesPerUser}</p>
              <p className="text-sm text-gray-400">queries per user</p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-6 h-6 text-yellow-500" />
                <h3 className="text-sm font-medium text-gray-400">PEAK HOUR</h3>
              </div>
              <p className="text-3xl font-bold text-white">{Math.max(...userAnalytics.usage.queriesPerHour.map(h => h.count))}</p>
              <p className="text-sm text-gray-400">queries/hour</p>
            </div>
          </div>

          {/* Top Users Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Top Active Users</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Queries</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Points</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {userAnalytics.topUsers.slice(0, 15).map((user, index) => (
                    <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div className="font-mono text-sm text-white">{user.address}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.userType === 'developer' ? 'bg-blue-500/20 text-blue-400' :
                          user.userType === 'authenticated' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {user.userType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white">{user.totalQueries}</td>
                      <td className="py-3 px-4 text-yellow-400">{user.totalPoints.toLocaleString()}</td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Network Participants Tab */}
      {activeTab === 'participants' && networkParticipants && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">All Network Participants</h2>
          
          {/* Network Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Server className="w-6 h-6 text-blue-500" />
                <h3 className="text-sm font-medium text-gray-400">PROVIDERS</h3>
              </div>
              <p className="text-3xl font-bold text-white">{networkParticipants.summary.totalProviders}</p>
              <p className="text-sm text-gray-400">{networkParticipants.summary.activeProviders} active</p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-6 h-6 text-green-500" />
                <h3 className="text-sm font-medium text-gray-400">USERS</h3>
              </div>
              <p className="text-3xl font-bold text-white">{networkParticipants.summary.totalUsers}</p>
              <p className="text-sm text-gray-400">registered</p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="w-6 h-6 text-yellow-500" />
                <h3 className="text-sm font-medium text-gray-400">API KEYS</h3>
              </div>
              <p className="text-3xl font-bold text-white">{networkParticipants.summary.totalApiKeys}</p>
              <p className="text-sm text-gray-400">issued</p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className={`w-6 h-6 ${networkParticipants.summary.networkHealth >= 90 ? 'text-green-500' : networkParticipants.summary.networkHealth >= 70 ? 'text-yellow-500' : 'text-red-500'}`} />
                <h3 className="text-sm font-medium text-gray-400">NETWORK HEALTH</h3>
              </div>
              <p className="text-3xl font-bold text-white">{networkParticipants.summary.networkHealth}%</p>
              <p className="text-sm text-gray-400">overall</p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-purple-500" />
                <h3 className="text-sm font-medium text-gray-400">ACTIVE PROVIDERS</h3>
              </div>
              <p className="text-3xl font-bold text-white">{networkParticipants.summary.activeProviders}</p>
              <p className="text-sm text-gray-400">serving requests</p>
            </div>
          </div>

          {/* Complete Providers Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">All Providers ({networkParticipants.providers.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Provider</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">VCU Balance</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Prompts</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Points</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Uptime</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Registration</th>
                  </tr>
                </thead>
                <tbody>
                  {networkParticipants.providers.map((provider, index) => (
                    <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{provider.name}</div>
                        <div className="text-gray-400 text-xs font-mono">{`${provider.address.substring(0, 8)}...${provider.address.substring(provider.address.length - 6)}`}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          provider.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {provider.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-green-400">{provider.vcuBalance.toFixed(2)}</td>
                      <td className="py-3 px-4 text-white">{provider.totalPrompts.toLocaleString()}</td>
                      <td className="py-3 px-4 text-yellow-400">{provider.points.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={`${
                          provider.uptime >= 99 ? 'text-green-400' :
                          provider.uptime >= 95 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {provider.uptime.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {provider.registrationDate ? new Date(provider.registrationDate).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

const SecurityMonitor: React.FC = () => {
  const [selectedSubTab, setSelectedSubTab] = useState('overview');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState(40); // Default minimum risk score

  // Fetch security data
  const suspiciousProviders = useQuery(api.providers.getSuspiciousProviders, { 
    minRiskScore: selectedRiskLevel 
  });
  const clusteringAnalytics = useQuery(api.providers.getProviderClusteringAnalytics, {});
  
  // Mutation for updating verification status
  const updateVerificationStatus = useMutation(api.providers.updateProviderVerificationStatus);

  const handleStatusUpdate = async (providerId: string, newStatus: string, reason?: string) => {
    try {
      await updateVerificationStatus({
        providerId: providerId as any,
        newStatus: newStatus as any,
        reason
      });
    } catch (error) {
      console.error('Failed to update verification status:', error);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'verified': return 'text-green-400 bg-green-500/20';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'flagged': return 'text-red-400 bg-red-500/20';
      case 'suspended': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const securityTabs = [
    { id: 'overview', name: 'Security Overview', icon: Shield },
    { id: 'providers', name: 'Suspicious Providers', icon: UserX },
    { id: 'clusters', name: 'Clustering Analysis', icon: Database },
    { id: 'fingerprints', name: 'Fingerprint Monitor', icon: Lock }
  ];

  return (
    <div className="space-y-6">
      {/* Security Sub-Navigation */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex space-x-1 mb-6">
          {securityTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedSubTab === tab.id
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Security Overview */}
        {selectedSubTab === 'overview' && clusteringAnalytics && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Anti-Gaming Security Overview</h2>
            
            {/* Key Security Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-gray-400">TOTAL PROVIDERS</span>
                </div>
                <p className="text-2xl font-bold text-white">{clusteringAnalytics.totalProviders}</p>
                <p className="text-sm text-gray-400">in network</p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium text-gray-400">HIGH RISK</span>
                </div>
                <p className="text-2xl font-bold text-red-400">{clusteringAnalytics.riskDistribution.high}</p>
                <p className="text-sm text-gray-400">providers flagged</p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Database className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-400">CLUSTERS</span>
                </div>
                <p className="text-2xl font-bold text-yellow-400">
                  {clusteringAnalytics.summary.totalSuspiciousClusters}
                </p>
                <p className="text-sm text-gray-400">suspicious groups</p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Ban className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-medium text-gray-400">SUSPENDED</span>
                </div>
                <p className="text-2xl font-bold text-purple-400">
                  {clusteringAnalytics.verificationStatusDistribution.suspended}
                </p>
                <p className="text-sm text-gray-400">manually blocked</p>
              </div>
            </div>

            {/* Risk Distribution Chart */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Risk Score Distribution</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {clusteringAnalytics.riskDistribution.low}
                  </div>
                  <div className="text-sm text-gray-400">Low Risk (0-39)</div>
                  <div className="text-xs text-green-400">Verified providers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-2">
                    {clusteringAnalytics.riskDistribution.medium}
                  </div>
                  <div className="text-sm text-gray-400">Medium Risk (40-69)</div>
                  <div className="text-xs text-yellow-400">Under review</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400 mb-2">
                    {clusteringAnalytics.riskDistribution.high}
                  </div>
                  <div className="text-sm text-gray-400">High Risk (70+)</div>
                  <div className="text-xs text-red-400">Flagged for gaming</div>
                </div>
              </div>
            </div>

            {/* Verification Status Overview */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Verification Status Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="text-lg font-bold text-white">
                      {clusteringAnalytics.verificationStatusDistribution.verified}
                    </div>
                    <div className="text-sm text-gray-400">Verified</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div>
                    <div className="text-lg font-bold text-white">
                      {clusteringAnalytics.verificationStatusDistribution.pending}
                    </div>
                    <div className="text-sm text-gray-400">Pending</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="text-lg font-bold text-white">
                      {clusteringAnalytics.verificationStatusDistribution.flagged}
                    </div>
                    <div className="text-sm text-gray-400">Flagged</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="text-lg font-bold text-white">
                      {clusteringAnalytics.verificationStatusDistribution.suspended}
                    </div>
                    <div className="text-sm text-gray-400">Suspended</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Suspicious Providers Tab */}
        {selectedSubTab === 'providers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Suspicious Providers</h2>
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-400">Min Risk Score:</label>
                <select
                  value={selectedRiskLevel}
                  onChange={(e) => setSelectedRiskLevel(Number(e.target.value))}
                  className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-1"
                >
                  <option value={20}>20+ (Very Low)</option>
                  <option value={40}>40+ (Medium)</option>
                  <option value={60}>60+ (High)</option>
                  <option value={70}>70+ (Very High)</option>
                </select>
              </div>
            </div>

            {suspiciousProviders && (
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Provider</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Address</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Risk Score</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Risk Factors</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suspiciousProviders.map((provider) => (
                        <tr key={provider._id} className="border-b border-gray-800 hover:bg-gray-700/50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{provider.name}</div>
                            <div className="text-sm text-gray-400">
                              Registered: {new Date(provider.registrationDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-sm text-gray-400">
                              {provider.address.substring(0, 8)}...{provider.address.substring(34)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className={`text-lg font-bold ${getRiskColor(provider.riskScore || 0)}`}>
                              {provider.riskScore || 0}
                            </div>
                            <div className="text-xs text-gray-400">/ 100</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(provider.verificationStatus)}`}>
                              {provider.verificationStatus || 'unknown'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-300 max-w-xs">
                              {provider.flaggedReason || 'No specific reasons recorded'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleStatusUpdate(provider._id, 'verified', 'Manually verified by admin')}
                                className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(provider._id, 'flagged', 'Flagged for review by admin')}
                                className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                              >
                                Flag
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(provider._id, 'suspended', 'Suspended by admin for policy violation')}
                                className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded hover:bg-gray-500/30"
                              >
                                Suspend
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {suspiciousProviders.length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    No suspicious providers found with risk score ≥ {selectedRiskLevel}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Clustering Analysis Tab */}
        {selectedSubTab === 'clusters' && clusteringAnalytics && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Provider Clustering Analysis</h2>
            
            {/* Fingerprint Clusters */}
            {clusteringAnalytics.suspiciousClusters.fingerprint.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  🔍 Fingerprint Clusters ({clusteringAnalytics.suspiciousClusters.fingerprint.length})
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Groups of providers with identical behavioral fingerprints (likely same user)
                </p>
                <div className="space-y-4">
                  {clusteringAnalytics.suspiciousClusters.fingerprint.map((cluster, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-yellow-400 font-medium">
                          Cluster {index + 1} - {cluster.providerCount} providers
                        </span>
                        <span className="text-sm text-gray-400">Hash: {cluster.hash}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cluster.providers.map((provider, providerIndex) => (
                          <div key={providerIndex} className="bg-gray-600 rounded p-3">
                            <div className="font-medium text-white">{provider.name}</div>
                            <div className="text-sm text-gray-300">
                              {provider.address.substring(0, 8)}...{provider.address.substring(34)}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-1 rounded ${provider.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {provider.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <span className={`text-xs ${getRiskColor(provider.riskScore || 0)}`}>
                                Risk: {provider.riskScore || 0}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IP Clusters */}
            {clusteringAnalytics.suspiciousClusters.ip.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  🌐 IP Address Clusters ({clusteringAnalytics.suspiciousClusters.ip.length})
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Multiple providers registered from the same IP address
                </p>
                <div className="space-y-4">
                  {clusteringAnalytics.suspiciousClusters.ip.map((cluster, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-orange-400 font-medium">
                          IP Cluster {index + 1} - {cluster.providerCount} providers
                        </span>
                        <span className="text-sm text-gray-400">Hash: {cluster.hash}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cluster.providers.map((provider, providerIndex) => (
                          <div key={providerIndex} className="bg-gray-600 rounded p-3">
                            <div className="font-medium text-white">{provider.name}</div>
                            <div className="text-sm text-gray-300">
                              {provider.address.substring(0, 8)}...{provider.address.substring(34)}
                            </div>
                            <div className="text-xs text-gray-400">
                              Registered: {new Date(provider.registrationDate).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Agent Clusters */}
            {clusteringAnalytics.suspiciousClusters.userAgent.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  🖥️ User Agent Clusters ({clusteringAnalytics.suspiciousClusters.userAgent.length})
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Multiple providers with identical browser/device signatures
                </p>
                <div className="space-y-4">
                  {clusteringAnalytics.suspiciousClusters.userAgent.map((cluster, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-blue-400 font-medium">
                          User Agent Cluster {index + 1} - {cluster.providerCount} providers
                        </span>
                        <span className="text-sm text-gray-400">Hash: {cluster.hash}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cluster.providers.map((provider, providerIndex) => (
                          <div key={providerIndex} className="bg-gray-600 rounded p-3">
                            <div className="font-medium text-white">{provider.name}</div>
                            <div className="text-sm text-gray-300">
                              {provider.address.substring(0, 8)}...{provider.address.substring(34)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Clusters Found */}
            {clusteringAnalytics.summary.totalSuspiciousClusters === 0 && (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Suspicious Clusters Detected</h3>
                <p className="text-gray-400">
                  All providers appear to have unique fingerprints, IP addresses, and user agents.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Fingerprint Monitor Tab */}
        {selectedSubTab === 'fingerprints' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Fingerprint Monitor</h2>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Fingerprinting Technology</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-white mb-3">Detection Methods</h4>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      IP Address Clustering
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      User Agent Fingerprinting
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      API Key Pattern Analysis
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Registration Timing Patterns
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Behavioral Fingerprinting
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-3">Privacy Protection</h4>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-500" />
                      All data hashed before storage
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-500" />
                      No raw IP addresses stored
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-500" />
                      No personal identifiers
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-500" />
                      Secure fingerprint algorithms
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-500" />
                      GDPR compliant design
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Risk Scoring Algorithm</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                  <span className="text-gray-300">Fingerprint Collision</span>
                  <span className="text-red-400 font-medium">+50 points</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                  <span className="text-gray-300">IP Clustering (3+ providers)</span>
                  <span className="text-orange-400 font-medium">+30 points</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                  <span className="text-gray-300">User Agent Clustering (4+ providers)</span>
                  <span className="text-yellow-400 font-medium">+20 points</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                  <span className="text-gray-300">Rapid Registration (6+ today)</span>
                  <span className="text-blue-400 font-medium">+25 points</span>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="text-blue-400 font-medium mb-2">Scoring Thresholds</h4>
                <div className="text-sm text-gray-400 space-y-1">
                  <div>• 0-39: Verified (Low Risk)</div>
                  <div>• 40-69: Pending Review (Medium Risk)</div>
                  <div>• 70+: Flagged (High Risk - Likely Gaming)</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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