import { describe, it, expect } from 'vitest';
import { generateKeyPair } from '../src/key-generation.js';
import { isAddress } from '@photon/addresses';

describe('KeyPair Integration Tests', () => {
  describe('getAddress with real crypto', () => {
    it('should derive a valid Solana address from a key pair', async () => {
      // Generate a real key pair
      const keyPair = await generateKeyPair({ extractable: true });
      const address = await keyPair.getAddress();

      // Verify it's a valid Solana address
      expect(isAddress(address)).toBe(true);
      expect(typeof address).toBe('string');
      expect(address.length).toBeGreaterThan(30); // Base58 addresses are typically 32-44 chars
    });

    it('should derive consistent addresses for the same public key', async () => {
      const keyPair = await generateKeyPair({ extractable: true });

      const address1 = await keyPair.getAddress();
      const address2 = await keyPair.getAddress();

      expect(address1).toBe(address2);
    });

    it('should derive different addresses for different key pairs', async () => {
      const keyPair1 = await generateKeyPair({ extractable: true });
      const keyPair2 = await generateKeyPair({ extractable: true });

      const address1 = await keyPair1.getAddress();
      const address2 = await keyPair2.getAddress();

      expect(address1).not.toBe(address2);
    });

    it('should throw for deterministic key generation (not yet implemented)', async () => {
      // Use the same seed to generate deterministic key pairs
      const seed = new Uint8Array(32);
      seed.fill(42); // Arbitrary but deterministic seed

      // Should throw since seed-based generation is not yet implemented
      await expect(generateKeyPair({ seed, extractable: true })).rejects.toThrow(
        'seed-based key generation',
      );
    });

    it('should match expected format for random key pair', async () => {
      // Create a random key pair (since seed-based is not implemented)
      const keyPair = await generateKeyPair({ extractable: true });
      const address = await keyPair.getAddress();

      // The address should be valid base58
      expect(isAddress(address)).toBe(true);

      // Export the public key to verify
      const publicKeyBytes = await keyPair.getPublicKeyBytes();
      expect(publicKeyBytes).toBeInstanceOf(Uint8Array);
      expect(publicKeyBytes.length).toBe(32);
    });

    it('should work with non-extractable keys', async () => {
      const keyPair = await generateKeyPair({ extractable: false });
      const address = await keyPair.getAddress();

      expect(isAddress(address)).toBe(true);
    });
  });
});
