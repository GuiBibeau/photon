import { describe, it, expect } from 'vitest';
import { boolean } from '../../src/index.js';

describe('Boolean Codec', () => {
  describe('encoding', () => {
    it('should encode true as 1', () => {
      const encoded = boolean.encode(true);
      expect(encoded).toEqual(new Uint8Array([1]));
    });

    it('should encode false as 0', () => {
      const encoded = boolean.encode(false);
      expect(encoded).toEqual(new Uint8Array([0]));
    });

    it('should throw on non-boolean values', () => {
      // @ts-expect-error Testing runtime validation
      expect(() => boolean.encode(1)).toThrow('Value must be a boolean');
      // @ts-expect-error Testing runtime validation
      expect(() => boolean.encode('true')).toThrow('Value must be a boolean');
      // @ts-expect-error Testing runtime validation
      expect(() => boolean.encode(null)).toThrow('Value must be a boolean');
      // @ts-expect-error Testing runtime validation
      expect(() => boolean.encode(undefined)).toThrow('Value must be a boolean');
    });
  });

  describe('decoding', () => {
    it('should decode 1 as true', () => {
      const [decoded, bytesRead] = boolean.decode(new Uint8Array([1]));
      expect(decoded).toBe(true);
      expect(bytesRead).toBe(1);
    });

    it('should decode 0 as false', () => {
      const [decoded, bytesRead] = boolean.decode(new Uint8Array([0]));
      expect(decoded).toBe(false);
      expect(bytesRead).toBe(1);
    });

    it('should handle offset correctly', () => {
      const bytes = new Uint8Array([0xff, 0xff, 1, 0xff]);
      const [decoded, bytesRead] = boolean.decode(bytes, 2);
      expect(decoded).toBe(true);
      expect(bytesRead).toBe(1);
    });

    it('should throw on invalid boolean values', () => {
      expect(() => boolean.decode(new Uint8Array([2]))).toThrow(
        'Invalid boolean value: expected 0 or 1, got 2',
      );
      expect(() => boolean.decode(new Uint8Array([255]))).toThrow(
        'Invalid boolean value: expected 0 or 1, got 255',
      );
    });

    it('should throw on insufficient bytes', () => {
      expect(() => boolean.decode(new Uint8Array([]))).toThrow();
      expect(() => boolean.decode(new Uint8Array([1, 2]), 2)).toThrow();
    });
  });

  describe('round-trip', () => {
    it('should correctly encode and decode true', () => {
      const original = true;
      const encoded = boolean.encode(original);
      const [decoded] = boolean.decode(encoded);
      expect(decoded).toBe(original);
    });

    it('should correctly encode and decode false', () => {
      const original = false;
      const encoded = boolean.encode(original);
      const [decoded] = boolean.decode(encoded);
      expect(decoded).toBe(original);
    });
  });

  describe('properties', () => {
    it('should have correct size', () => {
      expect(boolean.size).toBe(1);
    });

    it('should be a fixed-size codec', () => {
      expect(typeof boolean.size).toBe('number');
    });
  });

  describe('integration', () => {
    it('should work in sequential decoding', () => {
      const bytes = new Uint8Array([1, 0, 1, 1, 0]);
      let offset = 0;

      const values: boolean[] = [];
      for (let i = 0; i < 5; i++) {
        const [value, bytesRead] = boolean.decode(bytes, offset);
        values.push(value);
        offset += bytesRead;
      }

      expect(values).toEqual([true, false, true, true, false]);
      expect(offset).toBe(5);
    });

    it('should work with multiple booleans in a buffer', () => {
      const values = [true, false, false, true, true, false];
      const encoded = new Uint8Array(values.length);

      // Encode all values
      values.forEach((value, i) => {
        encoded[i] = boolean.encode(value)[0];
      });

      // Decode all values
      const decoded = values.map((_, i) => {
        const [value] = boolean.decode(encoded, i);
        return value;
      });

      expect(decoded).toEqual(values);
    });
  });
});
