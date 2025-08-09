/**
 * Primitive codec implementations for basic data types.
 *
 * This module exports all primitive codecs used throughout the Photon SDK
 * for encoding and decoding basic data types like numbers, strings, bytes,
 * and booleans.
 */

// Numeric codecs
export { u8, u16, u32, u64, i8, i16, i32, i64 } from './numeric.js';

// Byte array codecs
export { fixedBytes, bytes, bytesWithCustomSize, publicKey } from './bytes.js';

// String codecs
export { string, stringWithCustomSize, fixedString } from './string.js';

// Boolean codec
export { boolean } from './boolean.js';

// Base58 codecs
export {
  base58,
  base58String,
  encodeBase58,
  decodeBase58,
  isBase58,
  BASE58_ALPHABET,
} from './base58.js';

// Compact-u16 codec
export { compactU16 } from './compact-u16.js';
