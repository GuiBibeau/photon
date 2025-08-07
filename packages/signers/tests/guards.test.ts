import { describe, it, expect } from 'vitest';
import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import type { Signer, SignerInfo, SigningResult } from '../src/interface.js';
import {
  isSigner,
  isSignerInfo,
  isSigningResult,
  isValidSignature,
  isValidAddress,
  assertSigner,
  assertSignerInfo,
  assertValidSignature,
  assertValidAddress,
  validateSignerCollection,
} from '../src/guards.js';

describe('Signer Guards', () => {
  describe('isSigner', () => {
    it('should return true for valid signer', () => {
      const signer: Signer = {
        publicKey: '11111111111111111111111111111111' as Address,
        sign: async () => new Uint8Array(64) as Signature,
      };

      expect(isSigner(signer)).toBe(true);
    });

    it('should return true for signer with metadata', () => {
      const signer: Signer = {
        publicKey: '11111111111111111111111111111111' as Address,
        sign: async () => new Uint8Array(64) as Signature,
        metadata: { type: 'test' },
      };

      expect(isSigner(signer)).toBe(true);
    });

    it('should return false for invalid signers', () => {
      expect(isSigner(null)).toBe(false);
      expect(isSigner(undefined)).toBe(false);
      expect(isSigner({})).toBe(false);
      expect(isSigner({ publicKey: '111' })).toBe(false);
      expect(isSigner({ sign: () => {} })).toBe(false);
      expect(isSigner({ publicKey: 123, sign: () => {} })).toBe(false);
      expect(isSigner({ publicKey: '111', sign: 'not a function' })).toBe(false);
    });
  });

  describe('isSignerInfo', () => {
    it('should return true for valid signer info', () => {
      const info: SignerInfo = {
        publicKey: '11111111111111111111111111111111' as Address,
        isFeePayer: true,
        isWritable: true,
      };

      expect(isSignerInfo(info)).toBe(true);
    });

    it('should return true for signer info with signature', () => {
      const info: SignerInfo = {
        publicKey: '11111111111111111111111111111111' as Address,
        signature: new Uint8Array(64) as Signature,
        isFeePayer: false,
        isWritable: false,
      };

      expect(isSignerInfo(info)).toBe(true);
    });

    it('should return false for invalid signer info', () => {
      expect(isSignerInfo(null)).toBe(false);
      expect(isSignerInfo(undefined)).toBe(false);
      expect(isSignerInfo({})).toBe(false);
      expect(isSignerInfo({ publicKey: '111' })).toBe(false);
      expect(isSignerInfo({ publicKey: '111', isFeePayer: true })).toBe(false);
      expect(isSignerInfo({ publicKey: '111', isWritable: true })).toBe(false);
      expect(isSignerInfo({ publicKey: 123, isFeePayer: true, isWritable: true })).toBe(false);
    });
  });

  describe('isSigningResult', () => {
    it('should return true for valid signing result', () => {
      const result: SigningResult = {
        publicKey: '11111111111111111111111111111111' as Address,
        signature: new Uint8Array(64) as Signature,
      };

      expect(isSigningResult(result)).toBe(true);
    });

    it('should return false for invalid signing result', () => {
      expect(isSigningResult(null)).toBe(false);
      expect(isSigningResult(undefined)).toBe(false);
      expect(isSigningResult({})).toBe(false);
      expect(isSigningResult({ publicKey: '111' })).toBe(false);
      expect(isSigningResult({ signature: new Uint8Array(64) })).toBe(false);
      expect(isSigningResult({ publicKey: '111', signature: 'not bytes' })).toBe(false);
    });
  });

  describe('isValidSignature', () => {
    it('should return true for valid 64-byte signature', () => {
      expect(isValidSignature(new Uint8Array(64))).toBe(true);
    });

    it('should return false for invalid signatures', () => {
      expect(isValidSignature(null)).toBe(false);
      expect(isValidSignature(undefined)).toBe(false);
      expect(isValidSignature('signature')).toBe(false);
      expect(isValidSignature(new Uint8Array(32))).toBe(false);
      expect(isValidSignature(new Uint8Array(128))).toBe(false);
      expect(isValidSignature([])).toBe(false);
    });
  });

  describe('isValidAddress', () => {
    it('should return true for valid base58 addresses', () => {
      expect(isValidAddress('11111111111111111111111111111111')).toBe(true);
    });

    it('should return false for invalid addresses', () => {
      expect(isValidAddress(null)).toBe(false);
      expect(isValidAddress(undefined)).toBe(false);
      expect(isValidAddress(123)).toBe(false);
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress('invalid!@#')).toBe(false);
      expect(isValidAddress('short')).toBe(false);
    });
  });

  describe('Assertions', () => {
    describe('assertSigner', () => {
      it('should not throw for valid signer', () => {
        const signer: Signer = {
          publicKey: '11111111111111111111111111111111' as Address,
          sign: async () => new Uint8Array(64) as Signature,
        };

        expect(() => assertSigner(signer)).not.toThrow();
      });

      it('should throw for invalid signer', () => {
        expect(() => assertSigner(null)).toThrow('Value is not a valid Signer');
        expect(() => assertSigner({})).toThrow('Value is not a valid Signer');
      });
    });

    describe('assertSignerInfo', () => {
      it('should not throw for valid signer info', () => {
        const info: SignerInfo = {
          publicKey: '11111111111111111111111111111111' as Address,
          isFeePayer: true,
          isWritable: true,
        };

        expect(() => assertSignerInfo(info)).not.toThrow();
      });

      it('should throw for invalid signer info', () => {
        expect(() => assertSignerInfo(null)).toThrow('Value is not a valid SignerInfo');
        expect(() => assertSignerInfo({})).toThrow('Value is not a valid SignerInfo');
      });
    });

    describe('assertValidSignature', () => {
      it('should not throw for valid signature', () => {
        expect(() => assertValidSignature(new Uint8Array(64))).not.toThrow();
      });

      it('should throw for invalid signature', () => {
        expect(() => assertValidSignature(null)).toThrow('Value is not a valid 64-byte signature');
        expect(() => assertValidSignature(new Uint8Array(32))).toThrow(
          'Value is not a valid 64-byte signature',
        );
      });
    });

    describe('assertValidAddress', () => {
      it('should not throw for valid address', () => {
        expect(() => assertValidAddress('11111111111111111111111111111111')).not.toThrow();
      });

      it('should throw for invalid address', () => {
        expect(() => assertValidAddress(null)).toThrow(
          'Value is not a valid base58-encoded address',
        );
        expect(() => assertValidAddress('invalid')).toThrow(
          'Value is not a valid base58-encoded address',
        );
      });
    });
  });

  describe('validateSignerCollection', () => {
    const createMockSigner = (publicKey: string): Signer => ({
      publicKey: publicKey as Address,
      sign: async () => new Uint8Array(64) as Signature,
    });

    it('should validate valid collection', () => {
      const signers = [
        createMockSigner('11111111111111111111111111111111'),
        createMockSigner('22222222222222222222222222222222'),
      ];

      const result = validateSignerCollection(
        signers,
        '11111111111111111111111111111111' as Address,
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect empty signers', () => {
      const result = validateSignerCollection([]);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No signers provided');
    });

    it('should detect duplicate signers', () => {
      const signers = [
        createMockSigner('11111111111111111111111111111111'),
        createMockSigner('11111111111111111111111111111111'),
      ];

      const result = validateSignerCollection(signers);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Duplicate signers found');
    });

    it('should detect invalid signer objects', () => {
      const signers = [
        createMockSigner('11111111111111111111111111111111'),
        { invalid: true } as any,
      ];

      const result = validateSignerCollection(signers);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid signer object');
    });

    it('should detect invalid public keys', () => {
      const signers = [{ publicKey: 'invalid!@#', sign: async () => new Uint8Array(64) } as any];

      const result = validateSignerCollection(signers);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid public key address');
    });

    it('should detect missing fee payer', () => {
      const signers = [createMockSigner('11111111111111111111111111111111')];

      const result = validateSignerCollection(
        signers,
        '22222222222222222222222222222222' as Address,
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Fee payer');
      expect(result.errors[0]).toContain('not found in signers collection');
    });

    it('should detect invalid fee payer address', () => {
      const signers = [createMockSigner('11111111111111111111111111111111')];

      const result = validateSignerCollection(signers, 'invalid' as Address);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid fee payer address');
    });
  });
});
