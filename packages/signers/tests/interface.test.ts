import { describe, it, expect } from 'vitest';
import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import type { Signer, SignerInfo, SignerMetadata, SigningResult } from '../src/interface.js';

describe('Signer Interface', () => {
  describe('Type Definitions', () => {
    it('should define Signer interface correctly', () => {
      const mockSigner: Signer = {
        publicKey: '11111111111111111111111111111111' as Address,
        sign: async (_message: Uint8Array): Promise<Signature> => {
          return new Uint8Array(64) as Signature;
        },
      };

      expect(mockSigner.publicKey).toBeDefined();
      expect(mockSigner.sign).toBeDefined();
      expect(typeof mockSigner.sign).toBe('function');
    });

    it('should allow optional metadata on Signer', () => {
      const metadata: SignerMetadata = {
        name: 'Test Signer',
        type: 'mock',
        extractable: false,
        customField: 'custom value',
      };

      const mockSigner: Signer = {
        publicKey: '11111111111111111111111111111111' as Address,
        sign: async () => new Uint8Array(64) as Signature,
        metadata,
      };

      expect(mockSigner.metadata).toEqual(metadata);
      expect(mockSigner.metadata?.name).toBe('Test Signer');
      expect(mockSigner.metadata?.type).toBe('mock');
      expect(mockSigner.metadata?.extractable).toBe(false);
      expect(mockSigner.metadata?.customField).toBe('custom value');
    });

    it('should define SignerInfo interface correctly', () => {
      const signerInfo: SignerInfo = {
        publicKey: '11111111111111111111111111111111' as Address,
        isFeePayer: true,
        isWritable: true,
      };

      expect(signerInfo.publicKey).toBeDefined();
      expect(signerInfo.isFeePayer).toBe(true);
      expect(signerInfo.isWritable).toBe(true);
      expect(signerInfo.signature).toBeUndefined();
    });

    it('should allow signature in SignerInfo', () => {
      const signature = new Uint8Array(64) as Signature;
      const signerInfo: SignerInfo = {
        publicKey: '11111111111111111111111111111111' as Address,
        signature,
        isFeePayer: false,
        isWritable: false,
      };

      expect(signerInfo.signature).toBe(signature);
      expect(signerInfo.isFeePayer).toBe(false);
      expect(signerInfo.isWritable).toBe(false);
    });

    it('should define SigningResult interface correctly', () => {
      const signature = new Uint8Array(64) as Signature;
      const signingResult: SigningResult = {
        publicKey: '11111111111111111111111111111111' as Address,
        signature,
      };

      expect(signingResult.publicKey).toBeDefined();
      expect(signingResult.signature).toBe(signature);
    });
  });

  describe('Signer Implementation', () => {
    it('should handle async signing operations', async () => {
      const expectedSignature = new Uint8Array(64).fill(42) as Signature;

      const mockSigner: Signer = {
        publicKey: '11111111111111111111111111111111' as Address,
        sign: async (message: Uint8Array): Promise<Signature> => {
          expect(message).toBeInstanceOf(Uint8Array);
          return expectedSignature;
        },
      };

      const message = new Uint8Array([1, 2, 3, 4]);
      const signature = await mockSigner.sign(message);

      expect(signature).toBe(expectedSignature);
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64);
    });

    it('should handle signing errors', async () => {
      const mockSigner: Signer = {
        publicKey: '11111111111111111111111111111111' as Address,
        sign: async (): Promise<Signature> => {
          throw new Error('Signing failed');
        },
      };

      const message = new Uint8Array([1, 2, 3, 4]);

      await expect(mockSigner.sign(message)).rejects.toThrow('Signing failed');
    });
  });

  describe('Type Compatibility', () => {
    it('should enforce readonly properties', () => {
      const signer: Signer = {
        publicKey: '11111111111111111111111111111111' as Address,
        sign: async () => new Uint8Array(64) as Signature,
      };

      const signerInfo: SignerInfo = {
        publicKey: '11111111111111111111111111111111' as Address,
        isFeePayer: true,
        isWritable: true,
      };

      const signingResult: SigningResult = {
        publicKey: '11111111111111111111111111111111' as Address,
        signature: new Uint8Array(64) as Signature,
      };

      expect(signer.publicKey).toBeDefined();
      expect(signerInfo.publicKey).toBeDefined();
      expect(signingResult.publicKey).toBeDefined();
    });

    it('should support multiple signers with different metadata', () => {
      const signers: Signer[] = [
        {
          publicKey: '11111111111111111111111111111111' as Address,
          sign: async () => new Uint8Array(64) as Signature,
          metadata: { type: 'webcrypto' },
        },
        {
          publicKey: '22222222222222222222222222222222' as Address,
          sign: async () => new Uint8Array(64) as Signature,
          metadata: { type: 'hardware' },
        },
        {
          publicKey: '33333333333333333333333333333333' as Address,
          sign: async () => new Uint8Array(64) as Signature,
        },
      ];

      expect(signers).toHaveLength(3);
      expect(signers[0].metadata?.type).toBe('webcrypto');
      expect(signers[1].metadata?.type).toBe('hardware');
      expect(signers[2].metadata).toBeUndefined();
    });
  });
});
