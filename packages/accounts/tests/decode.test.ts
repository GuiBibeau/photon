/**
 * Tests for account data decoding functionality.
 */

import { describe, it, expect } from 'vitest';
import { u8, u32, struct } from '@photon/codecs';
import type { Codec } from '@photon/codecs';
import {
  decodeAccountData,
  tryDecodeAccountData,
  partialDecodeAccountData,
  transformAccountInfo,
  validateAccountDataSize,
  validateMinAccountDataSize,
  type LazyDecodedAccount,
} from '../src/decode.js';
import type { AccountInfo } from '../src/types.js';

describe('decodeAccountData', () => {
  const testCodec: Codec<{ value: number; flag: boolean }> = struct({
    value: u32,
    flag: u8 as Codec<boolean>,
  });

  const testData = new Uint8Array([42, 0, 0, 0, 1]); // value: 42, flag: true

  describe('codec strategy', () => {
    it('should decode data using provided codec', () => {
      const result = decodeAccountData(testData, {
        strategy: { type: 'codec', codec: testCodec },
      });

      expect(result).toEqual({ value: 42, flag: 1 });
    });

    it('should throw on invalid data', () => {
      const invalidData = new Uint8Array([1, 2]); // Too short

      expect(() =>
        decodeAccountData(invalidData, {
          strategy: { type: 'codec', codec: testCodec },
        }),
      ).toThrow();
    });
  });

  describe('raw strategy', () => {
    it('should return raw bytes', () => {
      const result = decodeAccountData(testData, {
        strategy: { type: 'raw' },
      });

      expect(result).toEqual(testData);
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe('lazy strategy', () => {
    it('should create lazy decoder with caching', () => {
      const result = decodeAccountData(testData, {
        strategy: { type: 'lazy', codec: testCodec },
        cache: true,
      }) as LazyDecodedAccount<{ value: number; flag: boolean }>;

      // Should have raw data
      expect(result.raw).toEqual(testData);

      // First access should decode
      const decoded1 = result.get();
      expect(decoded1).toEqual({ value: 42, flag: 1 });

      // Second access should return cached value
      const decoded2 = result.get();
      expect(decoded2).toBe(decoded1); // Same reference
    });

    it('should create lazy decoder without caching', () => {
      const result = decodeAccountData(testData, {
        strategy: { type: 'lazy', codec: testCodec },
        cache: false,
      }) as LazyDecodedAccount<{ value: number; flag: boolean }>;

      const decoded1 = result.get();
      const decoded2 = result.get();

      expect(decoded1).toEqual({ value: 42, flag: 1 });
      expect(decoded2).toEqual({ value: 42, flag: 1 });
      expect(decoded1).not.toBe(decoded2); // Different references
    });

    it('should refresh cached data', () => {
      const result = decodeAccountData(testData, {
        strategy: { type: 'lazy', codec: testCodec },
        cache: true,
      }) as LazyDecodedAccount<{ value: number; flag: boolean }>;

      const decoded1 = result.get();
      const refreshed = result.refresh();
      const decoded2 = result.get();

      expect(refreshed).toEqual({ value: 42, flag: 1 });
      expect(decoded2).toBe(refreshed); // Should be newly cached value
      expect(decoded1).not.toBe(refreshed); // Different from original
    });
  });

  describe('json-parsed strategy', () => {
    it('should throw error for json-parsed strategy', () => {
      expect(() =>
        decodeAccountData(testData, {
          strategy: { type: 'json-parsed' },
        }),
      ).toThrow('JSON parsed decoding requires RPC jsonParsed encoding');
    });
  });
});

describe('tryDecodeAccountData', () => {
  const testCodec: Codec<{ value: number }> = struct({ value: u32 });

  it('should return success with decoded data', () => {
    const data = new Uint8Array([10, 0, 0, 0]);
    const result = tryDecodeAccountData(data, testCodec);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ value: 10 });
    }
  });

  it('should return error on decode failure', () => {
    const invalidData = new Uint8Array([1]); // Too short
    const result = tryDecodeAccountData(invalidData, testCodec);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Error);
    }
  });
});

describe('partialDecodeAccountData', () => {
  const testCodec: Codec<{ value: number }> = struct({ value: u32 });

  it('should decode from offset', () => {
    const data = new Uint8Array([0, 0, 5, 0, 0, 0, 99]); // Padding, then value: 5
    const [decoded, bytesConsumed] = partialDecodeAccountData(data, testCodec, 2);

    expect(decoded).toEqual({ value: 5 });
    expect(bytesConsumed).toBe(4); // Consumed 4 bytes for u32
  });

  it('should decode from beginning by default', () => {
    const data = new Uint8Array([20, 0, 0, 0]);
    const [decoded, bytesConsumed] = partialDecodeAccountData(data, testCodec);

    expect(decoded).toEqual({ value: 20 });
    expect(bytesConsumed).toBe(4);
  });
});

describe('transformAccountInfo', () => {
  it('should transform account data', () => {
    const accountInfo: AccountInfo<Uint8Array> = {
      owner: '11111111111111111111111111111111' as any,
      lamports: 1000n,
      data: new Uint8Array([1, 2, 3, 4]),
      executable: false,
      rentEpoch: 100n,
      size: 4,
    };

    const transformed = transformAccountInfo(accountInfo, (data) => {
      // Convert bytes to hex string
      return Array.from(data)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    });

    expect(transformed.data).toBe('01020304');
    expect(transformed.owner).toBe(accountInfo.owner);
    expect(transformed.lamports).toBe(accountInfo.lamports);
  });
});

describe('validateAccountDataSize', () => {
  it('should return true for matching size', () => {
    const data = new Uint8Array(165); // Token account size
    expect(validateAccountDataSize(data, 165)).toBe(true);
  });

  it('should return false for non-matching size', () => {
    const data = new Uint8Array(100);
    expect(validateAccountDataSize(data, 165)).toBe(false);
  });
});

describe('validateMinAccountDataSize', () => {
  it('should return true for data at least minimum size', () => {
    const data = new Uint8Array(200);
    expect(validateMinAccountDataSize(data, 165)).toBe(true);
    expect(validateMinAccountDataSize(data, 200)).toBe(true);
  });

  it('should return false for data below minimum size', () => {
    const data = new Uint8Array(100);
    expect(validateMinAccountDataSize(data, 165)).toBe(false);
  });
});
