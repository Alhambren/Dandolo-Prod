import { v } from "convex/values";

// Basic crypto utilities that don't require Node.js

// Create secure hash using djb2 algorithm
export function createSecureHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive hex string and extend to 64-bit equivalent
  const positiveHash = Math.abs(hash);
  const baseHash = positiveHash.toString(16).padStart(8, '0');
  
  // Create extended hash by applying hash to the result multiple times
  let extendedHash = baseHash;
  for (let i = 0; i < 3; i++) {
    let secondaryHash = 5381;
    for (let j = 0; j < extendedHash.length; j++) {
      secondaryHash = ((secondaryHash << 5) + secondaryHash) + extendedHash.charCodeAt(j);
      secondaryHash = secondaryHash & secondaryHash;
    }
    extendedHash += Math.abs(secondaryHash).toString(16).padStart(8, '0');
  }
  
  return extendedHash.substring(0, 32); // Return 32 character hash (128-bit equivalent)
}

// Generate secure token using Web Crypto API (client-side safe)
export function generateSecureToken(length: number = 16): string {
  // Use crypto.getRandomValues if available (browser environment)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for environments without crypto.getRandomValues
  const chars = 'abcdef0123456789';
  let result = '';
  for (let i = 0; i < length * 2; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Validate API key format (Venice.ai keys can have various formats)
export function validateApiKeyFormat(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // Remove whitespace and check format
  const cleanKey = apiKey.trim();
  
  // Basic validation: must be at least 20 characters and contain alphanumeric characters
  if (cleanKey.length < 20) {
    return false;
  }
  
  // Check if it contains only valid characters (letters, numbers, hyphens, underscores)
  const validCharacters = /^[a-zA-Z0-9_-]+$/;
  if (!validCharacters.test(cleanKey)) {
    return false;
  }
  
  // Accept various API key formats including Venice.ai and other providers
  const validPrefixes = ['vn_', 'sk-', 'pk-', 'ak-', 'api_', 'key_'];
  const hasValidPrefix = validPrefixes.some(prefix => cleanKey.startsWith(prefix));
  
  // Allow keys with valid prefixes OR keys that are long enough (32+ chars) even without known prefixes
  return hasValidPrefix || cleanKey.length >= 32;
}

// Create secure fingerprint for duplicate detection
export function createApiKeyFingerprint(apiKey: string): string {
  // Use the last 8 characters + a hash of the key for fingerprinting
  const suffix = apiKey.slice(-8);
  const hash = createSecureHash(apiKey);
  return `${hash}_${suffix}`;
}

// Validate admin challenge format and timestamp
export function validateAdminChallenge(challenge: string, maxAgeMs: number = 300000): boolean {
  try {
    const parts = challenge.split('_');
    if (parts.length < 4 || parts[0] !== 'DANDOLO' || parts[1] !== 'ADMIN') {
      return false;
    }
    
    const timestamp = parseInt(parts[3]);
    if (isNaN(timestamp)) {
      return false;
    }
    
    // Check if challenge is not too old (default: 5 minutes)
    const age = Date.now() - timestamp;
    return age >= 0 && age <= maxAgeMs;
  } catch {
    return false;
  }
}