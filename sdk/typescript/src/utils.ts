/**
 * Utility Functions for Dandolo SDK
 * 
 * Provides helper functions, validators, formatters, and other utilities
 * that enhance the developer experience and SDK functionality.
 */

import {
  ChatMessage,
  EnhancedChatMessage,
  AgentInstruction,
  DandoloConfig,
  Model,
  StreamingChunk,
  DandoloError
} from './types';

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string): {
  valid: boolean;
  type: 'agent' | 'developer' | 'invalid';
  message?: string;
} {
  if (!apiKey || typeof apiKey !== 'string') {
    return {
      valid: false,
      type: 'invalid',
      message: 'API key must be a non-empty string'
    };
  }

  if (apiKey.startsWith('ak_')) {
    if (apiKey.length < 10) {
      return {
        valid: false,
        type: 'invalid',
        message: 'Agent API key appears to be too short'
      };
    }
    return { valid: true, type: 'agent' };
  }

  if (apiKey.startsWith('dk_')) {
    if (apiKey.length < 10) {
      return {
        valid: false,
        type: 'invalid',
        message: 'Developer API key appears to be too short'
      };
    }
    return { valid: true, type: 'developer' };
  }

  return {
    valid: false,
    type: 'invalid',
    message: 'API key must start with "ak_" (agent) or "dk_" (developer)'
  };
}

/**
 * Validate chat message
 */
export function validateChatMessage(message: any): {
  valid: boolean;
  message?: string;
} {
  if (!message || typeof message !== 'object') {
    return { valid: false, message: 'Message must be an object' };
  }

  if (!['system', 'user', 'assistant'].includes(message.role)) {
    return { valid: false, message: 'Message role must be system, user, or assistant' };
  }

  if (!message.content || typeof message.content !== 'string') {
    return { valid: false, message: 'Message content must be a non-empty string' };
  }

  if (message.content.length > 100000) {
    return { valid: false, message: 'Message content is too long (max 100,000 characters)' };
  }

  return { valid: true };
}

/**
 * Validate configuration object
 */
