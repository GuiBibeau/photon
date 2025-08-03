import { describe, it, expect } from 'vitest';
import {
  option,
  nullable,
  some,
  none,
  isSome,
  isNone,
  unwrap,
  unwrapOr,
  u32,
  string,
  boolean,
  isVariableSizeCodec,
  InvalidDataError,
} from '../../src/index.js';

describe('Option Codec', () => {
  describe('Option type utilities', () => {
    it('should create Some variants correctly', () => {
      const someValue = some(42);

      expect(someValue.__option).toBe('some');
      expect(someValue.value).toBe(42);
      expect(isSome(someValue)).toBe(true);
      expect(isNone(someValue)).toBe(false);
    });

    it('should create None variants correctly', () => {
      const noneValue = none();

      expect(noneValue.__option).toBe('none');
      expect(isSome(noneValue)).toBe(false);
      expect(isNone(noneValue)).toBe(true);
    });

    it('should unwrap Some values correctly', () => {
      const someValue = some('hello');

      expect(unwrap(someValue)).toBe('hello');
      expect(unwrapOr(someValue, 'default')).toBe('hello');
    });

    it('should handle None values correctly', () => {
      const noneValue = none();

      expect(() => unwrap(noneValue)).toThrow('Called unwrap on a None option');
      expect(unwrapOr(noneValue, 'default')).toBe('default');
    });

    it('should provide correct type guards', () => {
      const someValue = some(123);
      const noneValue = none();

      if (isSome(someValue)) {
        // TypeScript should know this has a value property
        expect(typeof someValue.value).toBe('number');
      }

      if (isNone(noneValue)) {
        // TypeScript should know this is None
        expect(noneValue.__option).toBe('none');
      }
    });
  });

  describe('option() codec', () => {
    const optionalNumberCodec = option(u32);

    it('should be identified as variable-size', () => {
      expect(isVariableSizeCodec(optionalNumberCodec)).toBe(true);
    });

    describe('Some variant encoding/decoding', () => {
      it('should encode and decode Some values correctly', () => {
        const someValue = some(123456);
        const encoded = optionalNumberCodec.encode(someValue);
        const [decoded, bytesRead] = optionalNumberCodec.decode(encoded);

        expect(isSome(decoded)).toBe(true);
        if (isSome(decoded)) {
          expect(decoded.value).toBe(123456);
        }
        expect(bytesRead).toBe(5); // 1 discriminator + 4 value bytes
      });

      it('should encode Some with correct discriminator', () => {
        const someValue = some(42);
        const encoded = optionalNumberCodec.encode(someValue);

        expect(encoded[0]).toBe(0x01); // Some discriminator
        expect(encoded.length).toBe(5);
      });

      it('should calculate Some size correctly', () => {
        const someValue = some(999);
        const size = optionalNumberCodec.size(someValue);

        expect(size).toBe(5); // 1 discriminator + 4 value bytes
      });
    });

    describe('None variant encoding/decoding', () => {
      it('should encode and decode None values correctly', () => {
        const noneValue = none();
        const encoded = optionalNumberCodec.encode(noneValue);
        const [decoded, bytesRead] = optionalNumberCodec.decode(encoded);

        expect(isNone(decoded)).toBe(true);
        expect(bytesRead).toBe(1); // Just discriminator
      });

      it('should encode None with correct discriminator', () => {
        const noneValue = none();
        const encoded = optionalNumberCodec.encode(noneValue);

        expect(encoded[0]).toBe(0x00); // None discriminator
        expect(encoded.length).toBe(1);
      });

      it('should calculate None size correctly', () => {
        const noneValue = none();
        const size = optionalNumberCodec.size(noneValue);

        expect(size).toBe(1); // Just discriminator
      });
    });

    describe('Variable-size value types', () => {
      const optionalStringCodec = option(string);

      it('should handle Some strings correctly', () => {
        const someString = some('Hello, World!');
        const encoded = optionalStringCodec.encode(someString);
        const [decoded] = optionalStringCodec.decode(encoded);

        expect(isSome(decoded)).toBe(true);
        if (isSome(decoded)) {
          expect(decoded.value).toBe('Hello, World!');
        }
      });

      it('should handle None strings correctly', () => {
        const noneString = none();
        const encoded = optionalStringCodec.encode(noneString);
        const [decoded] = optionalStringCodec.decode(encoded);

        expect(isNone(decoded)).toBe(true);
      });

      it('should calculate variable size correctly', () => {
        const someString = some('test');
        const noneString = none();

        expect(optionalStringCodec.size(someString)).toBe(1 + 4 + 4); // discriminator + length + data
        expect(optionalStringCodec.size(noneString)).toBe(1); // just discriminator
      });

      it('should handle empty strings', () => {
        const emptyString = some('');
        const encoded = optionalStringCodec.encode(emptyString);
        const [decoded] = optionalStringCodec.decode(encoded);

        expect(isSome(decoded)).toBe(true);
        if (isSome(decoded)) {
          expect(decoded.value).toBe('');
        }
      });
    });

    describe('Error handling', () => {
      it('should throw on invalid discriminator', () => {
        const invalidData = new Uint8Array([0x02, 0x42, 0x00, 0x00, 0x00]); // Invalid discriminator 0x02

        expect(() => optionalNumberCodec.decode(invalidData)).toThrow(InvalidDataError);
        expect(() => optionalNumberCodec.decode(invalidData)).toThrow(
          /Invalid option discriminator/,
        );
      });

      it('should throw on insufficient bytes for discriminator', () => {
        const emptyData = new Uint8Array(0);

        expect(() => optionalNumberCodec.decode(emptyData)).toThrow();
      });

      it('should throw on insufficient bytes for Some value', () => {
        const incompleteData = new Uint8Array([0x01, 0x42, 0x00]); // Some discriminator but incomplete u32

        expect(() => optionalNumberCodec.decode(incompleteData)).toThrow();
      });
    });

    describe('Partial decoding', () => {
      it('should handle partial decoding with offset for Some', () => {
        const buffer = new Uint8Array([0xff, 0xff, 0x01, 0x64, 0x00, 0x00, 0x00, 0xff]);
        const [decoded, bytesRead] = optionalNumberCodec.decode(buffer, 2);

        expect(isSome(decoded)).toBe(true);
        if (isSome(decoded)) {
          expect(decoded.value).toBe(100);
        }
        expect(bytesRead).toBe(5);
      });

      it('should handle partial decoding with offset for None', () => {
        const buffer = new Uint8Array([0xff, 0xff, 0x00, 0xff]);
        const [decoded, bytesRead] = optionalNumberCodec.decode(buffer, 2);

        expect(isNone(decoded)).toBe(true);
        expect(bytesRead).toBe(1);
      });
    });
  });

  describe('nullable() codec', () => {
    const nullableNumberCodec = nullable(u32);
    const nullableStringCodec = nullable(string);

    it('should encode and decode non-null values', () => {
      const value = 42;
      const encoded = nullableNumberCodec.encode(value);
      const [decoded] = nullableNumberCodec.decode(encoded);

      expect(decoded).toBe(42);
    });

    it('should encode and decode null values', () => {
      const value = null;
      const encoded = nullableNumberCodec.encode(value);
      const [decoded] = nullableNumberCodec.decode(encoded);

      expect(decoded).toBe(null);
    });

    it('should work with variable-size types', () => {
      const nonNullString = 'hello';
      const nullString = null;

      const encodedNonNull = nullableStringCodec.encode(nonNullString);
      const encodedNull = nullableStringCodec.encode(nullString);

      const [decodedNonNull] = nullableStringCodec.decode(encodedNonNull);
      const [decodedNull] = nullableStringCodec.decode(encodedNull);

      expect(decodedNonNull).toBe('hello');
      expect(decodedNull).toBe(null);
    });

    it('should calculate size correctly', () => {
      expect(nullableNumberCodec.size(42)).toBe(5); // discriminator + value
      expect(nullableNumberCodec.size(null)).toBe(1); // just discriminator
    });

    it('should be compatible with option codec encoding', () => {
      // nullable and option should produce the same binary format
      const optionalCodec = option(u32);
      const nullableCodec = nullable(u32);

      const someValue = some(123);
      const nonNullValue = 123;

      const optionalEncoded = optionalCodec.encode(someValue);
      const nullableEncoded = nullableCodec.encode(nonNullValue);

      expect(optionalEncoded).toEqual(nullableEncoded);

      const noneValue = none();
      const nullValue = null;

      const optionalNoneEncoded = optionalCodec.encode(noneValue);
      const nullableNullEncoded = nullableCodec.encode(nullValue);

      expect(optionalNoneEncoded).toEqual(nullableNullEncoded);
    });
  });

  describe('Complex type handling', () => {
    it('should work with boolean options', () => {
      const optionalBoolCodec = option(boolean);

      const someTrue = some(true);
      const someFalse = some(false);
      const noneValue = none();

      for (const value of [someTrue, someFalse, noneValue]) {
        const encoded = optionalBoolCodec.encode(value);
        const [decoded] = optionalBoolCodec.decode(encoded);

        if (isSome(value)) {
          expect(isSome(decoded)).toBe(true);
          if (isSome(decoded)) {
            expect(decoded.value).toBe(value.value);
          }
        } else {
          expect(isNone(decoded)).toBe(true);
        }
      }
    });

    it('should handle round-trip encoding correctly', () => {
      const optionalStringCodec = option(string);
      const testValues = [
        some(''),
        some('short'),
        some('a much longer string with various characters: åäö 123 !@#'),
        none(),
      ];

      for (const value of testValues) {
        const encoded = optionalStringCodec.encode(value);
        const [decoded] = optionalStringCodec.decode(encoded);

        if (isSome(value)) {
          expect(isSome(decoded)).toBe(true);
          if (isSome(decoded)) {
            expect(decoded.value).toBe(value.value);
          }
        } else {
          expect(isNone(decoded)).toBe(true);
        }
      }
    });
  });

  describe('Type safety', () => {
    it('should provide correct TypeScript types', () => {
      const optionalStringCodec = option(string);

      // Type test - these should compile without errors
      const someString = some('test');
      const noneString = none();

      const encoded1 = optionalStringCodec.encode(someString);
      const encoded2 = optionalStringCodec.encode(noneString);

      const [decoded1] = optionalStringCodec.decode(encoded1);
      const [decoded2] = optionalStringCodec.decode(encoded2);

      // TypeScript should understand the discriminated union
      if (isSome(decoded1)) {
        expect(typeof decoded1.value).toBe('string');
      }

      if (isNone(decoded2)) {
        expect(decoded2.__option).toBe('none');
      }
    });
  });
});
