/**
 * Array codec implementations for encoding and decoding collections.
 *
 * Provides codecs for fixed-size arrays, variable-size arrays with length prefixes,
 * and sets with unique element validation.
 */

import type { Codec, FixedSizeCodec, VariableSizeCodec } from '../codec.js';
import { isFixedSizeCodec } from '../codec.js';
import { assertSufficientBytes, CodecError } from '../errors.js';
import { u32 } from '../primitives/numeric.js';

/**
 * Create a codec for fixed-size arrays.
 *
 * All arrays encoded/decoded with this codec must have exactly the specified size.
 * The resulting codec is fixed-size if the element codec is fixed-size.
 *
 * @template T The element type
 * @param elementCodec Codec for individual array elements
 * @param size The fixed number of elements in the array
 * @returns A codec for arrays of the specified size
 *
 * @example
 * ```typescript
 * const pointsCodec = array(u32, 3); // Always 3 u32 values
 * const points = [1, 2, 3];
 * const encoded = pointsCodec.encode(points);
 * const [decoded] = pointsCodec.decode(encoded);
 * ```
 */
export function array<T>(elementCodec: FixedSizeCodec<T>, size: number): FixedSizeCodec<T[]>;

export function array<T>(elementCodec: VariableSizeCodec<T>, size: number): VariableSizeCodec<T[]>;

export function array<T>(elementCodec: Codec<T>, size: number): Codec<T[]>;

export function array<T>(elementCodec: Codec<T>, size: number): Codec<T[]> {
  if (size < 0 || !Number.isInteger(size)) {
    throw new CodecError(`Array size must be a non-negative integer, got ${size}`);
  }

  if (isFixedSizeCodec(elementCodec)) {
    const totalSize = elementCodec.size * size;

    return {
      encode(value: T[]): Uint8Array {
        if (value.length !== size) {
          throw new CodecError(`Array length mismatch: expected ${size}, got ${value.length}`);
        }

        const result = new Uint8Array(totalSize);
        let offset = 0;

        for (const element of value) {
          const encoded = elementCodec.encode(element);
          result.set(encoded, offset);
          offset += encoded.length;
        }

        return result;
      },

      decode(bytes: Uint8Array, offset = 0): readonly [T[], number] {
        assertSufficientBytes(bytes, totalSize, offset);

        const result: T[] = [];
        let currentOffset = offset;

        for (let i = 0; i < size; i++) {
          const [element, bytesRead] = elementCodec.decode(bytes, currentOffset);
          result.push(element);
          currentOffset += bytesRead;
        }

        return [result, totalSize] as const;
      },

      size: totalSize,
    } as FixedSizeCodec<T[]>;
  }

  // Variable-size element codec
  return {
    encode(value: T[]): Uint8Array {
      if (value.length !== size) {
        throw new CodecError(`Array length mismatch: expected ${size}, got ${value.length}`);
      }

      const parts: Uint8Array[] = [];
      let totalSize = 0;

      for (const element of value) {
        const encoded = elementCodec.encode(element);
        parts.push(encoded);
        totalSize += encoded.length;
      }

      const result = new Uint8Array(totalSize);
      let offset = 0;

      for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
      }

      return result;
    },

    decode(bytes: Uint8Array, offset = 0): readonly [T[], number] {
      const result: T[] = [];
      let currentOffset = offset;

      for (let i = 0; i < size; i++) {
        const [element, bytesRead] = elementCodec.decode(bytes, currentOffset);
        result.push(element);
        currentOffset += bytesRead;
      }

      return [result, currentOffset - offset] as const;
    },

    size(value: T[]): number {
      if (value.length !== size) {
        throw new CodecError(`Array length mismatch: expected ${size}, got ${value.length}`);
      }

      let totalSize = 0;

      for (const element of value) {
        if (typeof elementCodec.size === 'function') {
          totalSize += elementCodec.size(element);
        } else {
          totalSize += elementCodec.size;
        }
      }

      return totalSize;
    },
  } as VariableSizeCodec<T[]>;
}

