import React from 'react';
import { Tooltip } from "./Tooltip";

export const ZeroNumber = ({ children }: { children: React.ReactNode }) => (
  <span className="text-6xl font-semibold text-neutral-500">{children}</span>
);

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, subtitle }) => {
  return (
    <div
      className="text-center py-12"
      data-testid="empty-state"
    >
      <h3 className="text-lg font-medium text-white mb-2" data-testid="empty-state-title">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-gray-300" data-testid="empty-state-subtitle">
          {subtitle}
        </p>
      )}
    </div>
  );
};

interface StatCardProps {
  value: number;
  label: string;
  subtitle?: string;
  accentClass?: string;
  tooltip?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  subtitle,
  accentClass = 'text-red',
  tooltip,
}) => {
  const isZero = !value;
  return (
    <div
      className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6"
      data-testid="stat-card"
    >
      <div className="text-3xl font-bold mb-2" data-testid="stat-value">
        {isZero ? "0" : value.toLocaleString()}
      </div>
      <div className="text-white font-medium mb-1" data-testid="stat-label">
        {label}
      </div>
      <div className="text-sm text-gray-300" data-testid="stat-subtitle">
        {subtitle}
        {isZero && " — coming soon"}
      </div>
      {isZero && tooltip && (
        <div className="text-xs text-gray-400 mt-2" data-testid="stat-tooltip">
          {tooltip}
        </div>
      )}
    </div>
  );
}; 