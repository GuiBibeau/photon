import { describe, it, expect } from 'vitest';
import { u16, u32, u64, i16, i32, i64 } from '../src/index.js';

describe('Endianness Verification Tests', () => {
  describe('Little-Endian Encoding Verification', () => {
    describe('u16 (16-bit unsigned)', () => {
      it('should encode in little-endian byte order', () => {
        // 0x1234 should be encoded as [0x34, 0x12]
        expect(u16.encode(0x1234)).toEqual(new Uint8Array([0x34, 0x12]));

        // 0xABCD should be encoded as [0xCD, 0xAB]
        expect(u16.encode(0xabcd)).toEqual(new Uint8Array([0xcd, 0xab]));

        // Maximum value 0xFFFF
        expect(u16.encode(0xffff)).toEqual(new Uint8Array([0xff, 0xff]));

        // Minimum value 0x0000
        expect(u16.encode(0x0000)).toEqual(new Uint8Array([0x00, 0x00]));
      });

      it('should decode from little-endian byte order', () => {
        // [0x34, 0x12] should decode to 0x1234
        expect(u16.decode(new Uint8Array([0x34, 0x12]))[0]).toBe(0x1234);

        // [0xCD, 0xAB] should decode to 0xABCD
        expect(u16.decode(new Uint8Array([0xcd, 0xab]))[0]).toBe(0xabcd);

        // Maximum value
        expect(u16.decode(new Uint8Array([0xff, 0xff]))[0]).toBe(0xffff);

        // Minimum value
        expect(u16.decode(new Uint8Array([0x00, 0x00]))[0]).toBe(0x0000);
      });

      it('should handle boundary values correctly', () => {
        // Test powers of 2
        expect(u16.encode(256)).toEqual(new Uint8Array([0x00, 0x01])); // 0x0100
        expect(u16.encode(512)).toEqual(new Uint8Array([0x00, 0x02])); // 0x0200
        expect(u16.encode(1024)).toEqual(new Uint8Array([0x00, 0x04])); // 0x0400

        // Verify round-trip
        expect(u16.decode(new Uint8Array([0x00, 0x01]))[0]).toBe(256);
        expect(u16.decode(new Uint8Array([0x00, 0x02]))[0]).toBe(512);
        expect(u16.decode(new Uint8Array([0x00, 0x04]))[0]).toBe(1024);
      });
    });

    describe('u32 (32-bit unsigned)', () => {
      it('should encode in little-endian byte order', () => {
        // 0x12345678 should be encoded as [0x78, 0x56, 0x34, 0x12]
        expect(u32.encode(0x12345678)).toEqual(new Uint8Array([0x78, 0x56, 0x34, 0x12]));

        // 0xDEADBEEF should be encoded as [0xEF, 0xBE, 0xAD, 0xDE]
        expect(u32.encode(0xdeadbeef)).toEqual(new Uint8Array([0xef, 0xbe, 0xad, 0xde]));

        // Maximum value
        expect(u32.encode(0xffffffff)).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0xff]));

        // Minimum value
        expect(u32.encode(0x00000000)).toEqual(new Uint8Array([0x00, 0x00, 0x00, 0x00]));
      });

      it('should decode from little-endian byte order', () => {
        // [0x78, 0x56, 0x34, 0x12] should decode to 0x12345678
        expect(u32.decode(new Uint8Array([0x78, 0x56, 0x34, 0x12]))[0]).toBe(0x12345678);

        // [0xEF, 0xBE, 0xAD, 0xDE] should decode to 0xDEADBEEF
        expect(u32.decode(new Uint8Array([0xef, 0xbe, 0xad, 0xde]))[0]).toBe(0xdeadbeef);

        // Maximum value
        expect(u32.decode(new Uint8Array([0xff, 0xff, 0xff, 0xff]))[0]).toBe(0xffffffff);

        // Minimum value
        expect(u32.decode(new Uint8Array([0x00, 0x00, 0x00, 0x00]))[0]).toBe(0x00000000);
      });

      it('should handle mixed byte patterns', () => {
        // Test alternating byte patterns
        expect(u32.encode(0xaa55aa55)).toEqual(new Uint8Array([0x55, 0xaa, 0x55, 0xaa]));
        expect(u32.encode(0x55aa55aa)).toEqual(new Uint8Array([0xaa, 0x55, 0xaa, 0x55]));

        // Verify round-trip
        expect(u32.decode(new Uint8Array([0x55, 0xaa, 0x55, 0xaa]))[0]).toBe(0xaa55aa55);
        expect(u32.decode(new Uint8Array([0xaa, 0x55, 0xaa, 0x55]))[0]).toBe(0x55aa55aa);
      });
    });

    describe('u64 (64-bit unsigned)', () => {
      it('should encode in little-endian byte order', () => {
        // 0x123456789ABCDEF0 should be encoded with least significant byte first
        expect(u64.encode(0x123456789abcdef0n)).toEqual(
          new Uint8Array([0xf0, 0xde, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12]),
        );

        // 0xDEADBEEFCAFEBABE should be encoded with LSB first
        expect(u64.encode(0xdeadbeefcafebaben)).toEqual(
          new Uint8Array([0xbe, 0xba, 0xfe, 0xca, 0xef, 0xbe, 0xad, 0xde]),
        );

        // Maximum value
        expect(u64.encode(0xffffffffffffffffn)).toEqual(
          new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
        );

        // Minimum value
        expect(u64.encode(0x0000000000000000n)).toEqual(
          new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
        );
      });

      it('should decode from little-endian byte order', () => {
        // Little-endian bytes should decode to correct bigint
        expect(
          u64.decode(new Uint8Array([0xf0, 0xde, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12]))[0],
        ).toBe(0x123456789abcdef0n);

        expect(
          u64.decode(new Uint8Array([0xbe, 0xba, 0xfe, 0xca, 0xef, 0xbe, 0xad, 0xde]))[0],
        ).toBe(0xdeadbeefcafebaben);

        // Maximum value
        expect(
          u64.decode(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]))[0],
        ).toBe(0xffffffffffffffffn);

        // Minimum value
        expect(
          u64.decode(new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))[0],
        ).toBe(0x0000000000000000n);
      });

      it('should handle large values beyond JavaScript safe integers', () => {
        // Values larger than Number.MAX_SAFE_INTEGER
        const largeValue = BigInt(Number.MAX_SAFE_INTEGER) + 1000n;
        const encoded = u64.encode(largeValue);
        const [decoded] = u64.decode(encoded);
        expect(decoded).toBe(largeValue);

        // Test specific large value with known byte pattern
        const knownLarge = 0x8000000000000000n; // 2^63
        expect(u64.encode(knownLarge)).toEqual(
          new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80]),
        );
      });
    });
  });

  describe('Signed Integer Endianness', () => {
    describe('i16 (16-bit signed)', () => {
      it("should encode negative values in little-endian two's complement", () => {
        // -1 should be 0xFFFF in two's complement
        expect(i16.encode(-1)).toEqual(new Uint8Array([0xff, 0xff]));

        // -32768 (minimum value) should be 0x8000
        expect(i16.encode(-32768)).toEqual(new Uint8Array([0x00, 0x80]));

        // -256 should be 0xFF00
        expect(i16.encode(-256)).toEqual(new Uint8Array([0x00, 0xff]));
      });

      it("should decode negative values from little-endian two's complement", () => {
        expect(i16.decode(new Uint8Array([0xff, 0xff]))[0]).toBe(-1);
        expect(i16.decode(new Uint8Array([0x00, 0x80]))[0]).toBe(-32768);
        expect(i16.decode(new Uint8Array([0x00, 0xff]))[0]).toBe(-256);
      });

      it('should handle positive values correctly', () => {
        // Positive values should work the same as unsigned for same bit pattern
        expect(i16.encode(32767)).toEqual(new Uint8Array([0xff, 0x7f])); // 0x7FFF
        expect(i16.decode(new Uint8Array([0xff, 0x7f]))[0]).toBe(32767);
      });
    });

    describe('i32 (32-bit signed)', () => {
      it("should encode negative values in little-endian two's complement", () => {
        // -1 should be 0xFFFFFFFF
        expect(i32.encode(-1)).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0xff]));

        // Minimum value -2147483648 should be 0x80000000
        expect(i32.encode(-2147483648)).toEqual(new Uint8Array([0x00, 0x00, 0x00, 0x80]));

        // -65536 should be 0xFFFF0000
        expect(i32.encode(-65536)).toEqual(new Uint8Array([0x00, 0x00, 0xff, 0xff]));
      });

      it("should decode negative values from little-endian two's complement", () => {
        expect(i32.decode(new Uint8Array([0xff, 0xff, 0xff, 0xff]))[0]).toBe(-1);
        expect(i32.decode(new Uint8Array([0x00, 0x00, 0x00, 0x80]))[0]).toBe(-2147483648);
        expect(i32.decode(new Uint8Array([0x00, 0x00, 0xff, 0xff]))[0]).toBe(-65536);
      });

      it('should handle positive values correctly', () => {
        // Maximum positive value 2147483647 should be 0x7FFFFFFF
        expect(i32.encode(2147483647)).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0x7f]));
        expect(i32.decode(new Uint8Array([0xff, 0xff, 0xff, 0x7f]))[0]).toBe(2147483647);
      });
    });

    describe('i64 (64-bit signed)', () => {
      it("should encode negative values in little-endian two's complement", () => {
        // -1 should be all 0xFF bytes
        expect(i64.encode(-1n)).toEqual(
          new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
        );

        // Minimum value -(2^63) should be 0x8000000000000000
        expect(i64.encode(-(2n ** 63n))).toEqual(
          new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80]),
        );

        // -256 should have specific pattern
        expect(i64.encode(-256n)).toEqual(
          new Uint8Array([0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
        );
      });

      it("should decode negative values from little-endian two's complement", () => {
        expect(
          i64.decode(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]))[0],
        ).toBe(-1n);
        expect(
          i64.decode(new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80]))[0],
        ).toBe(-(2n ** 63n));
        expect(
          i64.decode(new Uint8Array([0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]))[0],
        ).toBe(-256n);
      });

      it('should handle positive values correctly', () => {
        // Maximum positive value (2^63 - 1) should be 0x7FFFFFFFFFFFFFFF
        expect(i64.encode(2n ** 63n - 1n)).toEqual(
          new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f]),
        );

        expect(
          i64.decode(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f]))[0],
        ).toBe(2n ** 63n - 1n);
      });
    });
  });

  describe('Cross-Platform Endianness Consistency', () => {
    it('should produce identical results regardless of host endianness', () => {
      // These tests ensure our codecs always use little-endian regardless of the host system

      // Create test vectors with known byte patterns
      const testVectors = [
        { value: 0x1234, expected: [0x34, 0x12] },
        { value: 0x5678, expected: [0x78, 0x56] },
        { value: 0xabcd, expected: [0xcd, 0xab] },
        { value: 0xef01, expected: [0x01, 0xef] },
      ];

      for (const { value, expected } of testVectors) {
        const encoded = u16.encode(value);
        expect(Array.from(encoded)).toEqual(expected);

        const [decoded] = u16.decode(new Uint8Array(expected));
        expect(decoded).toBe(value);
      }
    });

    it('should handle endianness consistently for 32-bit values', () => {
      const testVectors = [
        { value: 0x12345678, expected: [0x78, 0x56, 0x34, 0x12] },
        { value: 0x9abcdef0, expected: [0xf0, 0xde, 0xbc, 0x9a] },
        { value: 0xfedcba98, expected: [0x98, 0xba, 0xdc, 0xfe] },
      ];

      for (const { value, expected } of testVectors) {
        const encoded = u32.encode(value);
        expect(Array.from(encoded)).toEqual(expected);

        const [decoded] = u32.decode(new Uint8Array(expected));
        expect(decoded).toBe(value);
      }
    });

    it('should handle endianness consistently for 64-bit values', () => {
      const testVectors = [
        {
          value: 0x123456789abcdef0n,
          expected: [0xf0, 0xde, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12],
        },
        {
          value: 0xfedcba9876543210n,
          expected: [0x10, 0x32, 0x54, 0x76, 0x98, 0xba, 0xdc, 0xfe],
        },
      ];

      for (const { value, expected } of testVectors) {
        const encoded = u64.encode(value);
        expect(Array.from(encoded)).toEqual(expected);

        const [decoded] = u64.decode(new Uint8Array(expected));
        expect(decoded).toBe(value);
      }
    });
  });

  describe('Interoperability with DataView', () => {
    it('should match DataView little-endian results for u16', () => {
      const buffer = new ArrayBuffer(2);
      const view = new DataView(buffer);
      const bytes = new Uint8Array(buffer);

      const testValues = [0x1234, 0x5678, 0xabcd, 0xffff, 0x0001];

      for (const value of testValues) {
        // Set using DataView in little-endian mode
        view.setUint16(0, value, true);
        const dataViewBytes = Array.from(bytes);

        // Compare with our codec
        const codecBytes = Array.from(u16.encode(value));
        expect(codecBytes).toEqual(dataViewBytes);

        // Verify decode matches
        expect(u16.decode(new Uint8Array(dataViewBytes))[0]).toBe(value);
      }
    });

    it('should match DataView little-endian results for u32', () => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      const bytes = new Uint8Array(buffer);

      const testValues = [0x12345678, 0x9abcdef0, 0xffffffff, 0x00000001];

      for (const value of testValues) {
        view.setUint32(0, value, true);
        const dataViewBytes = Array.from(bytes);

        const codecBytes = Array.from(u32.encode(value));
        expect(codecBytes).toEqual(dataViewBytes);

        expect(u32.decode(new Uint8Array(dataViewBytes))[0]).toBe(value);
      }
    });

    it('should match DataView little-endian results for i16', () => {
      const buffer = new ArrayBuffer(2);
      const view = new DataView(buffer);
      const bytes = new Uint8Array(buffer);

      const testValues = [-1, -32768, 32767, -256, 255];

      for (const value of testValues) {
        view.setInt16(0, value, true);
        const dataViewBytes = Array.from(bytes);

        const codecBytes = Array.from(i16.encode(value));
        expect(codecBytes).toEqual(dataViewBytes);

        expect(i16.decode(new Uint8Array(dataViewBytes))[0]).toBe(value);
      }
    });

    it('should match DataView little-endian results for i32', () => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      const bytes = new Uint8Array(buffer);

      const testValues = [-1, -2147483648, 2147483647, -65536, 65535];

      for (const value of testValues) {
        view.setInt32(0, value, true);
        const dataViewBytes = Array.from(bytes);

        const codecBytes = Array.from(i32.encode(value));
        expect(codecBytes).toEqual(dataViewBytes);

        expect(i32.decode(new Uint8Array(dataViewBytes))[0]).toBe(value);
      }
    });
  });

  describe('Byte Order Mark Detection', () => {
    it('should detect incorrect big-endian encoding', () => {
      // These tests help verify we're definitely using little-endian

      // If we accidentally used big-endian, 0x1234 would be [0x12, 0x34]
      const value = 0x1234;
      const encoded = u16.encode(value);

      // Should NOT be big-endian
      expect(encoded).not.toEqual(new Uint8Array([0x12, 0x34]));

      // Should be little-endian
      expect(encoded).toEqual(new Uint8Array([0x34, 0x12]));
    });

    it('should detect mixed endianness issues', () => {
      // Test with asymmetric values that would be obvious if endianness was wrong
      const asymmetricValues = [
        { value: 0x0100, littleEndian: [0x00, 0x01], bigEndian: [0x01, 0x00] },
        { value: 0xff00, littleEndian: [0x00, 0xff], bigEndian: [0xff, 0x00] },
        { value: 0x1200, littleEndian: [0x00, 0x12], bigEndian: [0x12, 0x00] },
      ];

      for (const { value, littleEndian, bigEndian } of asymmetricValues) {
        const encoded = u16.encode(value);

        expect(Array.from(encoded)).toEqual(littleEndian);
        expect(Array.from(encoded)).not.toEqual(bigEndian);
      }
    });
  });

  describe('Real-world Solana Compatibility', () => {
    it('should match expected Solana account data encoding', () => {
      // Solana uses little-endian encoding throughout
      // Test with values typical in Solana applications

      // Token amounts (u64)
      const lamports = 1000000000n; // 1 SOL in lamports
      const encoded = u64.encode(lamports);

      // Should be little-endian
      expect(encoded).toEqual(new Uint8Array([0x00, 0xca, 0x9a, 0x3b, 0x00, 0x00, 0x00, 0x00]));

      // Verify round-trip
      expect(u64.decode(encoded)[0]).toBe(lamports);
    });

    it('should handle Solana instruction discriminators correctly', () => {
      // Instruction discriminators are often u32 values
      const discriminator = 0xdeadbeef;
      const encoded = u32.encode(discriminator);

      // Should be little-endian bytes
      expect(encoded).toEqual(new Uint8Array([0xef, 0xbe, 0xad, 0xde]));

      // This is critical for Solana program instruction parsing
      expect(u32.decode(encoded)[0]).toBe(discriminator);
    });

    it('should handle Solana block heights and slot numbers', () => {
      // Block heights and slots are u64 values that can be very large
      const blockHeight = 123456789n;
      const encoded = u64.encode(blockHeight);

      // Verify correct little-endian encoding
      const [decoded] = u64.decode(encoded);
      expect(decoded).toBe(blockHeight);

      // Test with a larger slot number
      const slotNumber = 999999999999n;
      const slotEncoded = u64.encode(slotNumber);
      const [slotDecoded] = u64.decode(slotEncoded);
      expect(slotDecoded).toBe(slotNumber);
    });
  });
});
