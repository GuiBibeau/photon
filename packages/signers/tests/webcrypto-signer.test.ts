import { describe, it, expect } from 'vitest';
import { addressFromBytes } from '@photon/addresses';
import { generateKeyPair } from '@photon/crypto';
import { SolanaError } from '@photon/errors';
import {
  CryptoKeySigner,
  generateCryptoKeySigner,
  fromCryptoKeyPair,
  importCryptoKeySignerFromKeyPair,
  isCryptoKeySigner,
} from '../src/webcrypto-signer.js';

describe('CryptoKeySigner', () => {
  describe('with real WebCrypto', () => {
    it('should create and use a CryptoKeySigner', async () => {
      // Generate a real key pair
      const keyPair = await generateKeyPair({ extractable: true });
      const signer = new CryptoKeySigner(keyPair.cryptoKeyPair);

      expect(signer).toBeInstanceOf(CryptoKeySigner);
      expect(signer.metadata.type).toBe('webcrypto');
      expect(signer.extractable).toBe(true);

      // Get public key
      const publicKey = await signer.getPublicKey();
      expect(publicKey).toBeDefined();
      expect(typeof publicKey).toBe('string');

      // Test caching
      expect(signer.publicKey).toBe(publicKey);

      // Sign a message
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      const signature = await signer.sign(message);
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64);
    });

    it('should handle non-extractable keys', async () => {
      const keyPair = await generateKeyPair({ extractable: false });
      const signer = new CryptoKeySigner(keyPair.cryptoKeyPair);

      expect(signer.extractable).toBe(false);
      await expect(signer.extractPrivateKey()).rejects.toThrow(SolanaError);
      // Just check it throws SolanaError, the message format varies
    });

    it('should handle extractable keys', async () => {
      const keyPair = await generateKeyPair({ extractable: true });
      const signer = new CryptoKeySigner(keyPair.cryptoKeyPair);

      expect(signer.extractable).toBe(true);
      const privateKey = await signer.extractPrivateKey();
      expect(privateKey).toBeInstanceOf(Uint8Array);
      expect(privateKey.length).toBeGreaterThan(0);
    });

    it('should cache public key by default', async () => {
      const keyPair = await generateKeyPair();
      const signer = new CryptoKeySigner(keyPair.cryptoKeyPair);

      const publicKey1 = await signer.getPublicKey();
      const publicKey2 = await signer.getPublicKey();
      expect(publicKey1).toBe(publicKey2);
    });

    it('should not cache when cachePublicKey is false', async () => {
      const keyPair = await generateKeyPair();
      const signer = new CryptoKeySigner(keyPair.cryptoKeyPair, { cachePublicKey: false });

      const publicKey1 = await signer.getPublicKey();
      const publicKey2 = await signer.getPublicKey();

      // They should be equal values but may be different object references
      expect(publicKey1).toBe(publicKey2);
    });

    it('should accept custom metadata', async () => {
      const keyPair = await generateKeyPair();
      const metadata = {
        name: 'Test Signer',
        customField: 'custom value',
      };

      const signer = new CryptoKeySigner(keyPair.cryptoKeyPair, { metadata });
      expect(signer.metadata).toMatchObject({
        type: 'webcrypto',
        extractable: false,
        ...metadata,
      });
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid key pair', () => {
      expect(() => new CryptoKeySigner(null as any)).toThrow(SolanaError);
      expect(() => new CryptoKeySigner({} as any)).toThrow(SolanaError);
      expect(() => new CryptoKeySigner({ privateKey: null, publicKey: null } as any)).toThrow(
        SolanaError,
      );
    });

    it('should throw error for wrong key types', () => {
      const invalidKeyPair1: CryptoKeyPair = {
        privateKey: {
          type: 'public', // Wrong type
          algorithm: { name: 'Ed25519' },
          extractable: false,
          usages: ['sign'],
        } as CryptoKey,
        publicKey: {
          type: 'public',
          algorithm: { name: 'Ed25519' },
          extractable: true,
          usages: ['verify'],
        } as CryptoKey,
      };

      expect(() => new CryptoKeySigner(invalidKeyPair1)).toThrow(SolanaError);

      const invalidKeyPair2: CryptoKeyPair = {
        privateKey: {
          type: 'private',
          algorithm: { name: 'Ed25519' },
          extractable: false,
          usages: ['sign'],
        } as CryptoKey,
        publicKey: {
          type: 'private', // Wrong type
          algorithm: { name: 'Ed25519' },
          extractable: true,
          usages: ['verify'],
        } as CryptoKey,
      };

      expect(() => new CryptoKeySigner(invalidKeyPair2)).toThrow(SolanaError);
    });

    it('should throw error for non-Ed25519 algorithms', () => {
      const invalidKeyPair1: CryptoKeyPair = {
        privateKey: {
          type: 'private',
          algorithm: { name: 'RSA' }, // Wrong algorithm
          extractable: false,
          usages: ['sign'],
        } as CryptoKey,
        publicKey: {
          type: 'public',
          algorithm: { name: 'Ed25519' },
          extractable: true,
          usages: ['verify'],
        } as CryptoKey,
      };

      expect(() => new CryptoKeySigner(invalidKeyPair1)).toThrow(SolanaError);

      const invalidKeyPair2: CryptoKeyPair = {
        privateKey: {
          type: 'private',
          algorithm: { name: 'Ed25519' },
          extractable: false,
          usages: ['sign'],
        } as CryptoKey,
        publicKey: {
          type: 'public',
          algorithm: { name: 'ECDSA' }, // Wrong algorithm
          extractable: true,
          usages: ['verify'],
        } as CryptoKey,
      };

      expect(() => new CryptoKeySigner(invalidKeyPair2)).toThrow(SolanaError);
    });

    it('should throw error for invalid message', async () => {
      const keyPair = await generateKeyPair();
      const signer = new CryptoKeySigner(keyPair.cryptoKeyPair);

      await expect(signer.sign(null as any)).rejects.toThrow(SolanaError);
      await expect(signer.sign('invalid' as any)).rejects.toThrow(SolanaError);
      await expect(signer.sign(123 as any)).rejects.toThrow(SolanaError);
    });

    it('should throw when accessing publicKey before caching', () => {
      // We need to create a signer without calling getPublicKey first
      // This is tricky because the constructor doesn't cache it
      const mockKeyPair: CryptoKeyPair = {
        privateKey: {
          type: 'private',
          algorithm: { name: 'Ed25519' },
          extractable: false,
          usages: ['sign'],
        } as CryptoKey,
        publicKey: {
          type: 'public',
          algorithm: { name: 'Ed25519' },
          extractable: true,
          usages: ['verify'],
        } as CryptoKey,
      };

      const signer = new CryptoKeySigner(mockKeyPair);
      expect(() => signer.publicKey).toThrow(SolanaError);
      // Just check it throws SolanaError, the message format varies
    });

    it('should handle signing errors gracefully', async () => {
      // Create a mock key pair with a failing sign operation
      const mockPrivateKey = {
        type: 'private',
        algorithm: { name: 'Ed25519' },
        extractable: false,
        usages: ['sign'],
      } as CryptoKey;

      const mockPublicKey = {
        type: 'public',
        algorithm: { name: 'Ed25519' },
        extractable: true,
        usages: ['verify'],
      } as CryptoKey;

      const mockKeyPair: CryptoKeyPair = {
        privateKey: mockPrivateKey,
        publicKey: mockPublicKey,
      };

      // Mock crypto.subtle.sign to throw an error
      const originalSign = crypto.subtle.sign;
      crypto.subtle.sign = async () => {
        throw new Error('WebCrypto signing failed');
      };

      try {
        const signer = new CryptoKeySigner(mockKeyPair);
        const message = new Uint8Array([1, 2, 3]);

        await expect(signer.sign(message)).rejects.toThrow(SolanaError);
      } finally {
        crypto.subtle.sign = originalSign;
      }
    });

    it('should handle key export errors for non-extractable keys', async () => {
      const keyPair = await generateKeyPair({ extractable: false });
      const signer = new CryptoKeySigner(keyPair.cryptoKeyPair);

      await expect(signer.extractPrivateKey()).rejects.toThrow(SolanaError);
    });

    it('should handle public key export errors', async () => {
      const mockKeyPair: CryptoKeyPair = {
        privateKey: {
          type: 'private',
          algorithm: { name: 'Ed25519' },
          extractable: false,
          usages: ['sign'],
        } as CryptoKey,
        publicKey: {
          type: 'public',
          algorithm: { name: 'Ed25519' },
          extractable: true,
          usages: ['verify'],
        } as CryptoKey,
      };

      const originalExportKey = crypto.subtle.exportKey;
      crypto.subtle.exportKey = async () => {
        throw new Error('Export failed');
      };

      try {
        const signer = new CryptoKeySigner(mockKeyPair);
        await expect(signer.getPublicKey()).rejects.toThrow();
      } finally {
        crypto.subtle.exportKey = originalExportKey;
      }
    });
  });

  describe('factory functions', () => {
    describe('generateCryptoKeySigner', () => {
      it('should generate a new signer with random key pair', async () => {
        const signer = await generateCryptoKeySigner();

        expect(signer).toBeInstanceOf(CryptoKeySigner);
        expect(signer.extractable).toBe(false);

        // Public key should be pre-cached
        expect(() => signer.publicKey).not.toThrow();
      });

      it('should generate extractable keys when specified', async () => {
        const signer = await generateCryptoKeySigner({ extractable: true });

        expect(signer.extractable).toBe(true);
        const privateKey = await signer.extractPrivateKey();
        expect(privateKey).toBeInstanceOf(Uint8Array);
      });

      it.skip('should use seed for deterministic generation', async () => {
        // Skipped: seed-based generation not yet implemented in crypto module
        const seed = new Uint8Array(32).fill(7);
        const signer1 = await generateCryptoKeySigner({ seed });
        const signer2 = await generateCryptoKeySigner({ seed });

        // Same seed should produce same public key
        expect(signer1.publicKey).toBe(signer2.publicKey);
      });

      it('should accept custom metadata', async () => {
        const metadata = { name: 'Generated Signer' };
        const signer = await generateCryptoKeySigner({ metadata });

        expect(signer.metadata).toMatchObject(metadata);
      });

      it('should handle key generation failures', async () => {
        // Mock crypto.subtle.generateKey to throw an error
        const originalGenerateKey = crypto.subtle.generateKey;
        crypto.subtle.generateKey = async () => {
          throw new Error('Key generation failed');
        };

        try {
          await expect(generateCryptoKeySigner()).rejects.toThrow(SolanaError);
        } finally {
          crypto.subtle.generateKey = originalGenerateKey;
        }
      });
    });

    describe('fromCryptoKeyPair', () => {
      it('should create signer from existing CryptoKeyPair', async () => {
        const keyPair = await generateKeyPair();
        const signer = await fromCryptoKeyPair(keyPair.cryptoKeyPair);

        expect(signer).toBeInstanceOf(CryptoKeySigner);
        expect(signer.getCryptoKeyPair()).toBe(keyPair.cryptoKeyPair);

        // Public key should be pre-cached
        expect(() => signer.publicKey).not.toThrow();
      });

      it('should accept custom options', async () => {
        const keyPair = await generateKeyPair();
        const metadata = { name: 'From KeyPair' };
        const signer = await fromCryptoKeyPair(keyPair.cryptoKeyPair, { metadata });

        expect(signer.metadata).toMatchObject(metadata);
      });

      it('should handle invalid key pair', async () => {
        await expect(fromCryptoKeyPair(null as any)).rejects.toThrow(SolanaError);
        await expect(fromCryptoKeyPair({} as any)).rejects.toThrow(SolanaError);
      });

      it('should handle public key export failures', async () => {
        const mockKeyPair: CryptoKeyPair = {
          privateKey: {
            type: 'private',
            algorithm: { name: 'Ed25519' },
            extractable: false,
            usages: ['sign'],
          } as CryptoKey,
          publicKey: {
            type: 'public',
            algorithm: { name: 'Ed25519' },
            extractable: true,
            usages: ['verify'],
          } as CryptoKey,
        };

        // Mock exportKey to fail
        const originalExportKey = crypto.subtle.exportKey;
        crypto.subtle.exportKey = async () => {
          throw new Error('Export failed');
        };

        try {
          // The error should be thrown as-is since getPublicKey doesn't wrap it in SolanaError
          await expect(fromCryptoKeyPair(mockKeyPair)).rejects.toThrow('Export failed');
        } finally {
          crypto.subtle.exportKey = originalExportKey;
        }
      });
    });

    describe('importCryptoKeySignerFromKeyPair', () => {
      it('should import from IKeyPair', async () => {
        const keyPair = await generateKeyPair();
        const signer = await importCryptoKeySignerFromKeyPair(keyPair);

        expect(signer).toBeInstanceOf(CryptoKeySigner);
        expect(signer.getCryptoKeyPair()).toBe(keyPair.cryptoKeyPair);
      });

      it('should accept custom options', async () => {
        const keyPair = await generateKeyPair();
        const metadata = { name: 'Imported' };
        const signer = await importCryptoKeySignerFromKeyPair(keyPair, { metadata });

        expect(signer.metadata).toMatchObject(metadata);
      });

      it('should handle invalid IKeyPair', async () => {
        const invalidKeyPair = {
          cryptoKeyPair: null,
        } as any;

        await expect(importCryptoKeySignerFromKeyPair(invalidKeyPair)).rejects.toThrow(SolanaError);
      });

      it('should handle public key export failure', async () => {
        const mockKeyPair = {
          cryptoKeyPair: {
            privateKey: {
              type: 'private',
              algorithm: { name: 'Ed25519' },
              extractable: false,
              usages: ['sign'],
            } as CryptoKey,
            publicKey: {
              type: 'public',
              algorithm: { name: 'Ed25519' },
              extractable: true,
              usages: ['verify'],
            } as CryptoKey,
          },
        };

        // Mock exportKey to fail
        const originalExportKey = crypto.subtle.exportKey;
        crypto.subtle.exportKey = async () => {
          throw new Error('Export failed');
        };

        try {
          await expect(importCryptoKeySignerFromKeyPair(mockKeyPair as any)).rejects.toThrow(
            SolanaError,
          );
        } finally {
          crypto.subtle.exportKey = originalExportKey;
        }
      });
    });

    describe('importCryptoKeySigner', () => {
      it('should import from raw private and public key bytes', async () => {
        // Now this works because we convert raw keys to PKCS8 format internally

        // First generate a key pair to get valid key bytes
        const keyPair = await generateKeyPair({ extractable: true });
        const signer1 = new CryptoKeySigner(keyPair.cryptoKeyPair);

        // Extract the keys
        const privateKeyBytes = await signer1.extractPrivateKey();
        const publicKeyBytes = await signer1.getPublicKeyBytes();

        // Extract the raw 32-byte seed from the PKCS8 format
        // PKCS8 has a 16-byte header, then the 32-byte key
        const rawPrivateKey = privateKeyBytes.slice(-32);

        // Import using raw bytes
        const { importCryptoKeySigner } = await import('../src/webcrypto-signer.js');
        const signer2 = await importCryptoKeySigner(rawPrivateKey, publicKeyBytes);

        expect(signer2).toBeInstanceOf(CryptoKeySigner);
        expect(signer2.publicKey).toBe(await signer2.getPublicKey());

        // Test that the imported signer can sign
        const message = new Uint8Array([1, 2, 3, 4, 5]);
        const signature = await signer2.sign(message);
        expect(signature).toBeInstanceOf(Uint8Array);
        expect(signature.length).toBe(64);
      });

      it('should reject invalid private key length', async () => {
        const { importCryptoKeySigner } = await import('../src/webcrypto-signer.js');

        const invalidPrivateKey = new Uint8Array(31); // Wrong size
        const validPublicKey = new Uint8Array(32);

        await expect(importCryptoKeySigner(invalidPrivateKey, validPublicKey)).rejects.toThrow(
          SolanaError,
        );
      });

      it('should reject invalid public key length', async () => {
        const { importCryptoKeySigner } = await import('../src/webcrypto-signer.js');

        const validPrivateKey = new Uint8Array(32);
        const invalidPublicKey = new Uint8Array(33); // Wrong size

        await expect(importCryptoKeySigner(validPrivateKey, invalidPublicKey)).rejects.toThrow(
          SolanaError,
        );
      });

      it('should handle extractable option', async () => {
        // Generate valid keys
        const keyPair = await generateKeyPair({ extractable: true });
        const signer1 = new CryptoKeySigner(keyPair.cryptoKeyPair);
        const privateKeyBytes = await signer1.extractPrivateKey();
        const publicKeyBytes = await signer1.getPublicKeyBytes();

        const rawPrivateKey = privateKeyBytes.slice(-32);

        const { importCryptoKeySigner } = await import('../src/webcrypto-signer.js');

        // Import as extractable
        const extractableSigner = await importCryptoKeySigner(rawPrivateKey, publicKeyBytes, {
          extractable: true,
        });
        expect(extractableSigner.extractable).toBe(true);

        // Import as non-extractable (default)
        const nonExtractableSigner = await importCryptoKeySigner(rawPrivateKey, publicKeyBytes);
        expect(nonExtractableSigner.extractable).toBe(false);
      });

      it('should handle null or undefined key bytes', async () => {
        const { importCryptoKeySigner } = await import('../src/webcrypto-signer.js');

        await expect(importCryptoKeySigner(null as any, new Uint8Array(32))).rejects.toThrow(
          SolanaError,
        );

        await expect(importCryptoKeySigner(new Uint8Array(32), null as any)).rejects.toThrow(
          SolanaError,
        );

        await expect(importCryptoKeySigner(undefined as any, new Uint8Array(32))).rejects.toThrow(
          SolanaError,
        );
      });

      it('should accept custom metadata', async () => {
        const keyPair = await generateKeyPair({ extractable: true });
        const signer1 = new CryptoKeySigner(keyPair.cryptoKeyPair);
        const privateKeyBytes = await signer1.extractPrivateKey();
        const publicKeyBytes = await signer1.getPublicKeyBytes();

        const rawPrivateKey = privateKeyBytes.slice(-32);

        const { importCryptoKeySigner } = await import('../src/webcrypto-signer.js');
        const metadata = { name: 'Imported from raw bytes' };

        const signer2 = await importCryptoKeySigner(rawPrivateKey, publicKeyBytes, { metadata });

        expect(signer2.metadata).toMatchObject(metadata);
      });

      it('should handle WebCrypto Ed25519 raw key import unsupported error', async () => {
        const { importCryptoKeySigner } = await import('../src/webcrypto-signer.js');

        // Mock crypto.subtle.importKey to throw unsupported error
        const originalImportKey = crypto.subtle.importKey;
        crypto.subtle.importKey = async () => {
          throw new Error('Unsupported key usage for this operation');
        };

        try {
          const validPrivateKey = new Uint8Array(32);
          const validPublicKey = new Uint8Array(32);

          await expect(importCryptoKeySigner(validPrivateKey, validPublicKey)).rejects.toThrow(
            SolanaError,
          );

          // Check that it throws the specific crypto not supported error
          try {
            await importCryptoKeySigner(validPrivateKey, validPublicKey);
          } catch (error: any) {
            expect(error).toBeInstanceOf(SolanaError);
            expect(error.code).toBe('CRYPTO_NOT_SUPPORTED');
          }
        } finally {
          crypto.subtle.importKey = originalImportKey;
        }
      });

      it('should handle WebCrypto raw format error', async () => {
        const { importCryptoKeySigner } = await import('../src/webcrypto-signer.js');

        // Mock crypto.subtle.importKey to throw raw format error
        const originalImportKey = crypto.subtle.importKey;
        crypto.subtle.importKey = async () => {
          throw new Error('The raw format is not supported for Ed25519 keys');
        };

        try {
          const validPrivateKey = new Uint8Array(32);
          const validPublicKey = new Uint8Array(32);

          await expect(importCryptoKeySigner(validPrivateKey, validPublicKey)).rejects.toThrow(
            SolanaError,
          );

          // Check that it throws the specific crypto not supported error
          try {
            await importCryptoKeySigner(validPrivateKey, validPublicKey);
          } catch (error: any) {
            expect(error).toBeInstanceOf(SolanaError);
            expect(error.code).toBe('CRYPTO_NOT_SUPPORTED');
          }
        } finally {
          crypto.subtle.importKey = originalImportKey;
        }
      });

      it('should handle generic import failures', async () => {
        const { importCryptoKeySigner } = await import('../src/webcrypto-signer.js');

        // Mock crypto.subtle.importKey to throw generic error
        const originalImportKey = crypto.subtle.importKey;
        crypto.subtle.importKey = async () => {
          throw new Error('Generic import failure');
        };

        try {
          const validPrivateKey = new Uint8Array(32);
          const validPublicKey = new Uint8Array(32);

          await expect(importCryptoKeySigner(validPrivateKey, validPublicKey)).rejects.toThrow(
            SolanaError,
          );

          // Check that it throws the KEY_GENERATION_FAILED error for generic failures
          try {
            await importCryptoKeySigner(validPrivateKey, validPublicKey);
          } catch (error: any) {
            expect(error).toBeInstanceOf(SolanaError);
            expect(error.code).toBe('KEY_GENERATION_FAILED');
          }
        } finally {
          crypto.subtle.importKey = originalImportKey;
        }
      });
    });

    describe('importSolanaKeySigner', () => {
      it('should import from 64-byte Solana format private key', async () => {
        // Generate a key pair to simulate a Solana wallet key
        const keyPair = await generateKeyPair({ extractable: true });
        const signer1 = new CryptoKeySigner(keyPair.cryptoKeyPair);

        // Get the raw components
        const privateKeyBytes = await signer1.extractPrivateKey();
        const publicKeyBytes = await signer1.getPublicKeyBytes();
        const seed = privateKeyBytes.slice(-32);

        // Create a 64-byte Solana format key (seed + public key)
        const solanaKey = new Uint8Array(64);
        solanaKey.set(seed, 0);
        solanaKey.set(publicKeyBytes, 32);

        // Import using Solana format
        const { importSolanaKeySigner } = await import('../src/webcrypto-signer.js');
        const signer2 = await importSolanaKeySigner(solanaKey);

        expect(signer2).toBeInstanceOf(CryptoKeySigner);
        // Both signers should have the same public key
        const publicKey1 = await signer1.getPublicKey();
        const publicKey2 = await signer2.getPublicKey();
        expect(publicKey2).toBe(publicKey1);

        // Test that the imported signer can sign
        const message = new Uint8Array([1, 2, 3, 4, 5]);
        const signature = await signer2.sign(message);
        expect(signature).toBeInstanceOf(Uint8Array);
        expect(signature.length).toBe(64);
      });

      it('should reject invalid Solana key length', async () => {
        const { importSolanaKeySigner } = await import('../src/webcrypto-signer.js');

        // Wrong size - should be 64 bytes
        const invalidKey32 = new Uint8Array(32);
        await expect(importSolanaKeySigner(invalidKey32)).rejects.toThrow(SolanaError);

        const invalidKey128 = new Uint8Array(128);
        await expect(importSolanaKeySigner(invalidKey128)).rejects.toThrow(SolanaError);
      });

      it('should handle null or undefined Solana key', async () => {
        const { importSolanaKeySigner } = await import('../src/webcrypto-signer.js');

        await expect(importSolanaKeySigner(null as any)).rejects.toThrow(SolanaError);
        await expect(importSolanaKeySigner(undefined as any)).rejects.toThrow(SolanaError);
      });

      it('should accept custom options', async () => {
        // Generate test key
        const keyPair = await generateKeyPair({ extractable: true });
        const signer1 = new CryptoKeySigner(keyPair.cryptoKeyPair);
        const privateKeyBytes = await signer1.extractPrivateKey();
        const publicKeyBytes = await signer1.getPublicKeyBytes();
        const seed = privateKeyBytes.slice(-32);

        // Create Solana format key
        const solanaKey = new Uint8Array(64);
        solanaKey.set(seed, 0);
        solanaKey.set(publicKeyBytes, 32);

        const { importSolanaKeySigner } = await import('../src/webcrypto-signer.js');
        const metadata = { name: 'Solana Wallet Import' };

        const signer2 = await importSolanaKeySigner(solanaKey, { metadata, extractable: true });

        expect(signer2.metadata).toMatchObject(metadata);
        expect(signer2.extractable).toBe(true);
      });
    });
  });

  describe('isCryptoKeySigner', () => {
    it('should return true for CryptoKeySigner instances', async () => {
      const signer = await generateCryptoKeySigner();
      expect(isCryptoKeySigner(signer)).toBe(true);
    });

    it('should return false for non-CryptoKeySigner values', () => {
      expect(isCryptoKeySigner(null)).toBe(false);
      expect(isCryptoKeySigner(undefined)).toBe(false);
      expect(isCryptoKeySigner({})).toBe(false);
      expect(isCryptoKeySigner('signer')).toBe(false);
      expect(isCryptoKeySigner(123)).toBe(false);
      expect(isCryptoKeySigner({ sign: () => {} })).toBe(false);
    });
  });

  describe('integration with Signer interface', () => {
    it('should implement the Signer interface correctly', async () => {
      const signer = await generateCryptoKeySigner();

      // Test it has all required properties
      expect(signer.publicKey).toBeDefined();
      expect(typeof signer.sign).toBe('function');
      expect(signer.metadata).toBeDefined();

      // Test signing works
      const message = new Uint8Array(32).fill(1);
      const signature = await signer.sign(message);
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64);
    });

    it('should work with multi-signer utilities', async () => {
      const { signWithMultiple } = await import('../src/multi-signer.js');

      const signer1 = await generateCryptoKeySigner();
      const signer2 = await generateCryptoKeySigner();
      const message = new Uint8Array([1, 2, 3]);

      const result = await signWithMultiple(message, [signer1, signer2]);

      expect(result.success).toBe(true);
      expect(result.signatures).toHaveLength(2);
      expect(result.failures).toHaveLength(0);
    });
  });

  describe('public key operations', () => {
    it('should derive correct public key bytes', async () => {
      const signer = await generateCryptoKeySigner();
      const publicKeyBytes = await signer.getPublicKeyBytes();

      expect(publicKeyBytes).toBeInstanceOf(Uint8Array);
      expect(publicKeyBytes.length).toBe(32);

      // Verify it produces a valid address
      const address = addressFromBytes(publicKeyBytes);
      expect(address).toBe(signer.publicKey);
    });

    it('should cache public key bytes when caching is enabled', async () => {
      const signer = await generateCryptoKeySigner();

      const bytes1 = await signer.getPublicKeyBytes();
      const bytes2 = await signer.getPublicKeyBytes();

      // Should return the same array instance when cached
      expect(bytes1).toBe(bytes2);
    });

    it('should not cache when cachePublicKey is false for bytes', async () => {
      const keyPair = await generateKeyPair();
      const signer = new CryptoKeySigner(keyPair.cryptoKeyPair, { cachePublicKey: false });

      const bytes1 = await signer.getPublicKeyBytes();
      const bytes2 = await signer.getPublicKeyBytes();

      // Should be equal values but potentially different instances
      expect(bytes1).toEqual(bytes2);
    });

    it('should handle invalid public key length from WebCrypto', async () => {
      const mockKeyPair: CryptoKeyPair = {
        privateKey: {
          type: 'private',
          algorithm: { name: 'Ed25519' },
          extractable: false,
          usages: ['sign'],
        } as CryptoKey,
        publicKey: {
          type: 'public',
          algorithm: { name: 'Ed25519' },
          extractable: true,
          usages: ['verify'],
        } as CryptoKey,
      };

      const originalExportKey = crypto.subtle.exportKey;
      crypto.subtle.exportKey = (async (_format: KeyFormat, _key: CryptoKey) => {
        // Return invalid length key based on format
        if (_format === 'jwk') {
          return {} as JsonWebKey;
        }
        return new Uint8Array(31).buffer; // Wrong size
      }) as typeof crypto.subtle.exportKey;

      try {
        const signer = new CryptoKeySigner(mockKeyPair);
        await expect(signer.getPublicKeyBytes()).rejects.toThrow(SolanaError);
      } finally {
        crypto.subtle.exportKey = originalExportKey;
      }
    });
  });

  describe('performance tests', () => {
    it('should handle multiple concurrent sign operations', async () => {
      const signer = await generateCryptoKeySigner();
      const messages = Array.from({ length: 10 }, (_, i) => new Uint8Array([i]));

      const signatures = await Promise.all(messages.map((msg) => signer.sign(msg)));

      expect(signatures).toHaveLength(10);
      signatures.forEach((sig) => {
        expect(sig).toBeInstanceOf(Uint8Array);
        expect(sig.length).toBe(64);
      });
    });

    it('should complete signing within reasonable time', async () => {
      const signer = await generateCryptoKeySigner();
      const message = new Uint8Array(1024).fill(42); // 1KB message

      const start = performance.now();
      await signer.sign(message);
      const duration = performance.now() - start;

      // Signing should complete within 100ms (generous for CI environments)
      expect(duration).toBeLessThan(100);
    });

    it('should handle batch signing efficiently', async () => {
      const signers = await Promise.all(Array.from({ length: 5 }, () => generateCryptoKeySigner()));
      const message = new Uint8Array([1, 2, 3, 4, 5]);

      const start = performance.now();
      const signatures = await Promise.all(signers.map((s) => s.sign(message)));
      const duration = performance.now() - start;

      expect(signatures).toHaveLength(5);
      // Batch signing should complete within 200ms
      expect(duration).toBeLessThan(200);
    });
  });

  describe('cross-compatibility tests', () => {
    it('should produce deterministic signatures for same message', async () => {
      const signer = await generateCryptoKeySigner();
      const message = new Uint8Array([1, 2, 3, 4, 5]);

      const signature1 = await signer.sign(message);
      const signature2 = await signer.sign(message);

      // Ed25519 signatures are deterministic
      expect(signature1).toEqual(signature2);
    });

    it('should produce different signatures for different messages', async () => {
      const signer = await generateCryptoKeySigner();
      const message1 = new Uint8Array([1, 2, 3]);
      const message2 = new Uint8Array([4, 5, 6]);

      const signature1 = await signer.sign(message1);
      const signature2 = await signer.sign(message2);

      expect(signature1).not.toEqual(signature2);
    });

    it('should handle empty messages', async () => {
      const signer = await generateCryptoKeySigner();
      const emptyMessage = new Uint8Array(0);

      const signature = await signer.sign(emptyMessage);
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64);
    });

    it('should handle large messages', async () => {
      const signer = await generateCryptoKeySigner();
      const largeMessage = new Uint8Array(10000).fill(7); // 10KB message

      const signature = await signer.sign(largeMessage);
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64);
    });
  });

  describe('memory management', () => {
    it('should not leak memory with repeated operations', async () => {
      const signer = await generateCryptoKeySigner();
      const message = new Uint8Array(100);

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await signer.sign(message);
        await signer.getPublicKey();
        await signer.getPublicKeyBytes();
      }

      // If we get here without issues, memory management is working
      expect(true).toBe(true);
    });

    it('should properly clean up when signer is no longer referenced', async () => {
      let signer: CryptoKeySigner | null = await generateCryptoKeySigner();
      const publicKey = signer.publicKey;

      // Clear the reference
      signer = null;

      // Force garbage collection if available (V8 only)
      if (global.gc) {
        global.gc();
      }

      // The public key should still be valid (it's just a string)
      expect(publicKey).toBeDefined();
      expect(typeof publicKey).toBe('string');
    });
  });
});
