import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { encryptApiKey, validateApiKeyFormat } from "./crypto";

/**
 * Migration to encrypt existing plaintext API keys
 * This should be run once to migrate existing providers to encrypted storage
 */
export const migrateApiKeysToEncryption = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all providers that need migration (those without apiKeySalt)
    const providersToMigrate = await ctx.db
      .query("providers")
      .filter((q) => q.eq(q.field("apiKeySalt"), undefined))
      .collect();

    let migratedCount = 0;
    let failedCount = 0;
    const results = [];

    for (const provider of providersToMigrate) {
      try {
        // Validate the existing API key format
        if (!validateApiKeyFormat(provider.veniceApiKey)) {
          results.push({
            providerId: provider._id,
            status: "skipped",
            reason: "Invalid API key format",
          });
          failedCount++;
          continue;
        }

        // Skip if key appears to already be encrypted (very short or contains non-printable chars)
        if (provider.veniceApiKey.length < 16) {
          results.push({
            providerId: provider._id,
            status: "skipped",
            reason: "Key too short, possibly already encrypted",
          });
          failedCount++;
          continue;
        }

        // Encrypt the API key
        const { encrypted, salt } = encryptApiKey(provider.veniceApiKey);

        // Update the provider with encrypted key and salt
        await ctx.db.patch(provider._id, {
          veniceApiKey: encrypted,
          apiKeySalt: salt,
        });

        results.push({
          providerId: provider._id,
          status: "migrated",
          keyLength: provider.veniceApiKey.length,
        });
        migratedCount++;

      } catch (error) {
        results.push({
          providerId: provider._id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        failedCount++;
      }
    }

    return {
      totalProviders: providersToMigrate.length,
      migratedCount,
      failedCount,
      results,
      message: `Migration completed: ${migratedCount} encrypted, ${failedCount} failed`,
    };
  },
});

/**
 * Check migration status - see how many providers need migration
 */
export const checkMigrationStatus = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allProviders = await ctx.db.query("providers").collect();
    const encryptedProviders = allProviders.filter(p => p.apiKeySalt);
    const plaintextProviders = allProviders.filter(p => !p.apiKeySalt);

    return {
      totalProviders: allProviders.length,
      encryptedCount: encryptedProviders.length,
      plaintextCount: plaintextProviders.length,
      migrationNeeded: plaintextProviders.length > 0,
      plaintextProviders: plaintextProviders.map(p => ({
        id: p._id,
        address: p.address.substring(0, 8) + "...",
        keyLength: p.veniceApiKey.length,
        registrationDate: new Date(p.registrationDate).toISOString(),
      })),
    };
  },
});

/**
 * Verify that encrypted keys can be properly decrypted
 */
export const verifyEncryptedKeys = internalQuery({
  args: {},
  handler: async (ctx) => {
    const encryptedProviders = await ctx.db
      .query("providers")
      .filter((q) => q.neq(q.field("apiKeySalt"), undefined))
      .collect();

    const verificationResults = [];

    for (const provider of encryptedProviders) {
      try {
        // Try to decrypt the key using the internal function
        const decryptedKey = await ctx.runQuery(
          "providers:getDecryptedApiKey" as any,
          { providerId: provider._id }
        );

        verificationResults.push({
          providerId: provider._id,
          status: "success",
          hasKey: !!decryptedKey,
          keyLength: decryptedKey?.length || 0,
        });
      } catch (error) {
        verificationResults.push({
          providerId: provider._id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = verificationResults.filter(r => r.status === "success").length;
    const failCount = verificationResults.filter(r => r.status === "failed").length;

    return {
      totalChecked: encryptedProviders.length,
      successCount,
      failCount,
      allValid: failCount === 0,
      results: verificationResults,
    };
  },
});

/**
 * Emergency rollback - decrypt keys back to plaintext (use with extreme caution)
 */
export const emergencyRollbackEncryption = internalMutation({
  args: {
    adminSignature: v.string(),
    confirmationCode: v.string(),
  },
  handler: async (ctx, args) => {
    // Require specific confirmation
    if (args.confirmationCode !== "EMERGENCY_ROLLBACK_APPROVED") {
      throw new Error("Invalid confirmation code");
    }

    // Additional admin verification would go here
    
    const encryptedProviders = await ctx.db
      .query("providers")
      .filter((q) => q.neq(q.field("apiKeySalt"), undefined))
      .collect();

    const rollbackResults = [];

    for (const provider of encryptedProviders) {
      try {
        // Decrypt the key
        const decryptedKey = await ctx.runQuery(
          "providers:getDecryptedApiKey" as any,
          { providerId: provider._id }
        );

        // Store back as plaintext and remove salt
        await ctx.db.patch(provider._id, {
          veniceApiKey: decryptedKey,
          apiKeySalt: undefined,
        });

        rollbackResults.push({
          providerId: provider._id,
          status: "rolled_back",
        });
      } catch (error) {
        rollbackResults.push({
          providerId: provider._id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      message: "EMERGENCY ROLLBACK COMPLETED - ALL KEYS NOW PLAINTEXT",
      totalProcessed: encryptedProviders.length,
      results: rollbackResults,
    };
  },
});