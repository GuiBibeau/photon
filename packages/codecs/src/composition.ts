/**
 * Utilities for composing and transforming codecs.
 *
 * These utilities enable building complex codecs from simpler ones,
 * allowing for type transformations and pre/post processing.
 */

import { isFixedSizeCodec } from './codec.js';
import type { Codec, FixedSizeCodec, VariableSizeCodec } from './codec.js';

/**
 * Transform a codec from one type to another using mapping functions.
 *
 * This is useful for converting between different representations of the same data,
 * such as converting between a number and a branded type, or between different
 * data structures.
 *
 * @template A The source type
 * @template B The target type
 * @param codec The source codec
 * @param mapFrom Function to convert from B to A (for encoding)
 * @param mapTo Function to convert from A to B (for decoding)
 * @returns A new codec that encodes/decodes type B
 */
export function mapCodec<A, B>(
  codec: Codec<A>,
  mapFrom: (value: B) => A,
  mapTo: (value: A) => B,
): Codec<B> {
  if (isFixedSizeCodec(codec)) {
    return createFixedSizeMapCodec(codec, mapFrom, mapTo);
  }

  return createVariableSizeMapCodec(codec as VariableSizeCodec<A>, mapFrom, mapTo);
}

/**
 * Create a fixed-size map codec.
 */
function createFixedSizeMapCodec<A, B>(
  codec: FixedSizeCodec<A>,
  mapFrom: (value: B) => A,
  mapTo: (value: A) => B,
): FixedSizeCodec<B> {
  return {
    encode: (value: B): Uint8Array => {
      const mappedValue = mapFrom(value);
      return codec.encode(mappedValue);
    },

    decode: (bytes: Uint8Array, offset = 0): readonly [B, number] => {
      const [decodedValue, bytesRead] = codec.decode(bytes, offset);
      const mappedValue = mapTo(decodedValue);
      return [mappedValue, bytesRead] as const;
    },

    size: codec.size,
  };
}

/**
 * Create a variable-size map codec.
 */
function createVariableSizeMapCodec<A, B>(
  codec: VariableSizeCodec<A>,
  mapFrom: (value: B) => A,
  mapTo: (value: A) => B,
): VariableSizeCodec<B> {
  return {
    encode: (value: B): Uint8Array => {
      const mappedValue = mapFrom(value);
      return codec.encode(mappedValue);
    },

    decode: (bytes: Uint8Array, offset = 0): readonly [B, number] => {
      const [decodedValue, bytesRead] = codec.decode(bytes, offset);
      const mappedValue = mapTo(decodedValue);
      return [mappedValue, bytesRead] as const;
    },

    size: (value: B): number => {
      const mappedValue = mapFrom(value);
      return codec.size(mappedValue);
    },
  };
}

/**
 * Wrap a codec with pre-processing (before encode) and post-processing (after decode).
 *
 * This is useful for adding validation, logging, or other side effects to codec operations.
 *
 * @template T The type being encoded/decoded
 * @param codec The source codec
 * @param options Wrapping options
 * @returns A new codec with the specified processing
 */
export function wrapCodec<T>(
  codec: Codec<T>,
  options: {
    preEncode?: (value: T) => T;
    postDecode?: (value: T) => T;
    preSize?: (value: T) => T;
  } = {},
): Codec<T> {
  const { preEncode, postDecode, preSize } = options;

  if (isFixedSizeCodec(codec)) {
    return createFixedSizeWrapCodec(codec, {
      preEncode: preEncode ?? undefined,
      postDecode: postDecode ?? undefined,
    });
  }

  return createVariableSizeWrapCodec(codec as VariableSizeCodec<T>, {
    preEncode: preEncode ?? undefined,
    postDecode: postDecode ?? undefined,
    preSize: preSize ?? undefined,
  });
}

/**
 * Create a fixed-size wrap codec.
 */
function createFixedSizeWrapCodec<T>(
  codec: FixedSizeCodec<T>,
  options: {
    preEncode: ((value: T) => T) | undefined;
    postDecode: ((value: T) => T) | undefined;
  },
): FixedSizeCodec<T> {
  const { preEncode, postDecode } = options;

  return {
    encode: (value: T): Uint8Array => {
      const processedValue = preEncode ? preEncode(value) : value;
      return codec.encode(processedValue);
    },

    decode: (bytes: Uint8Array, offset = 0): readonly [T, number] => {
      const [decodedValue, bytesRead] = codec.decode(bytes, offset);
      const processedValue = postDecode ? postDecode(decodedValue) : decodedValue;
      return [processedValue, bytesRead] as const;
    },

    size: codec.size,
  };
}

/**
 * Create a variable-size wrap codec.
 */
function createVariableSizeWrapCodec<T>(
  codec: VariableSizeCodec<T>,
  options: {
    preEncode: ((value: T) => T) | undefined;
    postDecode: ((value: T) => T) | undefined;
    preSize: ((value: T) => T) | undefined;
  },
): VariableSizeCodec<T> {
  const { preEncode, postDecode, preSize } = options;

  return {
    encode: (value: T): Uint8Array => {
      const processedValue = preEncode ? preEncode(value) : value;
      return codec.encode(processedValue);
    },

    decode: (bytes: Uint8Array, offset = 0): readonly [T, number] => {
      const [decodedValue, bytesRead] = codec.decode(bytes, offset);
      const processedValue = postDecode ? postDecode(decodedValue) : decodedValue;
      return [processedValue, bytesRead] as const;
    },

    size: (value: T): number => {
      const processedValue = preSize ? preSize(value) : value;
      return codec.size(processedValue);
    },
  };
}

/**
 * Create a codec that always encodes to the same constant value.
 *
 * This is useful for discriminator fields or magic numbers.
 *
 * @template T The type of the constant value
 * @param constantValue The value that will always be encoded
 * @param innerCodec The codec to use for encoding/decoding the constant
 * @returns A codec that validates the constant on decode
 */
export function constantCodec<T>(constantValue: T, innerCodec: Codec<T>): Codec<T> {
  return {
    encode: (_value: T): Uint8Array => {
      return innerCodec.encode(constantValue);
    },

    decode: (bytes: Uint8Array, offset = 0): readonly [T, number] => {
      const [decodedValue, bytesRead] = innerCodec.decode(bytes, offset);

      // Validate that the decoded value matches the expected constant
      if (!Object.is(decodedValue, constantValue)) {
        throw new Error(`Expected constant value ${constantValue}, but got ${decodedValue}`);
      }

      return [constantValue, bytesRead] as const;
    },

    size:
      typeof innerCodec.size === 'number'
        ? innerCodec.size
        : () => {
            if (typeof innerCodec.size === 'function') {
              return innerCodec.size(constantValue);
            }
            return innerCodec.size;
          },
  };
}
