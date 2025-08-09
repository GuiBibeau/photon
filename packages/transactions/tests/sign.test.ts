import { describe, it, expect, vi } from 'vitest';
import type { Address } from '@photon/addresses';
import type { Signature } from '@photon/crypto';
import type { Signer } from '@photon/signers';
import type { CompileableTransactionMessage } from '@photon/transaction-messages';
import {
  signTransaction,
  partiallySignTransaction,
  addSignaturesToTransaction,
  isFullySigned,
  getMissingSigners,
} from '../src/sign.js';

// Mock types
const mockAddress = (id: string): Address => id as Address;
const mockSignature = (data: string): Signature => new TextEncoder().encode(data) as Signature;

// Helper to create a mock signer
function createMockSigner(publicKey: string, shouldSign = true, signatureData?: string): Signer {
  return {
    publicKey: mockAddress(publicKey),
    sign: vi.fn().mockImplementation(async () => {
      if (!shouldSign) {
        throw new Error(`Signer ${publicKey} failed to sign`);
      }
      return mockSignature(signatureData || `sig-${publicKey}`);
    }),
  };
}

// Helper to create a mock transaction message
function createMockMessage(
  feePayer: string,
  additionalSigners: string[] = [],
): CompileableTransactionMessage {
  return {
    version: 'legacy',
    feePayer: mockAddress(feePayer),
    blockhash: 'mock-blockhash',
    lastValidBlockHeight: 1000n,
    instructions: [
      {
        programId: mockAddress('program1'),
        accounts: [
          ...additionalSigners.map((signer) => ({
            pubkey: mockAddress(signer),
            isSigner: true,
            isWritable: false,
          })),
        ],
        data: new Uint8Array([1, 2, 3]),
      },
    ],
  } as CompileableTransactionMessage;
}

describe('signTransaction', () => {
  it('should sign a transaction with a single signer', async () => {
    const feePayer = 'alice';
    const message = createMockMessage(feePayer);
    const signer = createMockSigner(feePayer);

    const transaction = await signTransaction([signer], message);

    expect(transaction.message).toBe(message);
    expect(transaction.signatures.has(mockAddress(feePayer))).toBe(true);
    expect(transaction.signatures.get(mockAddress(feePayer))).toBeDefined();
    expect(signer.sign).toHaveBeenCalledOnce();
  });

  it('should sign a transaction with multiple signers', async () => {
    const feePayer = 'alice';
    const additionalSigners = ['bob', 'charlie'];
    const message = createMockMessage(feePayer, additionalSigners);

    const signers = [
      createMockSigner(feePayer),
      createMockSigner('bob'),
      createMockSigner('charlie'),
    ];

    const transaction = await signTransaction(signers, message);

    expect(transaction.signatures.size).toBeGreaterThanOrEqual(3);
    expect(transaction.signatures.get(mockAddress(feePayer))).toBeDefined();
    expect(transaction.signatures.get(mockAddress('bob'))).toBeDefined();
    expect(transaction.signatures.get(mockAddress('charlie'))).toBeDefined();

    signers.forEach((signer) => {
      expect(signer.sign).toHaveBeenCalledOnce();
    });
  });

  it('should sign in parallel for performance', async () => {
    const feePayer = 'alice';
    const additionalSigners = ['bob', 'charlie'];
    const message = createMockMessage(feePayer, additionalSigners);

    let signCallCount = 0;
    const signers = [feePayer, ...additionalSigners].map((name) => ({
      publicKey: mockAddress(name),
      sign: vi.fn().mockImplementation(async () => {
        signCallCount++;
        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, 10));
        return mockSignature(`sig-${name}`);
      }),
    }));

    const startTime = Date.now();
    await signTransaction(signers, message);
    const duration = Date.now() - startTime;

    // All signers should have been called
    expect(signCallCount).toBe(3);

    // Should be faster than sequential (3 * 10ms)
    // Adding buffer for test stability
    expect(duration).toBeLessThan(25);
  });

  it('should throw if fee payer is not among signers', async () => {
    const message = createMockMessage('alice');
    const signer = createMockSigner('bob');

    await expect(signTransaction([signer], message)).rejects.toThrow(
      'Fee payer alice must be among the provided signers',
    );
  });

  it('should throw if message has no fee payer', async () => {
    const message = {
      version: 'legacy',
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 1000n,
      instructions: [],
    } as any;

    const signer = createMockSigner('alice');

    await expect(signTransaction([signer], message)).rejects.toThrow(
      'Transaction message must have a fee payer',
    );
  });

  it('should throw if message has no blockhash', async () => {
    const message = {
      version: 'legacy',
      feePayer: mockAddress('alice'),
      instructions: [],
    } as any;

    const signer = createMockSigner('alice');

    await expect(signTransaction([signer], message)).rejects.toThrow(
      'Transaction message must have a lifetime',
    );
  });

  it('should throw if required signer is missing with abortOnError true', async () => {
    const feePayer = 'alice';
    const additionalSigners = ['bob', 'charlie'];
    const message = createMockMessage(feePayer, additionalSigners);

    const signers = [
      createMockSigner(feePayer),
      createMockSigner('bob'),
      // charlie is missing
    ];

    await expect(signTransaction(signers, message, { abortOnError: true })).rejects.toThrow(
      'Missing required signers',
    );
  });

  it('should handle signer failures with abortOnError false', async () => {
    const feePayer = 'alice';
    const message = createMockMessage(feePayer, ['bob']);

    const signers = [
      createMockSigner(feePayer, true),
      createMockSigner('bob', false), // Will fail
    ];

    const transaction = await signTransaction(signers, message, {
      abortOnError: false,
    });

    expect(transaction.signatures.get(mockAddress(feePayer))).toBeDefined();
    expect(transaction.signatures.get(mockAddress('bob'))).toBeNull();
  });
});

