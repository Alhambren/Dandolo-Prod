import React from 'react';
import GlassCard from './GlassCard';
import { useState } from "react";
import { toast } from "sonner";

const DevelopersPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'sdk' | 'api' | 'examples'>('overview');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sdk', label: 'SDK' },
    { id: 'api', label: 'API Reference' },
    { id: 'examples', label: 'Examples' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white" data-testid="developers-page">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Developer Resources</h1>
          <p className="text-xl text-gray-300">Integrate with Dandolo's AI infrastructure</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <GlassCard className="p-6" data-testid="api-docs">
            <h2 className="text-2xl font-bold mb-4">API Documentation</h2>
            <p className="text-gray-300 mb-4">
              Access our RESTful API to integrate AI capabilities into your applications.
            </p>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Key Features:</h3>
              <ul className="list-disc list-inside text-gray-300">
                <li>Real-time inference</li>
                <li>Batch processing</li>
                <li>Custom model deployment</li>
                <li>Usage analytics</li>
              </ul>
            </div>
            <a
              href="/api-docs"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View API Docs
            </a>
          </GlassCard>

          <GlassCard className="p-6" data-testid="sdk-docs">
            <h2 className="text-2xl font-bold mb-4">SDK & Libraries</h2>
            <p className="text-gray-300 mb-4">
              Use our official SDKs and libraries to quickly integrate with Dandolo.
            </p>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Available SDKs:</h3>
              <ul className="list-disc list-inside text-gray-300">
                <li>JavaScript/TypeScript</li>
                <li>Python</li>
                <li>Go</li>
                <li>Rust</li>
              </ul>
            </div>
            <a
              href="/sdk-docs"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View SDK Docs
            </a>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default DevelopersPage;
