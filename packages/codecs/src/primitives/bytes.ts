/**
 * Byte array codec implementations for encoding and decoding binary data.
 *
 * These codecs handle raw byte arrays, both fixed-size and variable-size,
 * as well as specialized formats like public keys.
 */

import type { Codec, FixedSizeCodec, VariableSizeCodec } from '../codec.js';
import { assertSufficientBytes, CodecError } from '../errors.js';
import { u32 } from './numeric.js';

/**
 * Creates a codec for fixed-size byte arrays.
 *
 * @param size The fixed size in bytes
 * @returns A fixed-size codec for byte arrays
 */
export function fixedBytes(size: number): FixedSizeCodec<Uint8Array> {
  if (size < 0 || !Number.isInteger(size)) {
    throw new CodecError(`Size must be a non-negative integer, got ${size}`);
  }

  return {
    encode(value: Uint8Array): Uint8Array {
      if (!(value instanceof Uint8Array)) {
        throw new CodecError('Value must be a Uint8Array');
      }
      if (value.length !== size) {
        throw new CodecError(`Expected Uint8Array of length ${size}, got ${value.length}`);
      }

      // Return a copy to ensure immutability
      return new Uint8Array(value);
    },

    decode(bytes: Uint8Array, offset = 0): readonly [Uint8Array, number] {
      assertSufficientBytes(bytes, offset, size);

      // Create a copy of the slice to ensure immutability
      const value = new Uint8Array(size);
      value.set(bytes.slice(offset, offset + size));

      return [value, size] as const;
    },

    size,
  };
}

/**
 * Codec for variable-length byte arrays with a 32-bit length prefix.
 *
 * The encoded format is:
 * - 4 bytes: length (u32, little-endian)
 * - N bytes: data
 */
export const bytes: VariableSizeCodec<Uint8Array> = {
  encode(value: Uint8Array): Uint8Array {
    if (!(value instanceof Uint8Array)) {
      throw new CodecError('Value must be a Uint8Array');
    }

    const lengthBytes = u32.encode(value.length);
    const result = new Uint8Array(4 + value.length);
    result.set(lengthBytes);
    result.set(value, 4);

    return result;
  },

  decode(bytes: Uint8Array, offset = 0): readonly [Uint8Array, number] {
    // First decode the length
    const [length, lengthBytesRead] = u32.decode(bytes, offset);
    const dataOffset = offset + lengthBytesRead;

    // Then decode the data
    assertSufficientBytes(bytes, dataOffset, length);

    // Create a copy of the slice to ensure immutability
    const value = new Uint8Array(length);
    value.set(bytes.slice(dataOffset, dataOffset + length));

    return [value, lengthBytesRead + length] as const;
  },

  size(value: Uint8Array): number {
    return 4 + value.length;
  },
};

/**
 * Creates a variable-length byte array codec with a custom size prefix codec.
 *
 * @param sizeCodec The codec to use for encoding/decoding the size prefix
 * @returns A variable-size codec for byte arrays
 */
export function bytesWithCustomSize<TSizeCodec extends Codec<number>>(
  sizeCodec: TSizeCodec,
): VariableSizeCodec<Uint8Array> {
  return {
    encode(value: Uint8Array): Uint8Array {
      if (!(value instanceof Uint8Array)) {
        throw new CodecError('Value must be a Uint8Array');
      }

      const sizeBytes = sizeCodec.encode(value.length);
      const result = new Uint8Array(sizeBytes.length + value.length);
      result.set(sizeBytes);
      result.set(value, sizeBytes.length);

      return result;
    },

    decode(bytes: Uint8Array, offset = 0): readonly [Uint8Array, number] {
      // First decode the length
      const [length, sizeBytesRead] = sizeCodec.decode(bytes, offset);
      const dataOffset = offset + sizeBytesRead;

      // Then decode the data
      assertSufficientBytes(bytes, dataOffset, length);

      // Create a copy of the slice to ensure immutability
      const value = new Uint8Array(length);
      value.set(bytes.slice(dataOffset, dataOffset + length));

      return [value, sizeBytesRead + length] as const;
    },

    size(value: Uint8Array): number {
      const sizeOfSize =
        typeof sizeCodec.size === 'number' ? sizeCodec.size : sizeCodec.size(value.length);
      return sizeOfSize + value.length;
    },
  };
}

/**
 * Codec for Solana public keys (32-byte Ed25519 public keys).
 *
 * This is a specialized fixed-size byte array codec that validates
 * the correct length for public keys.
 */
export const publicKey: FixedSizeCodec<Uint8Array> = {
  encode(value: Uint8Array): Uint8Array {
    if (!(value instanceof Uint8Array)) {
      throw new CodecError('Public key must be a Uint8Array');
    }
    if (value.length !== 32) {
      throw new CodecError(`Public key must be exactly 32 bytes, got ${value.length}`);
    }

    // Return a copy to ensure immutability
    return new Uint8Array(value);
  },

  decode(bytes: Uint8Array, offset = 0): readonly [Uint8Array, number] {
    assertSufficientBytes(bytes, offset, 32);

    // Create a copy of the slice to ensure immutability
    const value = new Uint8Array(32);
    value.set(bytes.slice(offset, offset + 32));

    return [value, 32] as const;
  },

  size: 32,
};
