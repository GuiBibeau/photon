import { describe, it, expect } from 'vitest';
import {
  address,
  type Address,
  getAddressBytes,
  isAddress,
  assertAddress,
  addressesEqual,
  compareAddresses,
  addressFromBytes,
  ADDRESS_BYTE_LENGTH,
  SYSTEM_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
  NATIVE_MINT_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
} from '../src/index';

describe('Address type and validation', () => {
  // Valid test addresses (32 bytes when decoded)
  const VALID_ADDRESS_1 = '11111111111111111111111111111112'; // System program
  const VALID_ADDRESS_2 = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'; // Token program
  const VALID_ADDRESS_3 = 'So11111111111111111111111111111111111111112'; // Native mint

  // Invalid addresses for testing
  const INVALID_BASE58 = '11111111111111111111111111111110'; // Contains '0' which is not in base58 alphabet
  const EMPTY_STRING = '';

  describe('address() function', () => {
    it('should create Address type from valid base58 string', () => {
      const addr = address(VALID_ADDRESS_1);
      expect(addr).toBe(VALID_ADDRESS_1);
      // Type test - should be branded as Address
      expectTypeOf(addr).toEqualTypeOf<Address>();
    });

    it('should validate multiple valid addresses', () => {
      expect(() => address(VALID_ADDRESS_1)).not.toThrow();
      expect(() => address(VALID_ADDRESS_2)).not.toThrow();
      expect(() => address(VALID_ADDRESS_3)).not.toThrow();
    });

    it('should throw for non-string input', () => {
      expect(() => address(123 as any)).toThrow();
      expect(() => address(null as any)).toThrow();
      expect(() => address(undefined as any)).toThrow();
      expect(() => address({} as any)).toThrow();
    });

    it('should throw for invalid base58 characters', () => {
      expect(() => address(INVALID_BASE58)).toThrow();
      expect(() => address('invalid0chars')).toThrow();
      expect(() => address('OIl')).toThrow(); // Excluded chars
    });

    it('should throw for empty string', () => {
      expect(() => address(EMPTY_STRING)).toThrow();
    });

    it('should throw for wrong byte length', () => {
      // These are valid base58 but not 32 bytes
      expect(() => address('1')).toThrow(); // Too short
      expect(() => address('111')).toThrow(); // Still too short
    });

    it('should validate exact 32-byte requirement', () => {
      // Create a valid 32-byte address
      const thirtyTwoBytes = new Uint8Array(32);
      thirtyTwoBytes.fill(1); // Fill with non-zero to avoid leading zeros issue

      // This should work
      const validAddr = addressFromBytes(thirtyTwoBytes);
      expect(() => address(validAddr)).not.toThrow();
    });
  });

  describe('getAddressBytes() function', () => {
    it('should return 32-byte Uint8Array for valid address', () => {
      const addr = address(VALID_ADDRESS_1);
      const bytes = getAddressBytes(addr);

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(ADDRESS_BYTE_LENGTH);
    });

    it('should return consistent bytes for same address', () => {
      const addr = address(VALID_ADDRESS_2);
      const bytes1 = getAddressBytes(addr);
      const bytes2 = getAddressBytes(addr);

      expect(bytes1).toEqual(bytes2);
    });

    it('should return different bytes for different addresses', () => {
      const addr1 = address(VALID_ADDRESS_1);
      const addr2 = address(VALID_ADDRESS_2);

      const bytes1 = getAddressBytes(addr1);
      const bytes2 = getAddressBytes(addr2);

      expect(bytes1).not.toEqual(bytes2);
    });
  });

  describe('isAddress() type guard', () => {
    it('should return true for valid addresses', () => {
      expect(isAddress(VALID_ADDRESS_1)).toBe(true);
      expect(isAddress(VALID_ADDRESS_2)).toBe(true);
      expect(isAddress(VALID_ADDRESS_3)).toBe(true);
    });

    it('should return false for invalid inputs', () => {
      expect(isAddress(123)).toBe(false);
      expect(isAddress(null)).toBe(false);
      expect(isAddress(undefined)).toBe(false);
      expect(isAddress({})).toBe(false);
      expect(isAddress([])).toBe(false);
    });

    it('should return false for invalid base58', () => {
      expect(isAddress(INVALID_BASE58)).toBe(false);
      expect(isAddress('invalid0')).toBe(false);
    });

    it('should return false for wrong length', () => {
      expect(isAddress('1')).toBe(false);
      expect(isAddress('111')).toBe(false);
      expect(isAddress('')).toBe(false);
    });

    it('should handle edge cases gracefully', () => {
      expect(isAddress('')).toBe(false);
      expect(isAddress('   ')).toBe(false);
    });
  });

  describe('assertAddress() function', () => {
    it('should not throw for valid addresses', () => {
      expect(() => assertAddress(VALID_ADDRESS_1)).not.toThrow();
      expect(() => assertAddress(VALID_ADDRESS_2)).not.toThrow();
    });

    it('should throw for invalid addresses', () => {
      expect(() => assertAddress('invalid')).toThrow();
      expect(() => assertAddress(123)).toThrow();
      expect(() => assertAddress(null)).toThrow();
    });

    it('should accept custom error message parameter', () => {
      const customMessage = 'This is a custom error message';

      // Test that the function throws when provided with custom message
      expect(() => assertAddress('invalid', customMessage)).toThrow();
      expect(() => assertAddress(null, customMessage)).toThrow();

      // Test that it still throws with default message when not provided
      expect(() => assertAddress('invalid')).toThrow();
    });

    it('should provide type narrowing', () => {
      const value: unknown = VALID_ADDRESS_1;
      assertAddress(value);
      // After assertion, TypeScript should know this is an Address
      expectTypeOf(value).toEqualTypeOf<Address>();
    });
  });

  describe('Address comparison functions', () => {
    describe('addressesEqual()', () => {
      it('should return true for identical addresses', () => {
        const addr1 = address(VALID_ADDRESS_1);
        const addr2 = address(VALID_ADDRESS_1);

        expect(addressesEqual(addr1, addr2)).toBe(true);
      });

      it('should return false for different addresses', () => {
        const addr1 = address(VALID_ADDRESS_1);
        const addr2 = address(VALID_ADDRESS_2);

        expect(addressesEqual(addr1, addr2)).toBe(false);
      });
    });

    describe('compareAddresses()', () => {
      it('should return 0 for equal addresses', () => {
        const addr1 = address(VALID_ADDRESS_1);
        const addr2 = address(VALID_ADDRESS_1);

        expect(compareAddresses(addr1, addr2)).toBe(0);
      });

      it('should return consistent ordering', () => {
        const addr1 = address(VALID_ADDRESS_1);
        const addr2 = address(VALID_ADDRESS_2);

        const result = compareAddresses(addr1, addr2);
        const reverseResult = compareAddresses(addr2, addr1);

        expect(result).toBeOneOf([-1, 1]);
        expect(reverseResult).toBe(-result as -1 | 1);
      });

      it('should enable sorting', () => {
        const addresses = [
          address(VALID_ADDRESS_2),
          address(VALID_ADDRESS_1),
          address(VALID_ADDRESS_3),
        ];

        const sorted = [...addresses].sort(compareAddresses);
        const manualSort = [...addresses].sort((a, b) => a.localeCompare(b));

        expect(sorted.map(String)).toEqual(manualSort.map(String));
      });
    });
  });

  describe('addressFromBytes() function', () => {
    it('should create address from 32-byte array', () => {
      const bytes = new Uint8Array(32);
      bytes.fill(1);

      const addr = addressFromBytes(bytes);
      expect(addr).toBeDefined();
      expect(typeof addr).toBe('string');

      // Round trip test
      const roundTripBytes = getAddressBytes(addr);
      expect(roundTripBytes).toEqual(bytes);
    });

    it('should throw for wrong byte length', () => {
      expect(() => addressFromBytes(new Uint8Array(31))).toThrow();
      expect(() => addressFromBytes(new Uint8Array(33))).toThrow();
      expect(() => addressFromBytes(new Uint8Array(0))).toThrow();
    });

    it('should handle all-zero bytes', () => {
      const zeroBytes = new Uint8Array(32);
      const addr = addressFromBytes(zeroBytes);

      expect(addr).toBeDefined();
      expect(getAddressBytes(addr)).toEqual(zeroBytes);
    });

    it('should handle all-max bytes', () => {
      const maxBytes = new Uint8Array(32);
      maxBytes.fill(255);

      const addr = addressFromBytes(maxBytes);
      expect(addr).toBeDefined();
      expect(getAddressBytes(addr)).toEqual(maxBytes);
    });
  });

  describe('Well-known addresses', () => {
    const wellKnownAddresses = [
      { name: 'SYSTEM_PROGRAM_ADDRESS', address: SYSTEM_PROGRAM_ADDRESS },
      { name: 'TOKEN_PROGRAM_ADDRESS', address: TOKEN_PROGRAM_ADDRESS },
      { name: 'TOKEN_2022_PROGRAM_ADDRESS', address: TOKEN_2022_PROGRAM_ADDRESS },
      { name: 'NATIVE_MINT_ADDRESS', address: NATIVE_MINT_ADDRESS },
      { name: 'ASSOCIATED_TOKEN_PROGRAM_ADDRESS', address: ASSOCIATED_TOKEN_PROGRAM_ADDRESS },
    ];

    it.each(wellKnownAddresses)('$name should be a valid address', ({ address: addr }) => {
      expect(isAddress(addr)).toBe(true);
      expect(() => assertAddress(addr)).not.toThrow();

      const bytes = getAddressBytes(addr);
      expect(bytes.length).toBe(ADDRESS_BYTE_LENGTH);
    });

    it('should have correct system program address', () => {
      expect(SYSTEM_PROGRAM_ADDRESS).toBe('11111111111111111111111111111112');
    });

    it('should have correct token program address', () => {
      expect(TOKEN_PROGRAM_ADDRESS).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    });

    it('should have correct native mint address', () => {
      expect(NATIVE_MINT_ADDRESS).toBe('So11111111111111111111111111111111111111112');
    });

    it('should have unique addresses', () => {
      const addresses = wellKnownAddresses.map(({ address }) => address);
      const uniqueAddresses = new Set(addresses);

      expect(uniqueAddresses.size).toBe(addresses.length);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very long strings gracefully', () => {
      const veryLongString = 'a'.repeat(1000);
      expect(() => address(veryLongString)).toThrow();
    });

    it('should preserve original address string in round-trip', () => {
      const originalAddress = VALID_ADDRESS_2;
      const addr = address(originalAddress);

      expect(String(addr)).toBe(originalAddress);
    });

    it('should handle addresses with leading ones correctly', () => {
      // The system program address starts with many 1s
      const addr = address(VALID_ADDRESS_1);
      const bytes = getAddressBytes(addr);
      const backToAddress = addressFromBytes(bytes);

      expect(backToAddress).toBe(addr);
    });
  });

  describe('Type safety', () => {
    it('should maintain type brand across operations', () => {
      const addr = address(VALID_ADDRESS_1);

      // These should all maintain the Address type
      expectTypeOf(addr).toEqualTypeOf<Address>();
      expectTypeOf(addressFromBytes(getAddressBytes(addr))).toEqualTypeOf<Address>();
    });

    it('should not allow string assignment to Address', () => {
      // This should fail TypeScript compilation
      // @ts-expect-error - Testing that raw strings can't be assigned to Address
      const _addr: Address = 'some string';
    });
  });

  describe('Performance considerations', () => {
    it('should handle repeated operations efficiently', () => {
      const addr = address(VALID_ADDRESS_1);

      // These operations should be fast enough to run many times
      for (let i = 0; i < 1000; i++) {
        getAddressBytes(addr);
        isAddress(addr);
        addressesEqual(addr, addr);
      }
    });
  });
});
