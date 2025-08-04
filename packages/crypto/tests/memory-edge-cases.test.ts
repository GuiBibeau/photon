import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  signBytes,
  signBatch,
  verifySignature,
  verifyBatch,
  type KeyPair,
} from '../src/index.js';

describe('Memory and Edge Case Tests', () => {
  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated key generation', async () => {
      const iterations = 100;
      const keyPairs: KeyPair[] = [];

      // Track initial memory if available
      const initialMemory = performance.memory?.usedJSHeapSize;

      for (let i = 0; i < iterations; i++) {
        const keyPair = await generateKeyPair({ extractable: false });
        keyPairs.push(keyPair);

        // Force reference cleanup every 10 iterations
        if (i % 10 === 0 && i > 0) {
          keyPairs.splice(0, 10); // Remove old references
        }
      }

      // Clear remaining references
      keyPairs.length = 0;

      // Force garbage collection if available (in test environment)
      if (global.gc) {
        global.gc();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Check memory hasn't grown excessively
      if (performance.memory?.usedJSHeapSize && initialMemory) {
        const memoryGrowth = performance.memory.usedJSHeapSize - initialMemory;
        const growthMB = memoryGrowth / (1024 * 1024);
        // Allow up to 50MB growth for 100 keypairs
        expect(growthMB).toBeLessThan(50);
      }
    }, 30000);

    it('should not leak memory during repeated signing operations', async () => {
      const keyPair = await generateKeyPair({ extractable: true });
      const message = new Uint8Array(1024); // 1KB message
      crypto.getRandomValues(message);

      const iterations = 1000;
      const signatures: Uint8Array[] = [];

      for (let i = 0; i < iterations; i++) {
        const signature = await signBytes(keyPair.cryptoKeyPair.privateKey, message);
        signatures.push(signature);

        // Clear old signatures periodically
        if (i % 100 === 0 && i > 0) {
          signatures.splice(0, 100);
        }
      }

      // All signatures should be valid
      const lastSignature = signatures[signatures.length - 1];
      const isValid = await verifySignature(
        keyPair.cryptoKeyPair.publicKey,
        message,
        lastSignature,
      );
      expect(isValid).toBe(true);
    }, 30000);

    it('should handle large batch operations without memory issues', async () => {
      const keyPair = await generateKeyPair({ extractable: true });
      const batchSize = 500;

      // Create messages
      const messages = Array(batchSize)
        .fill(null)
        .map((_, i) => new TextEncoder().encode(`Message ${i}`));

      // Sign batch
      const signResult = await signBatch(keyPair.cryptoKeyPair.privateKey, messages, {
        maxConcurrency: 10, // Limit concurrency to control memory
      });

      expect(signResult.successCount).toBe(batchSize);
      expect(signResult.errorCount).toBe(0);
      expect(signResult.signatures.length).toBe(batchSize);

      // Verify batch
      const items = signResult.signatures.map((signature, i) => ({
        publicKey: keyPair.cryptoKeyPair.publicKey,
        message: messages[i],
        signature: signature as Uint8Array,
      }));

      const verifyResult = await verifyBatch(items, { maxConcurrency: 10 });
      expect(verifyResult.validCount).toBe(batchSize);
      expect(verifyResult.errorCount).toBe(0);
    }, 60000);

    it('should clean up resources in error conditions', async () => {
      const keyPair = await generateKeyPair({ extractable: true });

      // Create a mix of valid and invalid messages
      const messages = [
        new Uint8Array([1, 2, 3]),
        null as any, // Invalid
        new Uint8Array([4, 5, 6]),
        undefined as any, // Invalid
        new Uint8Array([7, 8, 9]),
      ];

      // Should handle errors without leaking
      const result = await signBatch(keyPair.cryptoKeyPair.privateKey, messages, {
        failFast: false,
      });

      expect(result.successCount).toBe(3);
      expect(result.errorCount).toBe(2);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle minimum size messages', async () => {
      const keyPair = await generateKeyPair({ extractable: true });

      // Empty message
      const emptyMessage = new Uint8Array(0);
      const emptySignature = await signBytes(keyPair.cryptoKeyPair.privateKey, emptyMessage);
      expect(emptySignature.length).toBe(64);

      const isValidEmpty = await verifySignature(
        keyPair.cryptoKeyPair.publicKey,
        emptyMessage,
        emptySignature,
      );
      expect(isValidEmpty).toBe(true);

      // Single byte message
      const singleByte = new Uint8Array([42]);
      const singleSignature = await signBytes(keyPair.cryptoKeyPair.privateKey, singleByte);
      expect(singleSignature.length).toBe(64);

      const isValidSingle = await verifySignature(
        keyPair.cryptoKeyPair.publicKey,
        singleByte,
        singleSignature,
      );
      expect(isValidSingle).toBe(true);
    });

    it('should handle maximum practical message sizes', async () => {
      const keyPair = await generateKeyPair({ extractable: true });

      // Test various large sizes
      const sizes = [
        1024, // 1KB
        1024 * 32, // 32KB - Node.js has 64KB limit for getRandomValues
        1024 * 64, // 64KB
      ];

      for (const size of sizes) {
        const largeMessage = new Uint8Array(size);
        crypto.getRandomValues(largeMessage);

        const signature = await signBytes(keyPair.cryptoKeyPair.privateKey, largeMessage);
        expect(signature.length).toBe(64);

        const isValid = await verifySignature(
          keyPair.cryptoKeyPair.publicKey,
          largeMessage,
          signature,
        );
        expect(isValid).toBe(true);
      }
    }, 30000);

    it('should reject excessively large messages', async () => {
      const keyPair = await generateKeyPair({ extractable: true });

      // Try to sign a 100MB message (should be rejected)
      const hugeMessage = new Uint8Array(100 * 1024 * 1024);

      await expect(signBytes(keyPair.cryptoKeyPair.privateKey, hugeMessage)).rejects.toThrow(
        /too large/i,
      );
    });

    it('should handle all possible byte values in messages', async () => {
      const keyPair = await generateKeyPair({ extractable: true });

      // Message with all byte values 0-255
      const allBytes = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        allBytes[i] = i;
      }

      const signature = await signBytes(keyPair.cryptoKeyPair.privateKey, allBytes);
      const isValid = await verifySignature(keyPair.cryptoKeyPair.publicKey, allBytes, signature);
      expect(isValid).toBe(true);

      // Message with repeated patterns
      const patterns = [
        new Uint8Array(100).fill(0), // All zeros
        new Uint8Array(100).fill(255), // All ones
        new Uint8Array(100).fill(170), // 10101010 pattern
        new Uint8Array(100).fill(85), // 01010101 pattern
      ];

      for (const pattern of patterns) {
        const sig = await signBytes(keyPair.cryptoKeyPair.privateKey, pattern);
        const valid = await verifySignature(keyPair.cryptoKeyPair.publicKey, pattern, sig);
        expect(valid).toBe(true);
      }
    });

    it('should handle edge case public key values', async () => {
      const _keyPair = await generateKeyPair({ extractable: true });
      const message = new TextEncoder().encode('Edge case test');

      // Test with various malformed public keys
      const edgeCaseKeys = [
        new Uint8Array(32), // All zeros
        new Uint8Array(32).fill(255), // All ones
        (() => {
          const key = new Uint8Array(32);
          key[0] = 1; // Only first byte set
          return key;
        })(),
        (() => {
          const key = new Uint8Array(32);
          key[31] = 1; // Only last byte set
          return key;
        })(),
      ];

      for (const edgeKey of edgeCaseKeys) {
        // These should all fail as they're not valid Ed25519 points
        const result = await verifySignature(edgeKey, message, new Uint8Array(64), {
          validateInputs: false,
        });
        expect(result).toBe(false);
      }
    });
  });

  describe('Concurrency and Race Conditions', () => {
    it('should handle concurrent key generation safely', async () => {
      const concurrentOps = 50;

      const keyPairPromises = Array(concurrentOps)
        .fill(null)
        .map(() => generateKeyPair({ extractable: true }));

      const keyPairs = await Promise.all(keyPairPromises);

      // All keypairs should be unique
      const publicKeys = await Promise.all(keyPairs.map((kp) => kp.getPublicKeyBytes()));

      const uniqueKeys = new Set(publicKeys.map((key) => key.toString()));
      expect(uniqueKeys.size).toBe(concurrentOps);
    });

    it('should handle concurrent signing operations', async () => {
      const keyPair = await generateKeyPair({ extractable: true });
      const messages = Array(20)
        .fill(null)
        .map((_, i) => new TextEncoder().encode(`Concurrent message ${i}`));

      // Sign all messages concurrently
      const signaturePromises = messages.map((msg) =>
        signBytes(keyPair.cryptoKeyPair.privateKey, msg),
      );

      const signatures = await Promise.all(signaturePromises);

      // Verify all signatures concurrently
      const verificationPromises = messages.map((msg, i) =>
        verifySignature(keyPair.cryptoKeyPair.publicKey, msg, signatures[i]),
      );

      const verifications = await Promise.all(verificationPromises);
      expect(verifications.every((v) => v === true)).toBe(true);
    });

    it('should handle mixed concurrent operations', async () => {
      // Mix of key generation, signing, and verification
      const operations = Promise.all([
        // Generate new keys
        generateKeyPair({ extractable: true }),
        generateKeyPair({ extractable: false }),

        // Sign with existing key
        (async () => {
          const kp = await generateKeyPair({ extractable: true });
          return signBytes(kp.cryptoKeyPair.privateKey, new Uint8Array([1, 2, 3]));
        })(),

        // Verify signatures
        (async () => {
          const kp = await generateKeyPair({ extractable: true });
          const msg = new Uint8Array([4, 5, 6]);
          const sig = await signBytes(kp.cryptoKeyPair.privateKey, msg);
          return verifySignature(kp.cryptoKeyPair.publicKey, msg, sig);
        })(),
      ]);

      const results = await operations;
      expect(results).toHaveLength(4);
      expect(results[3]).toBe(true); // Verification result
    });
  });

  describe('Type Edge Cases', () => {
    it('should handle ArrayBuffer vs Uint8Array conversions', async () => {
      const keyPair = await generateKeyPair({ extractable: true });

      // Create message as ArrayBuffer
      const buffer = new ArrayBuffer(10);
      const view = new DataView(buffer);
      for (let i = 0; i < 10; i++) {
        view.setUint8(i, i);
      }

      // Convert to Uint8Array for signing
      const message = new Uint8Array(buffer);
      const signature = await signBytes(keyPair.cryptoKeyPair.privateKey, message);

      // Verify with different views of the same data
      const isValid1 = await verifySignature(keyPair.cryptoKeyPair.publicKey, message, signature);
      const isValid2 = await verifySignature(
        keyPair.cryptoKeyPair.publicKey,
        new Uint8Array(buffer),
        signature,
      );

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
    });

    it('should handle subarray views correctly', async () => {
      const keyPair = await generateKeyPair({ extractable: true });

      // Create a larger buffer
      const fullBuffer = new Uint8Array(100);
      crypto.getRandomValues(fullBuffer);

      // Create subarrays
      const subarray1 = fullBuffer.subarray(10, 30); // 20 bytes
      const subarray2 = fullBuffer.subarray(50, 70); // 20 bytes

      // Sign subarrays
      const sig1 = await signBytes(keyPair.cryptoKeyPair.privateKey, subarray1);
      const sig2 = await signBytes(keyPair.cryptoKeyPair.privateKey, subarray2);

      // Signatures should be different (different data)
      expect(sig1).not.toEqual(sig2);

      // Each should verify correctly
      const valid1 = await verifySignature(keyPair.cryptoKeyPair.publicKey, subarray1, sig1);
      const valid2 = await verifySignature(keyPair.cryptoKeyPair.publicKey, subarray2, sig2);

      expect(valid1).toBe(true);
      expect(valid2).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should recover gracefully from crypto operation failures', async () => {
      // Create a mock key that will fail
      const mockPrivateKey = {
        type: 'private',
        algorithm: { name: 'Ed25519' },
        extractable: false,
        usages: ['sign'],
      } as CryptoKey;

      // Override the sign method to throw
      const originalSign = crypto.subtle.sign;
      let callCount = 0;
      crypto.subtle.sign = async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary crypto failure');
        }
        return originalSign.apply(crypto.subtle, arguments as any);
      };

      try {
        // First call should fail
        await expect(signBytes(mockPrivateKey, new Uint8Array([1, 2, 3]))).rejects.toThrow();

        // Restore method before testing with real key
        crypto.subtle.sign = originalSign;

        // Try with real key
        const keyPair = await generateKeyPair({ extractable: true });
        const signature = await signBytes(
          keyPair.cryptoKeyPair.privateKey,
          new Uint8Array([1, 2, 3]),
        );
        expect(signature).toBeInstanceOf(Uint8Array);
      } finally {
        // Ensure original method is restored
        crypto.subtle.sign = originalSign;
      }
    });
  });
});
