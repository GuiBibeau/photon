import { describe, it, expect } from 'vitest';
import {
  type FixedSizeCodec,
  type VariableSizeCodec,
  isFixedSizeCodec,
  isVariableSizeCodec,
  getCodecSize,
  mapCodec,
  wrapCodec,
  constantCodec,
  CodecError,
  InsufficientBytesError,
  InvalidDataError,
  assertSufficientBytes,
  assertValidOffset,
} from '../src/index.js';

describe('Codec Interface', () => {
  // Mock fixed-size codec for testing
  const mockU8Codec: FixedSizeCodec<number> = {
    encode: (value: number): Uint8Array => {
      if (value < 0 || value > 255 || !Number.isInteger(value)) {
        throw new Error('Value must be an integer between 0 and 255');
      }
      return new Uint8Array([value]);
    },
    decode: (bytes: Uint8Array, offset = 0): readonly [number, number] => {
      if (offset < 0 || offset >= bytes.length) {
        throw new InsufficientBytesError(1, bytes.length - offset, offset);
      }
      return [bytes[offset], 1] as const;
    },
    size: 1,
  };

  // Mock variable-size codec for testing (length-prefixed string)
  const mockStringCodec: VariableSizeCodec<string> = {
    encode: (value: string): Uint8Array => {
      const stringBytes = new TextEncoder().encode(value);
      const result = new Uint8Array(4 + stringBytes.length);
      // Store length as little-endian u32
      const view = new DataView(result.buffer);
      view.setUint32(0, stringBytes.length, true);
      result.set(stringBytes, 4);
      return result;
    },
    decode: (bytes: Uint8Array, offset = 0): readonly [string, number] => {
      if (bytes.length - offset < 4) {
        throw new InsufficientBytesError(4, bytes.length - offset, offset);
      }
      const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
      const length = view.getUint32(0, true);

      if (bytes.length - offset < 4 + length) {
        throw new InsufficientBytesError(4 + length, bytes.length - offset, offset);
      }

      const stringBytes = bytes.slice(offset + 4, offset + 4 + length);
      const value = new TextDecoder().decode(stringBytes);
      return [value, 4 + length] as const;
    },
    size: (value: string): number => {
      return 4 + new TextEncoder().encode(value).length;
    },
  };

  describe('Core Codec Interface', () => {
    it('should encode and decode correctly', () => {
      const value = 42;
      const encoded = mockU8Codec.encode(value);
      const [decoded, bytesRead] = mockU8Codec.decode(encoded);

      expect(decoded).toBe(value);
      expect(bytesRead).toBe(1);
      expect(encoded).toEqual(new Uint8Array([42]));
    });

    it('should handle offset in decode', () => {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      const [decoded, bytesRead] = mockU8Codec.decode(bytes, 2);

      expect(decoded).toBe(3);
      expect(bytesRead).toBe(1);
    });

    it('should throw on insufficient bytes', () => {
      const bytes = new Uint8Array([1, 2]);

      expect(() => mockU8Codec.decode(bytes, 2)).toThrow(InsufficientBytesError);
    });
  });

  describe('Type Guards', () => {
    it('should identify fixed-size codecs', () => {
      expect(isFixedSizeCodec(mockU8Codec)).toBe(true);
      expect(isVariableSizeCodec(mockU8Codec)).toBe(false);
    });

    it('should identify variable-size codecs', () => {
      expect(isFixedSizeCodec(mockStringCodec)).toBe(false);
      expect(isVariableSizeCodec(mockStringCodec)).toBe(true);
    });
  });

  describe('getCodecSize', () => {
    it('should return size for fixed-size codec', () => {
      expect(getCodecSize(mockU8Codec)).toBe(1);
    });

    it('should compute size for variable-size codec', () => {
      expect(getCodecSize(mockStringCodec, 'hello')).toBe(9); // 4 bytes length + 5 bytes string
    });

    it('should throw when value is missing for variable-size codec', () => {
      expect(() => getCodecSize(mockStringCodec)).toThrow('Value is required');
    });
  });

  describe('mapCodec', () => {
    type BrandedNumber = number & { readonly __brand: unique symbol };

    const brandedNumberCodec = mapCodec(
      mockU8Codec,
      (value: BrandedNumber) => value as number,
      (value: number) => value as BrandedNumber,
    );

    it('should transform types correctly', () => {
      const value = 42 as BrandedNumber;
      const encoded = brandedNumberCodec.encode(value);
      const [decoded, bytesRead] = brandedNumberCodec.decode(encoded);

      expect(decoded).toBe(value);
      expect(bytesRead).toBe(1);
      expect(encoded).toEqual(new Uint8Array([42]));
    });

    it('should preserve codec size for fixed-size codecs', () => {
      expect(isFixedSizeCodec(brandedNumberCodec)).toBe(true);
      if (isFixedSizeCodec(brandedNumberCodec)) {
        expect(brandedNumberCodec.size).toBe(1);
      }
    });

    it('should work with variable-size codecs', () => {
      const upperCaseStringCodec = mapCodec(
        mockStringCodec,
        (value: string) => value.toLowerCase(),
        (value: string) => value.toUpperCase(),
      );

      const value = 'hello';
      const encoded = upperCaseStringCodec.encode(value);
      const [decoded, bytesRead] = upperCaseStringCodec.decode(encoded);

      expect(decoded).toBe('HELLO');
      expect(bytesRead).toBe(9);
    });
  });

  describe('wrapCodec', () => {
    it('should apply pre-encode processing', () => {
      let processedValue: number | null = null;

      const wrappedCodec = wrapCodec(mockU8Codec, {
        preEncode: (value: number) => {
          processedValue = value;
          return value;
        },
      });

      wrappedCodec.encode(42);
      expect(processedValue).toBe(42);
    });

    it('should apply post-decode processing', () => {
      const wrappedCodec = wrapCodec(mockU8Codec, {
        postDecode: (value: number) => value * 2,
      });

      const encoded = mockU8Codec.encode(21);
      const [decoded] = wrappedCodec.decode(encoded);

      expect(decoded).toBe(42);
    });

    it('should preserve size for fixed-size codecs', () => {
      const wrappedCodec = wrapCodec(mockU8Codec, {
        preEncode: (value: number) => value,
      });

      expect(isFixedSizeCodec(wrappedCodec)).toBe(true);
      if (isFixedSizeCodec(wrappedCodec)) {
        expect(wrappedCodec.size).toBe(1);
      }
    });

    it('should handle variable-size codecs with preSize', () => {
      const wrappedCodec = wrapCodec(mockStringCodec, {
        preSize: (value: string) => value.toUpperCase(),
      });

      expect(wrappedCodec.size('hello')).toBe(9);
    });
  });

  describe('constantCodec', () => {
    const constantValue = 0xff;
    const constant = constantCodec(constantValue, mockU8Codec);

    it('should always encode the constant value', () => {
      const encoded1 = constant.encode(0x00);
      const encoded2 = constant.encode(0x42);

      expect(encoded1).toEqual(new Uint8Array([0xff]));
      expect(encoded2).toEqual(new Uint8Array([0xff]));
    });

    it('should decode and validate the constant', () => {
      const encoded = new Uint8Array([0xff]);
      const [decoded, bytesRead] = constant.decode(encoded);

      expect(decoded).toBe(constantValue);
      expect(bytesRead).toBe(1);
    });

    it('should throw when decoded value does not match constant', () => {
      const encoded = new Uint8Array([0x42]);

      expect(() => constant.decode(encoded)).toThrow('Expected constant value');
    });

    it('should preserve size for fixed-size codecs', () => {
      expect(typeof constant.size).toBe('number');
      expect(constant.size).toBe(1);
    });
  });

  describe('Error Handling', () => {
    describe('CodecError', () => {
      it('should create error with message and context', () => {
        const error = new CodecError('Test error', { key: 'value' });

        expect(error.message).toBe('Test error');
        expect(error.context).toEqual({ key: 'value' });
        expect(error.name).toBe('CodecError');
      });
    });

    describe('InsufficientBytesError', () => {
      it('should create error with byte information', () => {
        const error = new InsufficientBytesError(10, 5, 2);

        expect(error.message).toBe('Insufficient bytes: required 10, available 5, offset 2');
        expect(error.context).toEqual({ required: 10, available: 5, offset: 2 });
        expect(error.name).toBe('InsufficientBytesError');
      });
    });

    describe('InvalidDataError', () => {
      it('should create error with data context', () => {
        const data = new Uint8Array([1, 2, 3]);
        const error = new InvalidDataError('Invalid format', data, 1);

        expect(error.message).toBe('Invalid format');
        expect(error.context).toEqual({ data, offset: 1 });
        expect(error.name).toBe('InvalidDataError');
      });
    });

    describe('assertSufficientBytes', () => {
      it('should not throw when sufficient bytes available', () => {
        const bytes = new Uint8Array(10);

        expect(() => assertSufficientBytes(bytes, 5, 3)).not.toThrow();
      });

      it('should throw when insufficient bytes available', () => {
        const bytes = new Uint8Array(10);

        expect(() => assertSufficientBytes(bytes, 8, 5)).toThrow(InsufficientBytesError);
      });
    });

    describe('assertValidOffset', () => {
      it('should not throw for valid offsets', () => {
        const bytes = new Uint8Array(10);

        expect(() => assertValidOffset(bytes, 0)).not.toThrow();
        expect(() => assertValidOffset(bytes, 5)).not.toThrow();
        expect(() => assertValidOffset(bytes, 10)).not.toThrow(); // At end is valid
      });

      it('should throw for invalid offsets', () => {
        const bytes = new Uint8Array(10);

        expect(() => assertValidOffset(bytes, -1)).toThrow(CodecError);
        expect(() => assertValidOffset(bytes, 11)).toThrow(CodecError);
      });
    });
  });

  describe('Complex Usage Scenarios', () => {
    it('should handle round-trip encoding with different codecs', () => {
      const testString = 'Hello, World!';

      // Encode with string codec
      const encoded = mockStringCodec.encode(testString);

      // Decode with string codec
      const [decoded, bytesRead] = mockStringCodec.decode(encoded);

      expect(decoded).toBe(testString);
      expect(bytesRead).toBe(encoded.length);
    });

    it('should handle partial decoding with correct offset tracking', () => {
      const bytes = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      let offset = 0;

      const [first, firstBytes] = mockU8Codec.decode(bytes, offset);
      offset += firstBytes;

      const [second, secondBytes] = mockU8Codec.decode(bytes, offset);
      offset += secondBytes;

      expect(first).toBe(1);
      expect(second).toBe(2);
      expect(offset).toBe(2);
    });

    it('should compose multiple transformations', () => {
      // Create a codec that doubles values and adds 1
      const transformedCodec = wrapCodec(
        mapCodec(
          mockU8Codec,
          (value: number) => Math.floor(value / 2), // Reverse transform for encoding
          (value: number) => value * 2, // Transform for decoding
        ),
        {
          postDecode: (value: number) => value + 1,
        },
      );

      const originalValue = 21;
      const encoded = transformedCodec.encode(originalValue);
      const [decoded] = transformedCodec.decode(encoded);

      // (21 / 2) = 10.5 -> 10, encode as 10, decode as 10, multiply by 2 = 20, add 1 = 21
      expect(decoded).toBe(21);
    });
  });
});
