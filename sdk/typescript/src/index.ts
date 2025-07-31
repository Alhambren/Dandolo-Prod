/**
 * @dandolo/agent-sdk - Superior TypeScript SDK for Agent Integration
 * 
 * The most joyful, intuitive, and powerful AI agent SDK ever created.
 * Designed to surpass Venice.ai and OpenRoute.ai in developer experience.
 * 
 * @version 1.0.0
 * @author Dandolo.ai
 * @license MIT
 */

export * from './client';
export * from './types';
export * from './agents';
export * from './streaming';
export * from './workflows';
export * from './context';
export * from './errors';
export * from './utils';

// Advanced instruction processing features
export * from './instruction-processor';
export * from './template-engine';
export * from './security-validator';

// Advanced features
export * from './advanced';

// Framework adapters
export * from './adapters';

// Default export for easy importing
export { DandoloClient as default } from './client';

// Version and metadata
export const VERSION = '1.0.0';
export const SDK_NAME = '@dandolo/agent-sdk';
export const SUPPORTED_FEATURES = [
  'streaming',
  'agent-instructions',
  'workflow-management',
  'context-preservation',
  'multi-modal-support',
  'template-processing',
  'security-validation',
  'instruction-processing',
  'prompt-injection-protection',
  'content-sanitization',
  'zero-config-setup',
  'openai-compatibility',
  'enhanced-error-handling',
  'rate-limit-management',
  'secure-by-default',
  'performance-optimized',
  'comprehensive-testing'
] as const;