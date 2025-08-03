import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateKeyPair } from '../src/key-generation.js';
import { KeyPair } from '../src/keypair.js';
import { SolanaError } from '@photon/errors';

// Mock global crypto for testing
const mockCrypto = {
  subtle: {
    generateKey: vi.fn(),
    exportKey: vi.fn(),
    sign: vi.fn(),
  },
};

// Save original crypto
const originalCrypto = globalThis.crypto;

// Helper function to safely set crypto
function setCrypto(value: any) {
  Object.defineProperty(globalThis, 'crypto', {
    value,
    writable: true,
    configurable: true,
  });
}

describe('generateKeyPair', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset crypto to a working mock
    setCrypto(mockCrypto);

    // Default mock implementation for successful key generation
    mockCrypto.subtle.generateKey.mockResolvedValue({
      privateKey: {
        algorithm: { name: 'Ed25519' },
        usages: ['sign'],
        extractable: false,
      },
      publicKey: {
        algorithm: { name: 'Ed25519' },
        usages: ['verify'],
        extractable: true,
      },
    });
  });

  afterEach(() => {
    // Restore original crypto
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      writable: true,
      configurable: true,
    });
  });

  describe('successful key generation', () => {
    it('should generate a key pair with default options', async () => {
      const keyPair = await generateKeyPair();

      expect(keyPair).toBeInstanceOf(KeyPair);
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        { name: 'Ed25519' },
        false, // default non-extractable
        ['sign', 'verify'],
      );
    });

    it('should generate an extractable key pair when specified', async () => {
      const keyPair = await generateKeyPair({ extractable: true });

      expect(keyPair).toBeInstanceOf(KeyPair);
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith({ name: 'Ed25519' }, true, [
        'sign',
        'verify',
      ]);
    });

    it('should generate a non-extractable key pair when explicitly specified', async () => {
      const keyPair = await generateKeyPair({ extractable: false });

      expect(keyPair).toBeInstanceOf(KeyPair);
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith({ name: 'Ed25519' }, false, [
        'sign',
        'verify',
      ]);
    });

    it('should handle undefined options gracefully', async () => {
      const keyPair = await generateKeyPair(undefined);

      expect(keyPair).toBeInstanceOf(KeyPair);
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        { name: 'Ed25519' },
        false, // default
        ['sign', 'verify'],
      );
    });
  });

  describe('environment compatibility', () => {
    it('should throw CRYPTO_NOT_SUPPORTED when WebCrypto is not available', async () => {
      // Remove crypto entirely
      setCrypto(undefined);

      let caughtError: SolanaError | null = null;
      try {
        await generateKeyPair();
      } catch (error) {
        caughtError = error as SolanaError;
      }

      expect(caughtError).toBeInstanceOf(SolanaError);
      expect(caughtError?.code).toBe('CRYPTO_NOT_SUPPORTED');
    });

    it('should throw CRYPTO_NOT_SUPPORTED when subtle crypto is not available', async () => {
      setCrypto({});

      let caughtError: SolanaError | null = null;
      try {
        await generateKeyPair();
      } catch (error) {
        caughtError = error as SolanaError;
      }

      expect(caughtError).toBeInstanceOf(SolanaError);
      expect(caughtError?.code).toBe('CRYPTO_NOT_SUPPORTED');
    });

    it('should throw CRYPTO_NOT_SUPPORTED when Ed25519 is not supported', async () => {
      // Mock the test to fail, indicating Ed25519 is not supported
      mockCrypto.subtle.generateKey.mockRejectedValue(new Error('Algorithm not supported'));

      let caughtError: SolanaError | null = null;
      try {
        await generateKeyPair();
      } catch (error) {
        caughtError = error as SolanaError;
      }

      expect(caughtError).toBeInstanceOf(SolanaError);
      expect(caughtError?.code).toBe('CRYPTO_NOT_SUPPORTED');
    });
  });

  describe('input validation', () => {
    it('should reject invalid options type', async () => {
      let caughtError: SolanaError | null = null;
      try {
        await generateKeyPair('invalid' as any);
      } catch (error) {
        caughtError = error as SolanaError;
      }

      expect(caughtError).toBeInstanceOf(SolanaError);
      expect(caughtError?.code).toBe('INVALID_KEY_OPTIONS');
    });

    it('should accept valid options object', async () => {
      const keyPair = await generateKeyPair({});
      expect(keyPair).toBeInstanceOf(KeyPair);
    });

    it('should accept options with extra properties', async () => {
      const keyPair = await generateKeyPair({
        extractable: true,
        extraProperty: 'ignored',
      } as any);
      expect(keyPair).toBeInstanceOf(KeyPair);
    });
  });

  describe('key generation failures', () => {
    it('should throw error when generateKey returns null', async () => {
      mockCrypto.subtle.generateKey.mockResolvedValue(null);

      await expect(generateKeyPair()).rejects.toThrow(SolanaError);
    });

    it('should throw error when private key is missing', async () => {
      mockCrypto.subtle.generateKey.mockResolvedValue({
        privateKey: null,
        publicKey: {
          algorithm: { name: 'Ed25519' },
          usages: ['verify'],
        },
      });

      await expect(generateKeyPair()).rejects.toThrow(SolanaError);
    });

    it('should throw error when public key is missing', async () => {
      mockCrypto.subtle.generateKey.mockResolvedValue({
        privateKey: {
          algorithm: { name: 'Ed25519' },
          usages: ['sign'],
        },
        publicKey: null,
      });

      await expect(generateKeyPair()).rejects.toThrow(SolanaError);
    });

    it('should throw error when algorithms are incorrect', async () => {
      mockCrypto.subtle.generateKey.mockResolvedValue({
        privateKey: {
          algorithm: { name: 'RSA-PSS' }, // Wrong algorithm
          usages: ['sign'],
        },
        publicKey: {
          algorithm: { name: 'Ed25519' },
          usages: ['verify'],
        },
      });

      await expect(generateKeyPair()).rejects.toThrow(SolanaError);
    });

    it('should throw error when usages are incorrect', async () => {
      mockCrypto.subtle.generateKey.mockResolvedValue({
        privateKey: {
          algorithm: { name: 'Ed25519' },
          usages: ['encrypt'], // Wrong usage
        },
        publicKey: {
          algorithm: { name: 'Ed25519' },
          usages: ['verify'],
        },
      });

      await expect(generateKeyPair()).rejects.toThrow(SolanaError);
    });

    it('should wrap unexpected errors', async () => {
      const originalError = new Error('Unexpected WebCrypto error');
      mockCrypto.subtle.generateKey.mockRejectedValue(originalError);

      await expect(generateKeyPair()).rejects.toThrow(SolanaError);
    });
  });

  describe('key pair validation', () => {
    it('should validate that generated keys have correct properties', async () => {
      const mockKeyPair = {
        privateKey: {
          algorithm: { name: 'Ed25519' },
          usages: ['sign'],
          extractable: false,
        },
        publicKey: {
          algorithm: { name: 'Ed25519' },
          usages: ['verify'],
          extractable: true,
        },
      };

      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);

      const keyPair = await generateKeyPair();
      expect(keyPair.cryptoKeyPair).toBe(mockKeyPair);
    });

    it('should ensure proper algorithm validation', async () => {
      const keyPair = await generateKeyPair();
      const info = keyPair.getInfo();

      expect(info.algorithm).toBe('Ed25519');
    });
  });
});
