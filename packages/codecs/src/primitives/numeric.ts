/**
 * Numeric codec implementations for encoding and decoding integer types.
 *
 * All numeric codecs use little-endian byte order, which is the standard
 * for Solana and most modern architectures.
 */

import type { FixedSizeCodec } from '../codec.js';
import { assertSufficientBytes, CodecError } from '../errors.js';

/**
 * Creates a numeric codec for a specific byte size and signedness.
 *
 * @param bytes The number of bytes for the numeric type
 * @param signed Whether the numeric type is signed
 * @returns A fixed-size codec for the numeric type
 */
function createNumericCodec(bytes: 1 | 2 | 4, signed: boolean): FixedSizeCodec<number> {
  const min = signed ? -(2 ** (bytes * 8 - 1)) : 0;
  const max = signed ? 2 ** (bytes * 8 - 1) - 1 : 2 ** (bytes * 8) - 1;

  return {
    encode(value: number): Uint8Array {
      if (!Number.isInteger(value)) {
        throw new CodecError(`Value must be an integer, got ${value}`);
      }
      if (value < min || value > max) {
        throw new CodecError(
          `Value ${value} is out of range for ${signed ? 'i' : 'u'}${bytes * 8} [${min}, ${max}]`,
        );
      }

      const buffer = new ArrayBuffer(bytes);
      const view = new DataView(buffer);

      switch (bytes) {
        case 1:
          if (signed) {
            view.setInt8(0, value);
          } else {
            view.setUint8(0, value);
          }
          break;
        case 2:
          if (signed) {
            view.setInt16(0, value, true); // little-endian
          } else {
            view.setUint16(0, value, true);
          }
          break;
        case 4:
          if (signed) {
            view.setInt32(0, value, true);
          } else {
            view.setUint32(0, value, true);
          }
          break;
      }

      return new Uint8Array(buffer);
    },

    decode(bytes: Uint8Array, offset = 0): readonly [number, number] {
      assertSufficientBytes(bytes, offset, this.size);

      const view = new DataView(bytes.buffer, bytes.byteOffset + offset);

      let value: number;
      switch (this.size) {
        case 1:
          value = signed ? view.getInt8(0) : view.getUint8(0);
          break;
        case 2:
          value = signed ? view.getInt16(0, true) : view.getUint16(0, true);
          break;
        case 4:
          value = signed ? view.getInt32(0, true) : view.getUint32(0, true);
          break;
        default:
          throw new CodecError(`Unsupported byte size: ${this.size}`);
      }

      return [value, this.size] as const;
    },

    size: bytes,
  };
}

/**
 * Creates a 64-bit numeric codec that uses bigint for values.
 *
 * @param signed Whether the numeric type is signed
 * @returns A fixed-size codec for 64-bit integers
 */
function createBigIntCodec(signed: boolean): FixedSizeCodec<bigint> {
  const min = signed ? -(2n ** 63n) : 0n;
  const max = signed ? 2n ** 63n - 1n : 2n ** 64n - 1n;

  return {
    encode(value: bigint): Uint8Array {
      if (typeof value !== 'bigint') {
        throw new CodecError(`Value must be a bigint, got ${typeof value}`);
      }
      if (value < min || value > max) {
        throw new CodecError(
          `Value ${value} is out of range for ${signed ? 'i' : 'u'}64 [${min}, ${max}]`,
        );
      }

      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);

      if (signed) {
        view.setBigInt64(0, value, true); // little-endian
      } else {
        view.setBigUint64(0, value, true);
      }

      return new Uint8Array(buffer);
    },

    decode(bytes: Uint8Array, offset = 0): readonly [bigint, number] {
      assertSufficientBytes(bytes, offset, 8);

      const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
      const value = signed ? view.getBigInt64(0, true) : view.getBigUint64(0, true);

      return [value, 8] as const;
    },

    size: 8,
  };
}

/**
 * Codec for unsigned 8-bit integers (0 to 255).
 */
export const u8: FixedSizeCodec<number> = createNumericCodec(1, false);

/**
 * Codec for unsigned 16-bit integers (0 to 65,535).
 */
export const u16: FixedSizeCodec<number> = createNumericCodec(2, false);

/**
 * Codec for unsigned 32-bit integers (0 to 4,294,967,295).
 */
export const u32: FixedSizeCodec<number> = createNumericCodec(4, false);

/**
 * Codec for unsigned 64-bit integers (0 to 2^64-1).
 * Uses bigint for values outside JavaScript's safe integer range.
 */
export const u64: FixedSizeCodec<bigint> = createBigIntCodec(false);

/**
 * Codec for signed 8-bit integers (-128 to 127).
 */
export const i8: FixedSizeCodec<number> = createNumericCodec(1, true);

/**
 * Codec for signed 16-bit integers (-32,768 to 32,767).
 */
export const i16: FixedSizeCodec<number> = createNumericCodec(2, true);

/**
 * Codec for signed 32-bit integers (-2,147,483,648 to 2,147,483,647).
 */
export const i32: FixedSizeCodec<number> = createNumericCodec(4, true);

/**
 * Codec for signed 64-bit integers (-2^63 to 2^63-1).
 * Uses bigint for values outside JavaScript's safe integer range.
 */
export const i64: FixedSizeCodec<bigint> = createBigIntCodec(true);
