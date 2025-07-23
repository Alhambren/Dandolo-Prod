import React, { useState, useEffect } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface MonitoringDashboardProps {
  className?: string;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ className }) => {
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d">("24h");
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const dashboardData = useQuery(api.monitoring.getDashboardData, { 
    timeRange 
  }, `dashboard-${refreshKey}`);
  
  const validationReport = useQuery(api.monitoring.getValidationReport, { 
    hours: timeRange === "1h" ? 1 : timeRange === "6h" ? 6 : timeRange === "24h" ? 24 : 168 
  }, `validation-${refreshKey}`);

  const healthTrends = useQuery(api.monitoring.getHealthTrends, { 
    days: timeRange === "7d" ? 7 : 1 
  }, `trends-${refreshKey}`);


  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical': return 'border-l-red-500 bg-red-50';
      case 'error': return 'border-l-orange-500 bg-orange-50';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  if (!dashboardData) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded mb-4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const { currentStatus, trends, metrics, alerts, summary } = dashboardData;

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6 border-b">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Provider Monitoring Dashboard</h2>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>

        {/* System Status Overview */}
        {currentStatus && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">System Status</h3>
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentStatus.systemStatus)}`}>
                {currentStatus.systemStatus.toUpperCase()}
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Active Providers</h3>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-gray-900">
                  {currentStatus.activeProviders}
                </span>
                <span className="text-sm text-gray-500 ml-1">
                  / {currentStatus.totalProviders}
                </span>
                {trends?.activeProvidersTrend && (
                  <span className={`ml-2 text-sm ${trends.activeProvidersTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trends.activeProvidersTrend >= 0 ? '+' : ''}{trends.activeProvidersTrend}
                  </span>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Success Rate</h3>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-gray-900">
                  {currentStatus.validationSuccessRate.toFixed(1)}%
                </span>
                {trends?.validationSuccessRateTrend && (
                  <span className={`ml-2 text-sm ${trends.validationSuccessRateTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trends.validationSuccessRateTrend >= 0 ? '+' : ''}{trends.validationSuccessRateTrend.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Avg Response Time</h3>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-gray-900">
                  {currentStatus.averageResponseTime}ms
                </span>
                {trends?.responseTimeTrend && (
                  <span className={`ml-2 text-sm ${trends.responseTimeTrend <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trends.responseTimeTrend >= 0 ? '+' : ''}{trends.responseTimeTrend}ms
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        {summary?.lastUpdate && (
          <p className="text-sm text-gray-500">
            Last updated: {formatTimestamp(summary.lastUpdate)}
          </p>
        )}
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Alerts */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Alerts</h3>
            {alerts && alerts.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {alerts.slice(0, 10).map((alert, index) => (
                  <div
                    key={index}
                    className={`border-l-4 p-3 rounded ${getAlertColor(alert.level)}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium capitalize">{alert.level}: </span>
                        <span className="text-sm">{alert.message}</span>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {formatTimestamp(alert.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No recent alerts</p>
            )}
          </div>

          {/* Provider Validation Report */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Provider Status</h3>
            {validationReport ? (
              <div>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Success Rate:</span>
                      <span className="ml-2">{validationReport.summary.overallSuccessRate}%</span>
                    </div>
                    <div>
                      <span className="font-medium">Active:</span>
                      <span className="ml-2">{validationReport.summary.activeProviders}/{validationReport.summary.totalProviders}</span>
                    </div>
                    <div>
                      <span className="font-medium">Successful:</span>
                      <span className="ml-2 text-green-600">{validationReport.summary.successfulValidations}</span>
                    </div>
                    <div>
                      <span className="font-medium">Failed:</span>
                      <span className="ml-2 text-red-600">{validationReport.summary.failedValidations}</span>
                    </div>
                  </div>
                </div>
                
                <div className="max-h-40 overflow-y-auto">
                  {validationReport.providers
                    .filter(p => p.successRate < 100)
                    .slice(0, 5)
                    .map((provider, index) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 rounded bg-gray-50 mb-2">
                      <div>
                        <span className="font-medium text-sm">{provider.providerName}</span>
                        <span className={`ml-2 text-xs px-2 py-1 rounded ${provider.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {provider.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">{provider.successRate.toFixed(1)}%</div>
                        <div className="text-xs text-gray-500">{provider.totalChecks} checks</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Loading validation report...</p>
            )}
          </div>
        </div>

        {/* Metrics Chart Placeholder */}
        {metrics && metrics.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">System Metrics Over Time</h3>
            <div className="bg-gray-50 rounded-lg p-4 h-64 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="mb-2">📊 Metrics Chart</p>
                <p className="text-sm">
                  {metrics.length} data points over {timeRange}
                </p>
                <p className="text-xs mt-2">
                  Latest: {currentStatus && formatTimestamp(currentStatus.timestamp)}
                </p>
                {/* Simple text-based visualization */}
                <div className="mt-4 text-left max-w-md">
                  <div className="text-xs space-y-1">
                    <div>Active Providers: {metrics[metrics.length - 1]?.activeProviders || 'N/A'}</div>
                    <div>Success Rate: {metrics[metrics.length - 1]?.validationSuccessRate?.toFixed(1) || 'N/A'}%</div>
                    <div>Response Time: {metrics[metrics.length - 1]?.averageResponseTime || 'N/A'}ms</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {summary && (
          <div className="mt-6 pt-4 border-t text-sm text-gray-500">
            <div className="grid grid-cols-3 gap-4">
              <div>Metric Points: {summary.totalMetricPoints}</div>
              <div>Critical Alerts: {summary.criticalAlerts}</div>
              <div>Warning Alerts: {summary.warningAlerts}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringDashboard;