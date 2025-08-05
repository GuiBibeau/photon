import { describe, it, expect } from 'vitest';
import {
  getAddressFromPublicKey,
  getAddressFromPublicKeyBytes,
  getAddressFromPublicKeyAsync,
} from '../src/derive.js';
import { isAddress } from '../src/index.js';

describe('Address Derivation', () => {
  describe('getAddressFromPublicKeyBytes', () => {
    it('should derive a valid address from 32-byte public key', () => {
      // Test with a known public key
      const publicKeyBytes = new Uint8Array(32);
      publicKeyBytes[0] = 1; // Set first byte to make it non-zero

      const address = getAddressFromPublicKeyBytes(publicKeyBytes);

      expect(typeof address).toBe('string');
      expect(isAddress(address)).toBe(true);
    });

    it('should produce consistent addresses for the same public key', () => {
      const publicKeyBytes = new Uint8Array(32);
      publicKeyBytes.fill(42); // Fill with arbitrary value

      const address1 = getAddressFromPublicKeyBytes(publicKeyBytes);
      const address2 = getAddressFromPublicKeyBytes(publicKeyBytes);

      expect(address1).toBe(address2);
    });

    it('should produce different addresses for different public keys', () => {
      const publicKeyBytes1 = new Uint8Array(32);
      publicKeyBytes1[0] = 1;

      const publicKeyBytes2 = new Uint8Array(32);
      publicKeyBytes2[0] = 2;

      const address1 = getAddressFromPublicKeyBytes(publicKeyBytes1);
      const address2 = getAddressFromPublicKeyBytes(publicKeyBytes2);

      expect(address1).not.toBe(address2);
    });

    it('should throw for invalid public key length', () => {
      const invalidKey1 = new Uint8Array(31); // Too short
      const invalidKey2 = new Uint8Array(33); // Too long

      expect(() => getAddressFromPublicKeyBytes(invalidKey1)).toThrow(
        'Invalid public key length: 31',
      );
      expect(() => getAddressFromPublicKeyBytes(invalidKey2)).toThrow(
        'Invalid public key length: 33',
      );
    });

    it('should handle all-zero public key', () => {
      const zeroKey = new Uint8Array(32);
      const address = getAddressFromPublicKeyBytes(zeroKey);

      expect(isAddress(address)).toBe(true);
      // The all-zero key should produce the address "11111111111111111111111111111111"
      expect(address).toBe('11111111111111111111111111111111');
    });

    it('should handle all-255 public key', () => {
      const maxKey = new Uint8Array(32);
      maxKey.fill(255);

      const address = getAddressFromPublicKeyBytes(maxKey);
      expect(isAddress(address)).toBe(true);
    });
  });

  describe('getAddressFromPublicKey', () => {
    it('should handle Uint8Array input', () => {
      const publicKeyBytes = new Uint8Array(32);
      publicKeyBytes[0] = 1;

      const address = getAddressFromPublicKey(publicKeyBytes);
      expect(isAddress(address)).toBe(true);
    });

    it('should throw for CryptoKey input in sync function', () => {
      // Mock CryptoKey (can't create real one in sync test)
      const mockCryptoKey = {} as CryptoKey;

      expect(() => getAddressFromPublicKey(mockCryptoKey)).toThrow(
        'CryptoKey public key derivation requires async',
      );
    });
  });

  describe('getAddressFromPublicKeyAsync', () => {
    it('should derive address from CryptoKey', async () => {
      // Generate a real Ed25519 key pair
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'Ed25519',
          namedCurve: 'Ed25519',
        },
        true, // extractable
        ['sign', 'verify'],
      );

      const address = await getAddressFromPublicKeyAsync(keyPair.publicKey);
      expect(isAddress(address)).toBe(true);
    });

    it('should produce same address as sync version', async () => {
      // Generate a key pair and export the public key
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'Ed25519',
          namedCurve: 'Ed25519',
        },
        true,
        ['sign', 'verify'],
      );

      const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
      const publicKeyBytes = new Uint8Array(publicKeyBuffer);

      const asyncAddress = await getAddressFromPublicKeyAsync(keyPair.publicKey);
      const syncAddress = getAddressFromPublicKeyBytes(publicKeyBytes);

      expect(asyncAddress).toBe(syncAddress);
    });

    it('should handle multiple keys concurrently', async () => {
      // Generate multiple key pairs
      const keyPairs = await Promise.all(
        Array(5)
          .fill(null)
          .map(() =>
            crypto.subtle.generateKey(
              {
                name: 'Ed25519',
                namedCurve: 'Ed25519',
              },
              true,
              ['sign', 'verify'],
            ),
          ),
      );

      // Derive addresses concurrently
      const addresses = await Promise.all(
        keyPairs.map((kp) => getAddressFromPublicKeyAsync(kp.publicKey)),
      );

      // All should be valid addresses
      addresses.forEach((address) => {
        expect(isAddress(address)).toBe(true);
      });

      // All should be unique (extremely unlikely to have duplicates)
      const uniqueAddresses = new Set(addresses);
      expect(uniqueAddresses.size).toBe(addresses.length);
    });
  });
});
