/**
 * Base58 codec implementation for encoding and decoding base58 strings.
 *
 * This implementation uses the specific base58 alphabet used by Solana
 * and handles encoding/decoding between Uint8Array and base58 strings.
 * It's primarily used for encoding addresses and signatures.
 */

import type { VariableSizeCodec } from '../codec.js';
import { CodecError } from '../errors.js';

/**
 * The base58 alphabet used by Solana (Bitcoin alphabet).
 * This excludes characters that can be confused: 0, O, I, l
 */
export const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Lookup table for base58 character to index conversion.
 * Pre-computed for performance.
 */
const BASE58_LOOKUP: { [char: string]: number } = {};
for (let i = 0; i < BASE58_ALPHABET.length; i++) {
  const char = BASE58_ALPHABET[i];
  if (char !== undefined) {
    BASE58_LOOKUP[char] = i;
  }
}

/**
 * The base value for base58 encoding as a BigInt.
 */
const BASE = 58n;

/**
 * Encode a Uint8Array to a base58 string.
 *
 * @param bytes The bytes to encode
 * @returns The base58 encoded string
 */
export function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return '';
  }

  // Count leading zeros
  let leadingZeros = 0;
  for (const byte of bytes) {
    if (byte === 0) {
      leadingZeros++;
    } else {
      break;
    }
  }

  // Convert bytes to a big integer
  // Process bytes in big-endian order (most significant byte first)
  let num = 0n;
  for (const byte of bytes) {
    num = num * 256n + BigInt(byte);
  }

  // Convert to base58
  const encoded: string[] = [];
  if (num === 0n) {
    // If all bytes were zero, we just return the leading zeros as '1's
    return '1'.repeat(bytes.length);
  }

  while (num > 0n) {
    const remainder = num % BASE;
    num = num / BASE;
    const index = Number(remainder);
    const char = BASE58_ALPHABET[index];
    if (char !== undefined) {
      encoded.push(char);
    }
  }

  // Add the appropriate number of '1's for leading zeros
  const prefix = '1'.repeat(leadingZeros);

  // Reverse the encoded array and join with prefix
  return prefix + encoded.reverse().join('');
}

/**
 * Decode a base58 string to a Uint8Array.
 *
 * @param str The base58 string to decode
 * @returns The decoded bytes
 * @throws {CodecError} If the string contains invalid base58 characters
 */
export function decodeBase58(str: string): Uint8Array {
  if (str.length === 0) {
    return new Uint8Array(0);
  }

  // Validate all characters are in the alphabet
  for (const char of str) {
    if (!(char in BASE58_LOOKUP)) {
      throw new CodecError(`Invalid base58 character: '${char}'`);
    }
  }

  // Count leading '1's - each '1' represents a zero byte
  let leadingOnes = 0;
  for (const char of str) {
    if (char === '1') {
      leadingOnes++;
    } else {
      break;
    }
  }

  // Convert from base58 to big integer
  let num = 0n;
  for (const char of str) {
    const value = BASE58_LOOKUP[char];
    if (value !== undefined) {
      num = num * BASE + BigInt(value);
    }
  }

  // Convert big integer to bytes
  const bytes: number[] = [];
  if (num === 0n && leadingOnes > 0) {
    // Special case: all '1's means all zero bytes
    return new Uint8Array(leadingOnes);
  }

  while (num > 0n) {
    bytes.push(Number(num % 256n));
    num = num / 256n;
  }

  // Add the appropriate number of zero bytes for leading '1's
  const zeros = new Array(leadingOnes).fill(0);

  // Reverse the bytes array (to big-endian) and combine with leading zeros
  return new Uint8Array([...zeros, ...bytes.reverse()]);
}

/**
 * Check if a string is valid base58.
 *
 * @param str The string to check
 * @returns True if the string contains only valid base58 characters
 */
export function isBase58(str: string): boolean {
  if (typeof str !== 'string') {
    return false;
  }

  for (const char of str) {
    if (!(char in BASE58_LOOKUP)) {
      return false;
    }
  }

  return true;
}

/**
 * Codec for base58 encoded strings.
 *
 * This codec encodes Uint8Array values to base58 strings and vice versa.
 * It's primarily used for Solana addresses and signatures.
 */
export const base58: VariableSizeCodec<Uint8Array> = {
  encode(value: Uint8Array): Uint8Array {
    if (!(value instanceof Uint8Array)) {
      throw new CodecError('Value must be a Uint8Array');
    }

    const encoded = encodeBase58(value);
    // Convert the base58 string to UTF-8 bytes
    return new TextEncoder().encode(encoded);
  },

  decode(bytes: Uint8Array, offset = 0): readonly [Uint8Array, number] {
    // For base58, we need to know where the string ends.
    // In practice, base58 strings in Solana are often fixed-size (like addresses)
    // or have a known context. For a general codec, we'd need a length prefix.
    // Since base58 is typically used with known sizes, we'll decode the entire
    // remaining buffer as a base58 string.
    const stringBytes = bytes.slice(offset);
    const str = new TextDecoder().decode(stringBytes);

    // Find the end of the base58 string (first non-base58 character or end)
    let endIndex = 0;
    for (const char of str) {
      if (char in BASE58_LOOKUP) {
        endIndex++;
      } else {
        break;
      }
    }

    if (endIndex === 0) {
      throw new CodecError('No valid base58 string found at offset');
    }

    const base58Str = str.substring(0, endIndex);
    const decoded = decodeBase58(base58Str);

    // Return the decoded bytes and the number of bytes consumed from input
    return [decoded, endIndex] as const;
  },

  size(value: Uint8Array): number {
    if (!(value instanceof Uint8Array)) {
      throw new CodecError('Value must be a Uint8Array');
    }

    // The size is the UTF-8 byte length of the base58 encoded string
    const encoded = encodeBase58(value);
    return new TextEncoder().encode(encoded).length;
  },
};

/**
 * Create a base58 string codec that encodes/decodes strings directly.
 *
 * This is useful when you want to work with base58 strings rather than
 * the underlying byte arrays.
 */
export const base58String: VariableSizeCodec<string> = {
  encode(value: string): Uint8Array {
    if (typeof value !== 'string') {
      throw new CodecError('Value must be a string');
    }

    if (!isBase58(value)) {
      throw new CodecError('String contains invalid base58 characters');
    }

    // Simply encode the string as UTF-8
    return new TextEncoder().encode(value);
  },

  decode(bytes: Uint8Array, offset = 0): readonly [string, number] {
    // Decode UTF-8 bytes to string
    const stringBytes = bytes.slice(offset);
    const str = new TextDecoder().decode(stringBytes);

    // Find the end of the base58 string
    let endIndex = 0;
    for (const char of str) {
      if (char in BASE58_LOOKUP) {
        endIndex++;
      } else {
        break;
      }
    }

    if (endIndex === 0) {
      throw new CodecError('No valid base58 string found at offset');
    }

    const base58Str = str.substring(0, endIndex);
    return [base58Str, endIndex] as const;
  },

  size(value: string): number {
    if (typeof value !== 'string') {
      throw new CodecError('Value must be a string');
    }

    if (!isBase58(value)) {
      throw new CodecError('String contains invalid base58 characters');
    }

    return new TextEncoder().encode(value).length;
  },
};
