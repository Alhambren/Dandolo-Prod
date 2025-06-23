"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import crypto from "crypto";

// CRITICAL: Enforce secure master key - no fallbacks allowed
function getEncryptionKey(): Buffer {
  const masterKey = process.env.MASTER_ENCRYPTION_KEY;
  
  if (!masterKey) {
    throw new Error("MASTER_ENCRYPTION_KEY environment variable is required and not set. Cannot proceed with encryption operations.");
  }
  
  if (masterKey.length < 32) {
    throw new Error("MASTER_ENCRYPTION_KEY must be at least 32 characters long for secure AES-256 encryption.");
  }
  
  // Derive a consistent 32-byte key from the master key
  return crypto.createHash('sha256').update(masterKey).digest();
}

// Secure AES-256-GCM encryption action
export const encryptApiKey = internalAction({
  args: { 
    apiKey: v.string() 
  },
  handler: async (ctx, args): Promise<{ encrypted: string; iv: string; authTag: string }> => {
    try {
      const key = getEncryptionKey();
      
      // Generate random IV for each encryption
      const iv = crypto.randomBytes(16); // 128-bit IV for AES-GCM
      
      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      // Encrypt the API key
      let encrypted = cipher.update(args.apiKey, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Secure AES-256-GCM decryption action
export const decryptApiKey = internalAction({
  args: { 
    encrypted: v.string(),
    iv: v.string(),
    authTag: v.string()
  },
  handler: async (ctx, args): Promise<string> => {
    try {
      const key = getEncryptionKey();
      
      // Convert base64 inputs back to buffers
      const ivBuffer = Buffer.from(args.iv, 'base64');
      const authTagBuffer = Buffer.from(args.authTag, 'base64');
      
      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
      decipher.setAuthTag(authTagBuffer);
      
      // Decrypt
      let decrypted = decipher.update(args.encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: Authentication failed or corrupted data - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Generate cryptographically secure API keys
export const generateSecureApiKey = internalAction({
  args: { 
    keyType: v.union(v.literal("developer"), v.literal("agent"))
  },
  handler: async (ctx, args): Promise<string> => {
    const prefix = args.keyType === 'agent' ? 'ak_' : 'dk_';
    // Generate 24 bytes (48 hex chars) of cryptographically secure random data
    const randomBytes = crypto.randomBytes(24);
    const randomHex = randomBytes.toString('hex');
    return `${prefix}${randomHex}`;
  },
});

// Ethereum-compatible signature verification
export const verifyEthereumSignature = internalAction({
  args: {
    message: v.string(),
    signature: v.string(),
    expectedSigner: v.string()
  },
  handler: async (ctx, args): Promise<boolean> => {
    try {
      // Parse signature (should be hex string: 0x + 130 chars = 132 total)
      if (!args.signature.startsWith('0x') || args.signature.length !== 132) {
        return false;
      }
      
      const sigBytes = Buffer.from(args.signature.slice(2), 'hex');
      const r = sigBytes.slice(0, 32);
      const s = sigBytes.slice(32, 64);
      const v = sigBytes[64];
      
      // Create Ethereum-style message hash
      const messagePrefix = "\x19Ethereum Signed Message:\n";
      const fullMessage = messagePrefix + args.message.length + args.message;
      const messageHash = crypto.createHash('sha256').update(fullMessage).digest();
      
      // NOTE: Full ECDSA recovery requires additional libraries (secp256k1)
      // For production, implement with proper secp256k1 library
      // This is a placeholder that validates signature format
      
      // Validate signature components are in valid range
      const rBN = BigInt('0x' + r.toString('hex'));
      const sBN = BigInt('0x' + s.toString('hex'));
      const secp256k1N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
      
      if (rBN <= 0 || rBN >= secp256k1N || sBN <= 0 || sBN >= secp256k1N) {
        return false;
      }
      
      if (v !== 27 && v !== 28) {
        return false;
      }
      
      // TODO: Implement full ECDSA recovery with secp256k1 library
      // For now, return true if signature format is valid (TEMPORARY)
      console.warn("SECURITY WARNING: Signature format validation only - implement full ECDSA recovery for production");
      return true;
      
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  },
});

// Generate admin challenge for wallet signing
export const generateAdminChallenge = internalAction({
  args: {
    action: v.string(),
    adminAddress: v.string()
  },
  handler: async (ctx, args): Promise<string> => {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    return `DANDOLO_ADMIN_${args.action.toUpperCase()}_${timestamp}_${nonce}_${args.adminAddress}`;
  },
});