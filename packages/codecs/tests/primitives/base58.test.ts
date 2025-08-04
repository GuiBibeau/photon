/**
 * Tests for base58 codec implementation.
 *
 * These tests verify the correctness of base58 encoding/decoding
 * using known test vectors from Solana and other edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  base58,
  base58String,
  encodeBase58,
  decodeBase58,
  isBase58,
  BASE58_ALPHABET,
} from '../../src/primitives/base58.js';
import { CodecError } from '../../src/errors.js';

describe('base58 encoding and decoding', () => {
  describe('encodeBase58', () => {
    it('should encode empty bytes to empty string', () => {
      const result = encodeBase58(new Uint8Array(0));
      expect(result).toBe('');
    });

    it('should encode single zero byte to "1"', () => {
      const result = encodeBase58(new Uint8Array([0]));
      expect(result).toBe('1');
    });

    it('should encode multiple zero bytes to multiple "1"s', () => {
      const result = encodeBase58(new Uint8Array([0, 0, 0]));
      expect(result).toBe('111');
    });

    it('should encode known test vectors correctly', () => {
      // Test well-known Solana values
      const testVectors: Array<[Uint8Array, string]> = [
        // Simple single byte values
        [new Uint8Array([0]), '1'],
        [new Uint8Array([1]), '2'],
        [new Uint8Array([57]), 'z'], // 57 maps to index 57 which is 'z'
        [new Uint8Array([58]), '21'], // 58 = 1*58 + 0
        [new Uint8Array([255]), '5Q'],

        // Multi-byte values
        [new Uint8Array([255, 255]), 'LUv'],
        [new Uint8Array([255, 255, 255]), '2UzHL'],
        [new Uint8Array([255, 255, 255, 255]), '7YXq9G'],

        // System Program address (all zeros)
        [
          new Uint8Array(32), // All zeros
          '11111111111111111111111111111111',
        ],

        // Address with single bit set at end
        [
          new Uint8Array([
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 1,
          ]),
          '11111111111111111111111111111112',
        ],
      ];

      for (const [bytes, expected] of testVectors) {
        const result = encodeBase58(bytes);
        expect(result).toBe(expected);
      }
    });

    it('should handle bytes with mixed values', () => {
      const bytes = new Uint8Array([0, 123, 255, 0, 42]);
      const encoded = encodeBase58(bytes);
      const decoded = decodeBase58(encoded);
      expect(decoded).toEqual(bytes);
    });
  });

  describe('decodeBase58', () => {
    it('should decode empty string to empty bytes', () => {
      const result = decodeBase58('');
      expect(result).toEqual(new Uint8Array(0));
    });

    it('should decode "1" to single zero byte', () => {
      const result = decodeBase58('1');
      expect(result).toEqual(new Uint8Array([0]));
    });

    it('should decode multiple "1"s to multiple zero bytes', () => {
      const result = decodeBase58('111');
      expect(result).toEqual(new Uint8Array([0, 0, 0]));
    });

    it('should decode known test vectors correctly', () => {
      const testVectors: Array<[string, Uint8Array]> = [
        // Simple values
        ['1', new Uint8Array([0])],
        ['2', new Uint8Array([1])],
        ['z', new Uint8Array([57])], // 'z' is at index 57
        ['21', new Uint8Array([58])], // '21' decodes to 58
        ['5Q', new Uint8Array([255])],

        // Multi-byte values
        ['LUv', new Uint8Array([255, 255])],
        ['2UzHL', new Uint8Array([255, 255, 255])],
        ['7YXq9G', new Uint8Array([255, 255, 255, 255])],

        // System Program address
        ['11111111111111111111111111111111', new Uint8Array(32)],

        // Address with single bit at end
        [
          '11111111111111111111111111111112',
          new Uint8Array([
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 1,
          ]),
        ],
      ];

      for (const [str, expected] of testVectors) {
        const result = decodeBase58(str);
        expect(result).toEqual(expected);
      }
    });

    it('should throw error for invalid base58 characters', () => {
      const invalidChars = ['0', 'O', 'I', 'l', '#', '@', '!', ' '];

      for (const char of invalidChars) {
        expect(() => decodeBase58(`abc${char}def`)).toThrow(CodecError);
        expect(() => decodeBase58(`abc${char}def`)).toThrow(`Invalid base58 character: '${char}'`);
      }
    });

    it('should handle case sensitivity correctly', () => {
      // Base58 is case sensitive - 'a' and 'A' are different
      const lowercase = decodeBase58('abc');
      const uppercase = decodeBase58('ABC');
      expect(lowercase).not.toEqual(uppercase);
    });
  });

  describe('round-trip encoding/decoding', () => {
    it('should correctly round-trip random byte arrays', () => {
      // Test various lengths
      const lengths = [1, 5, 10, 16, 20, 32, 64, 100];

      for (const length of lengths) {
        const bytes = new Uint8Array(length);
        // Fill with pseudo-random values
        for (let i = 0; i < length; i++) {
          bytes[i] = (i * 37 + 13) % 256;
        }

        const encoded = encodeBase58(bytes);
        const decoded = decodeBase58(encoded);
        expect(decoded).toEqual(bytes);
      }
    });

    it('should handle edge cases', () => {
      const edgeCases = [
        new Uint8Array([0]),
        new Uint8Array([255]),
        new Uint8Array([0, 0, 0, 0]),
        new Uint8Array([255, 255, 255, 255]),
        new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
        new Uint8Array([128, 64, 32, 16, 8, 4, 2, 1]),
      ];

      for (const bytes of edgeCases) {
        const encoded = encodeBase58(bytes);
        const decoded = decodeBase58(encoded);
        expect(decoded).toEqual(bytes);
      }
    });
  });

  describe('isBase58', () => {
    it('should return true for valid base58 strings', () => {
      const validStrings = [
        '',
        '1',
        '111',
        'abc',
        'ABC',
        '123456789',
        BASE58_ALPHABET,
        '11111111111111111111111111111111', // System program
        'So11111111111111111111111111111111111111112', // Native SOL mint
      ];

      for (const str of validStrings) {
        expect(isBase58(str)).toBe(true);
      }
    });

    it('should return false for invalid base58 strings', () => {
      const invalidStrings = [
        '0',
        'O',
        'I',
        'l',
        'abc0def',
        'test string',
        'hello!',
        '123#456',
        'base58 with spaces',
      ];

      for (const str of invalidStrings) {
        expect(isBase58(str)).toBe(false);
      }
    });

    it('should return false for non-string values', () => {
      expect(isBase58(null as any)).toBe(false);
      expect(isBase58(undefined as any)).toBe(false);
      expect(isBase58(123 as any)).toBe(false);
      expect(isBase58({} as any)).toBe(false);
      expect(isBase58([] as any)).toBe(false);
    });
  });

  describe('base58 codec', () => {
    it('should encode Uint8Array to UTF-8 bytes of base58 string', () => {
      const value = new Uint8Array([1, 2, 3, 4]);
      const encoded = base58.encode(value);

      // Should be UTF-8 bytes of the base58 string
      const expectedString = encodeBase58(value);
      const expectedBytes = new TextEncoder().encode(expectedString);

      expect(encoded).toEqual(expectedBytes);
    });

    it('should decode UTF-8 bytes to Uint8Array', () => {
      const value = new Uint8Array([1, 2, 3, 4]);
      const base58Str = encodeBase58(value);
      const utf8Bytes = new TextEncoder().encode(base58Str);

      const [decoded, bytesRead] = base58.decode(utf8Bytes);

      expect(decoded).toEqual(value);
      expect(bytesRead).toBe(base58Str.length);
    });

    it('should handle offset correctly', () => {
      const value = new Uint8Array([1, 2, 3, 4]);
      const base58Str = encodeBase58(value);
      const prefix = new TextEncoder().encode('prefix:');
      const utf8Bytes = new TextEncoder().encode(`prefix:${base58Str}!suffix`);

      const [decoded, bytesRead] = base58.decode(utf8Bytes, prefix.length);

      expect(decoded).toEqual(value);
      expect(bytesRead).toBe(base58Str.length);
    });

    it('should throw error for non-Uint8Array encode input', () => {
      expect(() => base58.encode('string' as any)).toThrow(CodecError);
      expect(() => base58.encode('string' as any)).toThrow('Value must be a Uint8Array');
    });

    it('should throw error when no valid base58 found at offset', () => {
      const invalidBytes = new TextEncoder().encode('!!!');
      expect(() => base58.decode(invalidBytes)).toThrow(CodecError);
      expect(() => base58.decode(invalidBytes)).toThrow('No valid base58 string found at offset');
    });

    it('should calculate size correctly', () => {
      const testCases = [
        new Uint8Array([0]),
        new Uint8Array([255]),
        new Uint8Array([1, 2, 3, 4]),
        new Uint8Array(32), // 32 zero bytes
      ];

      for (const value of testCases) {
        const size = base58.size(value);
        const encoded = base58.encode(value);
        expect(size).toBe(encoded.length);
      }
    });

    it('should throw error for non-Uint8Array size input', () => {
      expect(() => base58.size('string' as any)).toThrow(CodecError);
      expect(() => base58.size('string' as any)).toThrow('Value must be a Uint8Array');
    });
  });

  describe('base58String codec', () => {
    it('should encode base58 string to UTF-8 bytes', () => {
      const value = '11111111111111111111111111111111';
      const encoded = base58String.encode(value);
      const expected = new TextEncoder().encode(value);

      expect(encoded).toEqual(expected);
    });

    it('should decode UTF-8 bytes to base58 string', () => {
      const value = '11111111111111111111111111111111';
      const utf8Bytes = new TextEncoder().encode(value);

      const [decoded, bytesRead] = base58String.decode(utf8Bytes);

      expect(decoded).toBe(value);
      expect(bytesRead).toBe(value.length);
    });

    it('should throw error for invalid base58 characters in encode', () => {
      expect(() => base58String.encode('invalid!base58')).toThrow(CodecError);
      expect(() => base58String.encode('invalid!base58')).toThrow(
        'String contains invalid base58 characters',
      );
    });

    it('should throw error for non-string encode input', () => {
      expect(() => base58String.encode(123 as any)).toThrow(CodecError);
      expect(() => base58String.encode(123 as any)).toThrow('Value must be a string');
    });

    it('should handle partial decoding with non-base58 suffix', () => {
      const validPart = 'ABC123';
      const fullString = `${validPart}!invalid`;
      const utf8Bytes = new TextEncoder().encode(fullString);

      const [decoded, bytesRead] = base58String.decode(utf8Bytes);

      expect(decoded).toBe(validPart);
      expect(bytesRead).toBe(validPart.length);
    });

    it('should calculate size correctly', () => {
      const testStrings = ['1', '111', 'ABC', '123456789'];

      for (const str of testStrings) {
        const size = base58String.size(str);
        const encoded = base58String.encode(str);
        expect(size).toBe(encoded.length);
      }
    });

    it('should throw error for invalid base58 in size calculation', () => {
      expect(() => base58String.size('invalid!')).toThrow(CodecError);
      expect(() => base58String.size('invalid!')).toThrow(
        'String contains invalid base58 characters',
      );
    });

    it('should throw error for non-string size input', () => {
      expect(() => base58String.size(123 as any)).toThrow(CodecError);
      expect(() => base58String.size(123 as any)).toThrow('Value must be a string');
    });
  });

  describe('BASE58_ALPHABET', () => {
    it('should have 58 characters', () => {
      expect(BASE58_ALPHABET).toHaveLength(58);
    });

    it('should not contain confusing characters', () => {
      expect(BASE58_ALPHABET).not.toContain('0');
      expect(BASE58_ALPHABET).not.toContain('O');
      expect(BASE58_ALPHABET).not.toContain('I');
      expect(BASE58_ALPHABET).not.toContain('l');
    });

    it('should contain expected characters', () => {
      const expectedChars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      expect(BASE58_ALPHABET).toBe(expectedChars);
    });
  });

  describe('performance characteristics', () => {
    it('should handle large byte arrays efficiently', () => {
      // Test with a 1KB array
      const largeArray = new Uint8Array(1024);
      for (let i = 0; i < largeArray.length; i++) {
        largeArray[i] = i % 256;
      }

      const start = performance.now();
      const encoded = encodeBase58(largeArray);
      const decoded = decodeBase58(encoded);
      const end = performance.now();

      expect(decoded).toEqual(largeArray);
      // Should complete in reasonable time (< 100ms)
      expect(end - start).toBeLessThan(100);
    });
  });
});
