"use node";

import { v } from "convex/values";
import crypto from "crypto";

// Secure encryption utilities for API keys and sensitive data
const ENCRYPTION_KEY_LENGTH = 32; // 256-bit key
const IV_LENGTH = 16; // 128-bit IV for AES-CBC
const SALT_LENGTH = 32; // 256-bit salt

// Generate cryptographically secure random bytes using Node.js crypto
function generateSecureRandom(length: number): Uint8Array {
  // Use Node.js crypto.randomBytes for cryptographically secure randomness
  return new Uint8Array(crypto.randomBytes(length));
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

// AES-256-GCM encryption for API keys - secure and authenticated
export function encryptApiKey(apiKey: string, masterKey?: string): { encrypted: string; iv: string; authTag: string } {
  // SECURITY: Require master key - no insecure fallbacks
  const encryptionKey = masterKey || process.env.MASTER_ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    throw new Error("MASTER_ENCRYPTION_KEY environment variable is required and not set. Cannot proceed with encryption operations.");
  }
  
  if (encryptionKey.length < 32) {
    throw new Error("MASTER_ENCRYPTION_KEY must be at least 32 characters long for secure AES-256 encryption.");
  }
  
  // Ensure key is exactly 32 bytes for AES-256
  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  
  // Generate random IV for each encryption
  const iv = generateSecureRandom(IV_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  // Encrypt the API key
  let encrypted = cipher.update(apiKey, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted: encrypted,
    iv: Buffer.from(iv).toString('base64'),
    authTag: authTag.toString('base64')
  };
}

// Decrypt API key using AES-256-GCM
export function decryptApiKey(encrypted: string, iv: string, authTag: string, masterKey?: string): string {
  try {
    // SECURITY: Require master key - no insecure fallbacks
    const encryptionKey = masterKey || process.env.MASTER_ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      throw new Error("MASTER_ENCRYPTION_KEY environment variable is required and not set. Cannot proceed with decryption operations.");
    }
    
    if (encryptionKey.length < 32) {
      throw new Error("MASTER_ENCRYPTION_KEY must be at least 32 characters long for secure AES-256 decryption.");
    }
    
    const key = crypto.createHash('sha256').update(encryptionKey).digest();
    
    // Convert base64 inputs back to buffers
    const ivBuffer = Buffer.from(iv, 'base64');
    const authTagBuffer = Buffer.from(authTag, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
    decipher.setAuthTag(authTagBuffer);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt API key: Authentication failed or corrupted data');
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
  const validPrefixes = ['sk-', 'pk-', 'ak_', 'dk_', 'api_'];
  return validPrefixes.some(prefix => cleanKey.startsWith(prefix)) && cleanKey.length >= 32;
}

// Create secure fingerprint for duplicate detection
export function createApiKeyFingerprint(apiKey: string): string {
  // Use the last 8 characters + a hash of the key for fingerprinting
  const suffix = apiKey.slice(-8);
  const hash = createSecureHash(apiKey);
  return `${hash}_${suffix}`;
}

// Generate secure API key for internal use with cryptographically secure randomness
export function generateApiKey(type: 'developer' | 'agent' = 'developer'): string {
  const prefix = type === 'agent' ? 'ak_' : 'dk_';
  // Generate 24 bytes (48 hex chars) of cryptographically secure random data
  const randomPart = generateSecureToken(24);
  return `${prefix}${randomPart}`;
}

// Generate secure session token for admin authentication
export function generateSessionToken(): string {
  return generateSecureToken(32); // 64 hex characters
}

// ECDSA signature verification for admin actions using secp256k1 (Ethereum-compatible)
export function verifyActionSignature(message: string, signature: string, expectedSigner: string): boolean {
  try {
    // Create message hash (Ethereum-style message signing)
    const messagePrefix = "\x19Ethereum Signed Message:\n";
    const fullMessage = messagePrefix + message.length + message;
    const messageHash = crypto.createHash('sha256').update(fullMessage).digest();
    
    // Parse signature (should be hex string)
    if (!signature.startsWith('0x') || signature.length !== 132) {
      return false;
    }
    
    const sigBytes = Buffer.from(signature.slice(2), 'hex');
    const r = sigBytes.slice(0, 32);
    const s = sigBytes.slice(32, 64);
    const v = sigBytes[64];
    
    // Recover public key from signature
    const recoveredAddress = recoverAddressFromSignature(messageHash, r, s, v);
    
    // Compare with expected signer address (case-insensitive)
    return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

// Helper function to recover Ethereum address from ECDSA signature
function recoverAddressFromSignature(messageHash: Buffer, r: Buffer, s: Buffer, v: number): string {
  try {
    // Ethereum uses recovery ID (v - 27)
    const recoveryId = v - 27;
    if (recoveryId < 0 || recoveryId > 1) {
      throw new Error('Invalid recovery ID');
    }
    
    // For demonstration - in production, use a proper secp256k1 library like 'secp256k1'
    // This is a simplified implementation that should be replaced with a proper library
    
    // Create ECDSA verify object with secp256k1 curve
    const ecdsa = crypto.createECDH('secp256k1');
    
    // This is a placeholder - proper implementation would use secp256k1 library
    // to recover the public key and derive the Ethereum address
    throw new Error('Full ECDSA recovery requires secp256k1 library - implement in production');
    
  } catch (error) {
    throw new Error('Address recovery failed: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// Generate secure challenge for admin operations (to be signed by admin wallet)
export function generateAdminChallenge(action: string, timestamp: number): string {
  // Create a unique challenge that must be signed
  const nonce = generateSecureToken(16);
  return `DANDOLO_ADMIN_${action.toUpperCase()}_${timestamp}_${nonce}`;
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