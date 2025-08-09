/**
 * Compact-u16 encoding as used in Solana transactions.
 *
 * This encoding uses a variable-length format:
 * - Values 0-127: 1 byte
 * - Values 128-16383: 2 bytes
 * - Values 16384-65535: 3 bytes
 */

import type { Codec } from '../codec.js';
import { assertSufficientBytes, CodecError } from '../errors.js';

/**
 * Codec for compact-u16 encoding used in Solana transactions
 */
export const compactU16: Codec<number> = {
  encode(value: number): Uint8Array {
    if (!Number.isInteger(value) || value < 0 || value > 65535) {
      throw new CodecError(`Value must be an integer between 0 and 65535, got ${value}`);
    }

    if (value < 0x80) {
      // 1 byte: 0xxxxxxx (7 bits of data)
      return new Uint8Array([value]);
    } else if (value < 0x4000) {
      // 2 bytes: 10xxxxxx xxxxxxxx (6 + 8 = 14 bits of data)
      return new Uint8Array([
        0x80 | (value & 0x3f), // Lower 6 bits with 10 prefix
        (value >> 6) & 0xff, // Next 8 bits
      ]);
    } else {
      // 3 bytes: 110xxxxx xxxxxxxx xxxxxxxx (5 + 8 + 8 = 21 bits, but we only need 16)
      return new Uint8Array([
        0xc0 | (value & 0x1f), // Lower 5 bits with 110 prefix
        (value >> 5) & 0xff, // Next 8 bits
        (value >> 13) & 0xff, // Final bits
      ]);
    }
  },

  decode(bytes: Uint8Array, offset = 0): readonly [number, number] {
    assertSufficientBytes(bytes, offset, 1);

    const firstByte = bytes[offset];
    if (firstByte === undefined) {
      throw new CodecError('Unexpected end of buffer while reading compact-u16');
    }

    if ((firstByte & 0x80) === 0) {
      // 1 byte encoding: 0xxxxxxx
      return [firstByte, 1] as const;
    } else if ((firstByte & 0xc0) === 0x80) {
      // 2 byte encoding: 10xxxxxx xxxxxxxx
      assertSufficientBytes(bytes, offset, 2);
      const secondByte = bytes[offset + 1];
      if (secondByte === undefined) {
        throw new CodecError('Unexpected end of buffer while reading compact-u16');
      }
      const value = (firstByte & 0x3f) | (secondByte << 6);
      return [value, 2] as const;
    } else if ((firstByte & 0xe0) === 0xc0) {
      // 3 byte encoding: 110xxxxx xxxxxxxx xxxxxxxx
      assertSufficientBytes(bytes, offset, 3);
      const secondByte = bytes[offset + 1];
      const thirdByte = bytes[offset + 2];
      if (secondByte === undefined || thirdByte === undefined) {
        throw new CodecError('Unexpected end of buffer while reading compact-u16');
      }
      const value = (firstByte & 0x1f) | (secondByte << 5) | (thirdByte << 13);
      return [value, 3] as const;
    } else {
      throw new CodecError(`Invalid compact-u16 encoding: first byte 0x${firstByte.toString(16)}`);
    }
  },

  size(value: number): number {
    if (value < 0x80) {
      return 1;
    }
    if (value < 0x4000) {
      return 2;
    }
    return 3;
  },
};
