/**
 * Struct codec implementation for encoding and decoding object structures.
 *
 * Struct codecs enable composing multiple codecs into a single object codec,
 * preserving field order and providing type-safe field access.
 */

import type { Codec, FixedSizeCodec, VariableSizeCodec } from '../codec.js';
import { isFixedSizeCodec } from '../codec.js';
import { assertSufficientBytes } from '../errors.js';

/**
 * Configuration object for struct fields.
 * Maps field names to their respective codecs.
 */
export type StructFields = Record<string, Codec<unknown>>;

/**
 * Infer the TypeScript type from a struct fields configuration.
 * Each field's type is derived from its codec's type parameter.
 */
export type InferStructType<T extends StructFields> = {
  [K in keyof T]: T[K] extends Codec<infer U> ? U : never;
};

/**
 * Check if all fields in a struct use fixed-size codecs.
 */
function areAllFieldsFixedSize<T extends StructFields>(fields: T): boolean {
  return Object.values(fields).every((codec) => isFixedSizeCodec(codec));
}

/**
 * Calculate the total size of a struct with fixed-size fields.
 */
function calculateFixedStructSize<T extends StructFields>(fields: T): number {
  return Object.values(fields).reduce((total, codec) => {
    if (isFixedSizeCodec(codec)) {
      return total + codec.size;
    }
    throw new Error('Cannot calculate fixed size for variable-size codec');
  }, 0);
}

/**
 * Create a struct codec that encodes/decodes objects with multiple fields.
 *
 * Fields are encoded/decoded in the order they appear in the fields object.
 * The resulting codec preserves the TypeScript type of the struct.
 *
 * @template T The struct fields configuration
 * @param fields Object mapping field names to their codecs
 * @returns A codec for the complete struct type
 *
 * @example
 * ```typescript
 * const pointCodec = struct({
 *   x: u32,
 *   y: u32,
 * });
 * // Type is Codec<{ x: number; y: number }>
 *
 * const tokenAccountCodec = struct({
 *   mint: publicKey,
 *   owner: publicKey,
 *   amount: u64,
 *   delegate: option(publicKey),
 *   state: u8,
 * });
 * ```
 */
export function struct<T extends StructFields>(fields: T): Codec<InferStructType<T>> {
  // Convert fields object to array to preserve order
  const fieldEntries = Object.entries(fields);

  if (areAllFieldsFixedSize(fields)) {
    const totalSize = calculateFixedStructSize(fields);

    return {
      encode(value: InferStructType<T>): Uint8Array {
        const result = new Uint8Array(totalSize);
        let offset = 0;

        for (const [fieldName, fieldCodec] of fieldEntries) {
          const fieldValue = (value as Record<string, unknown>)[fieldName];
          const encoded = fieldCodec.encode(fieldValue);
          result.set(encoded, offset);
          offset += encoded.length;
        }

        return result;
      },

      decode(bytes: Uint8Array, offset = 0): readonly [InferStructType<T>, number] {
        assertSufficientBytes(bytes, totalSize, offset);

        const result = {} as InferStructType<T>;
        let currentOffset = offset;

        for (const [fieldName, fieldCodec] of fieldEntries) {
          const [fieldValue, bytesRead] = fieldCodec.decode(bytes, currentOffset);
          (result as Record<string, unknown>)[fieldName] = fieldValue;
          currentOffset += bytesRead;
        }

        return [result, totalSize] as const;
      },

      size: totalSize,
    } as FixedSizeCodec<InferStructType<T>>;
  }

  // Variable-size struct
  return {
    encode(value: InferStructType<T>): Uint8Array {
      const parts: Uint8Array[] = [];
      let totalSize = 0;

      for (const [fieldName, fieldCodec] of fieldEntries) {
        const fieldValue = (value as Record<string, unknown>)[fieldName];
        const encoded = fieldCodec.encode(fieldValue);
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

    decode(bytes: Uint8Array, offset = 0): readonly [InferStructType<T>, number] {
      const result = {} as InferStructType<T>;
      let currentOffset = offset;

      for (const [fieldName, fieldCodec] of fieldEntries) {
        const [fieldValue, bytesRead] = fieldCodec.decode(bytes, currentOffset);
        (result as Record<string, unknown>)[fieldName] = fieldValue;
        currentOffset += bytesRead;
      }

      return [result, currentOffset - offset] as const;
    },

    size(value: InferStructType<T>): number {
      let totalSize = 0;

      for (const [fieldName, fieldCodec] of fieldEntries) {
        const fieldValue = (value as Record<string, unknown>)[fieldName];

        if (isFixedSizeCodec(fieldCodec)) {
          totalSize += fieldCodec.size;
        } else if (typeof fieldCodec.size === 'function') {
          totalSize += fieldCodec.size(fieldValue);
        }
      }

      return totalSize;
    },
  } as VariableSizeCodec<InferStructType<T>>;
}
