/**
 * Enum codec implementation for encoding and decoding tagged unions.
 *
 * Provides a way to encode/decode discriminated unions where each variant
 * can have different data types and codecs.
 */

import type { Codec, FixedSizeCodec, VariableSizeCodec } from '../codec.js';
import { isFixedSizeCodec } from '../codec.js';
import { InvalidDataError, CodecError } from '../errors.js';
import { u8 } from '../primitives/numeric.js';

/**
 * Configuration for enum variants.
 * Maps variant names to their respective codecs.
 */
export type EnumVariants = Record<string, Codec<unknown>>;

/**
 * Extract variant names from an enum configuration.
 */
export type VariantNames<T extends EnumVariants> = keyof T;

/**
 * Create a typed enum variant.
 */
export type EnumVariant<T extends EnumVariants, K extends VariantNames<T>> = {
  readonly __variant: K;
  readonly __discriminator: number;
} & (T[K] extends Codec<infer U>
  ? U extends undefined | void | null
    ? Record<string, never>
    : { readonly data: U }
  : Record<string, never>);

/**
 * Union type of all possible enum variants.
 */
export type EnumType<T extends EnumVariants> = {
  [K in VariantNames<T>]: EnumVariant<T, K>;
}[VariantNames<T>];

/**
 * Create an enum variant with data.
 *
 * @template T The enum variants configuration
 * @template K The variant name
 * @param variant The variant name
 * @param discriminator The discriminator value
 * @param data The variant data
 * @returns A typed enum variant
 */
export function enumVariant<T extends EnumVariants, K extends VariantNames<T>>(
  variant: K,
  discriminator: number,
  data?: T[K] extends Codec<infer U> ? U : never,
): EnumVariant<T, K> {
  const base = {
    __variant: variant,
    __discriminator: discriminator,
  };

  if (data !== undefined) {
    return { ...base, data } as unknown as EnumVariant<T, K>;
  }

  return base as unknown as EnumVariant<T, K>;
}

/**
 * Unit codec for variants without data.
 * Used internally for enum variants that have no associated data.
 */
const unitCodec: FixedSizeCodec<void> = {
  encode(): Uint8Array {
    return new Uint8Array(0);
  },

  decode(_bytes: Uint8Array, _offset = 0): readonly [void, number] {
    return [undefined as void, 0] as const;
  },

  size: 0,
};

/**
 * Create a codec for enums (tagged unions) with discriminator.
 *
 * Each variant is assigned a discriminator value based on its position
 * in the variants object. The enum is encoded as:
 * 1. Discriminator byte (by default u8, but can be customized)
 * 2. Variant data (encoded using the variant's codec)
 *
 * @template T The enum variants configuration
 * @param variants Object mapping variant names to their codecs
 * @param discriminatorCodec Optional codec for the discriminator (defaults to u8)
 * @returns A codec for the enum type
 *
 * @example
 * ```typescript
 * const resultCodec = enumCodec({
 *   ok: u32,
 *   error: string,
 * });
 *
 * const okVariant = enumVariant('ok', 0, 42);
 * const errorVariant = enumVariant('error', 1, 'Something went wrong');
 *
 * const encodedOk = resultCodec.encode(okVariant);
 * const encodedError = resultCodec.encode(errorVariant);
 * ```
 */
