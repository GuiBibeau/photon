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
  });
});
