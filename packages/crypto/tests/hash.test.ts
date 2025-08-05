import { describe, it, expect } from 'vitest';
import { sha256, sha256Concat } from '../src/hash.js';

describe('SHA-256 Hashing', () => {
  describe('sha256', () => {
    it('should compute SHA-256 hash of empty data', async () => {
      const data = new Uint8Array(0);
      const hash = await sha256(data);

      // SHA-256 of empty string
      const expected = new Uint8Array([
        0xe3, 0xb0, 0xc4, 0x42, 0x98, 0xfc, 0x1c, 0x14, 0x9a, 0xfb, 0xf4, 0xc8, 0x99, 0x6f, 0xb9,
        0x24, 0x27, 0xae, 0x41, 0xe4, 0x64, 0x9b, 0x93, 0x4c, 0xa4, 0x95, 0x99, 0x1b, 0x78, 0x52,
        0xb8, 0x55,
      ]);

      expect(hash).toEqual(expected);
    });

    it('should compute SHA-256 hash of known data', async () => {
      const data = new TextEncoder().encode('hello world');
      const hash = await sha256(data);

      // SHA-256 of "hello world"
      const expected = new Uint8Array([
        0xb9, 0x4d, 0x27, 0xb9, 0x93, 0x4d, 0x3e, 0x08, 0xa5, 0x2e, 0x52, 0xd7, 0xda, 0x7d, 0xab,
        0xfa, 0xc4, 0x84, 0xef, 0xe3, 0x7a, 0x53, 0x80, 0xee, 0x90, 0x88, 0xf7, 0xac, 0xe2, 0xef,
        0xcd, 0xe9,
      ]);

      expect(hash).toEqual(expected);
    });

    it('should produce consistent hashes for the same input', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const hash1 = await sha256(data);
      const hash2 = await sha256(data);

      expect(hash1).toEqual(hash2);
    });

    it('should produce different hashes for different inputs', async () => {
      const data1 = new Uint8Array([1, 2, 3]);
      const data2 = new Uint8Array([1, 2, 4]);

      const hash1 = await sha256(data1);
      const hash2 = await sha256(data2);

      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('sha256Concat', () => {
    it('should hash concatenated segments correctly', async () => {
      const segment1 = new Uint8Array([1, 2, 3]);
      const segment2 = new Uint8Array([4, 5, 6]);

      const hashConcat = await sha256Concat(segment1, segment2);
      const hashDirect = await sha256(new Uint8Array([1, 2, 3, 4, 5, 6]));

      expect(hashConcat).toEqual(hashDirect);
    });

    it('should handle empty segments', async () => {
      const segment1 = new Uint8Array([1, 2, 3]);
      const emptySegment = new Uint8Array(0);
      const segment2 = new Uint8Array([4, 5, 6]);

      const hashWithEmpty = await sha256Concat(segment1, emptySegment, segment2);
      const hashDirect = await sha256(new Uint8Array([1, 2, 3, 4, 5, 6]));

      expect(hashWithEmpty).toEqual(hashDirect);
    });

    it('should handle single segment', async () => {
      const segment = new Uint8Array([1, 2, 3, 4, 5]);

      const hashConcat = await sha256Concat(segment);
      const hashDirect = await sha256(segment);

      expect(hashConcat).toEqual(hashDirect);
    });

    it('should handle no segments', async () => {
      const hash = await sha256Concat();
      const emptyHash = await sha256(new Uint8Array(0));

      expect(hash).toEqual(emptyHash);
    });

    it('should handle many segments', async () => {
      const segments = Array.from({ length: 10 }, (_, i) => new Uint8Array([i, i + 1, i + 2]));

      const hashConcat = await sha256Concat(...segments);

      // Create expected concatenated array
      const concatenated = new Uint8Array(30);
      for (let i = 0; i < 10; i++) {
        concatenated.set([i, i + 1, i + 2], i * 3);
      }
      const hashDirect = await sha256(concatenated);

      expect(hashConcat).toEqual(hashDirect);
    });
  });
});
