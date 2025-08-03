import { describe, it, expect } from 'vitest';
import {
  fixedBytes,
  bytes,
  bytesWithCustomSize,
  publicKey,
  u8,
  u16,
  CodecError,
  InsufficientBytesError,
} from '../../src/index.js';

describe('Bytes Codecs', () => {
  describe('fixedBytes', () => {
    it('should encode and decode fixed-size byte arrays', () => {
      const codec = fixedBytes(4);
      const value = new Uint8Array([1, 2, 3, 4]);

      const encoded = codec.encode(value);
      expect(encoded).toEqual(value);
      expect(encoded).not.toBe(value); // Should be a copy

      const [decoded, bytesRead] = codec.decode(encoded);
      expect(decoded).toEqual(value);
      expect(decoded).not.toBe(value); // Should be a copy
      expect(bytesRead).toBe(4);
    });

    it('should handle empty arrays', () => {
      const codec = fixedBytes(0);
      const value = new Uint8Array([]);

      const encoded = codec.encode(value);
      expect(encoded).toEqual(value);
      expect(encoded.length).toBe(0);

      const [decoded, bytesRead] = codec.decode(new Uint8Array([1, 2, 3]));
      expect(decoded).toEqual(value);
      expect(bytesRead).toBe(0);
    });

    it('should handle offset correctly', () => {
      const codec = fixedBytes(3);
      const bytes = new Uint8Array([0, 0, 1, 2, 3, 4, 5]);

      const [decoded, bytesRead] = codec.decode(bytes, 2);
      expect(decoded).toEqual(new Uint8Array([1, 2, 3]));
      expect(bytesRead).toBe(3);
    });

    it('should throw on invalid size', () => {
      expect(() => fixedBytes(-1)).toThrow(CodecError);
      expect(() => fixedBytes(1.5)).toThrow(CodecError);
    });

    it('should throw on wrong input type', () => {
      const codec = fixedBytes(4);
      // @ts-expect-error Testing runtime validation
      expect(() => codec.encode([1, 2, 3, 4])).toThrow('Value must be a Uint8Array');
    });

    it('should throw on wrong length', () => {
      const codec = fixedBytes(4);
      expect(() => codec.encode(new Uint8Array([1, 2, 3]))).toThrow(
        'Expected Uint8Array of length 4, got 3',
      );
      expect(() => codec.encode(new Uint8Array([1, 2, 3, 4, 5]))).toThrow(
        'Expected Uint8Array of length 4, got 5',
      );
    });

    it('should throw on insufficient bytes', () => {
      const codec = fixedBytes(4);
      expect(() => codec.decode(new Uint8Array([1, 2, 3]))).toThrow(InsufficientBytesError);
    });

    it('should have correct size', () => {
      const codec = fixedBytes(10);
      expect(codec.size).toBe(10);
    });
  });

  describe('bytes (variable-length)', () => {
    it('should encode and decode variable-length byte arrays', () => {
      const value = new Uint8Array([1, 2, 3, 4, 5]);

      const encoded = bytes.encode(value);
      expect(encoded).toEqual(
        new Uint8Array([
          5,
          0,
          0,
          0, // Length (u32 little-endian)
          1,
          2,
          3,
          4,
          5, // Data
        ]),
      );

      const [decoded, bytesRead] = bytes.decode(encoded);
      expect(decoded).toEqual(value);
      expect(bytesRead).toBe(9); // 4 + 5
    });

    it('should handle empty arrays', () => {
      const value = new Uint8Array([]);

      const encoded = bytes.encode(value);
      expect(encoded).toEqual(new Uint8Array([0, 0, 0, 0]));

      const [decoded, bytesRead] = bytes.decode(encoded);
      expect(decoded).toEqual(value);
      expect(bytesRead).toBe(4);
    });

    it('should handle offset correctly', () => {
      const value = new Uint8Array([10, 20, 30]);
      const encoded = bytes.encode(value);
      const prefixed = new Uint8Array([0xff, 0xff, ...encoded]);

      const [decoded, bytesRead] = bytes.decode(prefixed, 2);
      expect(decoded).toEqual(value);
      expect(bytesRead).toBe(7); // 4 + 3
    });

    it('should handle large arrays', () => {
      const value = new Uint8Array(1000).fill(42);

      const encoded = bytes.encode(value);
      expect(encoded.length).toBe(1004); // 4 + 1000

      const [decoded, bytesRead] = bytes.decode(encoded);
      expect(decoded).toEqual(value);
      expect(bytesRead).toBe(1004);
    });

    it('should throw on wrong input type', () => {
      // @ts-expect-error Testing runtime validation
      expect(() => bytes.encode([1, 2, 3])).toThrow('Value must be a Uint8Array');
    });

    it('should throw on insufficient bytes for length', () => {
      expect(() => bytes.decode(new Uint8Array([1, 2, 3]))).toThrow(InsufficientBytesError);
    });

    it('should throw on insufficient bytes for data', () => {
      const encoded = new Uint8Array([
        10,
        0,
        0,
        0, // Length = 10
        1,
        2,
        3, // Only 3 bytes of data
      ]);
      expect(() => bytes.decode(encoded)).toThrow(InsufficientBytesError);
    });

    it('should calculate size correctly', () => {
      expect(bytes.size(new Uint8Array([]))).toBe(4);
      expect(bytes.size(new Uint8Array([1, 2, 3]))).toBe(7);
      expect(bytes.size(new Uint8Array(100))).toBe(104);
    });
  });

  describe('bytesWithCustomSize', () => {
    it('should work with u8 size prefix', () => {
      const codec = bytesWithCustomSize(u8);
      const value = new Uint8Array([1, 2, 3]);

      const encoded = codec.encode(value);
      expect(encoded).toEqual(
        new Uint8Array([
          3, // Length (u8)
          1,
          2,
          3, // Data
        ]),
      );

      const [decoded, bytesRead] = codec.decode(encoded);
      expect(decoded).toEqual(value);
      expect(bytesRead).toBe(4); // 1 + 3
    });

    it('should work with u16 size prefix', () => {
      const codec = bytesWithCustomSize(u16);
      const value = new Uint8Array(300).fill(42);

      const encoded = codec.encode(value);
      expect(encoded.length).toBe(302); // 2 + 300
      expect(encoded[0]).toBe(44); // 300 & 0xFF = 44
      expect(encoded[1]).toBe(1); // 300 >> 8 = 1

      const [decoded, bytesRead] = codec.decode(encoded);
      expect(decoded).toEqual(value);
      expect(bytesRead).toBe(302);
    });

    it('should handle variable-size prefix codec', () => {
      // Mock variable-size codec for testing
      const variableSizeCodec = {
        encode: (value: number) => {
          if (value < 128) {
            return new Uint8Array([value]);
          } else {
            return new Uint8Array([0x80 | (value & 0x7f), value >> 7]);
          }
        },
        decode: (bytes: Uint8Array, offset = 0) => {
          if (bytes[offset] < 128) {
            return [bytes[offset], 1] as const;
          } else {
            const value = (bytes[offset] & 0x7f) | (bytes[offset + 1] << 7);
            return [value, 2] as const;
          }
        },
        size: (value: number) => (value < 128 ? 1 : 2),
      };

      const codec = bytesWithCustomSize(variableSizeCodec);
      const smallValue = new Uint8Array(100).fill(1);
      const largeValue = new Uint8Array(200).fill(2);

      const smallEncoded = codec.encode(smallValue);
      expect(smallEncoded.length).toBe(101); // 1 + 100

      const largeEncoded = codec.encode(largeValue);
      expect(largeEncoded.length).toBe(202); // 2 + 200

      expect(codec.size(smallValue)).toBe(101);
      expect(codec.size(largeValue)).toBe(202);
    });
  });

  describe('publicKey', () => {
    it('should encode and decode 32-byte public keys', () => {
      const value = new Uint8Array(32).fill(0);
      value[0] = 0x11;
      value[31] = 0xff;

      const encoded = publicKey.encode(value);
      expect(encoded).toEqual(value);
      expect(encoded).not.toBe(value); // Should be a copy

      const [decoded, bytesRead] = publicKey.decode(encoded);
      expect(decoded).toEqual(value);
      expect(decoded).not.toBe(value); // Should be a copy
      expect(bytesRead).toBe(32);
    });

    it('should handle offset correctly', () => {
      const keyData = new Uint8Array(32).fill(0xaa);
      const bytes = new Uint8Array([0xff, 0xff, ...keyData, 0xff, 0xff]);

      const [decoded, bytesRead] = publicKey.decode(bytes, 2);
      expect(decoded).toEqual(keyData);
      expect(bytesRead).toBe(32);
    });

    it('should throw on wrong input type', () => {
      // @ts-expect-error Testing runtime validation
      expect(() => publicKey.encode([])).toThrow('Public key must be a Uint8Array');
    });

    it('should throw on wrong length', () => {
      expect(() => publicKey.encode(new Uint8Array(31))).toThrow(
        'Public key must be exactly 32 bytes, got 31',
      );
      expect(() => publicKey.encode(new Uint8Array(33))).toThrow(
        'Public key must be exactly 32 bytes, got 33',
      );
    });

    it('should throw on insufficient bytes', () => {
      expect(() => publicKey.decode(new Uint8Array(31))).toThrow(InsufficientBytesError);
    });

    it('should have correct size', () => {
      expect(publicKey.size).toBe(32);
    });
  });

  describe('Immutability', () => {
    it('should not modify input arrays during encoding', () => {
      const original = new Uint8Array([1, 2, 3, 4]);
      const originalCopy = new Uint8Array(original);

      const codec = fixedBytes(4);
      codec.encode(original);

      expect(original).toEqual(originalCopy);
    });

    it('should not share references between encoded/decoded values', () => {
      const codec = fixedBytes(4);
      const original = new Uint8Array([1, 2, 3, 4]);

      const encoded = codec.encode(original);
      encoded[0] = 99;
      expect(original[0]).toBe(1);

      const [decoded] = codec.decode(original);
      decoded[0] = 88;
      expect(original[0]).toBe(1);
    });
  });
});
