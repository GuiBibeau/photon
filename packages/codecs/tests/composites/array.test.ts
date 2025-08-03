import { describe, it, expect } from 'vitest';
import {
  array,
  vec,
  set,
  u8,
  u16,
  u32,
  string,
  boolean,
  isFixedSizeCodec,
  isVariableSizeCodec,
  CodecError,
} from '../../src/index.js';

describe('Array Codecs', () => {
  describe('array() - Fixed-size arrays', () => {
    describe('Fixed-size element codec', () => {
      const fixedArrayCodec = array(u32, 3);

      it('should be identified as fixed-size', () => {
        expect(isFixedSizeCodec(fixedArrayCodec)).toBe(true);
        expect(isVariableSizeCodec(fixedArrayCodec)).toBe(false);
      });

      it('should have correct total size', () => {
        if (isFixedSizeCodec(fixedArrayCodec)) {
          expect(fixedArrayCodec.size).toBe(12); // 3 * 4 bytes
        }
      });

      it('should encode and decode fixed arrays correctly', () => {
        const data = [100, 200, 300];
        const encoded = fixedArrayCodec.encode(data);
        const [decoded, bytesRead] = fixedArrayCodec.decode(encoded);

        expect(decoded).toEqual(data);
        expect(bytesRead).toBe(12);
        expect(encoded.length).toBe(12);
      });

      it('should preserve element order', () => {
        const data = [0x12345678, 0x9abcdef0, 0x11223344];
        const encoded = fixedArrayCodec.encode(data);

        // Check first element (little-endian)
        expect(encoded.slice(0, 4)).toEqual(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
        // Check second element
        expect(encoded.slice(4, 8)).toEqual(new Uint8Array([0xf0, 0xde, 0xbc, 0x9a]));
        // Check third element
        expect(encoded.slice(8, 12)).toEqual(new Uint8Array([0x44, 0x33, 0x22, 0x11]));
      });

      it('should handle partial decoding with offset', () => {
        const data = new Uint8Array(20);
        const view = new DataView(data.buffer);

        // Write array starting at offset 4
        view.setUint32(4, 111, true);
        view.setUint32(8, 222, true);
        view.setUint32(12, 333, true);

        const [decoded, bytesRead] = fixedArrayCodec.decode(data, 4);
        expect(decoded).toEqual([111, 222, 333]);
        expect(bytesRead).toBe(12);
      });

      it('should throw on incorrect array length during encoding', () => {
        expect(() => fixedArrayCodec.encode([1, 2])).toThrow(CodecError);
        expect(() => fixedArrayCodec.encode([1, 2, 3, 4])).toThrow(CodecError);
      });

      it('should throw on insufficient bytes during decoding', () => {
        const insufficientBytes = new Uint8Array(8); // Need 12 bytes
        expect(() => fixedArrayCodec.decode(insufficientBytes)).toThrow();
      });
    });

    describe('Variable-size element codec', () => {
      const variableArrayCodec = array(string, 2);

      it('should be identified as variable-size', () => {
        expect(isFixedSizeCodec(variableArrayCodec)).toBe(false);
        expect(isVariableSizeCodec(variableArrayCodec)).toBe(true);
      });

      it('should encode and decode variable arrays correctly', () => {
        const data = ['hello', 'world'];
        const encoded = variableArrayCodec.encode(data);
        const [decoded, bytesRead] = variableArrayCodec.decode(encoded);

        expect(decoded).toEqual(data);
        expect(bytesRead).toBe(encoded.length);
      });

      it('should calculate size correctly', () => {
        const data = ['test', 'data'];
        const expectedSize =
          4 +
          4 + // 'test' (length + data)
          4 +
          4; // 'data' (length + data)

        expect(variableArrayCodec.size(data)).toBe(expectedSize);

        const encoded = variableArrayCodec.encode(data);
        expect(encoded.length).toBe(expectedSize);
      });

      it('should handle empty strings in array', () => {
        const data = ['', 'nonempty'];
        const encoded = variableArrayCodec.encode(data);
        const [decoded] = variableArrayCodec.decode(encoded);

        expect(decoded).toEqual(data);
      });
    });

    describe('Edge cases', () => {
      it('should handle zero-size arrays', () => {
        const emptyArrayCodec = array(u32, 0);
        const data: number[] = [];

        if (isFixedSizeCodec(emptyArrayCodec)) {
          expect(emptyArrayCodec.size).toBe(0);
        }

        const encoded = emptyArrayCodec.encode(data);
        const [decoded] = emptyArrayCodec.decode(encoded);

        expect(decoded).toEqual(data);
        expect(encoded.length).toBe(0);
      });

      it('should throw on negative size', () => {
        expect(() => array(u32, -1)).toThrow(CodecError);
      });

      it('should throw on non-integer size', () => {
        expect(() => array(u32, 2.5)).toThrow(CodecError);
      });

      it('should handle single-element arrays', () => {
        const singleElementCodec = array(u16, 1);
        const data = [42];

        const encoded = singleElementCodec.encode(data);
        const [decoded] = singleElementCodec.decode(encoded);

        expect(decoded).toEqual(data);
      });
    });
  });

  describe('vec() - Variable-size arrays', () => {
    const numbersVecCodec = vec(u32);

    it('should be identified as variable-size', () => {
      expect(isVariableSizeCodec(numbersVecCodec)).toBe(true);
      expect(isFixedSizeCodec(numbersVecCodec)).toBe(false);
    });

    it('should encode and decode variable-length arrays', () => {
      const data = [1, 2, 3, 4, 5];
      const encoded = numbersVecCodec.encode(data);
      const [decoded, bytesRead] = numbersVecCodec.decode(encoded);

      expect(decoded).toEqual(data);
      expect(bytesRead).toBe(encoded.length);
    });

    it('should include length prefix in encoding', () => {
      const data = [100, 200];
      const encoded = numbersVecCodec.encode(data);

      // First 4 bytes should be length (2 in little-endian)
      expect(encoded.slice(0, 4)).toEqual(new Uint8Array([2, 0, 0, 0]));

      // Next 8 bytes should be the data
      expect(encoded.length).toBe(12); // 4 (length) + 8 (data)
    });

    it('should handle empty arrays', () => {
      const data: number[] = [];
      const encoded = numbersVecCodec.encode(data);
      const [decoded] = numbersVecCodec.decode(encoded);

      expect(decoded).toEqual(data);
      expect(encoded.length).toBe(4); // Just the length prefix
    });

    it('should calculate size correctly', () => {
      const data = [10, 20, 30];
      const expectedSize = 4 + 3 * 4; // length prefix + elements

      expect(numbersVecCodec.size(data)).toBe(expectedSize);

      const encoded = numbersVecCodec.encode(data);
      expect(encoded.length).toBe(expectedSize);
    });

    it('should handle large arrays', () => {
      const data = Array.from({ length: 1000 }, (_, i) => i);
      const encoded = numbersVecCodec.encode(data);
      const [decoded] = numbersVecCodec.decode(encoded);

      expect(decoded).toEqual(data);
      expect(encoded.length).toBe(4 + 1000 * 4);
    });

    it('should work with variable-size elements', () => {
      const stringsVecCodec = vec(string);
      const data = ['hello', 'world', 'test'];

      const encoded = stringsVecCodec.encode(data);
      const [decoded] = stringsVecCodec.decode(encoded);

      expect(decoded).toEqual(data);
    });

    it('should support custom length codecs', () => {
      const shortVecCodec = vec(u32, u8); // Use u8 for length instead of u32
      const data = [1, 2, 3];

      const encoded = shortVecCodec.encode(data);
      const [decoded] = shortVecCodec.decode(encoded);

      expect(decoded).toEqual(data);
      expect(encoded.slice(0, 1)).toEqual(new Uint8Array([3])); // Length in single byte
    });
  });

  describe('set() - Unique elements arrays', () => {
    const numbersSetCodec = set(u32);

    it('should be identified as variable-size', () => {
      expect(isVariableSizeCodec(numbersSetCodec)).toBe(true);
      expect(isFixedSizeCodec(numbersSetCodec)).toBe(false);
    });

    it('should encode and decode unique arrays correctly', () => {
      const data = [1, 2, 3, 4, 5];
      const encoded = numbersSetCodec.encode(data);
      const [decoded, bytesRead] = numbersSetCodec.decode(encoded);

      expect(decoded).toEqual(data);
      expect(bytesRead).toBe(encoded.length);
    });

    it('should throw on duplicate elements during encoding', () => {
      const dataWithDuplicates = [1, 2, 3, 2, 4];

      expect(() => numbersSetCodec.encode(dataWithDuplicates)).toThrow(CodecError);
      expect(() => numbersSetCodec.encode(dataWithDuplicates)).toThrow(/duplicate element/);
    });

    it('should throw on duplicate elements during decoding', () => {
      // Manually create an encoded array with duplicates
      const duplicateVecCodec = vec(u32);
      const invalidData = [1, 2, 3, 2, 4];
      const invalidEncoded = duplicateVecCodec.encode(invalidData);

      expect(() => numbersSetCodec.decode(invalidEncoded)).toThrow(CodecError);
      expect(() => numbersSetCodec.decode(invalidEncoded)).toThrow(/duplicate element/);
    });

    it('should handle empty sets', () => {
      const data: number[] = [];
      const encoded = numbersSetCodec.encode(data);
      const [decoded] = numbersSetCodec.decode(encoded);

      expect(decoded).toEqual(data);
    });

    it('should handle single-element sets', () => {
      const data = [42];
      const encoded = numbersSetCodec.encode(data);
      const [decoded] = numbersSetCodec.decode(encoded);

      expect(decoded).toEqual(data);
    });

    it('should work with complex types', () => {
      const stringsSetCodec = set(string);
      const data = ['apple', 'banana', 'cherry'];

      const encoded = stringsSetCodec.encode(data);
      const [decoded] = stringsSetCodec.decode(encoded);

      expect(decoded).toEqual(data);

      // Test duplicates
      const duplicateStrings = ['apple', 'banana', 'apple'];
      expect(() => stringsSetCodec.encode(duplicateStrings)).toThrow(CodecError);
    });

    it('should detect object duplicates correctly', () => {
      // Note: This is a limitation - object comparison uses JSON.stringify
      // So this test documents the current behavior
      const booleanSetCodec = set(boolean);

      const validData = [true, false];
      const encoded = booleanSetCodec.encode(validData);
      const [decoded] = booleanSetCodec.decode(encoded);
      expect(decoded).toEqual(validData);

      const duplicateBooleans = [true, false, true];
      expect(() => booleanSetCodec.encode(duplicateBooleans)).toThrow(CodecError);
    });

    it('should support custom length codecs', () => {
      const shortSetCodec = set(u32, u8);
      const data = [10, 20, 30];

      const encoded = shortSetCodec.encode(data);
      const [decoded] = shortSetCodec.decode(encoded);

      expect(decoded).toEqual(data);
    });
  });

  describe('Integration tests', () => {
    it('should work with nested arrays', () => {
      const nestedArrayCodec = vec(array(u16, 2));
      const data = [
        [1, 2],
        [3, 4],
        [5, 6],
      ];

      const encoded = nestedArrayCodec.encode(data);
      const [decoded] = nestedArrayCodec.decode(encoded);

      expect(decoded).toEqual(data);
    });

    it('should work with arrays of arrays', () => {
      const arrayOfArraysCodec = vec(vec(u8));
      const data = [
        [1, 2, 3],
        [4, 5],
        [6, 7, 8, 9],
      ];

      const encoded = arrayOfArraysCodec.encode(data);
      const [decoded] = arrayOfArraysCodec.decode(encoded);

      expect(decoded).toEqual(data);
    });

    it('should handle complex size calculations', () => {
      const complexArrayCodec = vec(string);
      const data = ['short', 'medium-length', 'very-long-string-here'];

      const size = complexArrayCodec.size(data);
      const encoded = complexArrayCodec.encode(data);

      expect(encoded.length).toBe(size);
    });
  });
});
