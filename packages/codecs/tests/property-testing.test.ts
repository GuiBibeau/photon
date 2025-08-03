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
  boolean,
  string,
  bytes,
  fixedBytes,
  publicKey,
  array,
  vec,
  struct,
  option,
  enumCodec,
  enumVariant,
  some,
  none,
  mapCodec,
  wrapCodec,
} from '../src/index.js';

describe('Round-Trip Property Testing', () => {
  describe('Primitive Codecs Round-Trip Properties', () => {
    describe('Numeric codecs', () => {
      it('should round-trip all valid u8 values', () => {
        for (let i = 0; i <= 255; i++) {
          const encoded = u8.encode(i);
          const [decoded, bytesRead] = u8.decode(encoded);
          expect(decoded).toBe(i);
          expect(bytesRead).toBe(1);
          expect(encoded.length).toBe(1);
        }
      });

      it('should round-trip random u16 values', () => {
        // Test boundary values and random values
        const testValues = [
          0,
          1,
          255,
          256,
          257,
          65534,
          65535,
          ...Array.from({ length: 100 }, () => Math.floor(Math.random() * 65536)),
        ];

        for (const value of testValues) {
          const encoded = u16.encode(value);
          const [decoded, bytesRead] = u16.decode(encoded);
          expect(decoded).toBe(value);
          expect(bytesRead).toBe(2);
          expect(encoded.length).toBe(2);
        }
      });

      it('should round-trip random u32 values', () => {
        const testValues = [
          0,
          1,
          255,
          256,
          65535,
          65536,
          16777215,
          16777216,
          4294967294,
          4294967295,
          ...Array.from({ length: 100 }, () => Math.floor(Math.random() * 4294967296)),
        ];

        for (const value of testValues) {
          const encoded = u32.encode(value);
          const [decoded, bytesRead] = u32.decode(encoded);
          expect(decoded).toBe(value);
          expect(bytesRead).toBe(4);
          expect(encoded.length).toBe(4);
        }
      });

      it('should round-trip random u64 values', () => {
        const testValues = [
          0n,
          1n,
          255n,
          256n,
          65535n,
          65536n,
          BigInt(Number.MAX_SAFE_INTEGER),
          BigInt(Number.MAX_SAFE_INTEGER) + 1n,
          18446744073709551615n, // MAX_U64
          ...Array.from({ length: 50 }, () => {
            // Generate random bigint up to 64 bits
            const randomHigh = BigInt(Math.floor(Math.random() * 4294967296));
            const randomLow = BigInt(Math.floor(Math.random() * 4294967296));
            return (randomHigh << 32n) | randomLow;
          }),
        ];

        for (const value of testValues) {
          const encoded = u64.encode(value);
          const [decoded, bytesRead] = u64.decode(encoded);
          expect(decoded).toBe(value);
          expect(bytesRead).toBe(8);
          expect(encoded.length).toBe(8);
        }
      });

      it('should round-trip all valid i8 values', () => {
        for (let i = -128; i <= 127; i++) {
          const encoded = i8.encode(i);
          const [decoded, bytesRead] = i8.decode(encoded);
          expect(decoded).toBe(i);
          expect(bytesRead).toBe(1);
          expect(encoded.length).toBe(1);
        }
      });

      it('should round-trip random signed integer values', () => {
        // Test i16
        const i16Values = [
          -32768,
          -32767,
          -1,
          0,
          1,
          32766,
          32767,
          ...Array.from({ length: 50 }, () => Math.floor(Math.random() * 65536) - 32768),
        ];

        for (const value of i16Values) {
          const encoded = i16.encode(value);
          const [decoded] = i16.decode(encoded);
          expect(decoded).toBe(value);
        }

        // Test i32
        const i32Values = [
          -2147483648,
          -2147483647,
          -1,
          0,
          1,
          2147483646,
          2147483647,
          ...Array.from({ length: 50 }, () => Math.floor(Math.random() * 4294967296) - 2147483648),
        ];

        for (const value of i32Values) {
          const encoded = i32.encode(value);
          const [decoded] = i32.decode(encoded);
          expect(decoded).toBe(value);
        }

        // Test i64
        const i64Values = [
          -(2n ** 63n),
          -(2n ** 63n) + 1n,
          -1n,
          0n,
          1n,
          2n ** 63n - 2n,
          2n ** 63n - 1n,
          ...Array.from({ length: 20 }, () => {
            const randomValue = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
            return Math.random() > 0.5 ? randomValue : -randomValue;
          }),
        ];

        for (const value of i64Values) {
          const encoded = i64.encode(value);
          const [decoded] = i64.decode(encoded);
          expect(decoded).toBe(value);
        }
      });
    });

    describe('Boolean codec', () => {
      it('should round-trip boolean values', () => {
        const values = [true, false];

        for (const value of values) {
          const encoded = boolean.encode(value);
          const [decoded, bytesRead] = boolean.decode(encoded);
          expect(decoded).toBe(value);
          expect(bytesRead).toBe(1);
          expect(encoded.length).toBe(1);
        }
      });
    });

    describe('String codec', () => {
      it('should round-trip various string values', () => {
        const testStrings = [
          '',
          'a',
          'hello',
          'Hello, World!',
          '🎉🌟💫', // Emojis
          '日本語', // Japanese
          'العربية', // Arabic
          'Ελληνικά', // Greek
          '中文', // Chinese
          'Русский', // Russian
          'Français', // French with accents
          'español', // Spanish
          'português', // Portuguese
          'A'.repeat(1000), // Long string
          'Mixed 123 !@# 🎯', // Mixed content
          '\n\t\r', // Whitespace
          '"quotes"', // Quotes
          'line1\nline2\nline3', // Multiline
        ];

        for (const value of testStrings) {
          const encoded = string.encode(value);
          const [decoded, bytesRead] = string.decode(encoded);
          expect(decoded).toBe(value);
          expect(bytesRead).toBe(encoded.length);

          // Verify size calculation
          const expectedSize = 4 + new TextEncoder().encode(value).length;
          expect(encoded.length).toBe(expectedSize);
          expect(string.size(value)).toBe(expectedSize);
        }
      });

      it('should handle edge case strings', () => {
        const edgeCases = [
          '\0', // Null character
          String.fromCharCode(0x10ffff), // Maximum Unicode code point
          '𝔘𝔫𝔦𝔠𝔬𝔡𝔢', // Mathematical script
          '🏳️‍🌈', // Complex emoji with ZWJ sequences
          'a̸͇̿', // Combining characters
        ];

        for (const value of edgeCases) {
          const encoded = string.encode(value);
          const [decoded] = string.decode(encoded);
          expect(decoded).toBe(value);
        }
      });
    });

    describe('Bytes codecs', () => {
      it('should round-trip variable-length byte arrays', () => {
        const testArrays = [
          new Uint8Array([]),
          new Uint8Array([0]),
          new Uint8Array([255]),
          new Uint8Array([0, 1, 2, 3, 4]),
          new Uint8Array(Array.from({ length: 256 }, (_, i) => i)),
          new Uint8Array(Array.from({ length: 1000 }, () => Math.floor(Math.random() * 256))),
          new Uint8Array([0xff, 0x00, 0xff, 0x00]), // Pattern
        ];

        for (const value of testArrays) {
          const encoded = bytes.encode(value);
          const [decoded, bytesRead] = bytes.decode(encoded);
          expect(decoded).toEqual(value);
          expect(bytesRead).toBe(encoded.length);
          expect(encoded.length).toBe(4 + value.length);
        }
      });

      it('should round-trip fixed-length byte arrays', () => {
        const sizes = [1, 2, 4, 8, 16, 32, 64];

        for (const size of sizes) {
          const codec = fixedBytes(size);
          const testArrays = [
            new Uint8Array(size), // All zeros
            new Uint8Array(Array.from({ length: size }, () => 255)), // All ones
            new Uint8Array(Array.from({ length: size }, (_, i) => i % 256)), // Pattern
            new Uint8Array(Array.from({ length: size }, () => Math.floor(Math.random() * 256))), // Random
          ];

          for (const value of testArrays) {
            const encoded = codec.encode(value);
            const [decoded, bytesRead] = codec.decode(encoded);
            expect(decoded).toEqual(value);
            expect(bytesRead).toBe(size);
            expect(encoded.length).toBe(size);
          }
        }
      });

      it('should round-trip public key arrays', () => {
        const testKeys = [
          new Uint8Array(32), // All zeros
          new Uint8Array(Array.from({ length: 32 }, () => 255)), // All ones
          new Uint8Array(Array.from({ length: 32 }, (_, i) => i % 256)), // Pattern
          new Uint8Array(Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))), // Random
        ];

        for (const value of testKeys) {
          const encoded = publicKey.encode(value);
          const [decoded, bytesRead] = publicKey.decode(encoded);
          expect(decoded).toEqual(value);
          expect(bytesRead).toBe(32);
          expect(encoded.length).toBe(32);
        }
      });
    });
  });

  describe('Composite Codecs Round-Trip Properties', () => {
    describe('Array codecs', () => {
      it('should round-trip fixed-size arrays', () => {
        const arrayCodec = array(u32, 5);

        const testArrays = [
          [0, 0, 0, 0, 0],
          [1, 2, 3, 4, 5],
          [4294967295, 0, 4294967295, 0, 4294967295],
          Array.from({ length: 5 }, () => Math.floor(Math.random() * 4294967296)),
        ];

        for (const value of testArrays) {
          const encoded = arrayCodec.encode(value);
          const [decoded, bytesRead] = arrayCodec.decode(encoded);
          expect(decoded).toEqual(value);
          expect(bytesRead).toBe(20); // 5 * 4 bytes
          expect(encoded.length).toBe(20);
        }
      });

      it('should round-trip variable-size arrays', () => {
        const vecCodec = vec(string);

        const testArrays = [
          [],
          ['hello'],
          ['hello', 'world'],
          Array.from({ length: 10 }, (_, i) => `item${i}`),
          ['', 'non-empty', '', 'another'],
          ['🎉', '🌟', '💫'],
        ];

        for (const value of testArrays) {
          const encoded = vecCodec.encode(value);
          const [decoded, bytesRead] = vecCodec.decode(encoded);
          expect(decoded).toEqual(value);
          expect(bytesRead).toBe(encoded.length);
        }
      });
    });

    describe('Struct codecs', () => {
      it('should round-trip simple structs', () => {
        const pointCodec = struct({
          x: u32,
          y: u32,
        });

        const testPoints = [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
          { x: 4294967295, y: 4294967295 },
          { x: 12345, y: 67890 },
        ];

        for (const value of testPoints) {
          const encoded = pointCodec.encode(value);
          const [decoded, bytesRead] = pointCodec.decode(encoded);
          expect(decoded).toEqual(value);
          expect(bytesRead).toBe(8);
          expect(encoded.length).toBe(8);
        }
      });

      it('should round-trip complex nested structs', () => {
        const personCodec = struct({
          name: string,
          age: u8,
          active: boolean,
          scores: vec(u32),
          metadata: option(string),
        });

        const testPersons = [
          {
            name: 'Alice',
            age: 30,
            active: true,
            scores: [100, 200, 300],
            metadata: some('admin'),
          },
          {
            name: 'Bob',
            age: 25,
            active: false,
            scores: [],
            metadata: none(),
          },
          {
            name: '田中太郎', // Japanese name
            age: 45,
            active: true,
            scores: [50, 75, 90, 85],
            metadata: some('user'),
          },
        ];

        for (const value of testPersons) {
          const encoded = personCodec.encode(value);
          const [decoded, bytesRead] = personCodec.decode(encoded);
          expect(decoded).toEqual(value);
          expect(bytesRead).toBe(encoded.length);

          // Verify size calculation
          expect(personCodec.size(value)).toBe(encoded.length);
        }
      });
    });

    describe('Option codecs', () => {
      it('should round-trip optional values', () => {
        const optionalU32 = option(u32);

        const testValues = [
          none(),
          some(0),
          some(1),
          some(4294967295),
          some(Math.floor(Math.random() * 4294967296)),
        ];

        for (const value of testValues) {
          const encoded = optionalU32.encode(value);
          const [decoded, bytesRead] = optionalU32.decode(encoded);
          expect(decoded).toEqual(value);
          expect(bytesRead).toBe(encoded.length);

          // Verify size calculation
          expect(optionalU32.size(value)).toBe(encoded.length);
        }
      });

      it('should round-trip nested optional values', () => {
        const nestedOptional = option(option(string));

        const testValues = [
          none(),
          some(none()),
          some(some('')),
          some(some('hello')),
          some(some('nested option test')),
        ];

        for (const value of testValues) {
          const encoded = nestedOptional.encode(value);
          const [decoded, bytesRead] = nestedOptional.decode(encoded);
          expect(decoded).toEqual(value);
          expect(bytesRead).toBe(encoded.length);
        }
      });
    });

    describe('Enum codecs', () => {
      it('should round-trip enum variants', () => {
        const messageCodec = enumCodec({
          text: string,
          number: u32,
          flag: boolean,
          empty: struct({}),
        });

        const testMessages = [
          enumVariant('text', 0, 'Hello'),
          enumVariant('number', 1, 42),
          enumVariant('flag', 2, true),
          enumVariant('flag', 2, false),
          enumVariant('empty', 3, {}),
          enumVariant('text', 0, ''),
          enumVariant('text', 0, 'Very long message with emojis 🎉🌟💫'),
        ];

        for (const value of testMessages) {
          const encoded = messageCodec.encode(value);
          const [decoded, bytesRead] = messageCodec.decode(encoded);
          expect(decoded).toEqual(value);
          expect(bytesRead).toBe(encoded.length);

          // Verify discriminator is encoded correctly
          expect(encoded[0]).toBe(value.__discriminator);
        }
      });
    });
  });

  describe('Transformed Codecs Round-Trip Properties', () => {
    describe('mapCodec', () => {
      it('should round-trip mapped values', () => {
        // Create a percentage codec (0-100 maps to 0-255)
        const percentageCodec = mapCodec(
          u8,
          (percentage: number) => Math.round(percentage * 2.55),
          (raw: number) => Math.round(raw / 2.55),
        );

        const testPercentages = [0, 10, 25, 50, 75, 90, 100];

        for (const value of testPercentages) {
          const encoded = percentageCodec.encode(value);
          const [decoded] = percentageCodec.decode(encoded);

          // Allow for small rounding differences
          expect(Math.abs(decoded - value)).toBeLessThanOrEqual(1);
          expect(encoded.length).toBe(1);
        }
      });

      it('should round-trip with complex transformations', () => {
        // Create a codec that normalizes strings
        const normalizedStringCodec = mapCodec(
          string,
          (value: string) => value.trim().toLowerCase(),
          (value: string) => value, // No reverse transformation needed
        );

        const testStrings = ['  HELLO  ', 'World', '  Mixed Case String  ', '', '   '];

        for (const value of testStrings) {
          const encoded = normalizedStringCodec.encode(value);
          const [decoded] = normalizedStringCodec.decode(encoded);

          expect(decoded).toBe(value.trim().toLowerCase());
        }
      });
    });

    describe('wrapCodec', () => {
      it('should round-trip with pre/post processing', () => {
        const clampedU8 = wrapCodec(u8, {
          preEncode: (value: number) => Math.max(0, Math.min(255, Math.floor(value))),
          postDecode: (value: number) => value,
        });

        const testValues = [-10, 0, 100, 255, 300, 1000];

        for (const value of testValues) {
          const encoded = clampedU8.encode(value);
          const [decoded] = clampedU8.decode(encoded);

          const expected = Math.max(0, Math.min(255, Math.floor(value)));
          expect(decoded).toBe(expected);
        }
      });
    });
  });

  describe('Offset and Partial Decoding', () => {
    it('should round-trip with various offsets', () => {
      const testData = new Uint8Array([
        0xff,
        0xff, // Padding
        0x34,
        0x12, // u16 value 0x1234
        0x78,
        0x56,
        0x34,
        0x12, // u32 value 0x12345678
        0xff,
        0xff,
        0xff,
        0xff, // More padding
      ]);

      // Test u16 at offset 2
      const [u16Value, u16BytesRead] = u16.decode(testData, 2);
      expect(u16Value).toBe(0x1234);
      expect(u16BytesRead).toBe(2);

      // Test u32 at offset 4
      const [u32Value, u32BytesRead] = u32.decode(testData, 4);
      expect(u32Value).toBe(0x12345678);
      expect(u32BytesRead).toBe(4);

      // Verify the original values match when encoded
      expect(u16.encode(u16Value)).toEqual(testData.slice(2, 4));
      expect(u32.encode(u32Value)).toEqual(testData.slice(4, 8));
    });

    it('should handle sequential decoding correctly', () => {
      // Create a composite structure
      const data = struct({
        count: u32,
        name: string,
        active: boolean,
      });

      const testValue = {
        count: 42,
        name: 'test',
        active: true,
      };

      const encoded = data.encode(testValue);

      // Decode manually field by field
      let offset = 0;

      const [count, countBytes] = u32.decode(encoded, offset);
      offset += countBytes;

      const [name, nameBytes] = string.decode(encoded, offset);
      offset += nameBytes;

      const [active, activeBytes] = boolean.decode(encoded, offset);
      offset += activeBytes;

      expect(count).toBe(testValue.count);
      expect(name).toBe(testValue.name);
      expect(active).toBe(testValue.active);
      expect(offset).toBe(encoded.length);

      // Verify struct decoding gives same result
      const [structDecoded] = data.decode(encoded);
      expect(structDecoded).toEqual(testValue);
    });
  });

  describe('Size Consistency Properties', () => {
    it('should have consistent size calculations for all codecs', () => {
      const testCases = [
        { codec: u8, values: [0, 255] },
        { codec: u16, values: [0, 65535] },
        { codec: u32, values: [0, 4294967295] },
        { codec: u64, values: [0n, 18446744073709551615n] },
        { codec: boolean, values: [true, false] },
        { codec: string, values: ['', 'hello', '🎉'] },
        { codec: bytes, values: [new Uint8Array([]), new Uint8Array([1, 2, 3])] },
      ];

      for (const { codec, values } of testCases) {
        for (const value of values) {
          const encoded = codec.encode(value);

          if (typeof codec.size === 'number') {
            // Fixed-size codec
            expect(encoded.length).toBe(codec.size);
          } else {
            // Variable-size codec
            expect(encoded.length).toBe(codec.size(value));
          }
        }
      }
    });

    it('should have consistent size calculations for composite codecs', () => {
      const testCodec = struct({
        id: u32,
        name: string,
        tags: vec(string),
        metadata: option(bytes),
      });

      const testValues = [
        {
          id: 1,
          name: 'test',
          tags: ['tag1', 'tag2'],
          metadata: some(new Uint8Array([1, 2, 3])),
        },
        {
          id: 2,
          name: '',
          tags: [],
          metadata: none(),
        },
      ];

      for (const value of testValues) {
        const encoded = testCodec.encode(value);
        const calculatedSize = testCodec.size(value);

        expect(encoded.length).toBe(calculatedSize);
      }
    });
  });
});
