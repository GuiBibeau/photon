import { describe, it, expect } from 'vitest';
import {
  mapCodec,
  wrapCodec,
  constantCodec,
  type Codec,
  type FixedSizeCodec,
  type VariableSizeCodec,
  u8,
  u32,
  string,
  isFixedSizeCodec,
  isVariableSizeCodec,
} from '../src/index.js';

describe('Composition Utilities', () => {
  // Mock codecs for testing
  const mockU8Codec: FixedSizeCodec<number> = {
    encode: (value: number): Uint8Array => {
      if (value < 0 || value > 255 || !Number.isInteger(value)) {
        throw new Error('Value must be an integer between 0 and 255');
      }
      return new Uint8Array([value]);
    },
    decode: (bytes: Uint8Array, offset = 0): readonly [number, number] => {
      if (offset < 0 || offset >= bytes.length) {
        throw new Error('Invalid offset');
      }
      return [bytes[offset], 1] as const;
    },
    size: 1,
  };

  const mockStringCodec: VariableSizeCodec<string> = {
    encode: (value: string): Uint8Array => {
      const stringBytes = new TextEncoder().encode(value);
      const result = new Uint8Array(4 + stringBytes.length);
      const view = new DataView(result.buffer);
      view.setUint32(0, stringBytes.length, true);
      result.set(stringBytes, 4);
      return result;
    },
    decode: (bytes: Uint8Array, offset = 0): readonly [string, number] => {
      if (bytes.length - offset < 4) {
        throw new Error('Insufficient bytes for length');
      }
      const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
      const length = view.getUint32(0, true);
      if (bytes.length - offset < 4 + length) {
        throw new Error('Insufficient bytes for string');
      }
      const stringBytes = bytes.slice(offset + 4, offset + 4 + length);
      const value = new TextDecoder().decode(stringBytes);
      return [value, 4 + length] as const;
    },
    size: (value: string): number => {
      return 4 + new TextEncoder().encode(value).length;
    },
  };

  describe('mapCodec', () => {
    describe('with fixed-size codec', () => {
      // Create a branded type for testing
      type BrandedNumber = number & { readonly __brand: unique symbol };

      const brandedCodec = mapCodec(
        mockU8Codec,
        (value: BrandedNumber) => value as number,
        (value: number) => value as BrandedNumber,
      );

      it('should preserve fixed-size property', () => {
        expect(isFixedSizeCodec(brandedCodec)).toBe(true);
        expect(isVariableSizeCodec(brandedCodec)).toBe(false);
        if (isFixedSizeCodec(brandedCodec)) {
          expect(brandedCodec.size).toBe(1);
        }
      });

      it('should encode and decode with type transformation', () => {
        const value = 42 as BrandedNumber;
        const encoded = brandedCodec.encode(value);
        const [decoded, bytesRead] = brandedCodec.decode(encoded);

        expect(decoded).toBe(value);
        expect(bytesRead).toBe(1);
        expect(encoded).toEqual(new Uint8Array([42]));
      });

      it('should handle complex transformations', () => {
        // Create a codec that adds/subtracts 10
        const offsetCodec = mapCodec(
          mockU8Codec,
          (value: number) => value - 10, // mapFrom: subtract 10 for encoding
          (value: number) => value + 10, // mapTo: add 10 for decoding
        );

        const encoded = offsetCodec.encode(50);
        expect(encoded).toEqual(new Uint8Array([40])); // 50 - 10 = 40

        const [decoded] = offsetCodec.decode(new Uint8Array([40]));
        expect(decoded).toBe(50); // 40 + 10 = 50
      });

      it('should propagate errors from inner codec', () => {
        const errorCodec = mapCodec(
          mockU8Codec,
          (value: number) => value,
          (value: number) => value,
        );

        expect(() => errorCodec.encode(256)).toThrow();
        expect(() => errorCodec.decode(new Uint8Array([]), 0)).toThrow();
      });

      it('should handle errors in transformation functions', () => {
        const throwingCodec = mapCodec(
          mockU8Codec,
          (value: number) => {
            if (value === 42) {
              throw new Error('Cannot encode 42');
            }
            return value;
          },
          (value: number) => value,
        );

        expect(() => throwingCodec.encode(42)).toThrow('Cannot encode 42');
        expect(() => throwingCodec.encode(41)).not.toThrow();
      });

      it('should work with chained transformations', () => {
        // First map: multiply by 2
        const doubleCodec = mapCodec(
          mockU8Codec,
          (value: number) => Math.floor(value / 2),
          (value: number) => value * 2,
        );

        // Second map: add 1
        const plusOneCodec = mapCodec(
          doubleCodec,
          (value: number) => value - 1,
          (value: number) => value + 1,
        );

        const encoded = plusOneCodec.encode(21); // (21 - 1) / 2 = 10
        expect(encoded).toEqual(new Uint8Array([10]));

        const [decoded] = plusOneCodec.decode(new Uint8Array([10])); // 10 * 2 + 1 = 21
        expect(decoded).toBe(21);
      });
    });

    describe('with variable-size codec', () => {
      const upperCaseCodec = mapCodec(
        mockStringCodec,
        (value: string) => value.toLowerCase(),
        (value: string) => value.toUpperCase(),
      );

      it('should preserve variable-size property', () => {
        expect(isFixedSizeCodec(upperCaseCodec)).toBe(false);
        expect(isVariableSizeCodec(upperCaseCodec)).toBe(true);
      });

      it('should transform values correctly', () => {
        const value = 'Hello World';
        const encoded = upperCaseCodec.encode(value);
        const [decoded] = upperCaseCodec.decode(encoded);

        expect(decoded).toBe('HELLO WORLD');
      });

      it('should compute size based on transformed value', () => {
        const size1 = upperCaseCodec.size('HELLO');
        const size2 = upperCaseCodec.size('hello');

        expect(size1).toBe(size2); // Both should be same size (4 + 5)
        expect(size1).toBe(9);
      });

      it('should handle empty strings', () => {
        const encoded = upperCaseCodec.encode('');
        const [decoded] = upperCaseCodec.decode(encoded);

        expect(decoded).toBe('');
        expect(upperCaseCodec.size('')).toBe(4); // Just the length prefix
      });

      it('should handle unicode transformations', () => {
        const unicodeCodec = mapCodec(
          mockStringCodec,
          (value: string) => value.normalize('NFD'),
          (value: string) => value.normalize('NFC'),
        );

        const value = 'café'; // é as single character
        const encoded = unicodeCodec.encode(value);
        const [decoded] = unicodeCodec.decode(encoded);

        expect(decoded).toBe('café');
      });
    });
  });

  describe('wrapCodec', () => {
    describe('with fixed-size codec', () => {
      it('should apply preEncode processing', () => {
        const processedValues: number[] = [];

        const wrappedCodec = wrapCodec(mockU8Codec, {
          preEncode: (value: number) => {
            processedValues.push(value);
            return Math.min(255, Math.max(0, value)); // Clamp to valid range
          },
        });

        wrappedCodec.encode(300);
        expect(processedValues).toEqual([300]);

        const encoded = wrappedCodec.encode(300);
        expect(encoded).toEqual(new Uint8Array([255])); // Clamped to 255
      });

      it('should apply postDecode processing', () => {
        const wrappedCodec = wrapCodec(mockU8Codec, {
          postDecode: (value: number) => value * 10,
        });

        const encoded = mockU8Codec.encode(5);
        const [decoded] = wrappedCodec.decode(encoded);

        expect(decoded).toBe(50); // 5 * 10
      });

      it('should apply both pre and post processing', () => {
        const wrappedCodec = wrapCodec(mockU8Codec, {
          preEncode: (value: number) => Math.floor(value / 10),
          postDecode: (value: number) => value * 10,
        });

        const encoded = wrappedCodec.encode(127);
        const [decoded] = wrappedCodec.decode(encoded);

        expect(encoded).toEqual(new Uint8Array([12])); // floor(127 / 10) = 12
        expect(decoded).toBe(120); // 12 * 10 = 120
      });

      it('should preserve fixed-size property', () => {
        const wrappedCodec = wrapCodec(mockU8Codec, {
          preEncode: (v) => v,
          postDecode: (v) => v,
        });

        expect(isFixedSizeCodec(wrappedCodec)).toBe(true);
        if (isFixedSizeCodec(wrappedCodec)) {
          expect(wrappedCodec.size).toBe(1);
        }
      });

      it('should handle errors in processing functions', () => {
        const errorCodec = wrapCodec(mockU8Codec, {
          preEncode: (value: number) => {
            if (value === 13) {
              throw new Error('Unlucky number!');
            }
            return value;
          },
        });

        expect(() => errorCodec.encode(13)).toThrow('Unlucky number!');
        expect(() => errorCodec.encode(12)).not.toThrow();
      });

      it('should handle undefined processing functions', () => {
        const codec1 = wrapCodec(mockU8Codec, {});
        const codec2 = wrapCodec(mockU8Codec, {
          preEncode: undefined,
          postDecode: undefined,
        });

        const value = 42;
        const encoded1 = codec1.encode(value);
        const encoded2 = codec2.encode(value);

        expect(encoded1).toEqual(encoded2);
        expect(encoded1).toEqual(new Uint8Array([42]));
      });
    });

    describe('with variable-size codec', () => {
      it('should apply preSize processing', () => {
        const processedValues: string[] = [];

        const wrappedCodec = wrapCodec(mockStringCodec, {
          preSize: (value: string) => {
            processedValues.push(value);
            return value.trim();
          },
        });

        const size = wrappedCodec.size('  hello  ');
        expect(processedValues).toEqual(['  hello  ']);
        expect(size).toBe(9); // 4 + 5 for "hello"
      });

      it('should preserve variable-size property', () => {
        const wrappedCodec = wrapCodec(mockStringCodec, {
          preEncode: (v) => v.trim(),
        });

        expect(isVariableSizeCodec(wrappedCodec)).toBe(true);
      });

      it('should apply all processing functions', () => {
        const logs: string[] = [];

        const wrappedCodec = wrapCodec(mockStringCodec, {
          preEncode: (value: string) => {
            logs.push(`preEncode: ${value}`);
            return value.toUpperCase();
          },
          postDecode: (value: string) => {
            logs.push(`postDecode: ${value}`);
            return value.toLowerCase();
          },
          preSize: (value: string) => {
            logs.push(`preSize: ${value}`);
            return value.toUpperCase();
          },
        });

        wrappedCodec.size('hello');
        expect(logs).toContain('preSize: hello');

        logs.length = 0;
        const encoded = wrappedCodec.encode('hello');
        expect(logs).toContain('preEncode: hello');

        logs.length = 0;
        const [decoded] = wrappedCodec.decode(encoded);
        expect(logs).toContain('postDecode: HELLO');
        expect(decoded).toBe('hello');
      });

      it('should handle complex transformations', () => {
        // Trim whitespace and add prefix/suffix
        const wrappedCodec = wrapCodec(mockStringCodec, {
          preEncode: (value: string) => `[${value.trim()}]`,
          postDecode: (value: string) => value.slice(1, -1),
        });

        const encoded = wrappedCodec.encode('  test  ');
        const [decoded] = wrappedCodec.decode(encoded);

        expect(decoded).toBe('test');
      });
    });

    describe('nested wrapping', () => {
      it('should support multiple layers of wrapping', () => {
        const layer1 = wrapCodec(mockU8Codec, {
          preEncode: (v) => v + 10,
          postDecode: (v) => v - 10,
        });

        const layer2 = wrapCodec(layer1, {
          preEncode: (v) => v * 2,
          postDecode: (v) => v / 2,
        });

        const encoded = layer2.encode(20); // 20 * 2 = 40, 40 + 10 = 50
        expect(encoded).toEqual(new Uint8Array([50]));

        const [decoded] = layer2.decode(encoded); // 50 - 10 = 40, 40 / 2 = 20
        expect(decoded).toBe(20);
      });
    });
  });

  describe('constantCodec', () => {
    describe('with fixed-size codec', () => {
      const MAGIC_NUMBER = 0x42;
      const magicCodec = constantCodec(MAGIC_NUMBER, mockU8Codec);

      it('should always encode the constant value', () => {
        const encoded1 = magicCodec.encode(0);
        const encoded2 = magicCodec.encode(100);
        const encoded3 = magicCodec.encode(MAGIC_NUMBER);

        expect(encoded1).toEqual(new Uint8Array([0x42]));
        expect(encoded2).toEqual(new Uint8Array([0x42]));
        expect(encoded3).toEqual(new Uint8Array([0x42]));
      });

      it('should decode and validate the constant', () => {
        const validBytes = new Uint8Array([0x42]);
        const [decoded, bytesRead] = magicCodec.decode(validBytes);

        expect(decoded).toBe(MAGIC_NUMBER);
        expect(bytesRead).toBe(1);
      });

      it('should throw when decoded value does not match', () => {
        const invalidBytes = new Uint8Array([0x43]);

        expect(() => magicCodec.decode(invalidBytes)).toThrow(
          'Expected constant value 66, but got 67',
        );
      });

      it('should preserve size for fixed-size inner codec', () => {
        expect(typeof magicCodec.size).toBe('number');
        expect(magicCodec.size).toBe(1);
      });

      it('should handle zero as constant', () => {
        const zeroCodec = constantCodec(0, mockU8Codec);

        const encoded = zeroCodec.encode(42);
        expect(encoded).toEqual(new Uint8Array([0]));

        const [decoded] = zeroCodec.decode(new Uint8Array([0]));
        expect(decoded).toBe(0);
      });

      it('should work with branded types', () => {
        type Version = number & { readonly __brand: unique symbol };
        const VERSION_1 = 1 as Version;

        const versionCodec = constantCodec(VERSION_1, mockU8Codec as Codec<Version>);

        const encoded = versionCodec.encode(99 as Version);
        expect(encoded).toEqual(new Uint8Array([1]));
      });
    });

    describe('with variable-size codec', () => {
      const CONSTANT_STRING = 'SOLANA';
      const constantStringCodec = constantCodec(CONSTANT_STRING, mockStringCodec);

      it('should encode the constant regardless of input', () => {
        const encoded1 = constantStringCodec.encode('');
        const encoded2 = constantStringCodec.encode('other');

        const [decoded1] = mockStringCodec.decode(encoded1);
        const [decoded2] = mockStringCodec.decode(encoded2);

        expect(decoded1).toBe(CONSTANT_STRING);
        expect(decoded2).toBe(CONSTANT_STRING);
      });

      it('should compute size based on constant', () => {
        const size = constantStringCodec.size('anything');
        const expectedSize = mockStringCodec.size(CONSTANT_STRING);

        expect(size).toBe(expectedSize);
      });

      it('should validate decoded constant', () => {
        const validEncoded = mockStringCodec.encode(CONSTANT_STRING);
        const invalidEncoded = mockStringCodec.encode('ETHEREUM');

        const [decoded] = constantStringCodec.decode(validEncoded);
        expect(decoded).toBe(CONSTANT_STRING);

        expect(() => constantStringCodec.decode(invalidEncoded)).toThrow(
          'Expected constant value SOLANA, but got ETHEREUM',
        );
      });

      it('should handle empty string constant', () => {
        const emptyCodec = constantCodec('', mockStringCodec);

        const encoded = emptyCodec.encode('not empty');
        const [decoded] = emptyCodec.decode(encoded);

        expect(decoded).toBe('');
      });
    });

    describe('with complex constants', () => {
      it('should demonstrate object reference comparison behavior', () => {
        type Point = { x: number; y: number };

        const pointCodec: Codec<Point> = {
          encode: (value: Point): Uint8Array => {
            return new Uint8Array([value.x, value.y]);
          },
          decode: (bytes: Uint8Array, offset = 0): readonly [Point, number] => {
            return [{ x: bytes[offset], y: bytes[offset + 1] }, 2] as const;
          },
          size: 2,
        };

        const ORIGIN = { x: 0, y: 0 };
        const originCodec = constantCodec(ORIGIN, pointCodec);

        // Always encodes the constant
        const encoded = originCodec.encode({ x: 42, y: 42 });
        expect(encoded).toEqual(new Uint8Array([0, 0]));

        // Object.is() compares by reference, so decoded objects won't match
        // even if they have the same values - this will throw
        expect(() => originCodec.decode(new Uint8Array([0, 0]))).toThrow('Expected constant value');

        // This is expected behavior since constantCodec is meant for primitive values
        // For complex objects, you'd typically use different validation logic
      });

      it('should handle NaN and special numeric values', () => {
        const floatCodec: FixedSizeCodec<number> = {
          encode: (value: number): Uint8Array => {
            const buffer = new ArrayBuffer(4);
            new DataView(buffer).setFloat32(0, value, true);
            return new Uint8Array(buffer);
          },
          decode: (bytes: Uint8Array, offset = 0): readonly [number, number] => {
            const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
            return [view.getFloat32(0, true), 4] as const;
          },
          size: 4,
        };

        // Test NaN handling
        const nanCodec = constantCodec(NaN, floatCodec);
        const nanEncoded = nanCodec.encode(42);
        const [nanDecoded] = nanCodec.decode(nanEncoded);
        expect(Number.isNaN(nanDecoded)).toBe(true);

        // Test Infinity
        const infCodec = constantCodec(Infinity, floatCodec);
        const infEncoded = infCodec.encode(0);
        const [infDecoded] = infCodec.decode(infEncoded);
        expect(infDecoded).toBe(Infinity);
      });
    });

    describe('edge cases', () => {
      it('should handle errors from inner codec', () => {
        const errorCodec: Codec<number> = {
          encode: () => {
            throw new Error('Encode error');
          },
          decode: () => {
            throw new Error('Decode error');
          },
          size: 1,
        };

        const constant = constantCodec(42, errorCodec);

        expect(() => constant.encode(0)).toThrow('Encode error');
        expect(() => constant.decode(new Uint8Array([42]))).toThrow('Decode error');
      });

      it('should handle complex size computation', () => {
        const complexCodec: Codec<string> = {
          encode: mockStringCodec.encode,
          decode: mockStringCodec.decode,
          size: (value: string) => {
            // Complex size calculation
            return 4 + new TextEncoder().encode(value).length + (value.length > 10 ? 4 : 0);
          },
        };

        const shortConstant = constantCodec('short', complexCodec);
        const longConstant = constantCodec('this is a long string', complexCodec);

        expect(typeof shortConstant.size).toBe('function');
        expect(typeof longConstant.size).toBe('function');

        if (typeof shortConstant.size === 'function') {
          expect(shortConstant.size('ignored')).toBe(9); // 4 + 5
        }

        if (typeof longConstant.size === 'function') {
          expect(longConstant.size('ignored')).toBe(29); // 4 + 21 + 4
        }
      });
    });
  });

  describe('Composition Integration', () => {
    it('should compose map and wrap operations', () => {
      // Create a percentage codec (0-100 as 0-255)
      const percentageCodec = mapCodec(
        wrapCodec(u8, {
          preEncode: (value: number) => {
            if (value < 0 || value > 100) {
              throw new Error('Percentage must be between 0 and 100');
            }
            return Math.round(value * 2.55);
          },
          postDecode: (value: number) => Math.round(value / 2.55),
        }),
        (p: number) => p,
        (p: number) => p,
      );

      expect(percentageCodec.encode(0)).toEqual(new Uint8Array([0]));
      expect(percentageCodec.encode(50)).toEqual(new Uint8Array([127])); // ~127.5
      expect(percentageCodec.encode(100)).toEqual(new Uint8Array([255]));

      expect(percentageCodec.decode(new Uint8Array([0]))[0]).toBe(0);
      expect(percentageCodec.decode(new Uint8Array([127]))[0]).toBe(50);
      expect(percentageCodec.decode(new Uint8Array([255]))[0]).toBe(100);
    });

    it('should create discriminated union with constants', () => {
      const PING_DISCRIMINATOR = 1;
      const PONG_DISCRIMINATOR = 2;

      const pingDiscriminator = constantCodec(PING_DISCRIMINATOR, u8);
      const pongDiscriminator = constantCodec(PONG_DISCRIMINATOR, u8);

      // Simulate encoding a ping message
      const pingBytes = new Uint8Array([...pingDiscriminator.encode(0), ...u32.encode(12345)]);

      // Decode discriminator
      const [discriminator] = u8.decode(pingBytes, 0);
      expect(discriminator).toBe(PING_DISCRIMINATOR);

      // Validate it's a ping
      const [validatedPing] = pingDiscriminator.decode(pingBytes, 0);
      expect(validatedPing).toBe(PING_DISCRIMINATOR);

      // Should fail for pong
      expect(() => pongDiscriminator.decode(pingBytes, 0)).toThrow();
    });

    it('should handle complex real-world scenario', () => {
      // Simulate a version-prefixed message format
      const VERSION = 1;

      type VersionedMessage = {
        version: number;
        payload: string;
      };

      const messageCodec = mapCodec(
        string,
        (msg: VersionedMessage) => msg.payload,
        (payload: string): VersionedMessage => ({ version: VERSION, payload }),
      );

      const wrappedMessageCodec = wrapCodec(messageCodec, {
        postDecode: (msg: VersionedMessage) => {
          // Add validation after decode
          if (msg.payload.length === 0) {
            throw new Error('Empty payload not allowed');
          }
          return msg;
        },
      });

      // Encode
      const message: VersionedMessage = { version: 999, payload: 'Hello' };
      const encoded = wrappedMessageCodec.encode(message);

      // The version field is ignored during encoding since we only encode payload
      const [decoded] = wrappedMessageCodec.decode(encoded);
      expect(decoded.version).toBe(VERSION); // Always returns VERSION
      expect(decoded.payload).toBe('Hello');

      // Test empty payload validation
      const emptyEncoded = string.encode('');
      expect(() => wrappedMessageCodec.decode(emptyEncoded)).toThrow('Empty payload not allowed');
    });
  });
});