export function enumCodec<T extends EnumVariants>(
  variants: T,
  discriminatorCodec: FixedSizeCodec<number> = u8,
): VariableSizeCodec<EnumType<T>> {
  // Convert variants to array and assign discriminator values
  const variantEntries = Object.entries(variants);
  const variantByName = new Map<string, { codec: Codec<unknown>; discriminator: number }>();
  const variantByDiscriminator = new Map<number, { name: string; codec: Codec<unknown> }>();

  // Build lookup maps
  variantEntries.forEach(([name, codec], index) => {
    variantByName.set(name, { codec: codec as Codec<unknown>, discriminator: index });
    variantByDiscriminator.set(index, { name, codec: codec as Codec<unknown> });
  });

  return {
    encode(value: EnumType<T>): Uint8Array {
      const variantInfo = variantByName.get(value.__variant as string);

      if (!variantInfo) {
        throw new CodecError(`Unknown enum variant: ${String(value.__variant)}`);
      }

      const discriminatorBytes = discriminatorCodec.encode(variantInfo.discriminator);

      // Handle unit variants (no data)
      if (!('data' in value) || value.data === undefined) {
        const dataBytes = unitCodec.encode(undefined as void);
        const result = new Uint8Array(discriminatorBytes.length + dataBytes.length);
        result.set(discriminatorBytes, 0);
        result.set(dataBytes, discriminatorBytes.length);
        return result;
      }

      // Encode variant data
      const dataBytes = variantInfo.codec.encode((value as { data: unknown }).data);
      const result = new Uint8Array(discriminatorBytes.length + dataBytes.length);

      result.set(discriminatorBytes, 0);
      result.set(dataBytes, discriminatorBytes.length);

      return result;
    },

    decode(bytes: Uint8Array, offset = 0): readonly [EnumType<T>, number] {
      // Decode discriminator
      const [discriminator, discriminatorBytesRead] = discriminatorCodec.decode(bytes, offset);
      let currentOffset = offset + discriminatorBytesRead;

      const variantInfo = variantByDiscriminator.get(discriminator);

      if (!variantInfo) {
        throw new InvalidDataError(`Invalid enum discriminator: ${discriminator}`, bytes, offset);
      }

      // Decode variant data
      const [data, dataBytesRead] = variantInfo.codec.decode(bytes, currentOffset);
      currentOffset += dataBytesRead;

      // Create the variant object
      let variant: EnumType<T>;

      if (variantInfo.codec === unitCodec || data === undefined) {
        // Unit variant (no data)
        variant = {
          __variant: variantInfo.name,
          __discriminator: discriminator,
        } as EnumType<T>;
      } else {
        // Variant with data
        variant = {
          __variant: variantInfo.name,
          __discriminator: discriminator,
          data,
        } as unknown as EnumType<T>;
      }

      return [variant as EnumType<T>, currentOffset - offset] as const;
    },

    size(value: EnumType<T>): number {
      const variantInfo = variantByName.get(value.__variant as string);

      if (!variantInfo) {
        throw new CodecError(`Unknown enum variant: ${String(value.__variant)}`);
      }

      let dataSize = 0;

      if ('data' in value && value.data !== undefined) {
        if (isFixedSizeCodec(variantInfo.codec)) {
          dataSize = variantInfo.codec.size;
        } else if (typeof variantInfo.codec.size === 'function') {
          dataSize = variantInfo.codec.size((value as { data: unknown }).data);
        }
      } else {
        dataSize = unitCodec.size;
      }

      return discriminatorCodec.size + dataSize;
    },
  };
}

/**
 * Create a simple enum codec with unit variants only (no associated data).
 *
 * This is a convenience function for enums where all variants are just
 * discriminators without any additional data.
 *
 * @param variants Array of variant names
 * @param discriminatorCodec Optional codec for the discriminator (defaults to u8)
 * @returns A codec for the simple enum type
 *
 * @example
 * ```typescript
 * const stateCodec = simpleEnum(['pending', 'completed', 'failed']);
 *
 * const pending = enumVariant('pending', 0);
 * const completed = enumVariant('completed', 1);
 * const failed = enumVariant('failed', 2);
 * ```
 */
export function simpleEnum<T extends readonly string[]>(
  variants: T,
  discriminatorCodec: FixedSizeCodec<number> = u8,
): VariableSizeCodec<EnumType<{ [K in T[number]]: typeof unitCodec }>> {
  const variantMap: Record<string, typeof unitCodec> = {};

  for (const variant of variants) {
    variantMap[variant] = unitCodec;
  }

  return enumCodec(variantMap as { [K in T[number]]: typeof unitCodec }, discriminatorCodec);
}
