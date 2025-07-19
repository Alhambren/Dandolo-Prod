import React from 'react';

interface HealthIndicatorProps {
  health: number;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const HealthIndicator: React.FC<HealthIndicatorProps> = ({ 
  health, 
  size = 'md', 
  showText = true,
  className = '' 
}) => {
  const getHealthColor = (health: number) => {
    if (health >= 95) return 'text-green-400';
    if (health >= 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthStatus = (health: number) => {
    if (health >= 95) return 'Excellent';
    if (health >= 80) return 'Good';
    if (health >= 60) return 'Fair';
    return 'Poor';
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size]} font-bold ${getHealthColor(health)}`}>
        {health.toFixed(1)}%
      </div>
      {showText && (
        <span className={`text-gray-400 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {getHealthStatus(health)}
        </span>
      )}
    </div>
  );
};

interface ResponseTimeIndicatorProps {
  responseTime: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ResponseTimeIndicator: React.FC<ResponseTimeIndicatorProps> = ({ 
  responseTime, 
  size = 'md',
  className = '' 
}) => {
  const getResponseTimeColor = (time: number) => {
    if (time <= 1000) return 'text-green-400';
    if (time <= 3000) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getResponseTimeStatus = (time: number) => {
    if (time <= 1000) return 'Fast';
    if (time <= 3000) return 'Moderate';
    return 'Slow';
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size]} font-bold ${getResponseTimeColor(responseTime)}`}>
        {responseTime.toFixed(0)}ms
      </div>
      <span className={`text-gray-400 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        {getResponseTimeStatus(responseTime)}
      </span>
    </div>
  );
};

interface UptimeIndicatorProps {
  uptime: number;
  totalChecks?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UptimeIndicator: React.FC<UptimeIndicatorProps> = ({ 
  uptime, 
  totalChecks,
  size = 'md',
  className = '' 
}) => {
  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99) return 'text-green-400';
    if (uptime >= 95) return 'text-yellow-400';
    return 'text-red-400';
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size]} font-bold ${getUptimeColor(uptime)}`}>
        {uptime.toFixed(1)}%
      </div>
      {totalChecks && (
        <span className={`text-gray-400 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          ({totalChecks} checks)
        </span>
      )}
    </div>
  );
};

interface StatusDotProps {
  status: 'healthy' | 'warning' | 'error' | 'offline';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({ 
  status, 
  size = 'md', 
  pulse = false,
  className = '' 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        ${getStatusColor(status)} 
        rounded-full 
        ${pulse ? 'animate-pulse' : ''} 
        ${className}
      `} 
    />
  );
};

interface HealthHistoryProps {
  history: Array<{ status: boolean; timestamp: number; error?: string }>;
  maxItems?: number;
  className?: string;
}

export const HealthHistory: React.FC<HealthHistoryProps> = ({ 
  history, 
  maxItems = 6,
  className = '' 
}) => {
  const recentHistory = history.slice(0, maxItems);

  return (
    <div className={`flex space-x-1 ${className}`}>
      {recentHistory.map((check, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full ${check.status ? 'bg-green-500' : 'bg-red-500'}`}
          title={`${check.status ? 'Healthy' : 'Failed'} - ${new Date(check.timestamp).toLocaleString()}${check.error ? ` (${check.error})` : ''}`}
        />
      ))}
      {recentHistory.length === 0 && (
        <span className="text-gray-500 text-xs">No health data</span>
      )}
    </div>
  );
};