/**
 * Create a codec for variable-size arrays with a length prefix.
 *
 * The array is encoded with a 32-bit little-endian length prefix followed by
 * the encoded elements. This is similar to Rust's Vec type.
 *
 * @template T The element type
 * @param elementCodec Codec for individual array elements
 * @param lengthCodec Optional codec for the length prefix (defaults to u32)
 * @returns A variable-size codec for arrays
 *
 * @example
 * ```typescript
 * const numbersCodec = vec(u32);
 * const numbers = [1, 2, 3, 4, 5];
 * const encoded = numbersCodec.encode(numbers);
 * const [decoded] = numbersCodec.decode(encoded);
 * ```
 */
export function vec<T>(
  elementCodec: Codec<T>,
  lengthCodec: FixedSizeCodec<number> = u32,
): VariableSizeCodec<T[]> {
  return {
    encode(value: T[]): Uint8Array {
      // Encode length prefix
      const lengthBytes = lengthCodec.encode(value.length);

      // Encode all elements
      const elementParts: Uint8Array[] = [];
      let elementsSize = 0;

      for (const element of value) {
        const encoded = elementCodec.encode(element);
        elementParts.push(encoded);
        elementsSize += encoded.length;
      }

      // Combine length and elements
      const result = new Uint8Array(lengthBytes.length + elementsSize);
      let offset = 0;

      result.set(lengthBytes, offset);
      offset += lengthBytes.length;

      for (const part of elementParts) {
        result.set(part, offset);
        offset += part.length;
      }

      return result;
    },

    decode(bytes: Uint8Array, offset = 0): readonly [T[], number] {
      // Decode length prefix
      const [length, lengthBytesRead] = lengthCodec.decode(bytes, offset);
      let currentOffset = offset + lengthBytesRead;

      // Decode elements
      const result: T[] = [];

      for (let i = 0; i < length; i++) {
        const [element, bytesRead] = elementCodec.decode(bytes, currentOffset);
        result.push(element);
        currentOffset += bytesRead;
      }

      return [result, currentOffset - offset] as const;
    },

    size(value: T[]): number {
      let totalSize = lengthCodec.size; // Length prefix size

      for (const element of value) {
        if (isFixedSizeCodec(elementCodec)) {
          totalSize += elementCodec.size;
        } else if (typeof elementCodec.size === 'function') {
          totalSize += elementCodec.size(element);
        }
      }

      return totalSize;
    },
  };
}

/**
 * Create a codec for sets (arrays with unique elements).
 *
 * This codec ensures that all elements in the array are unique when encoding.
 * During decoding, it validates that no duplicate elements exist.
 *
 * @template T The element type
 * @param elementCodec Codec for individual set elements
 * @param lengthCodec Optional codec for the length prefix (defaults to u32)
 * @returns A variable-size codec for sets
 *
 * @example
 * ```typescript
 * const uniqueNumbersCodec = set(u32);
 * const numbers = [1, 2, 3, 4, 5]; // Must be unique
 * const encoded = uniqueNumbersCodec.encode(numbers);
 * const [decoded] = uniqueNumbersCodec.decode(encoded);
 * ```
 */
export function set<T>(
  elementCodec: Codec<T>,
  lengthCodec: FixedSizeCodec<number> = u32,
): VariableSizeCodec<T[]> {
  const baseVecCodec = vec(elementCodec, lengthCodec);

  return {
    encode(value: T[]): Uint8Array {
      // Check for duplicates
      const seen = new Set();

      for (const element of value) {
        const key = JSON.stringify(element);
        if (seen.has(key)) {
          throw new CodecError(`Set contains duplicate element: ${JSON.stringify(element)}`);
        }
        seen.add(key);
      }

      return baseVecCodec.encode(value);
    },

    decode(bytes: Uint8Array, offset = 0): readonly [T[], number] {
      const [elements, bytesRead] = baseVecCodec.decode(bytes, offset);

      // Validate uniqueness
      const seen = new Set();

      for (const element of elements) {
        const key = JSON.stringify(element);
        if (seen.has(key)) {
          throw new CodecError(
            `Decoded set contains duplicate element: ${JSON.stringify(element)}`,
          );
        }
        seen.add(key);
      }

      return [elements, bytesRead] as const;
    },

    size: baseVecCodec.size,
  };
}
