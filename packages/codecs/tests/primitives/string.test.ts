import { describe, it, expect } from 'vitest';
import { string, stringWithCustomSize, fixedString, u8, u16, CodecError } from '../../src/index.js';

describe('String Codecs', () => {
  describe('string (variable-length with u32 prefix)', () => {
    it('should encode and decode UTF-8 strings', () => {
      const value = 'Hello, World!';

      const encoded = string.encode(value);
      const expectedBytes = new TextEncoder().encode(value);
      expect(encoded).toEqual(
        new Uint8Array([
          13,
          0,
          0,
          0, // Length (13 bytes)
          ...expectedBytes,
        ]),
      );

      const [decoded, bytesRead] = string.decode(encoded);
      expect(decoded).toBe(value);
      expect(bytesRead).toBe(17); // 4 + 13
    });

    it('should handle empty strings', () => {
      const encoded = string.encode('');
      expect(encoded).toEqual(new Uint8Array([0, 0, 0, 0]));

      const [decoded, bytesRead] = string.decode(encoded);
      expect(decoded).toBe('');
      expect(bytesRead).toBe(4);
    });

    it('should handle Unicode characters', () => {
      const value = '👋 Hello 世界 🌍';

      const encoded = string.encode(value);
      const [decoded, bytesRead] = string.decode(encoded);

      expect(decoded).toBe(value);
      expect(bytesRead).toBe(4 + new TextEncoder().encode(value).length);
    });

    it('should handle offset correctly', () => {
      const value = 'test';
      const encoded = string.encode(value);
      const prefixed = new Uint8Array([0xff, 0xff, ...encoded]);

      const [decoded, bytesRead] = string.decode(prefixed, 2);
      expect(decoded).toBe(value);
      expect(bytesRead).toBe(8); // 4 + 4
    });

    it('should throw on wrong input type', () => {
      // @ts-expect-error Testing runtime validation
      expect(() => string.encode(123)).toThrow('Value must be a string');
    });

    it('should throw on insufficient bytes for length', () => {
      expect(() => string.decode(new Uint8Array([1, 2, 3]))).toThrow(CodecError);
    });

    it('should throw on insufficient bytes for data', () => {
      const encoded = new Uint8Array([
        10,
        0,
        0,
        0, // Length = 10
        72,
        101,
        108, // Only 3 bytes of data
      ]);
      expect(() => string.decode(encoded)).toThrow('Insufficient bytes for string');
    });

    it('should throw on invalid UTF-8', () => {
      const encoded = new Uint8Array([
        2,
        0,
        0,
        0, // Length = 2
        0xff,
        0xfe, // Invalid UTF-8 sequence
      ]);
      expect(() => string.decode(encoded)).toThrow('Failed to decode UTF-8');
    });

    it('should calculate size correctly', () => {
      expect(string.size('')).toBe(4);
      expect(string.size('hello')).toBe(9); // 4 + 5
      expect(string.size('👋')).toBe(8); // 4 + 4 (emoji is 4 bytes)
    });
  });

  describe('stringWithCustomSize', () => {
    it('should work with u8 size prefix', () => {
      const codec = stringWithCustomSize(u8);
      const value = 'Hi!';

      const encoded = codec.encode(value);
      expect(encoded).toEqual(
        new Uint8Array([
          3, // Length (u8)
          72,
          105,
          33, // "Hi!"
        ]),
      );

      const [decoded, bytesRead] = codec.decode(encoded);
      expect(decoded).toBe(value);
      expect(bytesRead).toBe(4); // 1 + 3
    });

    it('should work with u16 size prefix', () => {
      const codec = stringWithCustomSize(u16);
      const value = 'A'.repeat(300); // 300 bytes

      const encoded = codec.encode(value);
      expect(encoded.length).toBe(302); // 2 + 300
      expect(encoded[0]).toBe(44); // 300 & 0xFF = 44
      expect(encoded[1]).toBe(1); // 300 >> 8 = 1

      const [decoded, bytesRead] = codec.decode(encoded);
      expect(decoded).toBe(value);
      expect(bytesRead).toBe(302);
    });

    it('should handle variable-size prefix codec', () => {
      // Mock variable-size codec
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

      const codec = stringWithCustomSize(variableSizeCodec);
      const smallValue = 'Small'; // 5 bytes
      const largeValue = 'X'.repeat(200); // 200 bytes

      const smallEncoded = codec.encode(smallValue);
      expect(smallEncoded.length).toBe(6); // 1 + 5

      const largeEncoded = codec.encode(largeValue);
      expect(largeEncoded.length).toBe(202); // 2 + 200

      expect(codec.size(smallValue)).toBe(6);
      expect(codec.size(largeValue)).toBe(202);
    });
  });

  describe('fixedString', () => {
    describe('null-terminated padding', () => {
      it('should encode and decode fixed-length strings', () => {
        const codec = fixedString(10);

        const encoded = codec.encode('hello');
        expect(encoded).toEqual(
          new Uint8Array([
            104,
            101,
            108,
            108,
            111, // "hello"
            0,
            0,
            0,
            0,
            0, // null padding
          ]),
        );

        const [decoded, bytesRead] = codec.decode(encoded);
        expect(decoded).toBe('hello');
        expect(bytesRead).toBe(10);
      });

      it('should handle strings that exactly fit', () => {
        const codec = fixedString(5);
        const value = 'hello';

        const encoded = codec.encode(value);
        expect(encoded.length).toBe(5);

        const [decoded] = codec.decode(encoded);
        expect(decoded).toBe(value);
      });

      it('should truncate long strings when truncate is true', () => {
        const codec = fixedString(5, { truncate: true });
        const value = 'hello world';

        const encoded = codec.encode(value);
        expect(encoded).toEqual(new TextEncoder().encode('hello'));

        const [decoded] = codec.decode(encoded);
        expect(decoded).toBe('hello');
      });

      it('should throw on long strings when truncate is false', () => {
        const codec = fixedString(5, { truncate: false });
        expect(() => codec.encode('hello world')).toThrow(
          'String byte length 11 exceeds fixed size 5',
        );
      });
    });

    describe('space-padded', () => {
      it('should encode and decode with space padding', () => {
        const codec = fixedString(10, { padding: 'spacePadded' });

        const encoded = codec.encode('hello');
        expect(encoded).toEqual(
          new Uint8Array([
            104,
            101,
            108,
            108,
            111, // "hello"
            32,
            32,
            32,
            32,
            32, // space padding
          ]),
        );

        const [decoded, bytesRead] = codec.decode(encoded);
        expect(decoded).toBe('hello'); // Spaces should be trimmed
        expect(bytesRead).toBe(10);
      });

      it('should handle strings with trailing spaces', () => {
        const codec = fixedString(10, { padding: 'spacePadded' });
        const value = 'hello  '; // Has trailing spaces

        const encoded = codec.encode(value);
        const [decoded] = codec.decode(encoded);

        // With space padding, we cannot distinguish between user spaces and padding spaces
        // All trailing spaces will be trimmed during decode
        expect(decoded).toBe('hello');
      });
    });

    it('should handle empty strings', () => {
      const codec = fixedString(5);

      const encoded = codec.encode('');
      expect(encoded).toEqual(new Uint8Array([0, 0, 0, 0, 0]));

      const [decoded] = codec.decode(encoded);
      expect(decoded).toBe('');
    });

    it('should handle Unicode correctly', () => {
      const codec = fixedString(8, { truncate: true });
      const value = '👋👋👋'; // Each emoji is 4 bytes

      const encoded = codec.encode(value);
      expect(encoded.length).toBe(8);

      // When we truncate at 8 bytes, we get exactly 2 emojis (4 bytes each)
      const [decoded] = codec.decode(encoded);
      expect(decoded).toBe('👋👋'); // Only 2 emojis fit in 8 bytes
    });

    it('should handle offset correctly', () => {
      const codec = fixedString(5);
      const data = new Uint8Array([
        0xff,
        0xff, // Prefix
        104,
        101,
        108,
        108,
        111, // "hello"
        0xff,
        0xff, // Suffix
      ]);

      const [decoded, bytesRead] = codec.decode(data, 2);
      expect(decoded).toBe('hello');
      expect(bytesRead).toBe(5);
    });

    it('should throw on wrong input type', () => {
      const codec = fixedString(10);
      // @ts-expect-error Testing runtime validation
      expect(() => codec.encode(123)).toThrow('Value must be a string');
    });

    it('should throw on insufficient bytes', () => {
      const codec = fixedString(10);
      expect(() => codec.decode(new Uint8Array([1, 2, 3]))).toThrow('Insufficient bytes');
    });

    it('should have correct size', () => {
      const codec = fixedString(20);
      expect(codec.size).toBe(20);
    });
  });

  describe('Edge cases', () => {
    it('should handle strings with null bytes', () => {
      const value = 'hello\0world';

      const encoded = string.encode(value);
      const [decoded] = string.decode(encoded);

      expect(decoded).toBe(value);
    });

    it('should handle very long strings', () => {
      const value = 'x'.repeat(10000);

      const encoded = string.encode(value);
      expect(encoded.length).toBe(10004); // 4 + 10000

      const [decoded, bytesRead] = string.decode(encoded);
      expect(decoded).toBe(value);
      expect(bytesRead).toBe(10004);
    });

    it('should handle all Unicode planes', () => {
      // Test various Unicode characters
      const value = '♠♣♥♦ 🂡🂢🂣🂤 𝄞𝄟𝄠𝄡 中文字符';

      const encoded = string.encode(value);
      const [decoded] = string.decode(encoded);

      expect(decoded).toBe(value);
    });
  });
});
