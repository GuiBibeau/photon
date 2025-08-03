/**
 * Option codec implementation for encoding and decoding optional values.
 *
 * Implements a Rust-style Option type with a 1-byte discriminator:
 * - 0x00 = None (no value present)
 * - 0x01 = Some (value present, followed by encoded value)
 */

import type { Codec, VariableSizeCodec } from '../codec.js';
import { isFixedSizeCodec } from '../codec.js';
import { assertSufficientBytes, InvalidDataError } from '../errors.js';

/**
 * Option type representing either Some(value) or None.
 */
export type Option<T> = Some<T> | None;

/**
 * Some variant containing a value.
 */
export interface Some<T> {
  readonly __option: 'some';
  readonly value: T;
}

/**
 * None variant representing no value.
 */
export interface None {
  readonly __option: 'none';
}

/**
 * Create a Some variant containing a value.
 *
 * @template T The value type
 * @param value The value to wrap
 * @returns A Some variant
 */
export function some<T>(value: T): Some<T> {
  return { __option: 'some', value };
}

/**
 * Create a None variant representing no value.
 *
 * @returns A None variant
 */
export function none(): None {
  return { __option: 'none' };
}

/**
 * Check if an Option is a Some variant.
 *
 * @template T The value type
 * @param option The option to check
 * @returns True if the option is Some
 */
export function isSome<T>(option: Option<T>): option is Some<T> {
  return option.__option === 'some';
}

/**
 * Check if an Option is a None variant.
 *
 * @template T The value type
 * @param option The option to check
 * @returns True if the option is None
 */
export function isNone<T>(option: Option<T>): option is None {
  return option.__option === 'none';
}

/**
 * Unwrap a Some variant to get its value.
 * Throws an error if the option is None.
 *
 * @template T The value type
 * @param option The option to unwrap
 * @returns The wrapped value
 * @throws {Error} If the option is None
 */
export function unwrap<T>(option: Option<T>): T {
  if (isSome(option)) {
    return option.value;
  }
  throw new Error('Called unwrap on a None option');
}

/**
 * Unwrap a Some variant or return a default value if None.
 *
 * @template T The value type
 * @param option The option to unwrap
 * @param defaultValue The default value to return if None
 * @returns The wrapped value or default
 */
export function unwrapOr<T>(option: Option<T>, defaultValue: T): T {
  if (isSome(option)) {
    return option.value;
  }
  return defaultValue;
}

/**
 * Create a codec for optional values using Rust-style Option type.
 *
 * The option is encoded with a 1-byte discriminator:
 * - 0x00 = None (no additional data)
 * - 0x01 = Some (followed by the encoded value)
 *
 * @template T The value type
 * @param valueCodec Codec for the wrapped value type
 * @returns A codec for Option<T>
 *
 * @example
 * ```typescript
 * const optionalNumberCodec = option(u32);
 *
 * const someValue = some(42);
 * const noneValue = none();
 *
 * const encodedSome = optionalNumberCodec.encode(someValue);
 * const encodedNone = optionalNumberCodec.encode(noneValue);
 *
 * const [decodedSome] = optionalNumberCodec.decode(encodedSome);
 * const [decodedNone] = optionalNumberCodec.decode(encodedNone);
 * ```
 */
export function option<T>(valueCodec: Codec<T>): VariableSizeCodec<Option<T>> {
  const NONE_DISCRIMINATOR = 0x00;
  const SOME_DISCRIMINATOR = 0x01;
  const DISCRIMINATOR_SIZE = 1;

  return {
    encode(value: Option<T>): Uint8Array {
      if (isNone(value)) {
        // Encode as None: just the discriminator
        return new Uint8Array([NONE_DISCRIMINATOR]);
      }

      // Encode as Some: discriminator + encoded value
      const encodedValue = valueCodec.encode(value.value);
      const result = new Uint8Array(DISCRIMINATOR_SIZE + encodedValue.length);

      result[0] = SOME_DISCRIMINATOR;
      result.set(encodedValue, DISCRIMINATOR_SIZE);

      return result;
    },

    decode(bytes: Uint8Array, offset = 0): readonly [Option<T>, number] {
      assertSufficientBytes(bytes, DISCRIMINATOR_SIZE, offset);

      const discriminator = bytes[offset];

      if (discriminator === NONE_DISCRIMINATOR) {
        return [none(), DISCRIMINATOR_SIZE] as const;
      }

      if (discriminator === SOME_DISCRIMINATOR) {
        const [value, valueBytesRead] = valueCodec.decode(bytes, offset + DISCRIMINATOR_SIZE);
        return [some(value), DISCRIMINATOR_SIZE + valueBytesRead] as const;
      }

      throw new InvalidDataError(
        `Invalid option discriminator: expected 0x00 or 0x01, got 0x${discriminator?.toString(16).padStart(2, '0')}`,
        bytes,
        offset,
      );
    },

    size(value: Option<T>): number {
      if (isNone(value)) {
        return DISCRIMINATOR_SIZE;
      }

      // Some variant: discriminator + value size
      const valueSize = isFixedSizeCodec(valueCodec)
        ? valueCodec.size
        : (valueCodec.size as (value: T) => number)(value.value);

      return DISCRIMINATOR_SIZE + valueSize;
    },
  };
}

/**
 * Create a codec for nullable values (T | null).
 *
 * This is a convenience function that maps between Option<T> and T | null,
 * which is more idiomatic in JavaScript/TypeScript.
 *
 * @template T The value type
 * @param valueCodec Codec for the value type
 * @returns A codec for T | null
 *
 * @example
 * ```typescript
 * const nullableNumberCodec = nullable(u32);
 *
 * const value: number | null = 42;
 * const encoded = nullableNumberCodec.encode(value);
 * const [decoded] = nullableNumberCodec.decode(encoded);
 * ```
 */
export function nullable<T>(valueCodec: Codec<T>): VariableSizeCodec<T | null> {
  const baseOptionCodec = option(valueCodec);

  return {
    encode(value: T | null): Uint8Array {
      const optionValue = value === null ? none() : some(value);
      return baseOptionCodec.encode(optionValue);
    },

    decode(bytes: Uint8Array, offset = 0): readonly [T | null, number] {
      const [optionValue, bytesRead] = baseOptionCodec.decode(bytes, offset);
      const value = isNone(optionValue) ? null : optionValue.value;
      return [value, bytesRead] as const;
    },

    size(value: T | null): number {
      const optionValue = value === null ? none() : some(value);
      return baseOptionCodec.size(optionValue);
    },
  };
}