export function validateConfig(config: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { valid: false, errors };
  }

  // Validate API key
  const apiKeyValidation = validateApiKey(config.apiKey);
  if (!apiKeyValidation.valid) {
    errors.push(apiKeyValidation.message || 'Invalid API key');
  }

  // Validate optional fields
  if (config.baseURL && typeof config.baseURL !== 'string') {
    errors.push('baseURL must be a string');
  }

  if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
    errors.push('timeout must be a positive number');
  }

  if (config.maxRetries && (typeof config.maxRetries !== 'number' || config.maxRetries < 0)) {
    errors.push('maxRetries must be a non-negative number');
  }

  if (config.headers && typeof config.headers !== 'object') {
    errors.push('headers must be an object');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format messages for display
 */
export function formatMessages(messages: ChatMessage[], options?: {
  includeTimestamps?: boolean;
  includeTokenCounts?: boolean;
  maxLength?: number;
}): string {
  const opts = {
    includeTimestamps: false,
    includeTokenCounts: false,
    maxLength: Infinity,
    ...options
  };

  return messages.map(message => {
    let formatted = `[${message.role.toUpperCase()}]`;
    
    if (opts.includeTimestamps && 'created_at' in message && message.created_at) {
      formatted += ` ${message.created_at.toISOString()}`;
    }
    
    if (opts.includeTokenCounts && 'token_count' in message && message.token_count) {
      formatted += ` (${message.token_count} tokens)`;
    }
    
    formatted += `\n${message.content}`;
    
    if (opts.maxLength && message.content.length > opts.maxLength) {
      formatted = formatted.substring(0, opts.maxLength) + '...';
    }
    
    return formatted;
  }).join('\n\n');
}

/**
 * Format streaming chunks for display
 */
export function formatStreamingOutput(chunks: StreamingChunk[]): string {
  return chunks
    .filter(chunk => chunk.content)
    .map(chunk => chunk.content)
    .join('');
}

/**
 * Format error for display
 */
export function formatError(error: DandoloError, verbose = false): string {
  let formatted = `Error: ${error.message}`;
  
  if (error.code) {
    formatted += ` (${error.code})`;
  }
  
  if (error.status) {
    formatted += ` [HTTP ${error.status}]`;
  }
  
  if (verbose) {
    if (error.type) {
      formatted += `\nType: ${error.type}`;
    }
    
    if (error.request_id) {
      formatted += `\nRequest ID: ${error.request_id}`;
    }
    
    if (error.details) {
      formatted += `\nDetails: ${JSON.stringify(error.details, null, 2)}`;
    }
  }
  
  return formatted;
}

/**
 * Format token usage information
 */
export function formatTokenUsage(usage: {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}): string {
  return `Tokens: ${usage.total_tokens} total (${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion)`;
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Convert chat messages to OpenAI format
 */
export function toOpenAIFormat(messages: ChatMessage[]): any[] {
  return messages.map(message => ({
    role: message.role,
    content: message.content
  }));
}

/**
 * Convert from OpenAI format to Dandolo format
 */
export function fromOpenAIFormat(messages: any[]): ChatMessage[] {
  return messages.map(message => ({
    role: message.role || 'user',
    content: message.content || ''
  }));
}

/**
 * Convert enhanced messages to basic messages
 */
export function toBasicMessages(messages: EnhancedChatMessage[]): ChatMessage[] {
  return messages.map(message => ({
    role: message.role,
    content: message.content,
    agent_instruction: message.agent_instruction,
    context_id: message.context_id,
    thread_id: message.thread_id,
    parent_message_id: message.parent_message_id,
    timestamp: message.timestamp
  }));
}

/**
 * Enhance basic messages with metadata
 */
export function enhanceMessages(messages: ChatMessage[]): EnhancedChatMessage[] {
  return messages.map((message, index) => ({
    ...message,
    id: `msg_${Date.now()}_${index}`,
    created_at: new Date(),
    token_count: estimateTokens(message.content)
  }));
}

// ============================================================================
// Token Estimation Utilities
// ============================================================================

/**
 * Estimate token count for text
 */
export function estimateTokens(text: string): number {
  // Improved estimation based on OpenAI's tokenization
  // Average of ~4 characters per token for English text
  const baseEstimate = Math.ceil(text.length / 4);
  
  // Adjust for common patterns
  const words = text.split(/\s+/).length;
  const punctuation = (text.match(/[.!?,:;]/g) || []).length;
  
  // More accurate estimation
  return Math.max(1, Math.ceil(baseEstimate + (words * 0.1) + (punctuation * 0.05)));
}

/**
 * Estimate tokens for messages array
 */
export function estimateMessagesTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, message) => {
    const contentTokens = estimateTokens(message.content);
    const roleTokens = 2; // Role prefix tokens
    return total + contentTokens + roleTokens;
  }, 0);
}

/**
 * Check if messages exceed token limit
 */
export function checkTokenLimit(
  messages: ChatMessage[],
  limit: number
): {
  within_limit: boolean;
  estimated_tokens: number;
  excess_tokens: number;
  suggested_removals: number;
} {
  const estimated = estimateMessagesTokens(messages);
  const within_limit = estimated <= limit;
  const excess = Math.max(0, estimated - limit);
  
  // Suggest removing messages from the beginning
  let suggested_removals = 0;
  let running_total = estimated;
  
  for (let i = 0; i < messages.length && running_total > limit; i++) {
    const messageTokens = estimateTokens(messages[i].content) + 2;
    running_total -= messageTokens;
    suggested_removals++;
  }
  
  return {
    within_limit,
    estimated_tokens: estimated,
    excess_tokens: excess,
    suggested_removals
  };
}

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Clean and normalize text
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
    .trim();
}

/**
 * Extract code blocks from text
 */
export function extractCodeBlocks(text: string): Array<{
  language: string;
  code: string;
  start: number;
  end: number;
}> {
  const codeBlocks: Array<{
    language: string;
    code: string;
    start: number;
    end: number;
  }> = [];
  
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  return codeBlocks;
}

// ============================================================================
// Performance Utilities
// ============================================================================

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Measure execution time
 */
export async function measureTime<T>(
  operation: () => Promise<T> | T,
  label?: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;
  
  if (label) {
    console.log(`${label}: ${duration.toFixed(2)}ms`);
  }
  
  return { result, duration };
}

