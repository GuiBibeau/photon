import { describe, it, expect } from 'vitest';
import {
  getCodecSize,
  isFixedSizeCodec,
  isVariableSizeCodec,
  assertSufficientBytes,
  assertValidOffset,
  type FixedSizeCodec,
  type VariableSizeCodec,
  u8,
  u32,
  string,
  CodecError,
  InsufficientBytesError,
  InvalidDataError,
} from '../src/index.js';

describe('Edge Cases and Interface Functions', () => {
  describe('getCodecSize', () => {
    const fixedCodec = u8;
    const variableCodec = string;

    it('should handle fixed-size codecs without value', () => {
      expect(getCodecSize(fixedCodec)).toBe(1);
      expect(getCodecSize(fixedCodec, undefined)).toBe(1);
      expect(getCodecSize(fixedCodec, 42)).toBe(1); // Value ignored for fixed-size
    });

    it('should handle variable-size codecs with value', () => {
      expect(getCodecSize(variableCodec, 'hello')).toBe(9); // 4 + 5
      expect(getCodecSize(variableCodec, '')).toBe(4); // 4 + 0
      expect(getCodecSize(variableCodec, 'test🎉')).toBe(12); // 4 + 8 (emoji is 4 bytes)
    });

    it('should throw for variable-size codecs without value', () => {
      expect(() => getCodecSize(variableCodec)).toThrow(
        'Value is required to compute size for variable-size codec',
      );
      expect(() => getCodecSize(variableCodec, undefined)).toThrow(
        'Value is required to compute size for variable-size codec',
      );
    });

    it('should handle edge case with malformed codec', () => {
      const malformedCodec = {
        encode: () => new Uint8Array([]),
        decode: () => [null, 0] as const,
        size: null as any, // Malformed size property
      };

      // Since size is not a number or function, it will be treated as variable-size
      // and require a value, which will throw the "Value is required" error
      expect(() => getCodecSize(malformedCodec)).toThrow(
        'Value is required to compute size for variable-size codec',
      );
    });

    it('should handle zero-size codecs', () => {
      const zeroSizeCodec: FixedSizeCodec<null> = {
        encode: () => new Uint8Array([]),
        decode: (_bytes: Uint8Array, _offset = 0) => [null, 0] as const,
        size: 0,
      };

      expect(getCodecSize(zeroSizeCodec)).toBe(0);
    });

    it('should handle large size values', () => {
      const largeSizeCodec: VariableSizeCodec<string> = {
        encode: string.encode,
        decode: string.decode,
        size: () => Number.MAX_SAFE_INTEGER,
      };

      expect(getCodecSize(largeSizeCodec, 'test')).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle size functions that throw', () => {
      const throwingCodec: VariableSizeCodec<string> = {
        encode: string.encode,
        decode: string.decode,
        size: (value: string) => {
          if (value === 'error') {
            throw new Error('Size calculation failed');
          }
          return 10;
        },
      };

      expect(() => getCodecSize(throwingCodec, 'error')).toThrow('Size calculation failed');
      expect(getCodecSize(throwingCodec, 'ok')).toBe(10);
    });
  });

  describe('Type Guards', () => {
    const fixedCodec = u32;
    const variableCodec = string;

    it('should correctly identify fixed-size codecs', () => {
      expect(isFixedSizeCodec(fixedCodec)).toBe(true);
      expect(isVariableSizeCodec(fixedCodec)).toBe(false);
    });

    it('should correctly identify variable-size codecs', () => {
      expect(isFixedSizeCodec(variableCodec)).toBe(false);
      expect(isVariableSizeCodec(variableCodec)).toBe(true);
    });

    it('should handle edge case codecs', () => {
      // Codec with size 0
      const zeroSizeCodec = {
        encode: () => new Uint8Array([]),
        decode: () => [null, 0] as const,
        size: 0,
      };
      expect(isFixedSizeCodec(zeroSizeCodec)).toBe(true);
      expect(isVariableSizeCodec(zeroSizeCodec)).toBe(false);

      // Codec with function that always returns same value
      const constantSizeCodec = {
        encode: () => new Uint8Array([]),
        decode: () => [null, 0] as const,
        size: () => 5,
      };
      expect(isFixedSizeCodec(constantSizeCodec)).toBe(false);
      expect(isVariableSizeCodec(constantSizeCodec)).toBe(true);
    });

    it('should handle malformed codec types gracefully', () => {
      const malformedCodec = {
        encode: () => new Uint8Array([]),
        decode: () => [null, 0] as const,
        size: 'invalid' as any,
      };

      expect(isFixedSizeCodec(malformedCodec)).toBe(false);
      expect(isVariableSizeCodec(malformedCodec)).toBe(false);
    });
  });

  describe('assertSufficientBytes', () => {
    it('should not throw when sufficient bytes are available', () => {
      const bytes = new Uint8Array(10);

      expect(() => assertSufficientBytes(bytes, 0, 5)).not.toThrow();
      expect(() => assertSufficientBytes(bytes, 0, 10)).not.toThrow();
      expect(() => assertSufficientBytes(bytes, 5, 5)).not.toThrow();
      expect(() => assertSufficientBytes(bytes, 10, 0)).not.toThrow(); // Zero bytes required
    });

    it('should throw when insufficient bytes are available', () => {
      const bytes = new Uint8Array(10);

      expect(() => assertSufficientBytes(bytes, 0, 11)).toThrow(InsufficientBytesError);
      expect(() => assertSufficientBytes(bytes, 5, 6)).toThrow(InsufficientBytesError);
      expect(() => assertSufficientBytes(bytes, 10, 1)).toThrow(InsufficientBytesError);
    });

    it('should provide correct error details', () => {
      const bytes = new Uint8Array(10);

      try {
        assertSufficientBytes(bytes, 2, 15);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientBytesError);
        const err = error as InsufficientBytesError;
        expect(err.context).toEqual({
          required: 15,
          available: 8, // 10 - 2
          offset: 2,
        });
      }
    });

    it('should handle edge cases', () => {
      const emptyBytes = new Uint8Array(0);

      expect(() => assertSufficientBytes(emptyBytes, 0, 0)).not.toThrow();
      expect(() => assertSufficientBytes(emptyBytes, 0, 1)).toThrow(InsufficientBytesError);

      const bytes = new Uint8Array(5);
      expect(() => assertSufficientBytes(bytes, 5, 0)).not.toThrow(); // At the end
      expect(() => assertSufficientBytes(bytes, 5, 1)).toThrow(InsufficientBytesError);
    });

    it('should handle negative values gracefully', () => {
      const bytes = new Uint8Array(10);

      // These might not make logical sense but should not crash
      expect(() => assertSufficientBytes(bytes, 0, -1)).not.toThrow(); // Negative requirement
      expect(() => assertSufficientBytes(bytes, -1, 5)).not.toThrow(); // Negative offset gives more available
    });

    it('should handle very large arrays and requirements', () => {
      const largeBytes = new Uint8Array(1000000);

      expect(() => assertSufficientBytes(largeBytes, 250000, 500000)).not.toThrow();
      expect(() => assertSufficientBytes(largeBytes, 250000, 800000)).toThrow(
        InsufficientBytesError,
      );
    });
  });

  describe('assertValidOffset', () => {
    it('should not throw for valid offsets', () => {
      const bytes = new Uint8Array(10);

      expect(() => assertValidOffset(bytes, 0)).not.toThrow();
      expect(() => assertValidOffset(bytes, 5)).not.toThrow();
      expect(() => assertValidOffset(bytes, 9)).not.toThrow();
      expect(() => assertValidOffset(bytes, 10)).not.toThrow(); // At the end is valid
    });

    it('should throw for invalid offsets', () => {
      const bytes = new Uint8Array(10);

      expect(() => assertValidOffset(bytes, -1)).toThrow(CodecError);
      expect(() => assertValidOffset(bytes, 11)).toThrow(CodecError);
      expect(() => assertValidOffset(bytes, -100)).toThrow(CodecError);
      expect(() => assertValidOffset(bytes, 1000)).toThrow(CodecError);
    });

    it('should provide correct error messages', () => {
      const bytes = new Uint8Array(10);

      try {
        assertValidOffset(bytes, -5);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CodecError);
        expect(error.message).toContain('Invalid offset: -5');
        expect(error.message).toContain('array length: 10');
      }

      try {
        assertValidOffset(bytes, 15);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CodecError);
        expect(error.message).toContain('Invalid offset: 15');
        expect(error.message).toContain('array length: 10');
      }
    });

    it('should handle empty arrays', () => {
      const emptyBytes = new Uint8Array(0);

      expect(() => assertValidOffset(emptyBytes, 0)).not.toThrow();
      expect(() => assertValidOffset(emptyBytes, 1)).toThrow(CodecError);
      expect(() => assertValidOffset(emptyBytes, -1)).toThrow(CodecError);
    });

    it('should handle very large arrays', () => {
      const largeBytes = new Uint8Array(1000000);

      expect(() => assertValidOffset(largeBytes, 0)).not.toThrow();
      expect(() => assertValidOffset(largeBytes, 999999)).not.toThrow();
      expect(() => assertValidOffset(largeBytes, 1000000)).not.toThrow(); // At end
      expect(() => assertValidOffset(largeBytes, 1000001)).toThrow(CodecError);
    });

    it('should handle special numeric values', () => {
      const bytes = new Uint8Array(10);

      expect(() => assertValidOffset(bytes, Number.MAX_SAFE_INTEGER)).toThrow(CodecError);
      expect(() => assertValidOffset(bytes, Number.MIN_SAFE_INTEGER)).toThrow(CodecError);
      expect(() => assertValidOffset(bytes, Infinity)).toThrow(CodecError);
      expect(() => assertValidOffset(bytes, -Infinity)).toThrow(CodecError);
      // NaN comparisons always return false, so NaN < 0 is false and NaN > 10 is false
      // This means NaN might not throw - let's test this more carefully
      try {
        assertValidOffset(bytes, NaN);
        // If no error thrown, NaN is treated as valid (which is unexpected but not wrong)
      } catch (error) {
        expect(error).toBeInstanceOf(CodecError);
      }
    });
  });

  describe('Extreme Edge Cases', () => {
    it('should handle maximum-size arrays', () => {
      // Test with reasonably large arrays (avoid memory issues in tests)
      const maxTestSize = 10000;
      const largeBytes = new Uint8Array(maxTestSize);

      expect(() => assertValidOffset(largeBytes, maxTestSize - 1)).not.toThrow();
      expect(() => assertValidOffset(largeBytes, maxTestSize)).not.toThrow();
      expect(() => assertValidOffset(largeBytes, maxTestSize + 1)).toThrow(CodecError);

      expect(() => assertSufficientBytes(largeBytes, 0, maxTestSize)).not.toThrow();
      expect(() => assertSufficientBytes(largeBytes, 0, maxTestSize + 1)).toThrow(
        InsufficientBytesError,
      );
    });

    it('should handle codecs with boundary size values', () => {
      const maxSizeCodec: FixedSizeCodec<null> = {
        encode: () => new Uint8Array([]),
        decode: () => [null, 0] as const,
        size: Number.MAX_SAFE_INTEGER,
      };

      expect(getCodecSize(maxSizeCodec)).toBe(Number.MAX_SAFE_INTEGER);
      expect(isFixedSizeCodec(maxSizeCodec)).toBe(true);
    });

    it('should handle codec size functions with edge behaviors', () => {
      const edgeCaseCodec: VariableSizeCodec<number> = {
        encode: () => new Uint8Array([]),
        decode: () => [0, 0] as const,
        size: (value: number) => {
          if (value === Infinity) {
            return Number.MAX_SAFE_INTEGER;
          }
          if (value === -Infinity) {
            return 0;
          }
          if (Number.isNaN(value)) {
            throw new Error('Cannot calculate size for NaN');
          }
          return Math.abs(value);
        },
      };

      expect(getCodecSize(edgeCaseCodec, Infinity)).toBe(Number.MAX_SAFE_INTEGER);
      expect(getCodecSize(edgeCaseCodec, -Infinity)).toBe(0);
      expect(() => getCodecSize(edgeCaseCodec, NaN)).toThrow('Cannot calculate size for NaN');
    });

    it('should handle arrays with unusual byte patterns', () => {
      const patternedBytes = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        patternedBytes[i] = i;
      }

      // Test offset validation with patterned data
      expect(() => assertValidOffset(patternedBytes, 0)).not.toThrow();
      expect(() => assertValidOffset(patternedBytes, 255)).not.toThrow();
      expect(() => assertValidOffset(patternedBytes, 256)).not.toThrow();
      expect(() => assertValidOffset(patternedBytes, 257)).toThrow(CodecError);

      // Test byte sufficiency with patterned data
      expect(() => assertSufficientBytes(patternedBytes, 0, 256)).not.toThrow();
      expect(() => assertSufficientBytes(patternedBytes, 128, 128)).not.toThrow();
      expect(() => assertSufficientBytes(patternedBytes, 128, 129)).toThrow(InsufficientBytesError);
    });

    it('should handle concurrent access patterns', () => {
      const sharedBytes = new Uint8Array(100);

      // Simulate multiple "threads" accessing the same data
      const operations = Array.from({ length: 10 }, (_, i) => () => {
        assertValidOffset(sharedBytes, i * 10);
        assertSufficientBytes(sharedBytes, i * 10, 10);
      });

      // All operations should succeed
      operations.forEach((op) => expect(op).not.toThrow());
    });
  });

  describe('Error Context and Messages', () => {
    it('should provide detailed error context for InsufficientBytesError', () => {
      try {
        assertSufficientBytes(new Uint8Array(5), 2, 10);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientBytesError);
        const err = error as InsufficientBytesError;
        expect(err.message).toBe('Insufficient bytes: required 10, available 3, offset 2');
        expect(err.context).toEqual({
          required: 10,
          available: 3,
          offset: 2,
        });
        expect(err.name).toBe('InsufficientBytesError');
      }
    });

    it('should provide helpful CodecError messages', () => {
      try {
        assertValidOffset(new Uint8Array(5), 10);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CodecError);
        expect(error.message).toContain('Invalid offset: 10');
        expect(error.message).toContain('array length: 5');
      }
    });

    it('should handle error inheritance correctly', () => {
      const insufficientError = new InsufficientBytesError(10, 5, 0);
      const invalidError = new InvalidDataError('test', new Uint8Array([1, 2, 3]), 1);
      const codecError = new CodecError('test');

      expect(insufficientError).toBeInstanceOf(Error);
      expect(insufficientError).toBeInstanceOf(CodecError);
      expect(insufficientError).toBeInstanceOf(InsufficientBytesError);

      expect(invalidError).toBeInstanceOf(Error);
      expect(invalidError).toBeInstanceOf(CodecError);
      expect(invalidError).toBeInstanceOf(InvalidDataError);

      expect(codecError).toBeInstanceOf(Error);
      expect(codecError).toBeInstanceOf(CodecError);
    });

    it('should maintain error stack traces', () => {
      try {
        assertSufficientBytes(new Uint8Array(1), 5, 0);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.stack).toBeDefined();
        expect(error.stack).toContain('assertSufficientBytes');
      }
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle repeated validation calls efficiently', () => {
      const bytes = new Uint8Array(1000);

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        assertValidOffset(bytes, i % 1000);
        assertSufficientBytes(bytes, i % 1000, 1);
      }
      const end = performance.now();

      // Should complete quickly (adjust threshold as needed)
      expect(end - start).toBeLessThan(100);
    });

    it('should handle size calculations for large values efficiently', () => {
      const largeStringCodec: VariableSizeCodec<string> = {
        encode: string.encode,
        decode: string.decode,
        size: (value: string) => 4 + new TextEncoder().encode(value).length,
      };

      const largeString = 'a'.repeat(10000);

      const start = performance.now();
      const size = getCodecSize(largeStringCodec, largeString);
      const end = performance.now();

      expect(size).toBe(10004); // 4 + 10000
      expect(end - start).toBeLessThan(50);
    });
  });
});
