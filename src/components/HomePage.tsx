import React from 'react';
import StatsGrid from './StatsGrid';
import GlassCard from './GlassCard';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white" data-testid="main-page">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Welcome to Dandolo</h1>
          <p className="text-xl text-gray-300">Your AI Infrastructure Platform</p>
        </div>

        <div className="mb-12">
          <StatsGrid />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div data-testid="top-providers">
            <h2 className="text-2xl font-bold mb-4">Top Providers</h2>
            <div className="grid grid-cols-1 gap-4">
              {['Provider Alpha', 'Provider Beta', 'Provider Gamma'].map((provider) => (
                <GlassCard key={provider} className="p-4" data-testid="provider-card">
                  <h3 className="text-lg font-semibold">{provider}</h3>
                  <p className="text-gray-300">GPT-4 • 99.9% Uptime</p>
                </GlassCard>
              ))}
            </div>
          </div>

          <div data-testid="live-activity">
            <h2 className="text-2xl font-bold mb-4">Network Health</h2>
            <GlassCard className="p-4" data-testid="network-health">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-300">Total Providers</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <div>
                  <p className="text-gray-300">Active Providers</p>
                  <p className="text-2xl font-bold">10</p>
                </div>
                <div>
                  <p className="text-gray-300">Network Uptime</p>
                  <p className="text-2xl font-bold">99.9%</p>
                </div>
                <div>
                  <p className="text-gray-300">Avg Response Time</p>
                  <p className="text-2xl font-bold">1.2s</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
