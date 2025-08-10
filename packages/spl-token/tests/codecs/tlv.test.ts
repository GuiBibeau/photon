import { describe, it, expect } from 'vitest';
import {
  parseTlv,
  encodeTlv,
  findTlvEntry,
  findAllTlvEntries,
  calculateTlvSize,
  tlvCodec,
  LazyTlvParser,
  type TlvEntry,
} from '../../src/codecs/tlv';
import { u16, u32, u64 } from '@photon/codecs/primitives/numeric';
import { struct } from '@photon/codecs/composites';

describe('TLV Codec', () => {
  describe('parseTlv', () => {
    it('should parse empty buffer', () => {
      const buffer = new Uint8Array(0);
      const result = parseTlv(buffer);

      expect(result.entries).toEqual([]);
      expect(result.bytesRead).toBe(0);
    });

    it('should parse single TLV entry', () => {
      // Create TLV data: type=1, length=4, value=[0x01, 0x02, 0x03, 0x04]
      const buffer = new Uint8Array([
        0x01,
        0x00, // type = 1 (little-endian)
        0x04,
        0x00, // length = 4 (little-endian)
        0x01,
        0x02,
        0x03,
        0x04, // value
      ]);

      const result = parseTlv(buffer);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe(1);
      expect(result.entries[0].length).toBe(4);
      expect(result.entries[0].data).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
      expect(result.entries[0].offset).toBe(0);
      expect(result.bytesRead).toBe(8);
    });

    it('should parse multiple TLV entries', () => {
      const buffer = new Uint8Array([
        // Entry 1: type=1, length=2
        0x01, 0x00, 0x02, 0x00, 0xff, 0xaa,
        // Entry 2: type=2, length=3
        0x02, 0x00, 0x03, 0x00, 0x11, 0x22, 0x33,
        // Entry 3: type=100, length=0 (empty)
        0x64, 0x00, 0x00, 0x00,
      ]);

      const result = parseTlv(buffer);

      expect(result.entries).toHaveLength(3);

      expect(result.entries[0].type).toBe(1);
      expect(result.entries[0].length).toBe(2);
      expect(result.entries[0].data).toEqual(new Uint8Array([0xff, 0xaa]));

      expect(result.entries[1].type).toBe(2);
      expect(result.entries[1].length).toBe(3);
      expect(result.entries[1].data).toEqual(new Uint8Array([0x11, 0x22, 0x33]));

      expect(result.entries[2].type).toBe(100);
      expect(result.entries[2].length).toBe(0);
      expect(result.entries[2].data).toEqual(new Uint8Array(0));

      expect(result.bytesRead).toBe(17);
    });

    it('should parse with offset', () => {
      const buffer = new Uint8Array([
        0xff,
        0xff,
        0xff, // padding
        0x05,
        0x00, // type = 5
        0x02,
        0x00, // length = 2
        0xab,
        0xcd, // value
      ]);

      const result = parseTlv(buffer, 3);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe(5);
      expect(result.entries[0].data).toEqual(new Uint8Array([0xab, 0xcd]));
      expect(result.bytesRead).toBe(6);
    });

    it('should parse with maxBytes limit', () => {
      const buffer = new Uint8Array([
        // Entry 1
        0x01, 0x00, 0x02, 0x00, 0x11, 0x22,
        // Entry 2 (should be ignored due to maxBytes)
        0x02, 0x00, 0x02, 0x00, 0x33, 0x44,
      ]);

      const result = parseTlv(buffer, 0, 6);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe(1);
      expect(result.bytesRead).toBe(6);
    });

    it('should throw error for insufficient bytes', () => {
      const buffer = new Uint8Array([
        0x01,
        0x00, // type
        0x04,
        0x00, // length = 4
        0x11,
        0x22, // only 2 bytes instead of 4
      ]);

      expect(() => parseTlv(buffer)).toThrow('Insufficient bytes for TLV value');
    });

    it('should handle partial header gracefully', () => {
      const buffer = new Uint8Array([
        0x01,
        0x00,
        0x02,
        0x00,
        0x11,
        0x22, // Complete entry
        0x02,
        0x00, // Partial header (missing length bytes)
      ]);

      const result = parseTlv(buffer);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe(1);
      expect(result.bytesRead).toBe(6);
    });
  });

  describe('encodeTlv', () => {
    it('should encode empty entries', () => {
      const encoded = encodeTlv([]);
      expect(encoded).toEqual(new Uint8Array(0));
    });

    it('should encode single entry', () => {
      const entries: Omit<TlvEntry, 'offset'>[] = [
        {
          type: 10,
          length: 3,
          data: new Uint8Array([0xaa, 0xbb, 0xcc]),
        },
      ];

      const encoded = encodeTlv(entries);

      expect(encoded).toEqual(
        new Uint8Array([
          0x0a,
          0x00, // type = 10
          0x03,
          0x00, // length = 3
          0xaa,
          0xbb,
          0xcc, // data
        ]),
      );
    });

    it('should encode multiple entries', () => {
      const entries: Omit<TlvEntry, 'offset'>[] = [
        { type: 1, length: 2, data: new Uint8Array([0x11, 0x22]) },
        { type: 255, length: 0, data: new Uint8Array(0) },
        { type: 1000, length: 1, data: new Uint8Array([0xff]) },
      ];

      const encoded = encodeTlv(entries);

      // Parse it back to verify
      const parsed = parseTlv(encoded);
      expect(parsed.entries).toHaveLength(3);
      expect(parsed.entries[0].type).toBe(1);
      expect(parsed.entries[1].type).toBe(255);
      expect(parsed.entries[2].type).toBe(1000);
    });

    it('should round-trip encode and decode', () => {
      const original: Omit<TlvEntry, 'offset'>[] = [
        { type: 42, length: 8, data: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) },
        { type: 100, length: 0, data: new Uint8Array(0) },
        { type: 999, length: 3, data: new Uint8Array([0xde, 0xad, 0xbe]) },
      ];

      const encoded = encodeTlv(original);
      const decoded = parseTlv(encoded);

      expect(decoded.entries).toHaveLength(original.length);

      for (let i = 0; i < original.length; i++) {
        expect(decoded.entries[i].type).toBe(original[i].type);
        expect(decoded.entries[i].length).toBe(original[i].length);
        expect(decoded.entries[i].data).toEqual(original[i].data);
      }
    });
  });

  describe('findTlvEntry', () => {
    const entries: TlvEntry[] = [
      { type: 1, length: 2, data: new Uint8Array([0x11, 0x22]), offset: 0 },
      { type: 2, length: 3, data: new Uint8Array([0x33, 0x44, 0x55]), offset: 6 },
      { type: 3, length: 0, data: new Uint8Array(0), offset: 13 },
    ];

    it('should find existing entry', () => {
      const entry = findTlvEntry(entries, 2);
      expect(entry).toBeDefined();
      expect(entry?.type).toBe(2);
      expect(entry?.data).toEqual(new Uint8Array([0x33, 0x44, 0x55]));
    });

    it('should return undefined for non-existent entry', () => {
      const entry = findTlvEntry(entries, 999);
      expect(entry).toBeUndefined();
    });

    it('should find first matching entry when duplicates exist', () => {
      const duplicateEntries: TlvEntry[] = [
        { type: 1, length: 1, data: new Uint8Array([0xaa]), offset: 0 },
        { type: 1, length: 1, data: new Uint8Array([0xbb]), offset: 5 },
      ];

      const entry = findTlvEntry(duplicateEntries, 1);
      expect(entry?.data).toEqual(new Uint8Array([0xaa]));
    });
  });

  describe('findAllTlvEntries', () => {
    const entries: TlvEntry[] = [
      { type: 1, length: 1, data: new Uint8Array([0xaa]), offset: 0 },
      { type: 2, length: 1, data: new Uint8Array([0xbb]), offset: 5 },
      { type: 1, length: 1, data: new Uint8Array([0xcc]), offset: 10 },
      { type: 1, length: 1, data: new Uint8Array([0xdd]), offset: 15 },
    ];

    it('should find all matching entries', () => {
      const matches = findAllTlvEntries(entries, 1);
      expect(matches).toHaveLength(3);
      expect(matches[0].data).toEqual(new Uint8Array([0xaa]));
      expect(matches[1].data).toEqual(new Uint8Array([0xcc]));
      expect(matches[2].data).toEqual(new Uint8Array([0xdd]));
    });

    it('should return empty array for non-existent type', () => {
      const matches = findAllTlvEntries(entries, 999);
      expect(matches).toEqual([]);
    });
  });

  describe('calculateTlvSize', () => {
    it('should calculate size of empty entries', () => {
      expect(calculateTlvSize([])).toBe(0);
    });

    it('should calculate size including headers', () => {
      const entries: TlvEntry[] = [
        { type: 1, length: 10, data: new Uint8Array(10), offset: 0 },
        { type: 2, length: 5, data: new Uint8Array(5), offset: 14 },
        { type: 3, length: 0, data: new Uint8Array(0), offset: 23 },
      ];

      // Each entry has 4 bytes header (type + length)
      // Total: (4 + 10) + (4 + 5) + (4 + 0) = 27
      expect(calculateTlvSize(entries)).toBe(27);
    });
  });

  describe('tlvCodec', () => {
    it('should create codec for simple value', () => {
      const codec = tlvCodec(42, u32);

      const value = 0x12345678;
      const encoded = codec.encode(value);

      // Check header
      expect(encoded[0]).toBe(42); // type low byte
      expect(encoded[1]).toBe(0); // type high byte
      expect(encoded[2]).toBe(4); // length low byte (u32 = 4 bytes)
      expect(encoded[3]).toBe(0); // length high byte

      // Decode and verify
      const [decoded, bytesRead] = codec.decode(encoded);
      expect(decoded).toBe(value);
      expect(bytesRead).toBe(8); // 4 header + 4 data
    });

    it('should create codec for struct', () => {
      const structCodec = struct({
        a: u16,
        b: u64,
      });

      const codec = tlvCodec(100, structCodec);

      const value = { a: 1234, b: 9876543210n };
      const encoded = codec.encode(value);

      const [decoded, bytesRead] = codec.decode(encoded);
      expect(decoded).toEqual(value);
      expect(bytesRead).toBe(4 + 2 + 8); // header + u16 + u64
    });

    it('should throw error for type mismatch', () => {
      const codec = tlvCodec(50, u32);

      // Create TLV with wrong type
      const badData = new Uint8Array([
        99,
        0, // wrong type
        4,
        0, // length
        1,
        2,
        3,
        4, // data
      ]);

      expect(() => codec.decode(badData)).toThrow('Expected TLV type');
    });

    it('should throw error for length mismatch', () => {
      const codec = tlvCodec(1, u32);

      // Create TLV with wrong length in header
      const badData = new Uint8Array([
        1,
        0, // type
        10,
        0, // wrong length (should be 4)
        1,
        2,
        3,
        4, // data
      ]);

      expect(() => codec.decode(badData)).toThrow('TLV length mismatch');
    });

    it('should calculate size correctly', () => {
      const codec = tlvCodec(1, u64);

      // Fixed size codec
      if ('size' in codec && typeof codec.size === 'number') {
        expect(codec.size).toBe(12); // 4 header + 8 data
      }

      // Variable size codec
      const varCodec = tlvCodec(2, {
        encode: (v: number[]) => new Uint8Array(v),
        decode: (b: Uint8Array) => [Array.from(b), b.length] as const,
        size: (v: number[]) => v.length,
      });

      if ('size' in varCodec && typeof varCodec.size === 'function') {
        expect(varCodec.size([1, 2, 3])).toBe(7); // 4 header + 3 data
      }
    });
  });

  describe('LazyTlvParser', () => {
    const buffer = new Uint8Array([
      // Entry 1: type=1, length=4
      0x01, 0x00, 0x04, 0x00, 0x11, 0x22, 0x33, 0x44,
      // Entry 2: type=2, length=2
      0x02, 0x00, 0x02, 0x00, 0xaa, 0xbb,
      // Entry 3: type=100, length=0
      0x64, 0x00, 0x00, 0x00,
    ]);

    it('should lazily parse entries', () => {
      const parser = new LazyTlvParser(buffer);

      // Check if entry exists
      expect(parser.has(1)).toBe(true);
      expect(parser.has(2)).toBe(true);
      expect(parser.has(100)).toBe(true);
      expect(parser.has(999)).toBe(false);
    });

    it('should get specific entry', () => {
      const parser = new LazyTlvParser(buffer);

      const entry1 = parser.get(1);
      expect(entry1).toBeDefined();
      expect(entry1?.type).toBe(1);
      expect(entry1?.data).toEqual(new Uint8Array([0x11, 0x22, 0x33, 0x44]));

      const entry2 = parser.get(2);
      expect(entry2?.type).toBe(2);
      expect(entry2?.data).toEqual(new Uint8Array([0xaa, 0xbb]));

      const entryNone = parser.get(999);
      expect(entryNone).toBeUndefined();
    });

    it('should get all entries', () => {
      const parser = new LazyTlvParser(buffer);

      const allEntries = parser.getAll();
      expect(allEntries).toHaveLength(3);
      expect(allEntries[0].type).toBe(1);
      expect(allEntries[1].type).toBe(2);
      expect(allEntries[2].type).toBe(100);
    });

    it('should get all types', () => {
      const parser = new LazyTlvParser(buffer);

      const types = parser.getTypes();
      expect(types).toEqual([1, 2, 100]);
    });

    it('should handle offset and maxBytes', () => {
      const paddedBuffer = new Uint8Array([
        0xff,
        0xff, // padding
        ...buffer,
      ]);

      const parser = new LazyTlvParser(paddedBuffer, 2, 14); // Skip padding, limit to first 2 entries

      const allEntries = parser.getAll();
      expect(allEntries).toHaveLength(2);
      expect(allEntries[0].type).toBe(1);
      expect(allEntries[1].type).toBe(2);
      expect(parser.has(100)).toBe(false); // Third entry should be beyond maxBytes
    });

    it('should handle empty buffer', () => {
      const parser = new LazyTlvParser(new Uint8Array(0));

      expect(parser.getAll()).toEqual([]);
      expect(parser.getTypes()).toEqual([]);
      expect(parser.has(1)).toBe(false);
      expect(parser.get(1)).toBeUndefined();
    });

    it('should cache parsed results', () => {
      const parser = new LazyTlvParser(buffer);

      // First call parses
      const entry1 = parser.get(1);
      // Second call should return cached result
      const entry1Again = parser.get(1);

      expect(entry1).toBe(entry1Again); // Same reference
    });
  });
});
