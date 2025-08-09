import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { TrendingUp, TrendingDown, Zap, Clock, BarChart3, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

// Glass card component for consistent styling
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 ${className}`}>
      {children}
    </div>
  );
}

// Model rank card component
function ModelRankCard({ 
  rank, 
  model, 
  showChange = false 
}: { 
  rank: number; 
  model: any; 
  showChange?: boolean;
}) {
  const formatLatency = (ms: number) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${Math.round(ms)}ms`;
  };

  return (
    <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-lg transition-colors border-b border-white/10 last:border-b-0">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
          {rank}
        </div>
        <div>
          <h3 className="text-white font-medium">{model.modelId}</h3>
          <p className="text-gray-400 text-sm capitalize">{model.category}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6 text-sm">
        <div className="text-right">
          <p className="text-white font-medium">{model.totalRequests.toLocaleString()}</p>
          <p className="text-gray-400">requests</p>
        </div>
        <div className="text-right">
          <p className="text-white font-medium">{model.totalTokens.toLocaleString()}</p>
          <p className="text-gray-400">tokens</p>
        </div>
        <div className="text-right">
          <p className="text-green-400 font-medium">{model.marketShare.toFixed(1)}%</p>
          <p className="text-gray-400">share</p>
        </div>
        <div className="text-right">
          <p className="text-blue-400 font-medium">{formatLatency(model.avgLatency)}</p>
          <p className="text-gray-400">latency</p>
        </div>
        {showChange && (
          <div className="text-right flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-medium">+12%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Trending model card
function TrendingCard({ model, rank }: { model: any; rank: number }) {
  const getGrowthColor = (rate: number) => {
    if (rate > 50) return 'text-green-400';
    if (rate > 0) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getGrowthIcon = (rate: number) => {
    return rate > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  return (
    <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-lg transition-colors">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
          {rank}
        </div>
        <div>
          <h3 className="text-white font-medium">{model.modelId}</h3>
          <p className="text-gray-400 text-sm capitalize">{model.category}</p>
          {model.isNew && <span className="inline-block px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full mt-1">NEW</span>}
        </div>
      </div>
      
      <div className="flex items-center gap-6 text-sm">
        <div className="text-right">
          <p className="text-white font-medium">{model.thisWeekUsage}</p>
          <p className="text-gray-400">this week</p>
        </div>
        <div className="text-right">
          <p className="text-white font-medium">{model.lastWeekUsage}</p>
          <p className="text-gray-400">last week</p>
        </div>
        <div className={`text-right flex items-center gap-1 ${getGrowthColor(model.growthRate)}`}>
          {getGrowthIcon(model.growthRate)}
          <span className="font-medium">{model.growthRate > 0 ? '+' : ''}{model.growthRate.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

// Category filter component
function CategoryFilter({ selectedCategory, onCategoryChange }: { 
  selectedCategory: string; 
  onCategoryChange: (category: string) => void;
}) {
  const categories = [
    { id: 'all', name: 'All Models', icon: BarChart3 },
    { id: 'text', name: 'Text', icon: Zap },
    { id: 'code', name: 'Code', icon: Zap },
    { id: 'image', name: 'Image', icon: Zap },
    { id: 'multimodal', name: 'Multimodal', icon: Zap },
    { id: 'audio', name: 'Audio', icon: Zap },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const Icon = category.icon;
        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              selectedCategory === category.id
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon className="w-4 h-4" />
            {category.name}
          </button>
        );
      })}
    </div>
  );
}

// Timeframe selector
function TimeframeSelector({ selectedTimeframe, onTimeframeChange }: {
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
}) {
  const timeframes = [
    { id: 'today', name: 'Today' },
    { id: 'week', name: 'This Week' },
    { id: 'month', name: 'This Month' },
    { id: 'all', name: 'All Time' },
  ];

  return (
    <div className="flex rounded-lg bg-white/5 p-1">
      {timeframes.map((timeframe) => (
        <button
          key={timeframe.id}
          onClick={() => onTimeframeChange(timeframe.id)}
          className={`px-4 py-2 rounded-md text-sm transition-colors ${
            selectedTimeframe === timeframe.id
              ? 'bg-white/10 text-white font-medium'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {timeframe.name}
        </button>
      ))}
    </div>
  );
}

export default function RankingsPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('leaderboard');

  // Use new stacked area chart analytics
  const stackedData = useQuery(api.analytics.getStackedModelUsage, { 
    days: selectedTimeframe === 'today' ? 7 : selectedTimeframe === 'week' ? 14 : selectedTimeframe === 'month' ? 30 : 14 
  });
  const modelData = useQuery(api.analytics.getModelUsageStats);
  const systemStats = useQuery(api.analytics.getSystemStats);
  
  // Process stacked area chart data
  const stackedChartData = React.useMemo(() => {
    if (!stackedData) return null;
    
    // Transform time series data for Recharts stacked area chart
    const chartData = stackedData.timeSeriesData.map(point => {
      const dataPoint: any = {
        date: point.date,
        timestamp: point.timestamp,
        total: point.totalTokens
      };
      
      // Add each model as a separate property for stacking
      stackedData.topModels.forEach(model => {
        dataPoint[model] = point.models[model] || 0;
      });
      
      // Add others category
      const othersValue = point.totalTokens - stackedData.topModels.reduce((sum, model) => sum + (point.models[model] || 0), 0);
      if (othersValue > 0) {
        dataPoint['Others'] = othersValue;
      }
      
      return dataPoint;
    });
    
    return {
      chartData,
      legendData: stackedData.legendData,
      totalTokens: stackedData.totalTokens,
      dateRange: stackedData.dateRange,
      topModels: stackedData.topModels
    };
  }, [stackedData]);

  // Keep existing model chart data for rankings table
  const modelChartData = React.useMemo(() => {
    if (!modelData || !stackedChartData) return null;
    
    const baseModels = modelData.topModels;
    
    // Use data from stacked chart for consistency
    const models = baseModels.map(model => {
      const legendEntry = stackedChartData.legendData.find(l => l.name === model.model);
      return {
        name: model.model,
        requests: model.count,
        tokens: legendEntry?.value || model.count * 1500,
        marketShare: legendEntry?.percentage || 0
      };
    });
    
    models.sort((a, b) => b.tokens - a.tokens);
    
    return {
      timeframe: selectedTimeframe,
      models: models.slice(0, 10),
      totalRequests: modelData.totalInferences,
      totalTokens: stackedChartData.totalTokens,
      periodStart: Date.now() - (selectedTimeframe === 'today' ? 24 * 60 * 60 * 1000 : 
                                 selectedTimeframe === 'week' ? 7 * 24 * 60 * 60 * 1000 : 
                                 30 * 24 * 60 * 60 * 1000),
      periodEnd: Date.now()
    };
  }, [modelData, selectedTimeframe, stackedChartData]);

  const tabs = [
    { id: 'leaderboard', name: 'Leaderboard', icon: BarChart3 },
    { id: 'trending', name: 'Trending', icon: TrendingUp },
    { id: 'categories', name: 'Categories', icon: Filter },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-1 via-dark-2 to-dark-3 text-white">
      <div className="container mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">
            Model Rankings
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Live statistics and performance metrics from the Dandolo.ai network. All data is updated in real-time based on actual usage.
          </p>
        </div>

        {/* Stacked Area Chart - Cumulative Model Usage Over Time */}
        {stackedChartData && (
          <GlassCard className="mb-8">
            <div className="flex">
              {/* Main Chart Area - Left Side */}
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">Model Usage Over Time</h2>
                    <p className="text-gray-400 text-sm">Cumulative token usage • {selectedTimeframe === 'today' ? 'Past week' : selectedTimeframe === 'week' ? 'Past 2 weeks' : selectedTimeframe === 'month' ? 'Past month' : 'Past 2 weeks'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{(stackedChartData.totalTokens / 1000000).toFixed(1)}M</p>
                    <p className="text-gray-400 text-sm">Total Tokens</p>
                  </div>
                </div>
                
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={stackedChartData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF"
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis 
                      stroke="#9CA3AF" 
                      fontSize={11}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value.toString();
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                        border: '1px solid rgba(75, 85, 99, 0.3)',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                      }}
                      formatter={(value: any, name: string) => [
                        typeof value === 'number' ? value.toLocaleString() + ' tokens' : value,
                        name
                      ]}
                    />
                    
                    {/* Render areas for each model */}
                    {stackedChartData.topModels.map((model, index) => {
                      const legendEntry = stackedChartData.legendData.find(l => l.name === model);
                      return (
                        <Area
                          key={model}
                          type="monotone"
                          dataKey={model}
                          stackId="1"
                          stroke={legendEntry?.color || '#8B5CF6'}
                          fill={legendEntry?.color || '#8B5CF6'}
                          fillOpacity={0.8}
                        />
                      );
                    })}
                    
                    {/* Others area */}
                    {stackedChartData.legendData.find(l => l.name === 'Others') && (
                      <Area
                        type="monotone"
                        dataKey="Others"
                        stackId="1"
                        stroke="#6B7280"
                        fill="#6B7280"
                        fillOpacity={0.6}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend - Right Side */}
              <div className="w-80 p-6 border-l border-white/10">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white mb-1">Top Models</h3>
                  <p className="text-gray-400 text-sm">Ranked by token usage</p>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {stackedChartData.legendData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div 
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-medium text-sm truncate">{item.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{(item.value / 1000000).toFixed(2)}M tokens</span>
                            <span>•</span>
                            <span>{item.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-mono text-gray-300">#{index + 1}</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Total Usage</span>
                    <span className="text-white font-medium">{(stackedChartData.totalTokens / 1000000).toFixed(1)}M tokens</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-gray-400">Date Range</span>
                    <span className="text-white font-medium text-xs">
                      {new Date(stackedChartData.dateRange.start).toLocaleDateString()} - {new Date(stackedChartData.dateRange.end).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Stats Overview */}
        {modelChartData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-400">Active Models</h3>
              </div>
              <p className="text-2xl font-bold">{modelChartData.models.length}</p>
              <p className="text-xs text-gray-500 mt-1">In {selectedTimeframe}</p>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-green-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-400">Total Requests</h3>
              </div>
              <p className="text-2xl font-bold">{modelChartData.totalRequests.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{selectedTimeframe}</p>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-400">Total Tokens</h3>
              </div>
              <p className="text-2xl font-bold">{(modelChartData.totalTokens / 1000000).toFixed(1)}M</p>
              <p className="text-xs text-gray-500 mt-1">{selectedTimeframe}</p>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-orange-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-400">Top Model</h3>
              </div>
              <p className="text-xl font-bold truncate">{modelChartData.models[0]?.name || 'N/A'}</p>
              <p className="text-xs text-gray-500 mt-1">{modelChartData.models[0]?.requests || 0} requests</p>
            </GlassCard>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-8">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
          
          <TimeframeSelector 
            selectedTimeframe={selectedTimeframe}
            onTimeframeChange={setSelectedTimeframe}
          />
        </div>

        {/* Content */}
        <GlassCard className="p-6">
          {activeTab === 'leaderboard' && modelChartData && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Top Models by Usage</h2>
                <p className="text-gray-400 text-sm">
                  Requests in {selectedTimeframe === 'today' ? 'today' : `the past ${selectedTimeframe}`}
                </p>
              </div>

              {/* Bar Chart */}
              <div className="mb-8">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={modelChartData.models} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9CA3AF"
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                        border: '1px solid rgba(75, 85, 99, 0.3)',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                      formatter={(value: any, name: string) => [
                        typeof value === 'number' ? value.toLocaleString() : value,
                        name === 'requests' ? 'Requests' : name === 'tokens' ? 'Tokens' : 'Market Share %'
                      ]}
                    />
                    <Bar dataKey="requests" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detailed Table */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold mb-4">Detailed Rankings</h3>
                {modelChartData.models.map((model, index) => (
                  <div key={model.name} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-lg transition-colors border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{model.name}</h4>
                        <p className="text-gray-400 text-sm">AI Model</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-white font-medium">{model.requests.toLocaleString()}</p>
                        <p className="text-gray-400">requests</p>
                      </div>
                      <div className="text-right">
                        <p className="text-blue-400 font-medium">{(model.tokens / 1000).toFixed(0)}K</p>
                        <p className="text-gray-400">tokens</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-medium">{model.marketShare.toFixed(1)}%</p>
                        <p className="text-gray-400">share</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'trending' && modelChartData && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Token Usage Distribution</h2>
                <p className="text-gray-400 text-sm">
                  Token consumption by model in {selectedTimeframe === 'today' ? 'today' : `the past ${selectedTimeframe}`}
                </p>
              </div>

              {/* Token Usage Bar Chart */}
              <div className="mb-8">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={modelChartData.models} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9CA3AF"
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                        border: '1px solid rgba(75, 85, 99, 0.3)',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                      formatter={(value: any) => [typeof value === 'number' ? value.toLocaleString() : value, 'Tokens']}
                    />
                    <Bar dataKey="tokens" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <h4 className="text-white font-medium mb-2">Highest Token Usage</h4>
                  <p className="text-blue-400 text-lg font-bold">{modelChartData.models[0]?.name || 'N/A'}</p>
                  <p className="text-gray-400 text-sm">{(modelChartData.models[0]?.tokens || 0).toLocaleString()} tokens</p>
                </div>
                <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <h4 className="text-white font-medium mb-2">Average Tokens/Request</h4>
                  <p className="text-purple-400 text-lg font-bold">
                    {modelChartData.totalRequests > 0 ? Math.round(modelChartData.totalTokens / modelChartData.totalRequests).toLocaleString() : 0}
                  </p>
                  <p className="text-gray-400 text-sm">per request</p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <h4 className="text-white font-medium mb-2">Period Range</h4>
                  <p className="text-green-400 text-lg font-bold">{new Date(modelChartData.periodStart).toLocaleDateString()}</p>
                  <p className="text-gray-400 text-sm">to {new Date(modelChartData.periodEnd).toLocaleDateString()}</p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'categories' && modelChartData && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Market Share Distribution</h2>
                <p className="text-gray-400 text-sm">
                  Model popularity in {selectedTimeframe === 'today' ? 'today' : `the past ${selectedTimeframe}`}
                </p>
              </div>

              {/* Market Share Pie Chart */}
              <div className="mb-8">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={modelChartData.models.slice(0, 8)} // Top 8 for readability
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="marketShare"
                    >
                      {modelChartData.models.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                        border: '1px solid rgba(75, 85, 99, 0.3)',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                      formatter={(value: any) => [`${parseFloat(value).toFixed(1)}%`, 'Market Share']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {modelChartData.models.slice(0, 8).map((model, index) => (
                  <div key={model.name} className="flex items-center gap-2 p-2 rounded">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: `hsl(${index * 45}, 70%, 60%)` }}
                    ></div>
                    <span className="text-white text-sm font-medium truncate">{model.name}</span>
                    <span className="text-gray-400 text-sm ml-auto">{model.marketShare.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </GlassCard>

        {/* Footer note */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            Data updates in real-time based on live network activity. All metrics are calculated from actual inference requests on Dandolo.ai.
          </p>
        </div>
      </div>
    </div>
  );
}