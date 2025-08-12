import { importSolanaKeySigner, type CryptoKeySigner } from '@photon/signers';
import { decodeBase58 } from '@photon/codecs/primitives/base58';
import type { Address } from '@photon/addresses';

/**
 * Parse a private key string in various formats into a Uint8Array.
 * Supports:
 * - Base58 encoded string (standard Solana format)
 * - Hex string (with or without 0x prefix)
 * - JSON array of numbers (e.g., "[1,2,3,...]")
 * - Comma-separated numbers (e.g., "1,2,3,...")
 *
 * @param privateKeyString - Private key in any supported format
 * @returns Uint8Array of the private key bytes
 */
export function parsePrivateKey(privateKeyString: string): Uint8Array {
  // Remove whitespace
  const trimmed = privateKeyString.trim();

  // Try to detect format

  // JSON array format: "[1,2,3,...]"
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.every((n) => typeof n === 'number')) {
        return new Uint8Array(parsed);
      }
    } catch {
      // Not valid JSON, continue to other formats
    }
  }

  // Comma-separated format: "1,2,3,..."
  if (trimmed.includes(',')) {
    try {
      const numbers = trimmed.split(',').map((s) => {
        const num = parseInt(s.trim(), 10);
        if (isNaN(num) || num < 0 || num > 255) {
          throw new Error('Invalid byte value');
        }
        return num;
      });
      return new Uint8Array(numbers);
    } catch {
      // Not valid comma-separated, continue
    }
  }

  // Hex format: "0x..." or "..."
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    return hexToBytes(trimmed.slice(2));
  }

  // Check if it looks like hex (all hex characters)
  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    // Must be even length for valid hex
    if (trimmed.length % 2 === 0) {
      try {
        return hexToBytes(trimmed);
      } catch {
        // Not valid hex, try base58
      }
    }
  }

  // Default to Base58 (standard Solana format)
  try {
    return decodeBase58(trimmed);
  } catch (error) {
    throw new Error(
      `Failed to parse private key. Supported formats: Base58, hex (with/without 0x), ` +
        `JSON array [1,2,3,...], or comma-separated bytes. Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    );
  }
}

/**
 * Convert a hex string to bytes.
 * @param hex - Hex string (without 0x prefix)
 * @returns Uint8Array of bytes
 */
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.substring(i, i + 2), 16);
    if (isNaN(byte)) {
      throw new Error(`Invalid hex character at position ${i}`);
    }
    bytes[i / 2] = byte;
  }
  return bytes;
}

/**
 * Import a wallet from a private key string in various formats.
 * Supports:
 * - Base58 encoded string (standard Solana format)
 * - Hex string (with or without 0x prefix)
 * - JSON array of numbers (e.g., "[1,2,3,...]")
 * - Comma-separated numbers (e.g., "1,2,3,...")
 *
 * The private key must be either:
 * - 64 bytes: Standard Solana keypair format (32-byte seed + 32-byte public key)
 * - 32 bytes: Just the seed (not currently supported by the SDK)
 *
 * @param privateKeyString - Private key string in any supported format
 * @returns Promise resolving to signer and address
 */
export async function importWalletFromPrivateKey(
  privateKeyString: string,
): Promise<{ signer: CryptoKeySigner; address: Address }> {
  try {
    // Parse the private key from any supported format
    const privateKeyBytes = parsePrivateKey(privateKeyString);

    let signer: CryptoKeySigner;

    if (privateKeyBytes.length === 64) {
      // 64-byte format: Solana standard format (seed + public key)
      signer = await importSolanaKeySigner(privateKeyBytes, { extractable: true });
    } else if (privateKeyBytes.length === 32) {
      // 32-byte seed format - we need to derive the public key
      // For this, we'll need to generate the keypair from the seed
      // This is a limitation - we need the public key bytes to use importCryptoKeySigner
      throw new Error(
        'Pure 32-byte seed import is not directly supported. ' +
          'Please use a 64-byte Solana keypair format (seed + public key).',
      );
    } else {
      throw new Error(
        `Invalid private key length: ${privateKeyBytes.length} bytes. ` +
          `Expected 64 bytes (Solana keypair format).`,
      );
    }

    // Get the address from the signer
    const address = await signer.getPublicKey();

    // Return only the signer and address - no KeyPair wrapper
    return { signer, address };
  } catch (error) {
    throw new Error(
      `Failed to import wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
