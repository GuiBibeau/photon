import { describe, it, expect, vi } from 'vitest';
import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import type { Signer } from '../src/interface.js';
import {
  deduplicateSigners,
  orderSigners,
  createSignerCollection,
  signWithMultiple,
  extractSignerInfo,
} from '../src/multi-signer.js';

describe('Multi-Signer Utilities', () => {
  const createMockSigner = (publicKey: string, delay = 0): Signer => ({
    publicKey: publicKey as Address,
    sign: vi.fn(async () => {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      return new Uint8Array(64).fill(parseInt(publicKey[0])) as Signature;
    }),
  });

  describe('deduplicateSigners', () => {
    it('should remove duplicate signers with keep-first strategy', () => {
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');
      const signer1Dup = createMockSigner('111');

      const result = deduplicateSigners([signer1, signer2, signer1Dup]);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(signer1);
      expect(result[1]).toBe(signer2);
    });

    it('should remove duplicate signers with keep-last strategy', () => {
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');
      const signer1Dup = createMockSigner('111');

      const result = deduplicateSigners([signer1, signer2, signer1Dup], { strategy: 'keep-last' });

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(signer1Dup);
      expect(result[1]).toBe(signer2);
    });

    it('should throw error on duplicates with error strategy', () => {
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');
      const signer1Dup = createMockSigner('111');

      expect(() =>
        deduplicateSigners([signer1, signer2, signer1Dup], { strategy: 'error' }),
      ).toThrow('Duplicate signer found: 111');
    });

    it('should handle empty array', () => {
      const result = deduplicateSigners([]);
      expect(result).toEqual([]);
    });

    it('should handle array with unique signers', () => {
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');
      const signer3 = createMockSigner('333');

      const result = deduplicateSigners([signer1, signer2, signer3]);

      expect(result).toHaveLength(3);
      expect(result).toEqual([signer1, signer2, signer3]);
    });
  });

  describe('orderSigners', () => {
    it('should place fee payer first', () => {
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');
      const signer3 = createMockSigner('333');

      const result = orderSigners([signer1, signer2, signer3], '222' as Address, {
        feePayerFirst: true,
      });

      expect(result[0]).toBe(signer2);
      expect(result[1]).toBe(signer1);
      expect(result[2]).toBe(signer3);
    });

    it('should sort by public key when specified', () => {
      const signer3 = createMockSigner('333');
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');

      const result = orderSigners([signer3, signer1, signer2], undefined, {
        feePayerFirst: false,
        sortByPublicKey: true,
      });

      expect(result[0]).toBe(signer1);
      expect(result[1]).toBe(signer2);
      expect(result[2]).toBe(signer3);
    });

    it('should use custom comparator when provided', () => {
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');
      const signer3 = createMockSigner('333');

      const result = orderSigners([signer1, signer2, signer3], undefined, {
        feePayerFirst: false,
        customComparator: (a, b) => b.publicKey.localeCompare(a.publicKey),
      });

      expect(result[0]).toBe(signer3);
      expect(result[1]).toBe(signer2);
      expect(result[2]).toBe(signer1);
    });

    it('should combine fee payer first with sorting', () => {
      const signer3 = createMockSigner('333');
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');

      const result = orderSigners([signer3, signer1, signer2], '222' as Address, {
        feePayerFirst: true,
        sortByPublicKey: true,
      });

      expect(result[0]).toBe(signer2);
      expect(result[1]).toBe(signer1);
      expect(result[2]).toBe(signer3);
    });
  });

  describe('createSignerCollection', () => {
    it('should create collection with fee payer signer', () => {
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');
      const signer3 = createMockSigner('333');

      const collection = createSignerCollection([signer1, signer2, signer3], signer2);

      expect(collection.signers).toHaveLength(3);
      expect(collection.feePayer).toBe(signer2);
    });

    it('should create collection with fee payer address', () => {
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');
      const signer3 = createMockSigner('333');

      const collection = createSignerCollection([signer1, signer2, signer3], '222' as Address);

      expect(collection.signers).toHaveLength(3);
      expect(collection.feePayer).toBe(signer2);
    });

    it('should add fee payer if not in signers array', () => {
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');
      const feePayer = createMockSigner('333');

      const collection = createSignerCollection([signer1, signer2], feePayer);

      expect(collection.signers).toHaveLength(3);
      expect(collection.signers[0]).toBe(feePayer);
      expect(collection.feePayer).toBe(feePayer);
    });

    it('should throw if fee payer address not found', () => {
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');

      expect(() => createSignerCollection([signer1, signer2], '333' as Address)).toThrow(
        'Fee payer not found in signers array',
      );
    });

    it('should deduplicate signers', () => {
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');
      const signer1Dup = createMockSigner('111');

      const collection = createSignerCollection([signer1, signer2, signer1Dup], signer1);

      expect(collection.signers).toHaveLength(2);
    });
  });

  describe('signWithMultiple', () => {
    it('should sign with multiple signers in parallel', async () => {
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');
      const signer3 = createMockSigner('333');

      const message = new Uint8Array([1, 2, 3]);
      const result = await signWithMultiple(message, [signer1, signer2, signer3]);

      expect(result.success).toBe(true);
      expect(result.signatures).toHaveLength(3);
      expect(result.failures).toHaveLength(0);

      expect(signer1.sign).toHaveBeenCalledWith(message);
      expect(signer2.sign).toHaveBeenCalledWith(message);
      expect(signer3.sign).toHaveBeenCalledWith(message);
    });

    it('should sign with multiple signers sequentially', async () => {
      const signer1 = createMockSigner('111', 10);
      const signer2 = createMockSigner('222', 10);
      const signer3 = createMockSigner('333', 10);

      const message = new Uint8Array([1, 2, 3]);
      const startTime = Date.now();

      const result = await signWithMultiple(message, [signer1, signer2, signer3], {
        parallel: false,
      });

      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.signatures).toHaveLength(3);
      // Allow for minor timing variations (accept 25ms or more instead of strict 30ms)
      expect(duration).toBeGreaterThanOrEqual(25);
    });

    it('should handle signing failures', async () => {
      const signer1 = createMockSigner('111');
      const signer2: Signer = {
        publicKey: '222' as Address,
        sign: vi.fn().mockRejectedValue(new Error('Signing error')),
      };
      const signer3 = createMockSigner('333');

      const message = new Uint8Array([1, 2, 3]);
      const result = await signWithMultiple(message, [signer1, signer2, signer3], {
        continueOnFailure: true,
      });

      expect(result.success).toBe(false);
      expect(result.signatures).toHaveLength(2);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].publicKey).toBe('222');
      expect(result.failures[0].error.message).toBe('Signing error');
    });

    it('should stop on first failure when continueOnFailure is false', async () => {
      const signer1 = createMockSigner('111');
      const signer2: Signer = {
        publicKey: '222' as Address,
        sign: vi.fn().mockRejectedValue(new Error('Signing error')),
      };
      const signer3 = createMockSigner('333');

      const message = new Uint8Array([1, 2, 3]);
      const result = await signWithMultiple(message, [signer1, signer2, signer3], {
        parallel: false,
        continueOnFailure: false,
      });

      expect(result.success).toBe(false);
      expect(result.signatures).toHaveLength(1);
      expect(result.failures).toHaveLength(1);
      expect(signer3.sign).not.toHaveBeenCalled();
    });

    it('should handle timeout', async () => {
      const signer1 = createMockSigner('111', 100);

      const message = new Uint8Array([1, 2, 3]);
      const result = await signWithMultiple(message, [signer1], { timeout: 50 });

      expect(result.success).toBe(false);
      expect(result.signatures).toHaveLength(0);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].error.message).toBe('Signing timeout');
    });
  });

  describe('extractSignerInfo', () => {
    it('should extract signer info correctly', () => {
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');
      const signer3 = createMockSigner('333');

      const info = extractSignerInfo([signer1, signer2, signer3], '111' as Address, [
        '333' as Address,
      ]);

      expect(info).toHaveLength(3);

      expect(info[0].publicKey).toBe('111');
      expect(info[0].isFeePayer).toBe(true);
      expect(info[0].isWritable).toBe(true);
      expect(info[0].signature).toBeUndefined();

      expect(info[1].publicKey).toBe('222');
      expect(info[1].isFeePayer).toBe(false);
      expect(info[1].isWritable).toBe(false);
      expect(info[1].signature).toBeUndefined();

      expect(info[2].publicKey).toBe('333');
      expect(info[2].isFeePayer).toBe(false);
      expect(info[2].isWritable).toBe(true);
      expect(info[2].signature).toBeUndefined();
    });

    it('should handle empty writable signers', () => {
      const signer1 = createMockSigner('111');
      const signer2 = createMockSigner('222');

      const info = extractSignerInfo([signer1, signer2], '111' as Address);

      expect(info).toHaveLength(2);
      expect(info[0].isWritable).toBe(true);
      expect(info[1].isWritable).toBe(false);
    });
  });
});
