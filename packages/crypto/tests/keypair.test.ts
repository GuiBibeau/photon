import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyPair } from '../src/keypair.js';
import { SolanaError } from '@photon/errors';

// Mock crypto for testing
const mockCrypto = {
  subtle: {
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

describe('KeyPair', () => {
  let mockCryptoKeyPair: CryptoKeyPair;

  beforeEach(() => {
    vi.clearAllMocks();
    setCrypto(mockCrypto);

    // Create a mock CryptoKeyPair
    mockCryptoKeyPair = {
      privateKey: {
        algorithm: { name: 'Ed25519' },
        usages: ['sign'],
        extractable: false,
        type: 'private',
      } as CryptoKey,
      publicKey: {
        algorithm: { name: 'Ed25519' },
        usages: ['verify'],
        extractable: true,
        type: 'public',
      } as CryptoKey,
    };

    // Default mock implementations
    mockCrypto.subtle.exportKey.mockResolvedValue(
      new Uint8Array(32).fill(1), // 32-byte public key
    );
    mockCrypto.subtle.sign.mockResolvedValue(
      new Uint8Array(64).fill(2), // 64-byte signature
    );
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      writable: true,
      configurable: true,
    });
  });

  describe('constructor', () => {
    it('should create a KeyPair with valid CryptoKeyPair', () => {
      const keyPair = new KeyPair(mockCryptoKeyPair);
      expect(keyPair.cryptoKeyPair).toBe(mockCryptoKeyPair);
    });

    it('should throw error when CryptoKeyPair is null', () => {
      expect(() => new KeyPair(null as any)).toThrow(SolanaError);
    });

    it('should throw error when CryptoKeyPair is undefined', () => {
      expect(() => new KeyPair(undefined as any)).toThrow(SolanaError);
    });

    it('should throw error when private key is missing', () => {
      const invalidKeyPair = {
        privateKey: null,
        publicKey: mockCryptoKeyPair.publicKey,
      } as any;

      expect(() => new KeyPair(invalidKeyPair)).toThrow(SolanaError);
    });

    it('should throw error when public key is missing', () => {
      const invalidKeyPair = {
        privateKey: mockCryptoKeyPair.privateKey,
        publicKey: null,
      } as any;

      expect(() => new KeyPair(invalidKeyPair)).toThrow(SolanaError);
    });

    it('should throw error when algorithm is not Ed25519', () => {
      const invalidKeyPair = {
        privateKey: {
          ...mockCryptoKeyPair.privateKey,
          algorithm: { name: 'RSA-PSS' },
        },
        publicKey: mockCryptoKeyPair.publicKey,
      } as any;

      expect(() => new KeyPair(invalidKeyPair)).toThrow(SolanaError);
    });
  });

  describe('getPublicKeyBytes', () => {
    it('should return 32-byte public key', async () => {
      const keyPair = new KeyPair(mockCryptoKeyPair);
      const publicKeyBytes = await keyPair.getPublicKeyBytes();

      expect(publicKeyBytes).toBeInstanceOf(Uint8Array);
      expect(publicKeyBytes.length).toBe(32);
      expect(mockCrypto.subtle.exportKey).toHaveBeenCalledWith('raw', mockCryptoKeyPair.publicKey);
    });

    it('should cache the public key bytes on subsequent calls', async () => {
      const keyPair = new KeyPair(mockCryptoKeyPair);

      const firstCall = await keyPair.getPublicKeyBytes();
      const secondCall = await keyPair.getPublicKeyBytes();

      expect(firstCall).toBe(secondCall); // Same reference
      expect(mockCrypto.subtle.exportKey).toHaveBeenCalledTimes(1);
    });

    it('should throw error when export fails', async () => {
      mockCrypto.subtle.exportKey.mockRejectedValue(new Error('Export failed'));
      const keyPair = new KeyPair(mockCryptoKeyPair);

      await expect(keyPair.getPublicKeyBytes()).rejects.toThrow(SolanaError);
    });

    it('should throw error when key length is invalid', async () => {
      mockCrypto.subtle.exportKey.mockResolvedValue(new Uint8Array(16)); // Wrong length
      const keyPair = new KeyPair(mockCryptoKeyPair);

      await expect(keyPair.getPublicKeyBytes()).rejects.toThrow(SolanaError);
    });

    it('should preserve SolanaError instances', async () => {
      const originalError = new SolanaError('INVALID_KEY_TYPE', { test: 'context' });
      mockCrypto.subtle.exportKey.mockRejectedValue(originalError);
      const keyPair = new KeyPair(mockCryptoKeyPair);

      await expect(keyPair.getPublicKeyBytes()).rejects.toBe(originalError);
    });
  });

  describe('getAddress', () => {
    it('should return an address derived from public key', async () => {
      const keyPair = new KeyPair(mockCryptoKeyPair);
      const address = await keyPair.getAddress();

      expect(typeof address).toBe('string');
      expect(address.length).toBeGreaterThan(0);
    });

    it('should cache the address on subsequent calls', async () => {
      const keyPair = new KeyPair(mockCryptoKeyPair);

      const firstCall = await keyPair.getAddress();
      const secondCall = await keyPair.getAddress();

      expect(firstCall).toBe(secondCall);
      // Should only call exportKey once for the public key bytes
      expect(mockCrypto.subtle.exportKey).toHaveBeenCalledTimes(1);
    });

    it('should create consistent addresses for same public key', async () => {
      const keyPair1 = new KeyPair(mockCryptoKeyPair);
      const keyPair2 = new KeyPair(mockCryptoKeyPair);

      const address1 = await keyPair1.getAddress();
      const address2 = await keyPair2.getAddress();

      expect(address1).toBe(address2);
    });
  });

  describe('sign', () => {
    it('should sign a message and return a signature', async () => {
      const keyPair = new KeyPair(mockCryptoKeyPair);
      const message = new Uint8Array([1, 2, 3, 4]);

      const signature = await keyPair.sign(message);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64);
      expect(mockCrypto.subtle.sign).toHaveBeenCalledWith(
        'Ed25519',
        mockCryptoKeyPair.privateKey,
        message,
      );
    });

    it('should throw error for empty message', async () => {
      const keyPair = new KeyPair(mockCryptoKeyPair);
      const emptyMessage = new Uint8Array(0);

      await expect(keyPair.sign(emptyMessage)).rejects.toThrow(SolanaError);
    });

    it('should throw error for null message', async () => {
      const keyPair = new KeyPair(mockCryptoKeyPair);

      await expect(keyPair.sign(null as any)).rejects.toThrow(SolanaError);
    });

    it('should throw error when signing fails', async () => {
      mockCrypto.subtle.sign.mockRejectedValue(new Error('Signing failed'));
      const keyPair = new KeyPair(mockCryptoKeyPair);
      const message = new Uint8Array([1, 2, 3]);

      await expect(keyPair.sign(message)).rejects.toThrow(SolanaError);
    });

    it('should throw error for invalid signature length', async () => {
      mockCrypto.subtle.sign.mockResolvedValue(new Uint8Array(32)); // Wrong length
      const keyPair = new KeyPair(mockCryptoKeyPair);
      const message = new Uint8Array([1, 2, 3]);

      await expect(keyPair.sign(message)).rejects.toThrow(SolanaError);
    });

    it('should handle large messages', async () => {
      const keyPair = new KeyPair(mockCryptoKeyPair);
      const largeMessage = new Uint8Array(1024 * 1024).fill(42); // 1MB message

      const signature = await keyPair.sign(largeMessage);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64);
    });
  });

  describe('canPerformOperation', () => {
    it('should return true for sign operation when private key supports it', () => {
      const keyPair = new KeyPair(mockCryptoKeyPair);
      expect(keyPair.canPerformOperation('sign')).toBe(true);
    });

    it('should return true for verify operation when public key supports it', () => {
      const keyPair = new KeyPair(mockCryptoKeyPair);
      expect(keyPair.canPerformOperation('verify')).toBe(true);
    });

    it('should return false for unsupported operation', () => {
      const keyPair = new KeyPair(mockCryptoKeyPair);
      expect(keyPair.canPerformOperation('encrypt' as any)).toBe(false);
    });

    it('should return false when key does not support the operation', () => {
      const keyPairWithoutSign = {
        privateKey: {
          ...mockCryptoKeyPair.privateKey,
          usages: ['decrypt'], // No sign usage
        },
        publicKey: mockCryptoKeyPair.publicKey,
      } as any;

      const keyPair = new KeyPair(keyPairWithoutSign);
      expect(keyPair.canPerformOperation('sign')).toBe(false);
    });
  });

  describe('getInfo', () => {
    it('should return key pair information', () => {
      const keyPair = new KeyPair(mockCryptoKeyPair);
      const info = keyPair.getInfo();

      expect(info).toEqual({
        algorithm: 'Ed25519',
        extractable: false,
        usages: {
          privateKey: ['sign'],
          publicKey: ['verify'],
        },
      });
    });

    it('should reflect extractable keys correctly', () => {
      const extractableKeyPair = {
        privateKey: {
          ...mockCryptoKeyPair.privateKey,
          extractable: true,
        },
        publicKey: mockCryptoKeyPair.publicKey,
      } as any;

      const keyPair = new KeyPair(extractableKeyPair);
      const info = keyPair.getInfo();

      expect(info.extractable).toBe(true);
    });

    it('should reflect multiple usages correctly', () => {
      const multiUsageKeyPair = {
        privateKey: {
          ...mockCryptoKeyPair.privateKey,
          usages: ['sign', 'derive'],
        },
        publicKey: {
          ...mockCryptoKeyPair.publicKey,
          usages: ['verify', 'derive'],
        },
      } as any;

      const keyPair = new KeyPair(multiUsageKeyPair);
      const info = keyPair.getInfo();

      expect(info.usages.privateKey).toEqual(['sign', 'derive']);
      expect(info.usages.publicKey).toEqual(['verify', 'derive']);
    });
  });
});
