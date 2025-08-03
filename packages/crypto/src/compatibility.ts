import { SolanaError } from '@photon/errors';
import type { CryptoCompatibility } from './types.js';

/**
 * Check browser compatibility for Ed25519 cryptographic operations.
 * @returns Compatibility information object
 */
export function checkCryptoCompatibility(): CryptoCompatibility {
  let hasWebCrypto = false;

  try {
    hasWebCrypto =
      typeof crypto !== 'undefined' &&
      crypto !== null &&
      typeof crypto.subtle !== 'undefined' &&
      crypto.subtle !== null;
  } catch {
    // If accessing crypto or crypto.subtle throws, treat as not supported
    hasWebCrypto = false;
  }

  if (!hasWebCrypto) {
    return {
      hasWebCrypto: false,
      hasEd25519: false,
      isFullySupported: false,
      message: 'WebCrypto API is not available in this environment.',
    };
  }

  // Ed25519 support detection is tricky since we can't easily test without
  // actually trying to generate a key. For now, we assume modern browsers
  // that have WebCrypto also support Ed25519.
  // This will be validated during actual key generation.
  const hasEd25519 = true; // Optimistic assumption

  const isFullySupported = hasWebCrypto && hasEd25519;

  return {
    hasWebCrypto,
    hasEd25519,
    isFullySupported,
    message: isFullySupported
      ? 'Full Ed25519 crypto support available.'
      : 'Ed25519 cryptographic operations may not be supported.',
  };
}

/**
 * Assert that the current environment supports Ed25519 operations.
 * Throws an error if crypto operations are not supported.
 */
export function assertCryptoSupport(): void {
  const compatibility = checkCryptoCompatibility();

  if (!compatibility.hasWebCrypto) {
    throw new SolanaError('CRYPTO_NOT_SUPPORTED', {
      operation: 'WebCrypto',
      details: 'WebCrypto API not available in this environment',
    });
  }

  // Additional Ed25519-specific checks will be performed during actual operations
}

/**
 * Check if Ed25519 is supported by attempting a test operation.
 * This is more reliable than feature detection alone.
 * @returns Promise resolving to true if Ed25519 is supported
 */
export async function testEd25519Support(): Promise<boolean> {
  try {
    // First check if crypto is available
    if (typeof crypto === 'undefined' || typeof crypto.subtle === 'undefined') {
      return false;
    }

    // Attempt to generate a test key pair
    const result = await crypto.subtle.generateKey(
      { name: 'Ed25519' },
      false, // non-extractable test key
      ['sign', 'verify'],
    );

    // Verify we got a valid result
    return result !== null && typeof result === 'object';
  } catch {
    return false;
  }
}
