import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkCryptoCompatibility,
  assertCryptoSupport,
  testEd25519Support,
} from '../src/compatibility.js';
import { SolanaError } from '@photon/errors';

// Mock crypto for testing
const mockCrypto = {
  subtle: {
    generateKey: vi.fn(),
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

// Helper function to restore crypto
function restoreCrypto() {
  Object.defineProperty(globalThis, 'crypto', {
    value: originalCrypto,
    writable: true,
    configurable: true,
  });
}

describe('compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    restoreCrypto();
  });

  describe('checkCryptoCompatibility', () => {
    it('should report incompatible when crypto is undefined', () => {
      setCrypto(undefined);

      const compatibility = checkCryptoCompatibility();

      expect(compatibility).toEqual({
        hasWebCrypto: false,
        hasEd25519: false,
        isFullySupported: false,
        message: 'WebCrypto API is not available in this environment.',
      });
    });

    it('should report incompatible when crypto.subtle is undefined', () => {
      setCrypto({});

      const compatibility = checkCryptoCompatibility();

      expect(compatibility).toEqual({
        hasWebCrypto: false,
        hasEd25519: false,
        isFullySupported: false,
        message: 'WebCrypto API is not available in this environment.',
      });
    });

    it('should report compatible when WebCrypto is available', () => {
      setCrypto(mockCrypto);

      const compatibility = checkCryptoCompatibility();

      expect(compatibility).toEqual({
        hasWebCrypto: true,
        hasEd25519: true, // Optimistic assumption
        isFullySupported: true,
        message: 'Full Ed25519 crypto support available.',
      });
    });

    it('should handle null crypto gracefully', () => {
      setCrypto(null);

      const compatibility = checkCryptoCompatibility();

      expect(compatibility.hasWebCrypto).toBe(false);
      expect(compatibility.isFullySupported).toBe(false);
    });

    it('should handle crypto with null subtle gracefully', () => {
      setCrypto({ subtle: null });

      const compatibility = checkCryptoCompatibility();

      expect(compatibility.hasWebCrypto).toBe(false);
      expect(compatibility.isFullySupported).toBe(false);
    });
  });

  describe('assertCryptoSupport', () => {
    it('should not throw when WebCrypto is available', () => {
      setCrypto(mockCrypto);

      expect(() => assertCryptoSupport()).not.toThrow();
    });

    it('should throw CRYPTO_NOT_SUPPORTED when crypto is undefined', () => {
      setCrypto(undefined);

      let caughtError: SolanaError | null = null;
      try {
        assertCryptoSupport();
      } catch (error) {
        caughtError = error as SolanaError;
      }

      expect(caughtError).toBeInstanceOf(SolanaError);
      expect(caughtError?.code).toBe('CRYPTO_NOT_SUPPORTED');
    });

    it('should throw CRYPTO_NOT_SUPPORTED when crypto.subtle is undefined', () => {
      setCrypto({});

      let caughtError: SolanaError | null = null;
      try {
        assertCryptoSupport();
      } catch (error) {
        caughtError = error as SolanaError;
      }

      expect(caughtError).toBeInstanceOf(SolanaError);
      expect(caughtError?.code).toBe('CRYPTO_NOT_SUPPORTED');
    });

    it('should include operation context in error', () => {
      setCrypto(undefined);

      let caughtError: SolanaError | null = null;
      try {
        assertCryptoSupport();
      } catch (error) {
        caughtError = error as SolanaError;
      }

      expect(caughtError).toBeInstanceOf(SolanaError);
      expect(caughtError?.code).toBe('CRYPTO_NOT_SUPPORTED');
      expect(caughtError?.context?.operation).toBe('WebCrypto');
    });
  });

  describe('testEd25519Support', () => {
    beforeEach(() => {
      setCrypto(mockCrypto);
    });

    it('should return true when Ed25519 is supported', async () => {
      mockCrypto.subtle.generateKey.mockResolvedValue({
        privateKey: { algorithm: { name: 'Ed25519' } },
        publicKey: { algorithm: { name: 'Ed25519' } },
      });

      const isSupported = await testEd25519Support();

      expect(isSupported).toBe(true);
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith({ name: 'Ed25519' }, false, [
        'sign',
        'verify',
      ]);
    });

    it('should return false when Ed25519 is not supported', async () => {
      mockCrypto.subtle.generateKey.mockRejectedValue(new Error('Algorithm not supported'));

      const isSupported = await testEd25519Support();

      expect(isSupported).toBe(false);
    });

    it('should return false when generateKey throws any error', async () => {
      mockCrypto.subtle.generateKey.mockRejectedValue(
        new DOMException('Operation not supported', 'NotSupportedError'),
      );

      const isSupported = await testEd25519Support();

      expect(isSupported).toBe(false);
    });

    it('should return false when generateKey returns null', async () => {
      mockCrypto.subtle.generateKey.mockResolvedValue(null);

      const isSupported = await testEd25519Support();

      expect(isSupported).toBe(false);
    });

    it('should handle synchronous errors gracefully', async () => {
      mockCrypto.subtle.generateKey.mockImplementation(() => {
        throw new Error('Immediate error');
      });

      const isSupported = await testEd25519Support();

      expect(isSupported).toBe(false);
    });

    it('should handle missing crypto.subtle gracefully', async () => {
      setCrypto({});

      const isSupported = await testEd25519Support();

      expect(isSupported).toBe(false);
    });

    it('should handle missing crypto gracefully', async () => {
      setCrypto(undefined);

      const isSupported = await testEd25519Support();

      expect(isSupported).toBe(false);
    });

    it('should not leak test keys', async () => {
      // Ensure test keys are non-extractable
      mockCrypto.subtle.generateKey.mockResolvedValue({
        privateKey: { algorithm: { name: 'Ed25519' } },
        publicKey: { algorithm: { name: 'Ed25519' } },
      });

      await testEd25519Support();

      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        { name: 'Ed25519' },
        false, // non-extractable
        ['sign', 'verify'],
      );
    });
  });

  describe('error context and messages', () => {
    it('should provide meaningful error messages', () => {
      setCrypto(undefined);

      let error: SolanaError | null = null;
      try {
        assertCryptoSupport();
      } catch (e) {
        error = e as SolanaError;
      }

      expect(error?.message).toContain('Cryptographic operation not supported');
      expect(error?.context?.details).toContain('WebCrypto API not available');
    });

    it('should include operation in error context', () => {
      setCrypto({ subtle: null });

      let error: SolanaError | null = null;
      try {
        assertCryptoSupport();
      } catch (e) {
        error = e as SolanaError;
      }

      expect(error?.context?.operation).toBe('WebCrypto');
    });
  });

  describe('edge cases', () => {
    it('should handle frozen crypto object', () => {
      const frozenCrypto = Object.freeze({ subtle: Object.freeze({}) });
      setCrypto(frozenCrypto);

      const compatibility = checkCryptoCompatibility();
      expect(compatibility.hasWebCrypto).toBe(true);
    });

    it('should handle crypto with getter that throws', () => {
      // For this test, we'll test the behavior when checkCryptoCompatibility
      // encounters an error during crypto access
      const cryptoWithThrowingGetter = {
        get subtle() {
          throw new Error('Crypto access denied');
        },
      };
      setCrypto(cryptoWithThrowingGetter);

      // The function should handle the error gracefully
      expect(() => checkCryptoCompatibility()).not.toThrow();

      const compatibility = checkCryptoCompatibility();
      // Should report as not supported if access throws
      expect(compatibility.hasWebCrypto).toBe(false);
    });

    it('should handle toString method calls on crypto', () => {
      const mockCryptoWithToString = {
        subtle: mockCrypto.subtle,
        toString() {
          return '[object Crypto]';
        },
      };
      setCrypto(mockCryptoWithToString);

      const compatibility = checkCryptoCompatibility();
      expect(compatibility.hasWebCrypto).toBe(true);
    });
  });
});
