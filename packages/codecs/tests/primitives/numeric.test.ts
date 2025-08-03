import { describe, it, expect } from 'vitest';
import {
  u8,
  u16,
  u32,
  u64,
  i8,
  i16,
  i32,
  i64,
  CodecError,
  InsufficientBytesError,
} from '../../src/index.js';

describe('Numeric Codecs', () => {
  describe('u8 codec', () => {
    it('should encode and decode unsigned 8-bit integers', () => {
      expect(u8.encode(0)).toEqual(new Uint8Array([0]));
      expect(u8.encode(255)).toEqual(new Uint8Array([255]));
      expect(u8.encode(128)).toEqual(new Uint8Array([128]));

      expect(u8.decode(new Uint8Array([0]))).toEqual([0, 1]);
      expect(u8.decode(new Uint8Array([255]))).toEqual([255, 1]);
      expect(u8.decode(new Uint8Array([128]))).toEqual([128, 1]);
    });

    it('should handle offset correctly', () => {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      expect(u8.decode(bytes, 2)).toEqual([3, 1]);
    });

    it('should throw on out of range values', () => {
      expect(() => u8.encode(-1)).toThrow(CodecError);
      expect(() => u8.encode(256)).toThrow(CodecError);
      expect(() => u8.encode(1.5)).toThrow('Value must be an integer');
    });

    it('should throw on insufficient bytes', () => {
      expect(() => u8.decode(new Uint8Array([]), 0)).toThrow(InsufficientBytesError);
    });

    it('should have correct size', () => {
      expect(u8.size).toBe(1);
    });
  });

  describe('u16 codec', () => {
    it('should encode and decode unsigned 16-bit integers', () => {
      // Little-endian encoding
      expect(u16.encode(0)).toEqual(new Uint8Array([0, 0]));
      expect(u16.encode(0x1234)).toEqual(new Uint8Array([0x34, 0x12]));
      expect(u16.encode(65535)).toEqual(new Uint8Array([255, 255]));

      expect(u16.decode(new Uint8Array([0, 0]))).toEqual([0, 2]);
      expect(u16.decode(new Uint8Array([0x34, 0x12]))).toEqual([0x1234, 2]);
      expect(u16.decode(new Uint8Array([255, 255]))).toEqual([65535, 2]);
    });

    it('should throw on out of range values', () => {
      expect(() => u16.encode(-1)).toThrow(CodecError);
      expect(() => u16.encode(65536)).toThrow(CodecError);
    });

    it('should have correct size', () => {
      expect(u16.size).toBe(2);
    });
  });

  describe('u32 codec', () => {
    it('should encode and decode unsigned 32-bit integers', () => {
      // Little-endian encoding
      expect(u32.encode(0)).toEqual(new Uint8Array([0, 0, 0, 0]));
      expect(u32.encode(0x12345678)).toEqual(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
      expect(u32.encode(4294967295)).toEqual(new Uint8Array([255, 255, 255, 255]));

      expect(u32.decode(new Uint8Array([0, 0, 0, 0]))).toEqual([0, 4]);
      expect(u32.decode(new Uint8Array([0x78, 0x56, 0x34, 0x12]))).toEqual([0x12345678, 4]);
      expect(u32.decode(new Uint8Array([255, 255, 255, 255]))).toEqual([4294967295, 4]);
    });

    it('should throw on out of range values', () => {
      expect(() => u32.encode(-1)).toThrow(CodecError);
      expect(() => u32.encode(4294967296)).toThrow(CodecError);
    });

    it('should have correct size', () => {
      expect(u32.size).toBe(4);
    });
  });

  describe('u64 codec', () => {
    it('should encode and decode unsigned 64-bit integers', () => {
      // Little-endian encoding
      expect(u64.encode(0n)).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]));
      expect(u64.encode(0x123456789abcdefn)).toEqual(
        new Uint8Array([0xef, 0xcd, 0xab, 0x89, 0x67, 0x45, 0x23, 0x01]),
      );
      expect(u64.encode(18446744073709551615n)).toEqual(
        new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255]),
      );

      expect(u64.decode(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]))).toEqual([0n, 8]);
      expect(u64.decode(new Uint8Array([0xef, 0xcd, 0xab, 0x89, 0x67, 0x45, 0x23, 0x01]))).toEqual([
        0x123456789abcdefn,
        8,
      ]);
    });

    it('should throw on non-bigint values', () => {
      // @ts-expect-error Testing runtime validation
      expect(() => u64.encode(123)).toThrow('Value must be a bigint');
    });

    it('should throw on out of range values', () => {
      expect(() => u64.encode(-1n)).toThrow(CodecError);
      expect(() => u64.encode(2n ** 64n)).toThrow(CodecError);
    });

    it('should have correct size', () => {
      expect(u64.size).toBe(8);
    });
  });

  describe('i8 codec', () => {
    it('should encode and decode signed 8-bit integers', () => {
      expect(i8.encode(-128)).toEqual(new Uint8Array([0x80]));
      expect(i8.encode(-1)).toEqual(new Uint8Array([0xff]));
      expect(i8.encode(0)).toEqual(new Uint8Array([0]));
      expect(i8.encode(127)).toEqual(new Uint8Array([0x7f]));

      expect(i8.decode(new Uint8Array([0x80]))).toEqual([-128, 1]);
      expect(i8.decode(new Uint8Array([0xff]))).toEqual([-1, 1]);
      expect(i8.decode(new Uint8Array([0]))).toEqual([0, 1]);
      expect(i8.decode(new Uint8Array([0x7f]))).toEqual([127, 1]);
    });

    it('should throw on out of range values', () => {
      expect(() => i8.encode(-129)).toThrow(CodecError);
      expect(() => i8.encode(128)).toThrow(CodecError);
    });

    it('should have correct size', () => {
      expect(i8.size).toBe(1);
    });
  });

  describe('i16 codec', () => {
    it('should encode and decode signed 16-bit integers', () => {
      expect(i16.encode(-32768)).toEqual(new Uint8Array([0x00, 0x80]));
      expect(i16.encode(-1)).toEqual(new Uint8Array([0xff, 0xff]));
      expect(i16.encode(0)).toEqual(new Uint8Array([0, 0]));
      expect(i16.encode(32767)).toEqual(new Uint8Array([0xff, 0x7f]));

      expect(i16.decode(new Uint8Array([0x00, 0x80]))).toEqual([-32768, 2]);
      expect(i16.decode(new Uint8Array([0xff, 0xff]))).toEqual([-1, 2]);
      expect(i16.decode(new Uint8Array([0, 0]))).toEqual([0, 2]);
      expect(i16.decode(new Uint8Array([0xff, 0x7f]))).toEqual([32767, 2]);
    });

    it('should throw on out of range values', () => {
      expect(() => i16.encode(-32769)).toThrow(CodecError);
      expect(() => i16.encode(32768)).toThrow(CodecError);
    });

    it('should have correct size', () => {
      expect(i16.size).toBe(2);
    });
  });

  describe('i32 codec', () => {
    it('should encode and decode signed 32-bit integers', () => {
      expect(i32.encode(-2147483648)).toEqual(new Uint8Array([0x00, 0x00, 0x00, 0x80]));
      expect(i32.encode(-1)).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0xff]));
      expect(i32.encode(0)).toEqual(new Uint8Array([0, 0, 0, 0]));
      expect(i32.encode(2147483647)).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0x7f]));

      expect(i32.decode(new Uint8Array([0x00, 0x00, 0x00, 0x80]))).toEqual([-2147483648, 4]);
      expect(i32.decode(new Uint8Array([0xff, 0xff, 0xff, 0xff]))).toEqual([-1, 4]);
    });

    it('should throw on out of range values', () => {
      expect(() => i32.encode(-2147483649)).toThrow(CodecError);
      expect(() => i32.encode(2147483648)).toThrow(CodecError);
    });

    it('should have correct size', () => {
      expect(i32.size).toBe(4);
    });
  });

  describe('i64 codec', () => {
    it('should encode and decode signed 64-bit integers', () => {
      expect(i64.encode(-(2n ** 63n))).toEqual(
        new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80]),
      );
      expect(i64.encode(-1n)).toEqual(
        new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
      );
      expect(i64.encode(0n)).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]));
      expect(i64.encode(2n ** 63n - 1n)).toEqual(
        new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f]),
      );

      expect(i64.decode(new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80]))).toEqual([
        -(2n ** 63n),
        8,
      ]);
      expect(i64.decode(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]))).toEqual([
        -1n,
        8,
      ]);
    });

    it('should throw on out of range values', () => {
      expect(() => i64.encode(-(2n ** 63n) - 1n)).toThrow(CodecError);
      expect(() => i64.encode(2n ** 63n)).toThrow(CodecError);
    });

    it('should have correct size', () => {
      expect(i64.size).toBe(8);
    });
  });

  describe('Edge cases', () => {
    it('should handle decoding with offset across all numeric types', () => {
      const bytes = new Uint8Array([
        0xff,
        0xff, // Padding
        0x12, // u8
        0x34,
        0x12, // u16
        0x78,
        0x56,
        0x34,
        0x12, // u32
      ]);

      expect(u8.decode(bytes, 2)).toEqual([0x12, 1]);
      expect(u16.decode(bytes, 3)).toEqual([0x1234, 2]);
      expect(u32.decode(bytes, 5)).toEqual([0x12345678, 4]);
    });

    it('should handle maximum safe JavaScript integers', () => {
      const maxSafeInt = Number.MAX_SAFE_INTEGER; // 2^53 - 1

      // u64 should handle values beyond MAX_SAFE_INTEGER as bigint
      const bigValue = BigInt(maxSafeInt) + 1n;
      const encoded = u64.encode(bigValue);
      const [decoded] = u64.decode(encoded);
      expect(decoded).toBe(bigValue);
    });
  });
});
