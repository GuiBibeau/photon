import { SolanaError } from '@photon/errors';
import type { KeyGenerationOptions } from './types.js';
import { assertCryptoSupport, testEd25519Support } from './compatibility.js';
import { KeyPair } from './keypair.js';

/**
 * Generate a new Ed25519 key pair using WebCrypto API.
 *
 * @param options - Configuration options for key generation
 * @returns Promise resolving to a KeyPair wrapper
 *
 * @throws {SolanaError} When crypto operations are not supported or key generation fails
 *
 * @example
 * ```typescript
 * // Generate a non-extractable key pair (default, more secure)
 * const keyPair = await generateKeyPair();
 *
 * // Generate an extractable key pair (less secure, allows key export)
 * const extractableKeyPair = await generateKeyPair({ extractable: true });
 * ```
 */
export async function generateKeyPair(options?: KeyGenerationOptions): Promise<KeyPair> {
  // Validate environment support
  assertCryptoSupport();

  // Validate options
  if (options && typeof options !== 'object') {
    throw new SolanaError('INVALID_KEY_OPTIONS', { details: 'Options must be an object' });
  }

  const extractable = options?.extractable ?? false;
  const seed = options?.seed;

  // Validate seed if provided
  if (seed) {
    if (!(seed instanceof Uint8Array)) {
      throw new SolanaError('INVALID_KEY_OPTIONS', { details: 'Seed must be a Uint8Array' });
    }
    if (seed.length !== 32) {
      throw new SolanaError('INVALID_KEY_OPTIONS', { details: 'Seed must be exactly 32 bytes' });
    }
  }

  try {
    // First, test if Ed25519 is actually supported
    const isEd25519Supported = await testEd25519Support();
    if (!isEd25519Supported) {
      throw new SolanaError('CRYPTO_NOT_SUPPORTED', {
        operation: 'Ed25519',
        details: 'Ed25519 algorithm is not supported in this browser',
      });
    }

    let cryptoKeyPair: CryptoKeyPair;

    if (seed) {
      // Generate from seed by importing the seed as a private key
      const privateKey = await crypto.subtle.importKey(
        'raw',
        seed as BufferSource,
        { name: 'Ed25519' },
        extractable,
        ['sign'],
      );

      // Derive the public key from the private key
      const publicKeyData = await crypto.subtle.exportKey('raw', privateKey);
      const publicKey = await crypto.subtle.importKey(
        'raw',
        publicKeyData,
        { name: 'Ed25519' },
        true,
        ['verify'],
      );

      cryptoKeyPair = { privateKey, publicKey };
    } else {
      // Generate random key pair
      cryptoKeyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, extractable, [
        'sign',
        'verify',
      ]);
    }

    // Validate the generated key pair
    if (!cryptoKeyPair || !cryptoKeyPair.privateKey || !cryptoKeyPair.publicKey) {
      throw new SolanaError('KEY_GENERATION_FAILED', {
        reason: 'Generated key pair is incomplete',
      });
    }

    // Validate key algorithms
    if (
      cryptoKeyPair.privateKey.algorithm.name !== 'Ed25519' ||
      cryptoKeyPair.publicKey.algorithm.name !== 'Ed25519'
    ) {
      throw new SolanaError('KEY_GENERATION_FAILED', {
        reason: 'Generated keys have incorrect algorithm',
      });
    }

    // Validate key usages
    if (
      !cryptoKeyPair.privateKey.usages.includes('sign') ||
      !cryptoKeyPair.publicKey.usages.includes('verify')
    ) {
      throw new SolanaError('KEY_GENERATION_FAILED', {
        reason: 'Generated keys have incorrect usage permissions',
      });
    }

    return new KeyPair(cryptoKeyPair);
  } catch (error) {
    // Re-throw SolanaError instances
    if (error instanceof SolanaError) {
      throw error;
    }

    // Wrap other errors
    throw new SolanaError(
      'KEY_GENERATION_FAILED',
      {
        reason: error instanceof Error ? error.message : 'Unknown error during key generation',
      },
      error instanceof Error ? error : undefined,
    );
  }
}