describe('partiallySignTransaction', () => {
  it('should collect signatures from available signers', async () => {
    const feePayer = 'alice';
    const message = createMockMessage(feePayer, ['bob', 'charlie']);

    // Only provide some signers
    const signers = [createMockSigner(feePayer), createMockSigner('bob')];

    const result = await partiallySignTransaction(signers, message);

    expect(result.transaction.signatures.get(mockAddress(feePayer))).toBeDefined();
    expect(result.transaction.signatures.get(mockAddress('bob'))).toBeDefined();
    expect(result.transaction.signatures.get(mockAddress('charlie'))).toBeNull();
    expect(result.failedSigners).toContain(mockAddress('charlie'));
  });

  it('should handle signing failures gracefully', async () => {
    const feePayer = 'alice';
    const message = createMockMessage(feePayer, ['bob']);

    const signers = [
      createMockSigner(feePayer, true),
      createMockSigner('bob', false), // Will fail
    ];

    const result = await partiallySignTransaction(signers, message);

    expect(result.transaction.signatures.get(mockAddress(feePayer))).toBeDefined();
    expect(result.transaction.signatures.get(mockAddress('bob'))).toBeNull();
    expect(result.failedSigners).toContain(mockAddress('bob'));
    expect(result.errors.has(mockAddress('bob'))).toBe(true);
  });

  it('should work with no signers provided', async () => {
    const message = createMockMessage('alice', ['bob']);
    const result = await partiallySignTransaction([], message);

    expect(result.transaction.signatures.get(mockAddress('alice'))).toBeNull();
    expect(result.transaction.signatures.get(mockAddress('bob'))).toBeNull();
    expect(result.failedSigners).toContain(mockAddress('alice'));
    expect(result.failedSigners).toContain(mockAddress('bob'));
  });
});

describe('addSignaturesToTransaction', () => {
  it('should add new signatures to a transaction', () => {
    const message = createMockMessage('alice', ['bob']);
    const transaction = {
      message,
      signatures: new Map([
        [mockAddress('alice'), mockSignature('sig-alice')],
        [mockAddress('bob'), null],
      ]),
    };

    const newSignatures = new Map([[mockAddress('bob'), mockSignature('sig-bob')]]);

    const updated = addSignaturesToTransaction(transaction, newSignatures);

    expect(updated.signatures.get(mockAddress('alice'))).toBeDefined();
    expect(updated.signatures.get(mockAddress('bob'))).toBeDefined();
    expect(updated).not.toBe(transaction); // Should be a new object
  });

  it('should overwrite existing signatures', () => {
    const message = createMockMessage('alice');
    const transaction = {
      message,
      signatures: new Map([[mockAddress('alice'), mockSignature('old-sig')]]),
    };

    const newSignatures = new Map([[mockAddress('alice'), mockSignature('new-sig')]]);

    const updated = addSignaturesToTransaction(transaction, newSignatures);

    const sig = updated.signatures.get(mockAddress('alice'));
    expect(new TextDecoder().decode(sig as Uint8Array)).toBe('new-sig');
  });
});

describe('isFullySigned', () => {
  it('should return true when all signatures are present', () => {
    const message = createMockMessage('alice', ['bob']);
    const transaction = {
      message,
      signatures: new Map([
        [mockAddress('alice'), mockSignature('sig-alice')],
        [mockAddress('bob'), mockSignature('sig-bob')],
      ]),
    };

    expect(isFullySigned(transaction)).toBe(true);
  });

  it('should return false when signatures are missing', () => {
    const message = createMockMessage('alice', ['bob']);
    const transaction = {
      message,
      signatures: new Map([
        [mockAddress('alice'), mockSignature('sig-alice')],
        [mockAddress('bob'), null],
      ]),
    };

    expect(isFullySigned(transaction)).toBe(false);
  });

  it('should return false when signature map is incomplete', () => {
    const message = createMockMessage('alice', ['bob']);
    const transaction = {
      message,
      signatures: new Map([
        [mockAddress('alice'), mockSignature('sig-alice')],
        // bob is not in the map at all
      ]),
    };

    expect(isFullySigned(transaction)).toBe(false);
  });
});

describe('getMissingSigners', () => {
  it('should return empty array when fully signed', () => {
    const message = createMockMessage('alice');
    const transaction = {
      message,
      signatures: new Map([[mockAddress('alice'), mockSignature('sig-alice')]]),
    };

    const missing = getMissingSigners(transaction);
    expect(missing).toEqual([]);
  });

  it('should return addresses with null signatures', () => {
    const message = createMockMessage('alice', ['bob', 'charlie']);
    const transaction = {
      message,
      signatures: new Map([
        [mockAddress('alice'), mockSignature('sig-alice')],
        [mockAddress('bob'), null],
        [mockAddress('charlie'), null],
      ]),
    };

    const missing = getMissingSigners(transaction);
    expect(missing).toContain(mockAddress('bob'));
    expect(missing).toContain(mockAddress('charlie'));
    expect(missing).not.toContain(mockAddress('alice'));
  });

  it('should return addresses not in signature map', () => {
    const message = createMockMessage('alice', ['bob']);
    const transaction = {
      message,
      signatures: new Map([
        [mockAddress('alice'), mockSignature('sig-alice')],
        // bob is missing from map
      ]),
    };

    const missing = getMissingSigners(transaction);
    expect(missing).toContain(mockAddress('bob'));
  });
});
