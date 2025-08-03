/**
 * Boolean codec implementation for encoding and decoding boolean values.
 *
 * Booleans are encoded as a single byte: 0 for false, 1 for true.
 */

import type { FixedSizeCodec } from '../codec.js';
import { assertSufficientBytes, CodecError } from '../errors.js';

/**
 * Codec for boolean values.
 *
 * Encodes:
 * - `false` as 0x00
 * - `true` as 0x01
 */
export const boolean: FixedSizeCodec<boolean> = {
  encode(value: boolean): Uint8Array {
    if (typeof value !== 'boolean') {
      throw new CodecError(`Value must be a boolean, got ${typeof value}`);
    }

    return new Uint8Array([value ? 1 : 0]);
  },

  decode(bytes: Uint8Array, offset = 0): readonly [boolean, number] {
    assertSufficientBytes(bytes, offset, 1);

    const byte = bytes[offset];

    if (byte !== 0 && byte !== 1) {
      throw new CodecError(`Invalid boolean value: expected 0 or 1, got ${byte}`);
    }

    return [byte === 1, 1] as const;
  },

  size: 1,
};