// ============================================================================
// Array Utilities
// ============================================================================

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Remove duplicates from array based on key
 */
export function uniqueBy<T>(array: T[], keyFn: (item: T) => any): T[] {
  const seen = new Set();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================================
// Object Utilities
// ============================================================================

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Merge objects deeply
 */
export function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;
  const source = sources.shift();
  
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  
  return deepMerge(target, ...sources);
}

/**
 * Check if value is an object
 */
function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// ============================================================================
// URL and Network Utilities
// ============================================================================

/**
 * Build URL with query parameters
 */
export function buildUrl(baseUrl: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) return baseUrl;
  
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  
  return url.toString();
}

/**
 * Parse User-Agent string
 */
export function parseUserAgent(userAgent: string): {
  browser?: string;
  version?: string;
  os?: string;
  device?: string;
} {
  const result: any = {};
  
  // Simple parsing - can be enhanced
  if (userAgent.includes('Chrome')) {
    result.browser = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    if (match) result.version = match[1];
  } else if (userAgent.includes('Firefox')) {
    result.browser = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (match) result.version = match[1];
  } else if (userAgent.includes('Safari')) {
    result.browser = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    if (match) result.version = match[1];
  }
  
  if (userAgent.includes('Windows')) result.os = 'Windows';
  else if (userAgent.includes('Mac')) result.os = 'macOS';
  else if (userAgent.includes('Linux')) result.os = 'Linux';
  else if (userAgent.includes('Android')) result.os = 'Android';
  else if (userAgent.includes('iOS')) result.os = 'iOS';
  
  return result;
}

// ============================================================================
// Development Utilities
// ============================================================================

/**
 * Create a simple logger
 */
export function createLogger(prefix: string, debug = false) {
  return {
    debug: (message: string, ...args: any[]) => {
      if (debug) console.log(`[${prefix}] DEBUG:`, message, ...args);
    },
    info: (message: string, ...args: any[]) => {
      console.log(`[${prefix}] INFO:`, message, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`[${prefix}] WARN:`, message, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(`[${prefix}] ERROR:`, message, ...args);
    }
  };
}

/**
 * Generate unique identifier
 */
export function generateId(prefix = '', length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Wait for specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry operation with backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await wait(delay);
    }
  }
  
  throw lastError!;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid chat message
 */
export function isChatMessage(value: any): value is ChatMessage {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.role === 'string' &&
    ['system', 'user', 'assistant'].includes(value.role) &&
    typeof value.content === 'string'
  );
}

/**
 * Check if value is an enhanced chat message
 */
export function isEnhancedChatMessage(value: any): value is EnhancedChatMessage {
  return isChatMessage(value) && (
    value.id !== undefined ||
    value.created_at !== undefined ||
    value.token_count !== undefined
  );
}

/**
 * Check if value is a streaming chunk
 */
export function isStreamingChunk(value: any): value is StreamingChunk {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.content === 'string' &&
    typeof value.done === 'boolean'
  );
}

/**
 * Check if value is a Dandolo error
 */
export function isDandoloError(value: any): value is DandoloError {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.message === 'string' &&
    typeof value.type === 'string' &&
    typeof value.code === 'string'
  );
}

// Export all utilities
export default {
  // Validation
  validateApiKey,
  validateChatMessage,
  validateConfig,
  
  // Formatting
  formatMessages,
  formatStreamingOutput,
  formatError,
  formatTokenUsage,
  
  // Conversion
  toOpenAIFormat,
  fromOpenAIFormat,
  toBasicMessages,
  enhanceMessages,
  
  // Token estimation
  estimateTokens,
  estimateMessagesTokens,
  checkTokenLimit,
  
  // String utilities
  truncateText,
  cleanText,
  extractCodeBlocks,
  
  // Performance
  debounce,
  throttle,
  measureTime,
  
  // Array utilities
  chunkArray,
  uniqueBy,
  
  // Object utilities
  deepClone,
  deepMerge,
  
  // Network
  buildUrl,
  parseUserAgent,
  
  // Development
  createLogger,
  generateId,
  wait,
  retryWithBackoff,
  
  // Type guards
  isChatMessage,
  isEnhancedChatMessage,
  isStreamingChunk,
  isDandoloError
};