/**
 * Base64 encoding/decoding utilities for RPC responses.
 *
 * Handles conversion between base64-encoded strings and Uint8Array
 * for account data and other binary content.
 */

/**
 * Decode a base64 string to Uint8Array.
 */
export function decodeBase64(base64: string): Uint8Array {
  // Remove any whitespace
  const cleaned = base64.replace(/\s/g, '');

  // Validate base64 format
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
    throw new Error('Invalid base64 string');
  }

  // Handle empty string
  if (cleaned.length === 0) {
    return new Uint8Array(0);
  }

  // Use native atob for browser/Node.js compatibility
  const binaryString = atob(cleaned);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Encode a Uint8Array to base64 string.
 */
export function encodeBase64(bytes: Uint8Array): string {
  // Convert bytes to binary string
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binaryString += String.fromCharCode(byte);
    }
  }

  // Use native btoa for encoding
  return btoa(binaryString);
}

/**
 * Decode base64 or base58 encoded data based on encoding type.
 */
export function decodeData(
  data: string | string[],
  encoding: 'base64' | 'base58' | 'base64+zstd' | 'jsonParsed',
): Uint8Array | unknown {
  if (encoding === 'jsonParsed') {
    // For jsonParsed, data is already decoded
    return data;
  }

  if (Array.isArray(data)) {
    // Handle array format [data, encoding]
    if (data.length !== 2 || typeof data[0] !== 'string' || typeof data[1] !== 'string') {
      throw new Error('Invalid data array format');
    }
    const [encodedData, dataEncoding] = data;

    if (dataEncoding === 'base64') {
      return decodeBase64(encodedData);
    } else if (dataEncoding === 'base58') {
      // Base58 decoding would be handled by addresses module
      throw new Error('Base58 decoding not implemented in this module');
    } else {
      throw new Error(`Unsupported encoding: ${dataEncoding}`);
    }
  }

  if (typeof data !== 'string') {
    throw new Error('Data must be a string or array');
  }

  if (encoding === 'base64') {
    return decodeBase64(data);
  } else if (encoding === 'base64+zstd') {
    // First decode base64, then decompress
    // Note: zstd decompression would require additional implementation
    throw new Error('Zstd decompression not yet implemented');
  } else if (encoding === 'base58') {
    // Base58 decoding would be handled by addresses module
    throw new Error('Base58 decoding not implemented in this module');
  }

  throw new Error(`Unsupported encoding: ${encoding}`);
}

/**
 * Parse account data from RPC response.
 */
export function parseAccountData(
  data: unknown,
  encoding?: 'base64' | 'base58' | 'base64+zstd' | 'jsonParsed',
): Uint8Array | unknown {
  if (data === null || data === undefined) {
    return new Uint8Array(0);
  }

  // Handle different data formats from RPC
  if (Array.isArray(data) && data.length === 2) {
    // Format: [data, encoding]
    return decodeData(data, encoding ?? 'base64');
  }

  if (typeof data === 'string') {
    // Single string, use provided encoding
    return decodeData(data, encoding ?? 'base64');
  }

  if (typeof data === 'object' && data !== null && 'parsed' in data) {
    // Already parsed JSON data
    return data;
  }

  // Return as-is for unknown formats
  return data;
}

/**
 * Check if a string is valid base64.
 */
export function isBase64(str: string): boolean {
  try {
    const cleaned = str.replace(/\s/g, '');
    if (cleaned.length === 0) {
      return true;
    }
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
      return false;
    }
    // Try to decode to verify
    atob(cleaned);
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculate the byte size of a base64-encoded string.
 */
export function base64ByteSize(base64: string): number {
  const cleaned = base64.replace(/\s/g, '');
  if (cleaned.length === 0) {
    return 0;
  }

  // Calculate based on base64 length
  // Every 4 base64 chars = 3 bytes
  const padding = (cleaned.match(/=/g) || []).length;
  return Math.floor((cleaned.length * 3) / 4) - padding;
}
