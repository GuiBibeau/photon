import { describe, it, expect } from 'vitest';
import {
  enumCodec,
  simpleEnum,
  enumVariant,
  u8,
  u16,
  u32,
  string,
  boolean,
  isVariableSizeCodec,
  CodecError,
  InvalidDataError,
} from '../../src/index.js';

describe('Enum Codec', () => {
  describe('enumVariant helper', () => {
    it('should create variants with data correctly', () => {
      const variant = enumVariant('success', 0, 42);

      expect(variant.__variant).toBe('success');
      expect(variant.__discriminator).toBe(0);
      expect((variant as any).data).toBe(42);
    });

    it('should create variants without data correctly', () => {
      const variant = enumVariant('pending', 1);

      expect(variant.__variant).toBe('pending');
      expect(variant.__discriminator).toBe(1);
      expect('data' in variant).toBe(false);
    });
  });

  describe('enumCodec() with data variants', () => {
    const resultCodec = enumCodec({
      ok: u32,
      error: string,
      pending: u8, // Different codec per variant
    });

    it('should be identified as variable-size', () => {
      expect(isVariableSizeCodec(resultCodec)).toBe(true);
    });

    describe('Encoding variants', () => {
      it('should encode Ok variant correctly', () => {
        const okVariant = enumVariant('ok', 0, 12345);
        const encoded = resultCodec.encode(okVariant);

        expect(encoded[0]).toBe(0); // Discriminator for 'ok'
        expect(encoded.length).toBe(5); // 1 discriminator + 4 u32 bytes

        // Check the u32 value (little-endian)
        const view = new DataView(encoded.buffer, encoded.byteOffset + 1);
        expect(view.getUint32(0, true)).toBe(12345);
      });

      it('should encode Error variant correctly', () => {
        const errorVariant = enumVariant('error', 1, 'Something went wrong');
        const encoded = resultCodec.encode(errorVariant);

        expect(encoded[0]).toBe(1); // Discriminator for 'error'
        expect(encoded.length).toBe(1 + 4 + 20); // discriminator + string length + string data
      });

      it('should encode Pending variant correctly', () => {
        const pendingVariant = enumVariant('pending', 2, 50);
        const encoded = resultCodec.encode(pendingVariant);

        expect(encoded[0]).toBe(2); // Discriminator for 'pending'
        expect(encoded[1]).toBe(50); // u8 value
        expect(encoded.length).toBe(2); // 1 discriminator + 1 u8 byte
      });
    });

    describe('Decoding variants', () => {
      it('should decode Ok variant correctly', () => {
        const okVariant = enumVariant('ok', 0, 9999);
        const encoded = resultCodec.encode(okVariant);
        const [decoded, bytesRead] = resultCodec.decode(encoded);

        expect(decoded.__variant).toBe('ok');
        expect(decoded.__discriminator).toBe(0);
        expect((decoded as any).data).toBe(9999);
        expect(bytesRead).toBe(5);
      });

      it('should decode Error variant correctly', () => {
        const errorVariant = enumVariant('error', 1, 'Test error');
        const encoded = resultCodec.encode(errorVariant);
        const [decoded] = resultCodec.decode(encoded);

        expect(decoded.__variant).toBe('error');
        expect(decoded.__discriminator).toBe(1);
        expect((decoded as any).data).toBe('Test error');
      });

      it('should decode Pending variant correctly', () => {
        const pendingVariant = enumVariant('pending', 2, 100);
        const encoded = resultCodec.encode(pendingVariant);
        const [decoded] = resultCodec.decode(encoded);

        expect(decoded.__variant).toBe('pending');
        expect(decoded.__discriminator).toBe(2);
        expect((decoded as any).data).toBe(100);
      });
    });

    describe('Size calculation', () => {
      it('should calculate size for Ok variant', () => {
        const okVariant = enumVariant('ok', 0, 42);
        expect(resultCodec.size(okVariant)).toBe(5); // 1 + 4
      });

      it('should calculate size for Error variant', () => {
        const errorVariant = enumVariant('error', 1, 'hello');
        expect(resultCodec.size(errorVariant)).toBe(10); // 1 + 4 + 5
      });

      it('should calculate size for Pending variant', () => {
        const pendingVariant = enumVariant('pending', 2, 123);
        expect(resultCodec.size(pendingVariant)).toBe(2); // 1 + 1
      });
    });
  });

  describe('simpleEnum() without data', () => {
    const stateCodec = simpleEnum(['pending', 'processing', 'completed', 'failed']);

    it('should encode and decode unit variants correctly', () => {
      const pendingVariant = enumVariant('pending', 0);
      const completedVariant = enumVariant('completed', 2);

      for (const variant of [pendingVariant, completedVariant]) {
        const encoded = stateCodec.encode(variant);
        const [decoded, bytesRead] = stateCodec.decode(encoded);

        expect(decoded.__variant).toBe(variant.__variant);
        expect(decoded.__discriminator).toBe(variant.__discriminator);
        expect('data' in decoded).toBe(false);
        expect(bytesRead).toBe(1); // Just discriminator
        expect(encoded.length).toBe(1);
      }
    });

    it('should assign correct discriminator values', () => {
      const variants = [
        enumVariant('pending', 0),
        enumVariant('processing', 1),
        enumVariant('completed', 2),
        enumVariant('failed', 3),
      ];

      for (const variant of variants) {
        const encoded = stateCodec.encode(variant);
        expect(encoded[0]).toBe(variant.__discriminator);
      }
    });

    it('should calculate correct size for unit variants', () => {
      const variant = enumVariant('pending', 0);
      expect(stateCodec.size(variant)).toBe(1); // Just discriminator
    });
  });

  describe('Custom discriminator codec', () => {
    const largeEnumCodec = enumCodec(
      {
        variant1: u32,
        variant2: u32,
        variant3: u32,
      },
      u16,
    ); // Use u16 for discriminator instead of u8

    it('should use custom discriminator size', () => {
      const variant = enumVariant('variant1', 0, 42);
      const encoded = largeEnumCodec.encode(variant);

      expect(encoded.length).toBe(6); // 2 (u16 discriminator) + 4 (u32 data)

      // Check discriminator is encoded as u16 little-endian
      expect(encoded[0]).toBe(0);
      expect(encoded[1]).toBe(0);
    });

    it('should decode with custom discriminator correctly', () => {
      const variant = enumVariant('variant2', 1, 9999);
      const encoded = largeEnumCodec.encode(variant);
      const [decoded] = largeEnumCodec.decode(encoded);

      expect(decoded.__variant).toBe('variant2');
      expect(decoded.__discriminator).toBe(1);
      expect((decoded as any).data).toBe(9999);
    });
  });

  describe('Error handling', () => {
    const testCodec = enumCodec({
      a: u32,
      b: string,
    });

    it('should throw on unknown variant during encoding', () => {
      const invalidVariant = { __variant: 'unknown', __discriminator: 99, data: 42 } as any;

      expect(() => testCodec.encode(invalidVariant)).toThrow(CodecError);
      expect(() => testCodec.encode(invalidVariant)).toThrow(/Unknown enum variant/);
    });

    it('should throw on invalid discriminator during decoding', () => {
      const invalidData = new Uint8Array([5, 0x42, 0x00, 0x00, 0x00]); // Discriminator 5 doesn't exist

      expect(() => testCodec.decode(invalidData)).toThrow(InvalidDataError);
      expect(() => testCodec.decode(invalidData)).toThrow(/Invalid enum discriminator/);
    });

    it('should throw on insufficient bytes for discriminator', () => {
      const emptyData = new Uint8Array(0);

      expect(() => testCodec.decode(emptyData)).toThrow();
    });

    it('should throw on insufficient bytes for variant data', () => {
      const incompleteData = new Uint8Array([0, 0x42, 0x00]); // Discriminator 0 (variant 'a') but incomplete u32

      expect(() => testCodec.decode(incompleteData)).toThrow();
    });

    it('should throw on unknown variant during size calculation', () => {
      const invalidVariant = { __variant: 'unknown', __discriminator: 99, data: 42 } as any;

      expect(() => testCodec.size(invalidVariant)).toThrow(CodecError);
    });
  });

  describe('Partial decoding', () => {
    const testCodec = enumCodec({
      first: u32,
      second: string,
    });

    it('should handle partial decoding with offset', () => {
      const variant = enumVariant('first', 0, 12345);
      const buffer = new Uint8Array(10);
      const encoded = testCodec.encode(variant);

      // Copy encoded data to offset 3
      buffer.set(encoded, 3);

      const [decoded, bytesRead] = testCodec.decode(buffer, 3);

      expect(decoded.__variant).toBe('first');
      expect((decoded as any).data).toBe(12345);
      expect(bytesRead).toBe(5);
    });
  });

  describe('Complex variant data types', () => {
    it('should handle boolean variant data', () => {
      const boolEnumCodec = enumCodec({
        enabled: boolean,
        disabled: boolean,
      });

      const enabledVariant = enumVariant('enabled', 0, true);
      const disabledVariant = enumVariant('disabled', 1, false);

      for (const variant of [enabledVariant, disabledVariant]) {
        const encoded = boolEnumCodec.encode(variant);
        const [decoded] = boolEnumCodec.decode(encoded);

        expect(decoded.__variant).toBe(variant.__variant);
        expect((decoded as any).data).toBe((variant as any).data);
      }
    });

    it('should handle empty string variant data', () => {
      const stringEnumCodec = enumCodec({
        message: string,
      });

      const emptyVariant = enumVariant('message', 0, '');
      const encoded = stringEnumCodec.encode(emptyVariant);
      const [decoded] = stringEnumCodec.decode(encoded);

      expect((decoded as any).data).toBe('');
    });
  });

  describe('Round-trip encoding', () => {
    const complexEnumCodec = enumCodec({
      small: u8,
      medium: u16,
      large: u32,
      text: string,
    });

    it('should maintain data integrity through encode/decode cycles', () => {
      const testVariants = [
        enumVariant('small', 0, 255),
        enumVariant('medium', 1, 65535),
        enumVariant('large', 2, 4294967295),
        enumVariant('text', 3, 'Hello, world! 🌍'),
      ];

      for (const original of testVariants) {
        const encoded = complexEnumCodec.encode(original);
        const [decoded] = complexEnumCodec.decode(encoded);

        expect(decoded.__variant).toBe(original.__variant);
        expect(decoded.__discriminator).toBe(original.__discriminator);
        expect((decoded as any).data).toBe((original as any).data);

        // Size should match encoded length
        expect(complexEnumCodec.size(original)).toBe(encoded.length);
      }
    });
  });

  describe('Type safety', () => {
    it('should provide correct discriminated union types', () => {
      const resultCodec = enumCodec({
        success: u32,
        failure: string,
      });

      // Type test - these should compile without errors
      const successVariant = enumVariant('success', 0, 42);
      const failureVariant = enumVariant('failure', 1, 'error message');

      const encoded1 = resultCodec.encode(successVariant);
      const encoded2 = resultCodec.encode(failureVariant);

      const [decoded1] = resultCodec.decode(encoded1);
      const [decoded2] = resultCodec.decode(encoded2);

      // TypeScript should understand the discriminated union
      expect(decoded1.__variant).toBe('success');
      expect(decoded2.__variant).toBe('failure');
    });
  });
});
