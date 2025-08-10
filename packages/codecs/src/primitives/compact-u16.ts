/**
 * Compact-u16 encoding as used in Solana transactions.
 *
 * This encoding uses a variable-length format:
 * - Values 0-127: 1 byte
 * - Values 128-16383: 2 bytes
 * - Values 16384-65535: 3 bytes
 */

import type { VariableSizeCodec } from '../codec.js';
import { assertSufficientBytes, CodecError } from '../errors.js';

/**
 * Codec for compact-u16 encoding used in Solana transactions
 */
export const compactU16: VariableSizeCodec<number> = {
  encode(value: number): Uint8Array {
    if (!Number.isInteger(value) || value < 0 || value > 65535) {
      throw new CodecError(`Value must be an integer between 0 and 65535, got ${value}`);
    }

    // Solana's compact-u16 encoding (little-endian with continuation bits)
    if (value <= 0x7f) {
      // 1 byte: 0xxxxxxx (7 bits of data, no continuation)
      return new Uint8Array([value]);
    } else if (value <= 0x3fff) {
      // 2 bytes: 1xxxxxxx 0xxxxxxx (14 bits of data)
      return new Uint8Array([
        (value & 0x7f) | 0x80, // Lower 7 bits with continuation bit
        (value >> 7) & 0x7f, // Upper 7 bits without continuation bit
      ]);
    } else {
      // 3 bytes: 1xxxxxxx 1xxxxxxx 00xxxxxx (16 bits of data)
      return new Uint8Array([
        (value & 0x7f) | 0x80, // Lower 7 bits with continuation bit
        ((value >> 7) & 0x7f) | 0x80, // Middle 7 bits with continuation bit
        (value >> 14) & 0x03, // Upper 2 bits without continuation bit
      ]);
    }
  },

  decode(bytes: Uint8Array, offset = 0): readonly [number, number] {
    assertSufficientBytes(bytes, offset, 1);

    const firstByte = bytes[offset];
    if (firstByte === undefined) {
      throw new CodecError('Unexpected end of buffer while reading compact-u16');
    }

    // Check for continuation bit
    if ((firstByte & 0x80) === 0) {
      // 1 byte encoding: 0xxxxxxx
      return [firstByte, 1] as const;
    }

    // Has continuation bit, read second byte
    assertSufficientBytes(bytes, offset, 2);
    const secondByte = bytes[offset + 1];
    if (secondByte === undefined) {
      throw new CodecError('Unexpected end of buffer while reading compact-u16');
    }

    // Check if second byte has continuation bit
    if ((secondByte & 0x80) === 0) {
      // 2 byte encoding: 1xxxxxxx 0xxxxxxx
      const value = (firstByte & 0x7f) | ((secondByte & 0x7f) << 7);
      return [value, 2] as const;
    }

    // Second byte has continuation bit, read third byte
    assertSufficientBytes(bytes, offset, 3);
    const thirdByte = bytes[offset + 2];
    if (thirdByte === undefined) {
      throw new CodecError('Unexpected end of buffer while reading compact-u16');
    }

    // 3 byte encoding: 1xxxxxxx 1xxxxxxx 00xxxxxx
    const value = (firstByte & 0x7f) | ((secondByte & 0x7f) << 7) | ((thirdByte & 0x03) << 14);
    return [value, 3] as const;
  },

  size(value: number): number {
    if (value <= 0x7f) {
      return 1;
    }
    if (value <= 0x3fff) {
      return 2;
    }
    return 3;
  },
};
