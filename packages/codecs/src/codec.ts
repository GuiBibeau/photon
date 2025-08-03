/**
 * Core codec interface for encoding and decoding binary data.
 *
 * A codec provides a bidirectional transformation between a TypeScript value
 * and its binary representation (Uint8Array). This forms the foundation for
 * all binary serialization in the Photon SDK.
 */

/**
 * The core codec interface for encoding and decoding values of type T.
 *
 * @template T The TypeScript type being encoded/decoded
 */
export interface Codec<T> {
  /**
   * Encode a value to binary format.
   *
   * @param value The value to encode
   * @returns Binary representation of the value
   */
  encode(value: T): Uint8Array;

  /**
   * Decode a value from binary format.
   *
   * @param bytes The binary data to decode from
   * @param offset Optional offset into the bytes array (default: 0)
   * @returns A tuple of [decoded value, bytes consumed]
   */
  decode(bytes: Uint8Array, offset?: number): readonly [T, number];

  /**
   * The size of the encoded representation.
   *
   * For fixed-size codecs, this is a constant number.
   * For variable-size codecs, this is a function that computes the size.
   */
  size: number | ((value: T) => number);
}

/**
 * A codec for types with a known, constant size.
 *
 * @template T The TypeScript type being encoded/decoded
 */
export interface FixedSizeCodec<T> extends Codec<T> {
  /**
   * The constant size in bytes of the encoded representation.
   */
  readonly size: number;
}

/**
 * A codec for types with variable size.
 *
 * @template T The TypeScript type being encoded/decoded
 */
export interface VariableSizeCodec<T> extends Codec<T> {
  /**
   * Function to compute the size of a value's encoded representation.
   */
  readonly size: (value: T) => number;
}

/**
 * Type guard to check if a codec is fixed-size.
 *
 * @param codec The codec to check
 * @returns True if the codec has a fixed size
 */
export function isFixedSizeCodec<T>(codec: Codec<T>): codec is FixedSizeCodec<T> {
  return typeof codec.size === 'number';
}

/**
 * Type guard to check if a codec is variable-size.
 *
 * @param codec The codec to check
 * @returns True if the codec has a variable size
 */
export function isVariableSizeCodec<T>(codec: Codec<T>): codec is VariableSizeCodec<T> {
  return typeof codec.size === 'function';
}

/**
 * Get the size of an encoded value.
 *
 * @param codec The codec to use
 * @param value The value to get the size for (required for variable-size codecs)
 * @returns The size in bytes
 */
export function getCodecSize<T>(codec: Codec<T>, value?: T): number {
  if (isFixedSizeCodec(codec)) {
    return codec.size;
  }

  if (value === undefined) {
    throw new Error('Value is required to compute size for variable-size codec');
  }

  if (typeof codec.size === 'function') {
    return codec.size(value);
  }

  // This should never happen due to the type guards above
  throw new Error('Invalid codec size configuration');
}
