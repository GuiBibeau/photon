import type { Address } from './index.js';
import { addressFromBytes } from './index.js';

/**
 * Derive a Solana address from a public key
 * @param publicKey - The public key as a Uint8Array or CryptoKey
 * @returns The derived Solana address
 */
export function getAddressFromPublicKey(publicKey: Uint8Array | CryptoKey): Address {
  if (publicKey instanceof Uint8Array) {
    return getAddressFromPublicKeyBytes(publicKey);
  }

  throw new Error(
    'CryptoKey public key derivation requires async. Use getAddressFromPublicKeyAsync instead.',
  );
}

/**
 * Derive a Solana address from public key bytes
 * @param publicKeyBytes - The 32-byte public key
 * @returns The derived Solana address
 */
export function getAddressFromPublicKeyBytes(publicKeyBytes: Uint8Array): Address {
  if (publicKeyBytes.length !== 32) {
    throw new Error(`Invalid public key length: ${publicKeyBytes.length}. Expected 32 bytes.`);
  }

  // A Solana address is simply the base58-encoded public key
  return addressFromBytes(publicKeyBytes);
}

/**
 * Asynchronously derive a Solana address from a CryptoKey
 * @param publicKey - The CryptoKey containing the public key
 * @returns The derived Solana address
 */
export async function getAddressFromPublicKeyAsync(publicKey: CryptoKey): Promise<Address> {
  // Export the public key to raw format
  const publicKeyBytes = await crypto.subtle.exportKey('raw', publicKey);
  return getAddressFromPublicKeyBytes(new Uint8Array(publicKeyBytes));
}
