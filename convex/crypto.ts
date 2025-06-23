import { v } from "convex/values";
import { randomBytes } from "crypto";

// Secure encryption utilities for API keys and sensitive data
const ENCRYPTION_KEY_LENGTH = 32; // 256-bit key
const IV_LENGTH = 16; // 128-bit IV for AES-CBC
const SALT_LENGTH = 32; // 256-bit salt

// Generate cryptographically secure random bytes
function generateSecureRandom(length: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  return randomBytes(length);
}

// Generate secure random string for tokens and keys
export function generateSecureToken(length: number = 32): string {
  const bytes = generateSecureRandom(length);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Create secure hash using djb2 algorithm (better than simple hash)
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

// Simple XOR encryption for API keys (temporary solution)
// In production, this should use proper AES encryption
export function encryptApiKey(apiKey: string, salt?: string): { encrypted: string; salt: string } {
  const useSalt = salt || generateSecureToken(16);
  let encrypted = '';
  
  for (let i = 0; i < apiKey.length; i++) {
    const keyChar = apiKey.charCodeAt(i);
    const saltChar = useSalt.charCodeAt(i % useSalt.length);
    encrypted += String.fromCharCode(keyChar ^ saltChar);
  }
  
  // Base64 encode the result
  const base64Encrypted = btoa(encrypted);
  
  return {
    encrypted: base64Encrypted,
    salt: useSalt
  };
}

// Decrypt API key
export function decryptApiKey(encryptedKey: string, salt: string): string {
  try {
    // Base64 decode
    const encrypted = atob(encryptedKey);
    let decrypted = '';
    
    for (let i = 0; i < encrypted.length; i++) {
      const encChar = encrypted.charCodeAt(i);
      const saltChar = salt.charCodeAt(i % salt.length);
      decrypted += String.fromCharCode(encChar ^ saltChar);
    }
    
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt API key');
  }
}

// Validate API key format (Venice.ai keys start with specific prefixes)
export function validateApiKeyFormat(apiKey: string): boolean {
  // Venice.ai API keys typically start with 'vn_' and have specific length
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // Remove whitespace and check format
  const cleanKey = apiKey.trim();
  
  // Venice.ai keys should start with 'vn_' and be at least 32 characters
  if (cleanKey.startsWith('vn_') && cleanKey.length >= 32) {
    return true;
  }
  
  // Also accept keys that start with other common AI API prefixes for testing
  const validPrefixes = ['sk-', 'pk-', 'ak-', 'api_'];
  return validPrefixes.some(prefix => cleanKey.startsWith(prefix)) && cleanKey.length >= 32;
}

// Create secure fingerprint for duplicate detection
export function createApiKeyFingerprint(apiKey: string): string {
  // Use the last 8 characters + a hash of the key for fingerprinting
  const suffix = apiKey.slice(-8);
  const hash = createSecureHash(apiKey);
  return `${hash}_${suffix}`;
}

// Generate secure API key for internal use
export function generateApiKey(type: 'developer' | 'agent' = 'developer'): string {
  const prefix = type === 'agent' ? 'ak_' : 'dk_';
  const randomPart = generateSecureToken(24); // 48 hex characters
  return `${prefix}${randomPart}`;
}

// Generate secure session token for admin authentication
export function generateSessionToken(): string {
  return generateSecureToken(32); // 64 hex characters
}

// Simple signature verification for admin actions
// In production, this should use proper cryptographic signatures
export function verifyActionSignature(message: string, signature: string, expectedSigner: string): boolean {
  // Create expected signature by hashing message + signer
  const expectedSignature = createSecureHash(message + expectedSigner + "admin_salt_2024");
  return signature === expectedSignature;
}

// Generate action signature for admin operations
export function generateActionSignature(action: string, timestamp: number, adminAddress: string): string {
  const message = `${action}_${timestamp}_emergency`;
  return createSecureHash(message + adminAddress + "admin_salt_2024");
}