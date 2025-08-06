/**
 * Tests for RPC response parsers.
 */

import { describe, it, expect } from 'vitest';
import {
  parseBigInt,
  parseBigIntOrNull,
  parseBigIntWithDefault,
  needsBigInt,
  parseNumeric,
  bigIntToNumber,
  bigIntToNumberSafe,
  decodeBase64,
  encodeBase64,
  isBase64,
  base64ByteSize,
  parseAccountData,
  parseAddress,
  parseAddressOrNull,
  parseAddressArray,
  parseSignature,
  parseRpcResponse,
  parseAccountInfo,
  parseBlockhashInfo,
  parseSignatureStatus,
} from '../src/parsers/index.js';

describe('BigInt Parsers', () => {
  describe('parseBigInt', () => {
    it('should parse bigint from various types', () => {
      expect(parseBigInt(123n)).toBe(123n);
      expect(parseBigInt(456)).toBe(456n);
      expect(parseBigInt('789')).toBe(789n);
      expect(parseBigInt(' 1000 ')).toBe(1000n);
      expect(parseBigInt('-500')).toBe(-500n);
    });

    it('should handle large numbers', () => {
      const largeNum = '9007199254740992'; // Larger than MAX_SAFE_INTEGER
      expect(parseBigInt(largeNum)).toBe(BigInt(largeNum));
    });

    it('should throw on invalid input', () => {
      expect(() => parseBigInt('not a number')).toThrow();
      expect(() => parseBigInt(3.14)).toThrow();
      expect(() => parseBigInt({})).toThrow();
      expect(() => parseBigInt(null)).toThrow();
    });
  });

  describe('parseBigIntOrNull', () => {
    it('should handle null values', () => {
      expect(parseBigIntOrNull(null)).toBeNull();
      expect(parseBigIntOrNull(undefined)).toBeNull();
      expect(parseBigIntOrNull(123)).toBe(123n);
    });
  });

  describe('parseBigIntWithDefault', () => {
    it('should use default for invalid values', () => {
      expect(parseBigIntWithDefault(null, 100n)).toBe(100n);
      expect(parseBigIntWithDefault('invalid', 200n)).toBe(200n);
      expect(parseBigIntWithDefault(300, 100n)).toBe(300n);
    });
  });

  describe('needsBigInt', () => {
    it('should identify when BigInt is needed', () => {
      expect(needsBigInt(100)).toBe(false);
      expect(needsBigInt(Number.MAX_SAFE_INTEGER)).toBe(false);
      expect(needsBigInt(Number.MAX_SAFE_INTEGER + 1)).toBe(true);
      expect(needsBigInt('9007199254740992')).toBe(true);
      expect(needsBigInt('1000')).toBe(false);
    });
  });

  describe('parseNumeric', () => {
    it('should return appropriate type based on size', () => {
      const small = parseNumeric('1000');
      expect(typeof small).toBe('number');
      expect(small).toBe(1000);

      const large = parseNumeric('9007199254740992');
      expect(typeof large).toBe('bigint');
      expect(large).toBe(9007199254740992n);
    });
  });

  describe('bigIntToNumber', () => {
    it('should convert safe bigints to number', () => {
      expect(bigIntToNumber(123n)).toBe(123);
      expect(bigIntToNumber(-456n)).toBe(-456);
    });

    it('should throw for unsafe conversions', () => {
      expect(() => bigIntToNumber(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow();
    });
  });

  describe('bigIntToNumberSafe', () => {
    it('should return null for unsafe conversions', () => {
      expect(bigIntToNumberSafe(123n)).toBe(123);
      expect(bigIntToNumberSafe(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toBeNull();
    });
  });
});

describe('Base64 Parsers', () => {
  describe('decodeBase64', () => {
    it('should decode base64 strings', () => {
      const decoded = decodeBase64('SGVsbG8gV29ybGQ=');
      const text = new TextDecoder().decode(decoded);
      expect(text).toBe('Hello World');
    });

    it('should handle empty string', () => {
      const decoded = decodeBase64('');
      expect(decoded).toEqual(new Uint8Array(0));
    });

    it('should handle whitespace', () => {
      const decoded = decodeBase64('SGVs bG8g V29y bGQ=');
      const text = new TextDecoder().decode(decoded);
      expect(text).toBe('Hello World');
    });

    it('should throw on invalid base64', () => {
      expect(() => decodeBase64('Not!Base64')).toThrow();
    });
  });

  describe('encodeBase64', () => {
    it('should encode Uint8Array to base64', () => {
      const bytes = new TextEncoder().encode('Hello World');
      const encoded = encodeBase64(bytes);
      expect(encoded).toBe('SGVsbG8gV29ybGQ=');
    });

    it('should handle empty array', () => {
      const encoded = encodeBase64(new Uint8Array(0));
      expect(encoded).toBe('');
    });
  });

  describe('isBase64', () => {
    it('should validate base64 strings', () => {
      expect(isBase64('SGVsbG8gV29ybGQ=')).toBe(true);
      expect(isBase64('')).toBe(true);
      expect(isBase64('SGVs bG8=')).toBe(true); // With whitespace
      expect(isBase64('Not!Base64')).toBe(false);
      expect(isBase64('Hello@World')).toBe(false);
    });
  });

  describe('base64ByteSize', () => {
    it('should calculate byte size from base64', () => {
      expect(base64ByteSize('SGVsbG8gV29ybGQ=')).toBe(11); // "Hello World"
      expect(base64ByteSize('SGVsbG8=')).toBe(5); // "Hello"
      expect(base64ByteSize('')).toBe(0);
      expect(base64ByteSize('YWJj')).toBe(3); // "abc" no padding
    });
  });

  describe('parseAccountData', () => {
    it('should parse array format [data, encoding]', () => {
      const result = parseAccountData(['SGVsbG8=', 'base64']);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(result as Uint8Array)).toBe('Hello');
    });

    it('should parse string with encoding', () => {
      const result = parseAccountData('SGVsbG8=', 'base64');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(result as Uint8Array)).toBe('Hello');
    });

    it('should handle null data', () => {
      const result = parseAccountData(null);
      expect(result).toEqual(new Uint8Array(0));
    });

    it('should handle parsed JSON data', () => {
      const jsonData = { parsed: { type: 'token' } };
      const result = parseAccountData(jsonData);
      expect(result).toEqual(jsonData);
    });
  });
});

describe('Type Parsers', () => {
  describe('parseAddress', () => {
    it('should parse address string', () => {
      const addr = parseAddress('11111111111111111111111111111111');
      expect(addr).toBe('11111111111111111111111111111111');
    });

    it('should throw on non-string', () => {
      expect(() => parseAddress(123)).toThrow();
      expect(() => parseAddress(null)).toThrow();
    });
  });

  describe('parseAddressOrNull', () => {
    it('should handle null addresses', () => {
      expect(parseAddressOrNull(null)).toBeNull();
      expect(parseAddressOrNull(undefined)).toBeNull();
      expect(parseAddressOrNull('11111111111111111111111111111111')).toBe(
        '11111111111111111111111111111111',
      );
    });
  });

  describe('parseAddressArray', () => {
    it('should parse array of addresses', () => {
      const addresses = parseAddressArray([
        '11111111111111111111111111111111',
        '22222222222222222222222222222222',
      ]);
      expect(addresses).toEqual([
        '11111111111111111111111111111111',
        '22222222222222222222222222222222',
      ]);
    });

    it('should throw on non-array', () => {
      expect(() => parseAddressArray('not an array')).toThrow();
    });
  });

  describe('parseSignature', () => {
    it('should parse signature string', () => {
      const sig = parseSignature('signature123');
      expect(sig).toBe('signature123');
    });

    it('should throw on non-string', () => {
      expect(() => parseSignature(123)).toThrow();
    });
  });

  describe('parseRpcResponse', () => {
    it('should parse RPC response wrapper', () => {
      const response = {
        context: { slot: 123456 },
        value: 'test value',
      };

      const parsed = parseRpcResponse(response, (v) => v as string);

      expect(parsed).toEqual({
        context: { slot: 123456, apiVersion: undefined },
        value: 'test value',
      });
    });

    it('should handle API version', () => {
      const response = {
        context: { slot: 123456, apiVersion: '1.16.0' },
        value: 100,
      };

      const parsed = parseRpcResponse(response, (v) => v as number);

      expect(parsed.context.apiVersion).toBe('1.16.0');
    });
  });

  describe('parseAccountInfo', () => {
    it('should parse account info', () => {
      const info = {
        executable: false,
        owner: '11111111111111111111111111111111',
        lamports: '1000000000',
        data: ['', 'base64'],
        rentEpoch: '250',
      };

      const parsed = parseAccountInfo(info);

      expect(parsed).toEqual({
        executable: false,
        owner: '11111111111111111111111111111111',
        lamports: 1000000000n,
        data: expect.any(Uint8Array),
        rentEpoch: 250n,
      });
    });

    it('should handle null account', () => {
      expect(parseAccountInfo(null)).toBeNull();
      expect(parseAccountInfo(undefined)).toBeNull();
    });
  });

  describe('parseBlockhashInfo', () => {
    it('should parse blockhash info', () => {
      const info = {
        blockhash: 'hash123',
        lastValidBlockHeight: '1000000',
      };

      const parsed = parseBlockhashInfo(info);

      expect(parsed).toEqual({
        blockhash: 'hash123',
        lastValidBlockHeight: 1000000n,
      });
    });
  });

  describe('parseSignatureStatus', () => {
    it('should parse signature status', () => {
      const status = {
        slot: 123456,
        confirmations: 10,
        err: null,
        confirmationStatus: 'confirmed',
      };

      const parsed = parseSignatureStatus(status);

      expect(parsed).toEqual({
        slot: 123456,
        confirmations: 10,
        err: null,
        confirmationStatus: 'confirmed',
      });
    });

    it('should handle null confirmations', () => {
      const status = {
        slot: 123456,
        confirmations: null,
        err: { InstructionError: [0, 'Custom'] },
        confirmationStatus: 'processed',
      };

      const parsed = parseSignatureStatus(status);

      expect(parsed?.confirmations).toBeNull();
      expect(parsed?.err).toEqual({ InstructionError: [0, 'Custom'] });
    });

    it('should handle null status', () => {
      expect(parseSignatureStatus(null)).toBeNull();
      expect(parseSignatureStatus(undefined)).toBeNull();
    });
  });
});
