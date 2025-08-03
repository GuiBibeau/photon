/**
 * String codec implementations for encoding and decoding UTF-8 strings.
 *
 * These codecs handle string serialization with length prefixes,
 * using the standard UTF-8 encoding for text data.
 */

import type { Codec, VariableSizeCodec } from '../codec.js';
import { CodecError } from '../errors.js';
import { u32 } from './numeric.js';

// Reusable TextEncoder/TextDecoder instances for performance
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

/**
 * Codec for UTF-8 strings with a 32-bit length prefix.
 *
 * The encoded format is:
 * - 4 bytes: byte length (u32, little-endian)
 * - N bytes: UTF-8 encoded string data
 */
export const string: VariableSizeCodec<string> = {
  encode(value: string): Uint8Array {
    if (typeof value !== 'string') {
      throw new CodecError(`Value must be a string, got ${typeof value}`);
    }

    const stringBytes = textEncoder.encode(value);
    const lengthBytes = u32.encode(stringBytes.length);
    const result = new Uint8Array(4 + stringBytes.length);

    result.set(lengthBytes);
    result.set(stringBytes, 4);

    return result;
  },

  decode(bytes: Uint8Array, offset = 0): readonly [string, number] {
    // First decode the byte length
    const [byteLength, lengthBytesRead] = u32.decode(bytes, offset);
    const dataOffset = offset + lengthBytesRead;

    // Then decode the string data
    if (bytes.length - dataOffset < byteLength) {
      throw new CodecError(
        `Insufficient bytes for string: expected ${byteLength}, available ${bytes.length - dataOffset}`,
      );
    }

    try {
      const stringBytes = bytes.slice(dataOffset, dataOffset + byteLength);
      const value = textDecoder.decode(stringBytes);
      return [value, lengthBytesRead + byteLength] as const;
    } catch (error) {
      throw new CodecError(
        `Failed to decode UTF-8 string: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },

  size(value: string): number {
    // Calculate the byte length of the UTF-8 encoded string
    const byteLength = textEncoder.encode(value).length;
    return 4 + byteLength;
  },
};

/**
 * Creates a string codec with a custom size prefix codec.
 *
 * This allows for more compact encodings when the string length
 * is known to fit within smaller integer types.
 *
 * @param sizeCodec The codec to use for encoding/decoding the size prefix
 * @returns A variable-size codec for strings
 */
export function stringWithCustomSize<TSizeCodec extends Codec<number>>(
  sizeCodec: TSizeCodec,
): VariableSizeCodec<string> {
  return {
    encode(value: string): Uint8Array {
      if (typeof value !== 'string') {
        throw new CodecError(`Value must be a string, got ${typeof value}`);
      }

      const stringBytes = textEncoder.encode(value);
      const sizeBytes = sizeCodec.encode(stringBytes.length);
      const result = new Uint8Array(sizeBytes.length + stringBytes.length);

      result.set(sizeBytes);
      result.set(stringBytes, sizeBytes.length);

      return result;
    },

    decode(bytes: Uint8Array, offset = 0): readonly [string, number] {
      // First decode the byte length
      const [byteLength, sizeBytesRead] = sizeCodec.decode(bytes, offset);
      const dataOffset = offset + sizeBytesRead;

      // Then decode the string data
      if (bytes.length - dataOffset < byteLength) {
        throw new CodecError(
          `Insufficient bytes for string: expected ${byteLength}, available ${bytes.length - dataOffset}`,
        );
      }

      try {
        const stringBytes = bytes.slice(dataOffset, dataOffset + byteLength);
        const value = textDecoder.decode(stringBytes);
        return [value, sizeBytesRead + byteLength] as const;
      } catch (error) {
        throw new CodecError(
          `Failed to decode UTF-8 string: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },

    size(value: string): number {
      const stringBytes = textEncoder.encode(value);
      const sizeOfSize =
        typeof sizeCodec.size === 'number' ? sizeCodec.size : sizeCodec.size(stringBytes.length);
      return sizeOfSize + stringBytes.length;
    },
  };
}

/**
 * Creates a fixed-length string codec that pads or truncates strings
 * to a specific byte length.
 *
 * @param byteLength The fixed byte length for the encoded string
 * @param options Encoding options
 * @returns A fixed-size codec for strings
 */
export function fixedString(
  byteLength: number,
  options: {
    padding?: 'nullTerminated' | 'spacePadded';
    truncate?: boolean;
  } = {},
): Codec<string> {
  const { padding = 'nullTerminated', truncate = false } = options;

  return {
    encode(value: string): Uint8Array {
      if (typeof value !== 'string') {
        throw new CodecError(`Value must be a string, got ${typeof value}`);
      }

      const stringBytes = textEncoder.encode(value);

      if (stringBytes.length > byteLength) {
        if (!truncate) {
          throw new CodecError(
            `String byte length ${stringBytes.length} exceeds fixed size ${byteLength}`,
          );
        }
        // Truncate to fit
        return stringBytes.slice(0, byteLength);
      }

      const result = new Uint8Array(byteLength);
      result.set(stringBytes);

      // Apply padding
      if (padding === 'spacePadded') {
        for (let i = stringBytes.length; i < byteLength; i++) {
          result[i] = 0x20; // ASCII space
        }
      }
      // null-terminated is the default (already zeros)

      return result;
    },

    decode(bytes: Uint8Array, offset = 0): readonly [string, number] {
      if (bytes.length - offset < byteLength) {
        throw new CodecError(
          `Insufficient bytes: expected ${byteLength}, available ${bytes.length - offset}`,
        );
      }

      const stringBytes = bytes.slice(offset, offset + byteLength);

      // Find the actual string length based on padding type
      let actualLength = byteLength;
      if (padding === 'nullTerminated') {
        // Find first null byte
        for (let i = 0; i < byteLength; i++) {
          if (stringBytes[i] === 0) {
            actualLength = i;
            break;
          }
        }
      } else if (padding === 'spacePadded') {
        // Trim trailing padding spaces only
        // We need to be careful not to trim spaces that are part of the actual string
        actualLength = byteLength;
        while (actualLength > 0 && stringBytes[actualLength - 1] === 0x20) {
          actualLength--;
        }
      }

      try {
        const value = textDecoder.decode(stringBytes.slice(0, actualLength));
        return [value, byteLength] as const;
      } catch (error) {
        throw new CodecError(
          `Failed to decode UTF-8 string: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },

    size: byteLength,
  };
}
