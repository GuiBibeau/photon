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
} from '../src/index.js';

// Mock helpers
const mockAddress = (id: string): Address => id as Address;
const mockSignature = (data: string): Signature => new TextEncoder().encode(data) as Signature;

describe('Transaction signing integration', () => {
  it('should support a complete multi-signer workflow', async () => {
    // Create a transaction that needs 3 signatures
    const message: CompileableTransactionMessage = {
      version: 'legacy',
      feePayer: mockAddress('alice'),
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 1000n,
      instructions: [
        {
          programId: mockAddress('multi-sig-program'),
          accounts: [
            {
              pubkey: mockAddress('alice'),
              isSigner: true,
              isWritable: true,
            },
            {
              pubkey: mockAddress('bob'),
              isSigner: true,
              isWritable: false,
            },
            {
              pubkey: mockAddress('charlie'),
              isSigner: true,
              isWritable: false,
            },
          ],
          data: new Uint8Array([1, 2, 3]),
        },
      ],
    } as CompileableTransactionMessage;

    // Step 1: Alice signs first (she has the transaction)
    const aliceSigner: Signer = {
      publicKey: mockAddress('alice'),
      sign: vi.fn().mockResolvedValue(mockSignature('sig-alice')),
    };

    const partialTx1 = await partiallySignTransaction([aliceSigner], message);

    expect(partialTx1.transaction.signatures.get(mockAddress('alice'))).toBeDefined();
    expect(partialTx1.failedSigners).toContain(mockAddress('bob'));
    expect(partialTx1.failedSigners).toContain(mockAddress('charlie'));
    expect(isFullySigned(partialTx1.transaction)).toBe(false);

    // Step 2: Send to Bob for signing
    const bobSigner: Signer = {
      publicKey: mockAddress('bob'),
      sign: vi.fn().mockResolvedValue(mockSignature('sig-bob')),
    };

    const bobSignatures = new Map([[mockAddress('bob'), await bobSigner.sign(new Uint8Array())]]);

    const partialTx2 = addSignaturesToTransaction(partialTx1.transaction, bobSignatures);

    expect(partialTx2.signatures.get(mockAddress('alice'))).toBeDefined();
    expect(partialTx2.signatures.get(mockAddress('bob'))).toBeDefined();
    expect(getMissingSigners(partialTx2)).toEqual([mockAddress('charlie')]);

    // Step 3: Send to Charlie for final signature
    const charlieSigner: Signer = {
      publicKey: mockAddress('charlie'),
      sign: vi.fn().mockResolvedValue(mockSignature('sig-charlie')),
    };

    const charlieSignatures = new Map([
      [mockAddress('charlie'), await charlieSigner.sign(new Uint8Array())],
    ]);

    const fullySignedTx = addSignaturesToTransaction(partialTx2, charlieSignatures);

    // Verify the transaction is fully signed
    expect(isFullySigned(fullySignedTx)).toBe(true);
    expect(getMissingSigners(fullySignedTx)).toEqual([]);
    expect(fullySignedTx.signatures.size).toBeGreaterThanOrEqual(3);
  });

  it('should support offline signing workflow', async () => {
    // Scenario: Alice prepares a transaction offline, Bob signs it later
    const message: CompileableTransactionMessage = {
      version: 'legacy',
      feePayer: mockAddress('alice'),
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 1000n,
      instructions: [
        {
          programId: mockAddress('token-program'),
          accounts: [
            {
              pubkey: mockAddress('alice'),
              isSigner: true,
              isWritable: true,
            },
            {
              pubkey: mockAddress('bob'),
              isSigner: true,
              isWritable: true,
            },
          ],
          data: new Uint8Array([1]),
        },
      ],
    } as CompileableTransactionMessage;

    // Alice creates the transaction but doesn't sign yet
    const emptyTx = {
      message,
      signatures: new Map([
        [mockAddress('alice'), null],
        [mockAddress('bob'), null],
      ]),
    };

    expect(isFullySigned(emptyTx)).toBe(false);
    expect(getMissingSigners(emptyTx)).toContain(mockAddress('alice'));
    expect(getMissingSigners(emptyTx)).toContain(mockAddress('bob'));

    // Alice signs offline
    const aliceSignature = mockSignature('alice-offline-sig');
    const txWithAlice = addSignaturesToTransaction(
      emptyTx,
      new Map([[mockAddress('alice'), aliceSignature]]),
    );

    expect(getMissingSigners(txWithAlice)).toEqual([mockAddress('bob')]);

    // Bob signs offline
    const bobSignature = mockSignature('bob-offline-sig');
    const fullySignedTx = addSignaturesToTransaction(
      txWithAlice,
      new Map([[mockAddress('bob'), bobSignature]]),
    );

    expect(isFullySigned(fullySignedTx)).toBe(true);
  });

  it('should handle hardware wallet signing pattern', async () => {
    // Scenario: Regular signer for fee payer, hardware wallet for valuable operation
    const message: CompileableTransactionMessage = {
      version: 'legacy',
      feePayer: mockAddress('hot-wallet'),
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 1000n,
      instructions: [
        {
          programId: mockAddress('defi-program'),
          accounts: [
            {
              pubkey: mockAddress('hot-wallet'),
              isSigner: true,
              isWritable: true,
            },
            {
              pubkey: mockAddress('hardware-wallet'),
              isSigner: true,
              isWritable: true,
            },
          ],
          data: new Uint8Array([1]),
        },
      ],
    } as CompileableTransactionMessage;

    // Hot wallet signs immediately
    const hotWalletSigner: Signer = {
      publicKey: mockAddress('hot-wallet'),
      sign: vi.fn().mockResolvedValue(mockSignature('hot-sig')),
    };

    // Hardware wallet signer with delay
    const hardwareWalletSigner: Signer = {
      publicKey: mockAddress('hardware-wallet'),
      sign: vi.fn().mockImplementation(async () => {
        // Simulate hardware wallet delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        return mockSignature('hardware-sig');
      }),
    };

    const startTime = Date.now();
    const signedTx = await signTransaction([hotWalletSigner, hardwareWalletSigner], message);
    const duration = Date.now() - startTime;

    expect(isFullySigned(signedTx)).toBe(true);
    expect(duration).toBeGreaterThanOrEqual(90); // Hardware wallet delay (with some tolerance)
  });

  it('should support retry pattern for failed signers', async () => {
    const message: CompileableTransactionMessage = {
      version: 'legacy',
      feePayer: mockAddress('alice'),
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 1000n,
      instructions: [
        {
          programId: mockAddress('program'),
          accounts: [
            {
              pubkey: mockAddress('bob'),
              isSigner: true,
              isWritable: false,
            },
          ],
          data: new Uint8Array([1]),
        },
      ],
    } as CompileableTransactionMessage;

    // Alice signs successfully
    const aliceSigner: Signer = {
      publicKey: mockAddress('alice'),
      sign: vi.fn().mockResolvedValue(mockSignature('sig-alice')),
    };

    // Bob fails first time
    let bobAttempts = 0;
    const bobSigner: Signer = {
      publicKey: mockAddress('bob'),
      sign: vi.fn().mockImplementation(async () => {
        bobAttempts++;
        if (bobAttempts === 1) {
          throw new Error('Network error');
        }
        return mockSignature('sig-bob');
      }),
    };

    // First attempt - Bob fails
    const attempt1 = await partiallySignTransaction([aliceSigner, bobSigner], message);

    expect(attempt1.failedSigners).toContain(mockAddress('bob'));
    expect(attempt1.errors.has(mockAddress('bob'))).toBe(true);
    expect(isFullySigned(attempt1.transaction)).toBe(false);

    // Retry with Bob only
    const attempt2 = await partiallySignTransaction([bobSigner], message);

    // Combine signatures - filter out null values
    const bobSignature = attempt2.transaction.signatures.get(mockAddress('bob'));
    const newSignatures = new Map();
    if (bobSignature) {
      newSignatures.set(mockAddress('bob'), bobSignature);
    }

    const finalTx = addSignaturesToTransaction(attempt1.transaction, newSignatures);

    expect(isFullySigned(finalTx)).toBe(true);
    expect(bobAttempts).toBe(2);
  });
});
