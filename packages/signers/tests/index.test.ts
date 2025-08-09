import { describe, it, expect } from 'vitest';
import * as signers from '../src/index.js';

describe('Package Exports', () => {
  it('should export interface types and utilities', () => {
    // Test that the main Signer interface type is available (implicitly through type checking)
    expect(signers).toBeDefined();
  });

  it('should export multi-signer utilities', () => {
    expect(signers.deduplicateSigners).toBeDefined();
    expect(typeof signers.deduplicateSigners).toBe('function');

    expect(signers.orderSigners).toBeDefined();
    expect(typeof signers.orderSigners).toBe('function');

    expect(signers.createSignerCollection).toBeDefined();
    expect(typeof signers.createSignerCollection).toBe('function');

    expect(signers.signWithMultiple).toBeDefined();
    expect(typeof signers.signWithMultiple).toBe('function');

    expect(signers.extractSignerInfo).toBeDefined();
    expect(typeof signers.extractSignerInfo).toBe('function');
  });

  it('should export guard functions', () => {
    expect(signers.isSigner).toBeDefined();
    expect(typeof signers.isSigner).toBe('function');

    expect(signers.assertSigner).toBeDefined();
    expect(typeof signers.assertSigner).toBe('function');

    expect(signers.isSignerInfo).toBeDefined();
    expect(typeof signers.isSignerInfo).toBe('function');

    expect(signers.isSigningResult).toBeDefined();
    expect(typeof signers.isSigningResult).toBe('function');

    expect(signers.isValidSignature).toBeDefined();
    expect(typeof signers.isValidSignature).toBe('function');

    expect(signers.isValidAddress).toBeDefined();
    expect(typeof signers.isValidAddress).toBe('function');

    expect(signers.validateSignerCollection).toBeDefined();
    expect(typeof signers.validateSignerCollection).toBe('function');
  });

  it('should export WebCrypto signer utilities', () => {
    expect(signers.CryptoKeySigner).toBeDefined();
    expect(typeof signers.CryptoKeySigner).toBe('function');

    expect(signers.generateCryptoKeySigner).toBeDefined();
    expect(typeof signers.generateCryptoKeySigner).toBe('function');

    expect(signers.fromCryptoKeyPair).toBeDefined();
    expect(typeof signers.fromCryptoKeyPair).toBe('function');

    expect(signers.importCryptoKeySignerFromKeyPair).toBeDefined();
    expect(typeof signers.importCryptoKeySignerFromKeyPair).toBe('function');

    expect(signers.importCryptoKeySigner).toBeDefined();
    expect(typeof signers.importCryptoKeySigner).toBe('function');

    expect(signers.importSolanaKeySigner).toBeDefined();
    expect(typeof signers.importSolanaKeySigner).toBe('function');

    expect(signers.isCryptoKeySigner).toBeDefined();
    expect(typeof signers.isCryptoKeySigner).toBe('function');
  });

  it('should export all expected items', () => {
    const expectedExports = [
      // Multi-signer utilities
      'deduplicateSigners',
      'orderSigners',
      'createSignerCollection',
      'signWithMultiple',
      'extractSignerInfo',
      // Guards
      'isSigner',
      'assertSigner',
      'isSignerInfo',
      'isSigningResult',
      'isValidSignature',
      'isValidAddress',
      'assertSignerInfo',
      'assertValidSignature',
      'assertValidAddress',
      'validateSignerCollection',
      // WebCrypto signer
      'CryptoKeySigner',
      'generateCryptoKeySigner',
      'fromCryptoKeyPair',
      'importCryptoKeySignerFromKeyPair',
      'importCryptoKeySigner',
      'importSolanaKeySigner',
      'isCryptoKeySigner',
    ];

    expectedExports.forEach((exportName) => {
      expect(signers).toHaveProperty(exportName);
    });
  });
});
