import React from 'react';
import { DeveloperHub } from './DeveloperHub';

/**
 * DevelopersPage - Complete Developer Hub
 * Includes API key management and comprehensive documentation
 * Uses hash-based navigation internally for sub-views (appropriate for single-page tabs)
 */
interface DevelopersPageProps {
  defaultTab?: 'quickstart' | 'models';
}

const DevelopersPage: React.FC<DevelopersPageProps> = ({ defaultTab }) => {
  return <DeveloperHub defaultTab={defaultTab} />;
};

export default DevelopersPage;

