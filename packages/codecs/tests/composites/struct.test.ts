import { describe, it, expect } from 'vitest';
import {
  struct,
  u8,
  u16,
  u32,
  u64,
  string,
  boolean,
  fixedBytes,
  bytes,
  isFixedSizeCodec,
  isVariableSizeCodec,
} from '../../src/index.js';

describe('Struct Codec', () => {
  describe('Fixed-size structs', () => {
    const pointCodec = struct({
      x: u32,
      y: u32,
    });

    it('should be identified as fixed-size when all fields are fixed-size', () => {
      expect(isFixedSizeCodec(pointCodec)).toBe(true);
      expect(isVariableSizeCodec(pointCodec)).toBe(false);
    });

    it('should have the correct total size', () => {
      if (isFixedSizeCodec(pointCodec)) {
        expect(pointCodec.size).toBe(8); // 4 + 4 bytes
      }
    });

    it('should encode and decode simple structs correctly', () => {
      const point = { x: 100, y: 200 };
      const encoded = pointCodec.encode(point);
      const [decoded, bytesRead] = pointCodec.decode(encoded);

      expect(decoded).toEqual(point);
      expect(bytesRead).toBe(8);
      expect(encoded.length).toBe(8);
    });

    it('should preserve field order during encoding', () => {
      const point = { x: 0x12345678, y: 0x9abcdef0 };
      const encoded = pointCodec.encode(point);

      // Check that x comes first (little-endian)
      expect(encoded.slice(0, 4)).toEqual(new Uint8Array([0x78, 0x56, 0x34, 0x12]));
      // Check that y comes second
      expect(encoded.slice(4, 8)).toEqual(new Uint8Array([0xf0, 0xde, 0xbc, 0x9a]));
    });

    it('should handle partial decoding with offset', () => {
      const data = new Uint8Array([
        0xff, 0xff, 0x64, 0x00, 0x00, 0x00, 0xc8, 0x00, 0x00, 0x00, 0xff,
      ]);
      const [decoded, bytesRead] = pointCodec.decode(data, 2);

      expect(decoded).toEqual({ x: 100, y: 200 });
      expect(bytesRead).toBe(8);
    });

    it('should support nested structs', () => {
      const rectCodec = struct({
        topLeft: pointCodec,
        bottomRight: pointCodec,
      });

      const rect = {
        topLeft: { x: 10, y: 20 },
        bottomRight: { x: 30, y: 40 },
      };

      expect(isFixedSizeCodec(rectCodec)).toBe(true);
      if (isFixedSizeCodec(rectCodec)) {
        expect(rectCodec.size).toBe(16); // 4 points * 4 bytes each
      }

      const encoded = rectCodec.encode(rect);
      const [decoded, bytesRead] = rectCodec.decode(encoded);

      expect(decoded).toEqual(rect);
      expect(bytesRead).toBe(16);
    });

    it('should handle complex fixed-size structs', () => {
      const playerCodec = struct({
        id: u32,
        level: u8,
        health: u16,
        isAlive: boolean,
        position: pointCodec,
      });

      const player = {
        id: 12345,
        level: 42,
        health: 100,
        isAlive: true,
        position: { x: 150, y: 250 },
      };

      expect(isFixedSizeCodec(playerCodec)).toBe(true);
      if (isFixedSizeCodec(playerCodec)) {
        expect(playerCodec.size).toBe(16); // 4 + 1 + 2 + 1 + 8
      }

      const encoded = playerCodec.encode(player);
      const [decoded] = playerCodec.decode(encoded);

      expect(decoded).toEqual(player);
    });
  });

  describe('Variable-size structs', () => {
    const userCodec = struct({
      id: u32,
      name: string,
      email: string,
    });

    it('should be identified as variable-size when any field is variable-size', () => {
      expect(isFixedSizeCodec(userCodec)).toBe(false);
      expect(isVariableSizeCodec(userCodec)).toBe(true);
    });

    it('should encode and decode variable-size structs correctly', () => {
      const user = {
        id: 1001,
        name: 'Alice',
        email: 'alice@example.com',
      };

      const encoded = userCodec.encode(user);
      const [decoded, bytesRead] = userCodec.decode(encoded);

      expect(decoded).toEqual(user);
      expect(bytesRead).toBe(encoded.length);
    });

    it('should calculate size correctly for variable-size structs', () => {
      const user = {
        id: 1001,
        name: 'Bob',
        email: 'bob@test.com',
      };

      const expectedSize =
        4 + // id (u32)
        4 +
        3 + // name (u32 length + 3 bytes)
        4 +
        12; // email (u32 length + 12 bytes)

      expect(userCodec.size(user)).toBe(expectedSize);

      const encoded = userCodec.encode(user);
      expect(encoded.length).toBe(expectedSize);
    });

    it('should handle mixed fixed and variable fields', () => {
      const messageCodec = struct({
        timestamp: u64,
        sender: fixedBytes(32), // Fixed 32 bytes
        content: string, // Variable length
        priority: u8,
        attachments: bytes, // Variable length
      });

      const message = {
        timestamp: 1234567890n,
        sender: new Uint8Array(32).fill(0xaa),
        content: 'Hello, world!',
        priority: 1,
        attachments: new Uint8Array([1, 2, 3, 4, 5]),
      };

      expect(isVariableSizeCodec(messageCodec)).toBe(true);

      const encoded = messageCodec.encode(message);
      const [decoded] = messageCodec.decode(encoded);

      expect(decoded).toEqual(message);
    });

    it('should handle empty strings and arrays', () => {
      const emptyUser = {
        id: 999,
        name: '',
        email: '',
      };

      const encoded = userCodec.encode(emptyUser);
      const [decoded] = userCodec.decode(encoded);

      expect(decoded).toEqual(emptyUser);
    });
  });

  describe('Type safety', () => {
    it('should infer correct TypeScript types', () => {
      const configCodec = struct({
        version: u32,
        enabled: boolean,
        name: string,
      });

      // Type test - this should compile without errors
      const config: {
        version: number;
        enabled: boolean;
        name: string;
      } = {
        version: 1,
        enabled: true,
        name: 'test',
      };

      const encoded = configCodec.encode(config);
      const [decoded] = configCodec.decode(encoded);

      // TypeScript should know the exact shape of decoded
      expect(typeof decoded.version).toBe('number');
      expect(typeof decoded.enabled).toBe('boolean');
      expect(typeof decoded.name).toBe('string');
    });
  });

  describe('Error handling', () => {
    const simpleCodec = struct({
      a: u32,
      b: u16,
    });

    it('should throw on insufficient bytes for fixed-size struct', () => {
      const insufficientBytes = new Uint8Array([1, 2, 3]); // Need 6 bytes

      expect(() => simpleCodec.decode(insufficientBytes)).toThrow();
    });

    it('should throw on invalid offset', () => {
      const validBytes = new Uint8Array(10);

      expect(() => simpleCodec.decode(validBytes, 8)).toThrow(); // Not enough bytes from offset
    });

    it('should handle field encoding errors', () => {
      const testCodec = struct({
        value: u8,
      });

      expect(() => testCodec.encode({ value: 256 })).toThrow(); // u8 max is 255
    });
  });

  describe('Edge cases', () => {
    it('should handle struct with single field', () => {
      const singleFieldCodec = struct({
        value: u32,
      });

      const data = { value: 42 };
      const encoded = singleFieldCodec.encode(data);
      const [decoded] = singleFieldCodec.decode(encoded);

      expect(decoded).toEqual(data);
    });

    it('should handle deeply nested structs', () => {
      const levelThreeCodec = struct({
        value: u32,
      });

      const levelTwoCodec = struct({
        inner: levelThreeCodec,
        id: u16,
      });

      const levelOneCodec = struct({
        nested: levelTwoCodec,
        name: string,
      });

      const data = {
        nested: {
          inner: { value: 123 },
          id: 456,
        },
        name: 'test',
      };

      const encoded = levelOneCodec.encode(data);
      const [decoded] = levelOneCodec.decode(encoded);

      expect(decoded).toEqual(data);
    });

    it('should maintain field order with many fields', () => {
      const manyFieldsCodec = struct({
        a: u8,
        b: u8,
        c: u8,
        d: u8,
        e: u8,
        f: u8,
        g: u8,
        h: u8,
      });

      const data = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8 };
      const encoded = manyFieldsCodec.encode(data);

      // Check that fields are in correct order
      for (let i = 0; i < 8; i++) {
        expect(encoded[i]).toBe(i + 1);
      }

      const [decoded] = manyFieldsCodec.decode(encoded);
      expect(decoded).toEqual(data);
    });
  });
});
